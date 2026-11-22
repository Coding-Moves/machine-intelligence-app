import { PageHeading } from "@/components/page-heading";
import { StoryBoard, type StoryReview } from "@/components/story-board";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { requireEditor } from "@/lib/auth/require-editor";
import { calculateScoreBreakdown } from "@/lib/ingest/scoring";
import { getDraftEdition } from "@/lib/magazine/build";
import {
  defaultMagazineTemplate,
  readMagazineTemplate,
} from "@/lib/magazine/template";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  await requireEditor();
  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from("stories")
    .select(
      "id, headline, summary, section, status, final_score, reject_reason, verification, is_ai_related, ai_importance, ai_pakistan_relevance, editorial_reason, first_seen_at",
    )
    .in("status", ["candidate", "approved"])
    .order("final_score", { ascending: false, nullsFirst: false });
  if (error) throw new Error("Could not load stories for review.");

  const storyIds = (rows ?? []).map((story) => story.id);
  const { data: articles, error: articleError } = storyIds.length
    ? await admin
        .from("articles")
        .select("id, story_id, source_id, url")
        .in("story_id", storyIds)
    : { data: [], error: null };
  if (articleError) throw new Error("Could not load story sources.");
  const sourceIds = [
    ...new Set((articles ?? []).map((article) => article.source_id)),
  ];
  const { data: sources, error: sourceError } = sourceIds.length
    ? await admin
        .from("sources")
        .select("id, name, trust_weight")
        .in("id", sourceIds)
        .eq("trusted", true)
    : { data: [], error: null };
  if (sourceError) throw new Error("Could not load story source names.");
  const sourceNames = new Map(
    (sources ?? []).map((source) => [
      source.id,
      { name: source.name, trustWeight: Number(source.trust_weight) },
    ]),
  );
  const articlesByStory = new Map<string, StoryReview["sources"]>();
  for (const article of articles ?? []) {
    if (!article.story_id) continue;
    const source = sourceNames.get(article.source_id);
    if (!source) continue;
    const values = articlesByStory.get(article.story_id) ?? [];
    values.push({
      id: article.id,
      sourceId: article.source_id,
      name: source.name,
      trustWeight: source.trustWeight,
      url: article.url,
    });
    articlesByStory.set(article.story_id, values);
  }

  const { data: images, error: imageError } = storyIds.length
    ? await admin
        .from("images")
        .select("id, story_id, storage_path, approved, credit")
        .in("story_id", storyIds)
        .eq("license", "own")
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (imageError) throw new Error("Could not load story illustrations.");
  const imageByStory = new Map<
    string,
    { url: string; approved: boolean; credit: string }
  >();
  const imageByPath = new Map(
    (images ?? []).map((image) => [image.storage_path, image]),
  );
  const { data: signedImages, error: signedImagesError } = images?.length
    ? await admin.storage
        .from("drafts")
        .createSignedUrls(
          images.map((image) => image.storage_path),
          3600,
        )
    : { data: [], error: null };
  if (signedImagesError) throw new Error("Could not sign story illustrations.");
  for (const signed of signedImages ?? []) {
    if (!signed.path || !signed.signedUrl || signed.error) continue;
    const image = imageByPath.get(signed.path);
    if (!image?.story_id || imageByStory.has(image.story_id)) continue;
    imageByStory.set(image.story_id, {
      url: signed.signedUrl,
      approved: image.approved,
      credit: image.credit,
    });
  }

  const stories: StoryReview[] = (rows ?? []).map((story) => ({
    id: story.id,
    headline: story.headline,
    summary: story.summary,
    section: story.section,
    status: story.status,
    isAiRelated: story.is_ai_related,
    finalScore: story.final_score,
    editorialReason: story.editorial_reason,
    scoreBreakdown:
      story.ai_importance !== null && story.ai_pakistan_relevance !== null
        ? calculateScoreBreakdown({
            importance: story.ai_importance,
            pakistanRelevance: story.ai_pakistan_relevance,
            distinctSources: new Set(
              articlesByStory.get(story.id)?.map((source) => source.sourceId) ??
                [],
            ).size,
            firstSeenAt: story.first_seen_at,
            trustWeights: [
              ...new Map(
                (articlesByStory.get(story.id) ?? []).map((source) => [
                  source.sourceId,
                  source.trustWeight,
                ]),
              ).values(),
            ],
          })
        : null,
    rejectReason: story.reject_reason,
    verification: story.verification,
    sources: articlesByStory.get(story.id) ?? [],
    image: imageByStory.get(story.id) ?? null,
  }));
  const draft = await getDraftEdition();
  const template = draft
    ? readMagazineTemplate(draft.layout)
    : defaultMagazineTemplate;

  return (
    <Section>
      <PageHeading
        eyebrow={siteCopy.desk.storiesTitle}
        title={siteCopy.desk.storiesTitle}
        description="Review stories stored in Supabase. Only approved stories with a summary and section can enter the draft magazine."
      />
      <div className="mt-10">
        <StoryBoard stories={stories} sections={template.sections} />
      </div>
    </Section>
  );
}
