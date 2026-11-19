import Parser from "rss-parser";
import { createHash } from "node:crypto";
import { parseHTML } from "linkedom";
import type { SourceKind, SourceRegion } from "@/lib/supabase/types";

export const INGEST_USER_AGENT =
  "MachineIntelligenceMagazine/0.1 (+https://github.com/Coding-Moves/machine-intelligence-app)";
export const MAX_ITEMS_PER_SOURCE = 10;
export const MAX_ARTICLE_TEXT_LENGTH = 30_000;
export const RECENT_ARTICLE_WINDOW_DAYS = 30;

export interface IngestSource {
  id: string;
  name: string;
  feed_url: string;
  homepage: string;
  region: SourceRegion;
  kind: SourceKind;
  fetch_full_text: boolean;
}

interface CustomRssItem {
  contentEncoded?: string;
}

export interface FeedArticle {
  title: string;
  url: string;
  urlHash: string;
  publishedAt: string | null;
  rssText: string;
  ogImageUrl: string | null;
}

const rssParser = new Parser<Record<string, unknown>, CustomRssItem>({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
  timeout: 10_000,
  headers: { "User-Agent": INGEST_USER_AGENT },
});

export function normalizeSourceDomain(homepage: string) {
  const hostname = new URL(homepage).hostname
    .toLowerCase()
    .replace(/^www\./, "");
  return hostname;
}

export function isAllowedSourceUrl(url: string, homepage: string) {
  let hostname: string;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return false;
    }
    hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }

  const sourceDomain = normalizeSourceDomain(homepage);
  return hostname === sourceDomain || hostname.endsWith(`.${sourceDomain}`);
}

export function normalizeArticleUrl(value: string, homepage: string) {
  if (!isAllowedSourceUrl(value, homepage)) return null;

  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return url.toString();
}

export function cleanHtmlText(value: string) {
  const { document } = parseHTML(`<html><body>${value}</body></html>`);
  document
    .querySelectorAll("script, style, noscript, iframe, svg, form")
    .forEach((node) => node.remove());

  return (document.body?.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\t\r\f]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim()
    .slice(0, MAX_ARTICLE_TEXT_LENGTH);
}

export async function parseFeed(xml: string, source: IngestSource) {
  const feed = await rssParser.parseString(xml);
  const cutoff = Date.now() - RECENT_ARTICLE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const articles: FeedArticle[] = [];

  for (const item of feed.items) {
    if (articles.length >= MAX_ITEMS_PER_SOURCE) break;
    const title = item.title?.replace(/\s+/g, " ").trim().slice(0, 500);
    const candidateUrl = item.link?.trim();
    if (!title || !candidateUrl) continue;

    const url = normalizeArticleUrl(candidateUrl, source.homepage);
    if (!url) continue;

    const publishedValue = item.isoDate ?? item.pubDate;
    const parsedDate = publishedValue ? new Date(publishedValue) : null;
    const publishedAt =
      parsedDate && Number.isFinite(parsedDate.getTime())
        ? parsedDate.toISOString()
        : null;
    if (publishedAt && new Date(publishedAt).getTime() < cutoff) continue;

    const rssHtml =
      item.contentEncoded ??
      item.content ??
      item.summary ??
      item.contentSnippet ??
      "";
    const rssText = cleanHtmlText(rssHtml);
    const imageUrl = item.enclosure?.url;
    const ogImageUrl =
      imageUrl && /^https:\/\//i.test(imageUrl)
        ? imageUrl.slice(0, 2048)
        : null;

    articles.push({
      title,
      url,
      urlHash: createHash("sha256").update(url).digest("hex"),
      publishedAt,
      rssText,
      ogImageUrl,
    });
  }

  return articles;
}
