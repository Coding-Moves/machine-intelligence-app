import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import {
  createIssuePlan,
  planItemSchema,
  type IssuePlan,
  type PlanStory,
} from "@/lib/magazine/plan";
import {
  createFallbackLayout,
  isValidIssueLayout,
  sortPlanItems,
} from "@/lib/magazine/layout";
import { renderMagazineTex, type RenderStory } from "@/lib/magazine/render";
import {
  defaultMagazineTemplate,
  magazineTemplateSchema,
  readMagazineTemplate,
  toJsonTemplate,
  type MagazineTemplate,
} from "@/lib/magazine/template";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

const factsSchema = z.array(z.object({ label: z.string(), value: z.string() }));
const savedPlanSchema = z.object({
  items: z.array(planItemSchema),
  provider: z.enum(["gemini", "fallback"]),
  warning: z.string().nullable(),
  generatedAt: z.string(),
});

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
type DraftEdition = Awaited<ReturnType<typeof getDraftEdition>>;

export async function getDraftEdition() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("editions")
    .select("*")
    .eq("status", "draft")
    .maybeSingle();
  if (error) throw new Error("Could not load the current draft issue.");
  return data;
}

async function getDraftEditionById(admin: AdminClient, editionId: string) {
  const { data, error } = await admin
    .from("editions")
    .select("*")
    .eq("id", editionId)
    .eq("status", "draft")
    .maybeSingle();
  if (error || !data)
    throw new Error("Could not load the current draft issue.");
  return data;
}

async function invalidateDraftArtifacts(admin: AdminClient, editionId: string) {
  const { data: revision, error } = await admin.rpc(
    "invalidate_draft_edition_artifacts",
    { p_edition_id: editionId },
  );
  if (error || revision === null)
    throw new Error("Could not invalidate the current draft files.");
  return revision;
}

export async function invalidateCurrentDraftArtifacts() {
  const admin = createSupabaseAdminClient();
  const edition = await getDraftEdition();
  if (!edition) throw new Error("No draft issue exists.");
  await invalidateDraftArtifacts(admin, edition.id);
}

function jsonRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

async function fetchApprovedStories(admin: AdminClient, windowStart: string) {
  const { data, error } = await admin
    .from("stories")
    .select(
      "id, headline, summary, key_facts, section, final_score, status, is_ai_related",
    )
    .eq("status", "approved")
    .eq("is_ai_related", true)
    .gte("last_updated_at", windowStart)
    .order("final_score", { ascending: false, nullsFirst: false });
  if (error) throw new Error("Could not load approved stories.");

  const eligible = (data ?? []).filter(
    (story) => story.section && story.summary?.trim(),
  );
  const ids = eligible.map((story) => story.id);
  if (!ids.length)
    return { stories: [] as RenderStory[], skipped: (data ?? []).length };

  const { data: articles, error: articlesError } = await admin
    .from("articles")
    .select("story_id, source_id, url, published_at")
    .in("story_id", ids);
  if (articlesError) throw new Error("Could not load story source links.");

  const sourceIds = [
    ...new Set((articles ?? []).map((article) => article.source_id)),
  ];
  const { data: sources, error: sourcesError } = sourceIds.length
    ? await admin
        .from("sources")
        .select("id, name")
        .in("id", sourceIds)
        .eq("trusted", true)
    : { data: [], error: null };
  if (sourcesError) throw new Error("Could not load story source names.");
  const sourceName = new Map(
    (sources ?? []).map((source) => [source.id, source.name]),
  );
  const trustedSourceIds = new Set(sourceName.keys());
  const articlesByStory = new Map<string, RenderStory["sources"]>();
  for (const article of articles ?? []) {
    if (!article.story_id || !trustedSourceIds.has(article.source_id)) continue;
    const values = articlesByStory.get(article.story_id) ?? [];
    values.push({
      name: sourceName.get(article.source_id) ?? "Source",
      url: article.url,
      publishedAt: article.published_at,
    });
    articlesByStory.set(article.story_id, values);
  }

  const { data: illustrations, error: illustrationsError } = await admin
    .from("images")
    .select("story_id, storage_path")
    .in("story_id", ids)
    .eq("license", "own")
    .eq("approved", true);
  if (illustrationsError)
    throw new Error("Could not load approved illustrations.");
  const imagePathByStory = new Map<string, string>();
  for (const image of illustrations ?? []) {
    if (
      image.story_id &&
      image.storage_path.toLowerCase().endsWith(".png") &&
      !imagePathByStory.has(image.story_id)
    ) {
      imagePathByStory.set(image.story_id, `images/${image.story_id}.png`);
    }
  }

  return {
    stories: eligible.flatMap((story) => {
      const section = story.section;
      if (!section) return [];
      const facts = factsSchema.safeParse(story.key_facts);
      return [
        {
          id: story.id,
          headline: story.headline,
          summary: story.summary ?? "",
          section,
          finalScore: Number(story.final_score ?? 0),
          keyFacts: facts.success ? facts.data : [],
          sources: articlesByStory.get(story.id) ?? [],
          imagePath: imagePathByStory.get(story.id),
        },
      ];
    }),
    skipped: (data ?? []).length - eligible.length,
  };
}

