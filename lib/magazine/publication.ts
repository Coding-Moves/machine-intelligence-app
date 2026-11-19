import "server-only";

import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { planItemSchema } from "@/lib/magazine/plan";
import {
  evaluatePublishReadiness,
  type PublishReadiness,
  type StoryReview,
} from "@/lib/magazine/publication-readiness";

export { MINIMUM_ISSUE_AGE_DAYS } from "@/lib/magazine/publication-readiness";
export type { PublishReadiness } from "@/lib/magazine/publication-readiness";

type EditionForReadiness = {
  id: string;
  created_at: string;
  window_start: string | null;
  pdf_path: string | null;
  tex_hash: string | null;
  pdf_tex_hash: string | null;
  editor_note: string | null;
  editor_note_approved: boolean;
  layout: Json;
};

function getPlanStoryIds(layout: Json) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return [];
  const plan = layout.plan;
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return [];
  const items = plan.items;
  if (!Array.isArray(items)) return [];
  const parsed = z.array(planItemSchema).safeParse(items);
  return parsed.success ? parsed.data.map((item) => item.storyId) : [];
}

function planUsesGemini(layout: Json) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout))
    return false;
  const plan = layout.plan;
  return Boolean(
    plan &&
    typeof plan === "object" &&
    !Array.isArray(plan) &&
    plan.provider === "gemini" &&
    plan.warning === null,
  );
}

function getScannedTrustedSourceIds(details: Json) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const ids = details.scannedTrustedSourceIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return null;
  }
  return [...ids].sort();
}

export async function getDraftPublishReadiness(
  edition: EditionForReadiness,
): Promise<PublishReadiness> {
  const admin = createSupabaseAdminClient();
  const storyIds = getPlanStoryIds(edition.layout);
  const uniqueStoryIds = [...new Set(storyIds)];
  const windowStart = edition.window_start ?? edition.created_at;
  const [
    selectedResult,
    approvedResult,
    pendingAiResult,
    pendingEditorResult,
    articleResult,
    sourcePassResult,
    trustedSourceResult,
  ] = await Promise.all([
    uniqueStoryIds.length
      ? admin
          .from("stories")
          .select("id, status, is_ai_related, verification")
          .in("id", uniqueStoryIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("stories")
      .select("id")
      .eq("status", "approved")
      .eq("is_ai_related", true)
      .gte("last_updated_at", windowStart),
    admin
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("status", "candidate")
      .eq("needs_reprocess", true)
      .gte("last_updated_at", windowStart),
    admin
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("status", "candidate")
      .eq("is_ai_related", true)
      .eq("needs_reprocess", false)
      .gte("last_updated_at", windowStart),
    uniqueStoryIds.length
      ? admin
          .from("articles")
          .select("story_id, source_id")
          .in("story_id", uniqueStoryIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("runs")
      .select("id, ok, details")
      .eq("kind", "ingest")
      .gte("started_at", windowStart)
      .order("started_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1),
    admin.from("sources").select("id").eq("active", true).eq("trusted", true),
  ]);

  if (
    selectedResult.error ||
    approvedResult.error ||
    pendingAiResult.error ||
    pendingEditorResult.error ||
    articleResult.error ||
    sourcePassResult.error ||
    trustedSourceResult.error
  ) {
    throw new Error("Could not check whether this issue is ready to publish.");
  }

  const articleRows = articleResult.data ?? [];
  const sourceIds = [
    ...new Set(articleRows.map((article) => article.source_id)),
  ];
  const { data: trustedSources, error: sourceError } = sourceIds.length
    ? await admin
        .from("sources")
        .select("id")
        .in("id", sourceIds)
        .eq("trusted", true)
    : { data: [], error: null };
  if (sourceError) {
    throw new Error("Could not verify the issue’s trusted sources.");
  }

  const trustedSourceIds = new Set(
    (trustedSources ?? []).map((source) => source.id),
  );
  const storiesWithTrustedSources = new Set(
    articleRows
      .filter((article) => trustedSourceIds.has(article.source_id))
      .map((article) => article.story_id)
      .filter((id): id is string => Boolean(id)),
  );
  const stories = (
    (selectedResult.data ?? []) as unknown as Omit<
      StoryReview,
      "hasTrustedSource"
    >[]
  ).map((story) => ({
    ...story,
    verification:
      story.verification &&
      typeof story.verification === "object" &&
      !Array.isArray(story.verification)
        ? (story.verification as { [key: string]: unknown })
        : null,
    hasTrustedSource: storiesWithTrustedSources.has(story.id),
  }));
  const currentTrustedSourceIds = (trustedSourceResult.data ?? [])
    .map((source) => source.id)
    .sort();
  const scannedTrustedSourceIds = sourcePassResult.data?.[0]
    ? getScannedTrustedSourceIds(sourcePassResult.data[0].details)
    : null;
  const fullSourcePassComplete =
    sourcePassResult.data?.[0]?.ok === true &&
    scannedTrustedSourceIds !== null &&
    scannedTrustedSourceIds.length === currentTrustedSourceIds.length &&
    scannedTrustedSourceIds.every(
      (sourceId, index) => sourceId === currentTrustedSourceIds[index],
    );

  return evaluatePublishReadiness({
    editionId: edition.id,
    createdAt: edition.created_at,
    pdfPath: edition.pdf_path,
    texHash: edition.tex_hash,
    pdfTexHash: edition.pdf_tex_hash,
    editorNote: edition.editor_note,
    editorNoteApproved: edition.editor_note_approved,
    planUsesGemini: planUsesGemini(edition.layout),
    storyIds,
    approvedStoryIds: (approvedResult.data ?? []).map((story) => story.id),
    stories,
    pendingAiReviews: pendingAiResult.count ?? 0,
    pendingEditorReviews: pendingEditorResult.count ?? 0,
    fullSourcePassComplete,
  });
}
