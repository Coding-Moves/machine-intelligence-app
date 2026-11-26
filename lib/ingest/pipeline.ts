import "server-only";

import { z } from "zod";
import { fetchArticlePageText, fetchRssDocument } from "@/lib/ingest/fulltext";
import {
  MAX_ARTICLE_TEXT_LENGTH,
  filterArticlesToIssueWindow,
  parseFeed,
  type FeedArticle,
  type IngestSource,
} from "@/lib/ingest/rss";
import { findMatchingStory, fingerprintTitle } from "@/lib/ingest/cluster";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { enrichPendingStories } from "@/lib/ingest/enrich";
import { generateMissingStoryIllustrations } from "@/lib/ingest/illustrations";
import { rebuildMagazineDraft } from "@/lib/magazine/build";

const MAX_FULL_TEXT_REQUESTS_PER_SOURCE = 2;
const URL_HASH_LOOKUP_BATCH_SIZE = 50;
const STORY_LOOKBACK_DAYS = 5;

const storedArticleResultSchema = z.object({
  article_id: z.string().uuid(),
  story_id: z.string().uuid().nullable(),
  created: z.boolean(),
  story_created: z.boolean(),
});

type IngestError = { source: string; message: string };

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected ingestion error.";
  return message.replace(/[\r\n]+/g, " ").slice(0, 300);
}

function selectArticleContent(article: FeedArticle, pageText: string) {
  const cleanedPageText = pageText.trim().slice(0, MAX_ARTICLE_TEXT_LENGTH);
  if (cleanedPageText.length > article.rssText.length) {
    return {
      text: cleanedPageText,
      origin: "article_page" as const,
    };
  }

  return {
    text: article.rssText,
    origin:
      article.rssText.length >= 800
        ? ("rss" as const)
        : ("rss_fallback" as const),
  };
}

