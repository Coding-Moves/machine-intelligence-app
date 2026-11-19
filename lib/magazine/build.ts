import "server-only";

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

function jsonRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

async function fetchApprovedStories(admin: AdminClient) {
  const { data, error } = await admin
    .from("stories")
    .select(
      "id, headline, summary, key_facts, section, final_score, status, is_ai_related",
    )
    .eq("status", "approved")
    .or("is_ai_related.is.null,is_ai_related.eq.true")
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
    ? await admin.from("sources").select("id, name").in("id", sourceIds)
    : { data: [], error: null };
  if (sourcesError) throw new Error("Could not load story source names.");
  const sourceName = new Map(
    (sources ?? []).map((source) => [source.id, source.name]),
  );
  const articlesByStory = new Map<string, RenderStory["sources"]>();
  for (const article of articles ?? []) {
    if (!article.story_id) continue;
    const values = articlesByStory.get(article.story_id) ?? [];
    values.push({
      name: sourceName.get(article.source_id) ?? "Source",
      url: article.url,
      publishedAt: article.published_at,
    });
    articlesByStory.set(article.story_id, values);
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
  const path = `${input.edition.id}/edition.tex`;
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
  return path;
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
  const template = readMagazineTemplate(edition.layout);
  const { stories, skipped } = await fetchApprovedStories(admin);
  const plan = await createIssuePlan(toPlanStories(stories), template.sections);
  const note = options?.preserveEditorNote
    ? (edition.editor_note ?? "")
    : plan.editorNote || edition.editor_note || "";
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
    ...jsonRecord(edition.layout),
    template: toJsonTemplate(template),
    plan: {
      items: plan.items as unknown as Json,
      provider: plan.provider,
      warning: planDetails.warning,
      generatedAt,
    },
  } as Json;
  const texPath = await saveRenderedTex({
    admin,
    edition,
    template,
    plan: planDetails,
    stories,
    editorNote: note,
    editorNoteApproved: false,
  });
  const { error } = await admin
    .from("editions")
    .update({
      layout,
      tex_path: texPath,
      in_this_issue: sortPlanItems(plan.items, template.sections)
        .map(
          (item) =>
            stories.find((story) => story.id === item.storyId)?.headline,
        )
        .filter((headline): headline is string => Boolean(headline)),
      editor_note: note,
      editor_note_approved: false,
    })
    .eq("id", edition.id)
    .eq("status", "draft");
  if (error) throw new Error("Could not save the generated magazine layout.");
  return {
    editionId: edition.id,
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
  const layout = {
    ...jsonRecord(edition.layout),
    template: toJsonTemplate(parsed.data),
  } as Json;
  const { error } = await admin
    .from("editions")
    .update({ title: input.title, layout, editor_note_approved: false })
    .eq("id", edition.id)
    .eq("status", "draft");
  if (error) throw new Error("Could not save the magazine template.");
  return edition.id;
}

export async function saveDraftEditorNote(input: {
  note: string;
  approved: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const edition = await getDraftEdition();
  if (!edition) throw new Error("No draft issue exists.");
  const { error } = await admin
    .from("editions")
    .update({ editor_note: input.note, editor_note_approved: input.approved })
    .eq("id", edition.id)
    .eq("status", "draft");
  if (error) throw new Error("Could not save the editor's note.");
  return edition.id;
}

export async function refreshDraftTex(editionId: string) {
  const admin = createSupabaseAdminClient();
  const { data: edition, error } = await admin
    .from("editions")
    .select("*")
    .eq("id", editionId)
    .eq("status", "draft")
    .maybeSingle();
  if (error || !edition)
    throw new Error("Could not find the current draft issue.");
  const { stories } = await fetchApprovedStories(admin);
  const template = readMagazineTemplate(edition.layout);
  const plan = getSavedPlan(edition.layout, stories, template.sections);
  const path = await saveRenderedTex({
    admin,
    edition,
    template,
    plan,
    stories,
    editorNote: edition.editor_note ?? "",
    editorNoteApproved: edition.editor_note_approved,
  });
  const { error: updateError } = await admin
    .from("editions")
    .update({
      tex_path: path,
      in_this_issue: sortPlanItems(plan.items, template.sections)
        .map(
          (item) =>
            stories.find((story) => story.id === item.storyId)?.headline,
        )
        .filter((headline): headline is string => Boolean(headline)),
    })
    .eq("id", edition.id)
    .eq("status", "draft");
  if (updateError) throw new Error("Could not update the generated TeX draft.");
}

export function getTemplateForDraft(layout: Json) {
  return magazineTemplateSchema.parse(
    readMagazineTemplate(layout) ?? defaultMagazineTemplate,
  );
}
