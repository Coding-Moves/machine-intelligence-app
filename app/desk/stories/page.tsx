import { PageHeading } from "@/components/page-heading";
import { StoryBoard, type StoryReview } from "@/components/story-board";
import { Section } from "@/components/ui/section";
import { siteCopy } from "@/content/site";
import { requireEditor } from "@/lib/auth/require-editor";
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
      "id, headline, summary, section, status, final_score, reject_reason, verification, is_ai_related",
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
    ? await admin.from("sources").select("id, name").in("id", sourceIds)
    : { data: [], error: null };
  if (sourceError) throw new Error("Could not load story source names.");
  const sourceNames = new Map(
    (sources ?? []).map((source) => [source.id, source.name]),
  );
  const articlesByStory = new Map<string, StoryReview["sources"]>();
  for (const article of articles ?? []) {
    if (!article.story_id) continue;
    const values = articlesByStory.get(article.story_id) ?? [];
    values.push({
      id: article.id,
      name: sourceNames.get(article.source_id) ?? "Source",
      url: article.url,
    });
    articlesByStory.set(article.story_id, values);
  }

  const stories: StoryReview[] = (rows ?? []).map((story) => ({
    id: story.id,
    headline: story.headline,
    summary: story.summary,
    section: story.section,
    status: story.status,
    isAiRelated: story.is_ai_related,
    finalScore: story.final_score,
    rejectReason: story.reject_reason,
    verification: story.verification,
    sources: articlesByStory.get(story.id) ?? [],
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