export async function runIngest() {
  const supabase = createSupabaseAdminClient();
  const startedAt = new Date().toISOString();
  const { data: run, error: runInsertError } = await supabase
    .from("runs")
    .insert({
      kind: "ingest",
      started_at: startedAt,
      details: { pipeline: "rss-v1" },
    })
    .select("id")
    .single();

  if (runInsertError || !run) {
    throw new Error("Could not start an ingest run.");
  }

  try {
    const { data: issueEdition, error: draftError } = await supabase
      .from("editions")
      .select("created_at, window_start")
      .eq("status", "draft")
      .maybeSingle();
    if (draftError || !issueEdition) {
      throw new Error("Could not find the current magazine issue window.");
    }
    const issueWindowStart =
      issueEdition.window_start ?? issueEdition.created_at;

    const { data: sources, error: sourcesError } = await supabase
      .from("sources")
      .select("id, name, feed_url, homepage, region, kind, fetch_full_text")
      .eq("active", true)
      .eq("trusted", true)
      .order("name");

    if (sourcesError) throw new Error("Could not load active sources.");

    const storyCutoff = new Date(
      Date.now() - STORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: recentStories, error: storiesError } = await supabase
      .from("stories")
      .select("id, headline, title_fingerprint, first_seen_at, status")
      .gte("first_seen_at", storyCutoff)
      .neq("status", "published")
      .order("first_seen_at", { ascending: false })
      .limit(1000);

    if (storiesError) throw new Error("Could not load recent stories.");

    const storyCandidates = [...(recentStories ?? [])];
    const sourceErrors: IngestError[] = [];
    const warnings: IngestError[] = [];
    const shortItemsBySource = new Map<string, number>();
    let newArticles = 0;
    let newStories = 0;
    let duplicateArticles = 0;
    let skippedShortItems = 0;
    const storiesToEnrich = new Set<string>();
    let issueStoriesChanged = false;

    for (const source of (sources ?? []) as IngestSource[]) {
      try {
        const xml = await fetchRssDocument(source.feed_url, source);
        const feedArticles = filterArticlesToIssueWindow(
          await parseFeed(xml, source),
          issueWindowStart,
        );
        if (!feedArticles.length) continue;

        const knownHashes = new Set<string>();
        for (
          let offset = 0;
          offset < feedArticles.length;
          offset += URL_HASH_LOOKUP_BATCH_SIZE
        ) {
          const hashBatch = feedArticles
            .slice(offset, offset + URL_HASH_LOOKUP_BATCH_SIZE)
            .map((article) => article.urlHash);
          const { data: existingArticles, error: existingArticlesError } =
            await supabase
              .from("articles")
              .select("url_hash")
              .in("url_hash", hashBatch);

          if (existingArticlesError) {
            throw new Error("Could not check previously fetched article URLs.");
          }
          for (const article of existingArticles ?? []) {
            knownHashes.add(article.url_hash);
          }
        }
        const newFeedArticles = feedArticles.filter(
          (article) => !knownHashes.has(article.urlHash),
        );
        duplicateArticles += feedArticles.length - newFeedArticles.length;
        let fullTextRequests = 0;

        for (const article of newFeedArticles) {
          let pageText = "";
          let ogImageUrl = article.ogImageUrl;
          if (
            source.fetch_full_text &&
            article.rssText.length < 2_000 &&
            fullTextRequests < MAX_FULL_TEXT_REQUESTS_PER_SOURCE
          ) {
            fullTextRequests += 1;
            try {
              const page = await fetchArticlePageText(article.url, source);
              pageText = page.text;
              ogImageUrl = page.ogImageUrl ?? ogImageUrl;
            } catch (error) {
              warnings.push({
                source: source.name,
                message: `Article text unavailable; RSS content will be used (${getErrorMessage(error)}).`,
              });
            }
          }

          const content = selectArticleContent(article, pageText);
          if (content.text.length < 100) {
            skippedShortItems += 1;
            shortItemsBySource.set(
              source.name,
              (shortItemsBySource.get(source.name) ?? 0) + 1,
            );
            continue;
          }

          const matchingStory = findMatchingStory(
            article.title,
            storyCandidates,
          );
          const { data, error } = await supabase.rpc("store_ingested_article", {
            p_source_id: source.id,
            p_url: article.url,
            p_url_hash: article.urlHash,
            p_title: article.title,
            p_published_at: article.publishedAt,
            p_content_text: content.text,
            p_content_origin: content.origin,
            p_og_image_url: ogImageUrl,
            p_matching_story_id: matchingStory?.id ?? null,
            p_title_fingerprint: fingerprintTitle(article.title),
          });

          if (error) throw new Error("Could not save an ingested article.");
          const stored = storedArticleResultSchema.parse(data);
          if (!stored.created) {
            duplicateArticles += 1;
            continue;
          }
          if (!stored.story_id) {
            throw new Error("The database did not return a story ID.");
          }

          newArticles += 1;
          storiesToEnrich.add(stored.story_id);
          if (
            matchingStory?.status === "approved" ||
            matchingStory?.status === "ready"
          ) {
            issueStoriesChanged = true;
          }
          if (stored.story_created) {
            newStories += 1;
            storyCandidates.push({
              id: stored.story_id,
              headline: article.title,
              title_fingerprint: fingerprintTitle(article.title),
              first_seen_at: new Date().toISOString(),
              status: "candidate",
            });
          }
        }
      } catch (error) {
        sourceErrors.push({
          source: source.name,
          message: getErrorMessage(error),
        });
      }
    }

    for (const [sourceName, count] of shortItemsBySource) {
      const existingError = sourceErrors.find(
        (sourceError) => sourceError.source === sourceName,
      );
      const message = `${count} recent feed item${count === 1 ? "" : "s"} had too little text to review and were not added to the magazine.`;
      if (existingError) existingError.message += ` ${message}`;
      else sourceErrors.push({ source: sourceName, message });
    }

    if (!sources?.length) {
      sourceErrors.push({
        source: "configuration",
        message: "No active RSS sources are configured.",
      });
    }

    let enrichedStories = 0;
    let generatedImages = 0;
    let aiWarning: string | null = null;
    try {
      const enriched = await enrichPendingStories(supabase);
      enrichedStories = enriched.enrichedStories;
      if (enrichedStories > 0) issueStoriesChanged = true;
      aiWarning = enriched.aiWarning;
      if (aiWarning)
        warnings.push({ source: "AI story writer", message: aiWarning });
    } catch (error) {
      aiWarning = getErrorMessage(error);
      warnings.push({ source: "AI story writer", message: aiWarning });
    }

    try {
      const illustrations = await generateMissingStoryIllustrations(supabase);
      generatedImages = illustrations.generatedImages;
      if (generatedImages > 0) issueStoriesChanged = true;
      if (illustrations.imageWarning) {
        warnings.push({
          source: "AI illustrations",
          message: illustrations.imageWarning,
        });
      }
    } catch (error) {
      warnings.push({
        source: "AI illustrations",
        message: getErrorMessage(error),
      });
    }

    let draft: Awaited<ReturnType<typeof rebuildMagazineDraft>> | null = null;
    let draftNeedsRebuild = issueStoriesChanged;
    if (!draftNeedsRebuild) {
      const { data: currentDraft, error: draftError } = await supabase
        .from("editions")
        .select("id, tex_path, tex_hash")
        .eq("status", "draft")
        .maybeSingle();
      if (draftError) {
        warnings.push({
          source: "Magazine builder",
          message:
            "Could not check whether the current draft needs an initial build.",
        });
        draftNeedsRebuild = true;
      } else {
        draftNeedsRebuild = !currentDraft?.tex_path || !currentDraft?.tex_hash;
      }
    }
    if (draftNeedsRebuild) {
      try {
        draft = await rebuildMagazineDraft();
      } catch (error) {
        warnings.push({
          source: "Magazine builder",
          message: getErrorMessage(error),
        });
      }
    }

    const result = {
      ok: sourceErrors.length === 0 && (!draftNeedsRebuild || draft !== null),
      runId: run.id,
      sourcesProcessed: (sources ?? []).filter(
        (source) =>
          !sourceErrors.some(
            (sourceError) => sourceError.source === source.name,
          ),
      ).length,
      scannedTrustedSourceIds: (sources ?? [])
        .map((source) => source.id)
        .sort(),
      newArticles,
      newStories,
      enrichedStories,
      generatedImages,
      duplicateArticles,
      skippedShortItems,
      storiesQueuedForEnrichment: storiesToEnrich.size,
      aiWarning,
      draft,
      sourceErrors,
      warnings,
    };
    const { error: updateError } = await supabase
      .from("runs")
      .update({
        finished_at: new Date().toISOString(),
        ok: result.ok,
        details: result as unknown as Json,
        new_articles: newArticles,
        new_stories: newStories,
        errors: sourceErrors as unknown as Json,
      })
      .eq("id", run.id);

    if (updateError) throw new Error("Could not finish the ingest run.");
    return result;
  } catch (error) {
    await supabase
      .from("runs")
      .update({
        finished_at: new Date().toISOString(),
        ok: false,
        details: {
          pipeline: "rss-v1",
          fatalError: getErrorMessage(error),
        },
        errors: [
          { source: "ingest", message: getErrorMessage(error) },
        ] as unknown as Json,
      })
      .eq("id", run.id);
    throw error;
  }
}