function toPlanStories(stories: RenderStory[]): PlanStory[] {
  return stories.map(
    ({ id, headline, summary, section, finalScore, keyFacts }) => ({
      id,
      headline,
      summary,
      section,
      finalScore,
      keyFacts,
    }),
  );
}

function getSavedPlan(
  layout: Json,
  stories: RenderStory[],
  sections: MagazineTemplate["sections"],
): IssuePlan {
  const raw = jsonRecord(layout).plan;
  const parsed = savedPlanSchema.safeParse(raw);
  if (
    !parsed.success ||
    !isValidIssueLayout(parsed.data.items, toPlanStories(stories), sections)
  ) {
    return {
      items: createFallbackLayout(toPlanStories(stories), sections),
      editorNote: "",
      provider: "fallback",
      warning: "The saved layout needed a safe default.",
    };
  }
  return {
    items: parsed.data.items,
    editorNote: "",
    provider: parsed.data.provider,
    warning: parsed.data.warning,
  };
}

async function saveRenderedTex(input: {
  admin: AdminClient;
  edition: NonNullable<DraftEdition>;
  template: MagazineTemplate;
  plan: IssuePlan;
  stories: RenderStory[];
  editorNote: string;
  editorNoteApproved: boolean;
}) {
  const tex = await renderMagazineTex({
    title: input.edition.title,
    template: input.template,
    plan: input.plan,
    stories: input.stories,
    editorNote: input.editorNote,
    editorNoteApproved: input.editorNoteApproved,
  });
  const texHash = createHash("sha256").update(tex, "utf8").digest("hex");
  const path = `${input.edition.id}/${texHash}.tex`;
  const { error: uploadError } = await input.admin.storage
    .from("drafts")
    .upload(
      path,
      new Blob([tex], { type: "application/x-tex; charset=utf-8" }),
      {
        upsert: true,
        contentType: "application/x-tex; charset=utf-8",
      },
    );
  if (uploadError)
    throw new Error("Could not save the draft magazine source file.");
  return { path, texHash };
}

export async function rebuildMagazineDraft(options?: {
  preserveEditorNote?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const edition = await getDraftEdition();
  if (!edition)
    throw new Error(
      "No draft issue exists. Apply the database migrations first.",
    );
  const revision = await invalidateDraftArtifacts(admin, edition.id);
  const currentEdition = await getDraftEditionById(admin, edition.id);
  if (currentEdition.draft_revision !== revision)
    throw new Error("The draft changed before its layout could be generated.");
  const template = readMagazineTemplate(currentEdition.layout);
  const { stories, skipped } = await fetchApprovedStories(
    admin,
    currentEdition.window_start ?? currentEdition.created_at,
  );
  const plan = await createIssuePlan(toPlanStories(stories), template.sections);
  const note = options?.preserveEditorNote
    ? (currentEdition.editor_note ?? "")
    : plan.editorNote || currentEdition.editor_note || "";
  const generatedAt = new Date().toISOString();
  const planDetails = {
    ...plan,
    warning:
      [
        plan.warning,
        skipped
          ? `${skipped} approved stories need a section and summary before they can be laid out.`
          : null,
      ]
        .filter(Boolean)
        .join(" ") || null,
  };
  const layout = {
    ...jsonRecord(currentEdition.layout),
    template: toJsonTemplate(template),
    plan: {
      items: plan.items as unknown as Json,
      provider: plan.provider,
      warning: planDetails.warning,
      generatedAt,
    },
  } as Json;
  const rendered = await saveRenderedTex({
    admin,
    edition: currentEdition,
    template,
    plan: planDetails,
    stories,
    editorNote: note,
    editorNoteApproved: false,
  });
  const { data, error } = await admin
    .from("editions")
    .update({
      layout,
      tex_path: rendered.path,
      tex_hash: rendered.texHash,
      in_this_issue: sortPlanItems(plan.items, template.sections)
        .map(
          (item) =>
            stories.find((story) => story.id === item.storyId)?.headline,
        )
        .filter((headline): headline is string => Boolean(headline)),
      editor_note: note,
      editor_note_approved: false,
      pdf_path: null,
      pdf_tex_hash: null,
    })
    .eq("id", currentEdition.id)
    .eq("status", "draft")
    .eq("draft_revision", revision)
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new Error(
      "The draft changed while its layout was being generated. Rebuild it again.",
    );
  return {
    editionId: currentEdition.id,
    storyCount: stories.length,
    provider: plan.provider,
    warning: planDetails.warning,
  };
}

export async function saveDraftTemplate(input: {
  title: string;
  template: MagazineTemplate;
}) {
  const parsed = magazineTemplateSchema.safeParse(input.template);
  if (!parsed.success)
    throw new Error("The magazine template settings are invalid.");
  const admin = createSupabaseAdminClient();
  const edition = await getDraftEdition();
  if (!edition) throw new Error("No draft issue exists.");
  const { data, error } = await admin.rpc("save_draft_edition_template", {
    p_edition_id: edition.id,
    p_title: input.title,
    p_template: toJsonTemplate(parsed.data),
  });
  if (error || !data) throw new Error("Could not save the magazine template.");
  return data;
}

export async function saveDraftEditorNote(input: {
  note: string;
  approved: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const edition = await getDraftEdition();
  if (!edition) throw new Error("No draft issue exists.");
  const { data, error } = await admin.rpc("save_draft_edition_editor_note", {
    p_edition_id: edition.id,
    p_editor_note: input.note,
    p_approved: input.approved,
  });
  if (error || !data) throw new Error("Could not save the editor's note.");
  return data;
}

export async function refreshDraftTex(editionId: string) {
  const admin = createSupabaseAdminClient();
  const revision = await invalidateDraftArtifacts(admin, editionId);
  const edition = await getDraftEditionById(admin, editionId);
  if (edition.draft_revision !== revision)
    throw new Error("The draft changed before its TeX could be generated.");
  const { stories } = await fetchApprovedStories(
    admin,
    edition.window_start ?? edition.created_at,
  );
  const template = readMagazineTemplate(edition.layout);
  const plan = getSavedPlan(edition.layout, stories, template.sections);
  const rendered = await saveRenderedTex({
    admin,
    edition,
    template,
    plan,
    stories,
    editorNote: edition.editor_note ?? "",
    editorNoteApproved: edition.editor_note_approved,
  });
  const { data, error: updateError } = await admin
    .from("editions")
    .update({
      tex_path: rendered.path,
      tex_hash: rendered.texHash,
      in_this_issue: sortPlanItems(plan.items, template.sections)
        .map(
          (item) =>
            stories.find((story) => story.id === item.storyId)?.headline,
        )
        .filter((headline): headline is string => Boolean(headline)),
      pdf_path: null,
      pdf_tex_hash: null,
    })
    .eq("id", edition.id)
    .eq("status", "draft")
    .eq("draft_revision", revision)
    .select("id")
    .maybeSingle();
  if (updateError || !data)
    throw new Error(
      "The draft changed while its TeX was being generated. Refresh it again.",
    );
}

export function getTemplateForDraft(layout: Json) {
  return magazineTemplateSchema.parse(
    readMagazineTemplate(layout) ?? defaultMagazineTemplate,
  );
}
