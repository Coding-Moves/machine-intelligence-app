import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Readability } from "@mozilla/readability";
import ipaddr from "ipaddr.js";
import { parseHTML } from "linkedom";
import robotsParser from "robots-parser";
import { INGEST_USER_AGENT, MAX_ARTICLE_TEXT_LENGTH } from "@/lib/ingest/rss";
import { normalizeSourceDomain } from "@/lib/ingest/rss";

const MAX_XML_BYTES = 2_000_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_ROBOTS_BYTES = 128_000;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 3;

interface PublisherSource {
  homepage: string;
}

interface FetchedDocument {
  text: string;
  finalUrl: string;
}

interface ArticlePageResult {
  text: string;
  ogImageUrl: string | null;
}

const robotsRules = new Map<
  string,
  Promise<ReturnType<typeof robotsParser> | null>
>();
const lastRequestByHost = new Map<string, number>();

function isArxivHost(hostname: string) {
  return hostname === "arxiv.org" || hostname.endsWith(".arxiv.org");
}

function assertHttpsUrl(value: string, sourceDomain: string) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    (hostname !== sourceDomain && !hostname.endsWith(`.${sourceDomain}`)) ||
    hostname.endsWith(".localhost") ||
    hostname === "localhost" ||
    isIP(hostname)
  ) {
    throw new Error(
      "The requested URL is outside the source's public HTTPS domain.",
    );
  }
  return url;
}

async function assertPublicDns(hostname: string) {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length)
    throw new Error("The source hostname has no DNS address.");

  for (const { address } of addresses) {
    let range: string;
    try {
      range = ipaddr.parse(address).range();
    } catch {
      throw new Error("The source hostname resolved to an invalid IP address.");
    }
    if (range !== "unicast") {
      throw new Error(
        "The source hostname resolved to a non-public IP address.",
      );
    }
  }
}

async function readLimitedBody(response: Response, maxBytes: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("The publisher response exceeded the size limit.");
    }
    chunks.push(value);
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
  );
}

async function requestText(
  value: string,
  sourceDomain: string,
  maxBytes: number,
  acceptedContentType: RegExp,
) {
  let url = assertHttpsUrl(value, sourceDomain);

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    await assertPublicDns(url.hostname);

    const response = await fetch(url, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.1",
        "User-Agent": INGEST_USER_AGENT,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error(
          "The publisher response has too many or invalid redirects.",
        );
      }
      const redirectedUrl = assertHttpsUrl(
        new URL(location, url).toString(),
        sourceDomain,
      );
      if (redirectedUrl.origin !== url.origin) {
        throw new Error("Cross-origin publisher redirects are not allowed.");
      }
      url = redirectedUrl;
      continue;
    }

    if (!response.ok) {
      throw new Error(`The publisher returned HTTP ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !acceptedContentType.test(contentType)) {
      throw new Error("The publisher returned an unexpected content type.");
    }

    return {
      text: await readLimitedBody(response, maxBytes),
      finalUrl: url.toString(),
    } satisfies FetchedDocument;
  }

  throw new Error("The publisher response has too many redirects.");
}

async function getRobots(origin: string) {
  const cached = robotsRules.get(origin);
  if (cached) return cached;

  const pending = (async () => {
    const robotsUrl = new URL("/robots.txt", origin).toString();
    const sourceDomain = normalizeSourceDomain(origin);
    const hostname = new URL(origin).hostname;
    try {
      // arXiv asks clients to make no more than one request every three
      // seconds. Count its robots.txt request as part of that limit too.
      if (isArxivHost(hostname)) {
        await waitForCrawlDelay(hostname, 3);
      }
      const result = await requestText(
        robotsUrl,
        sourceDomain,
        MAX_ROBOTS_BYTES,
        /text\/plain|text\/html|application\/octet-stream/i,
      );
      return robotsParser(robotsUrl, result.text);
    } catch (error) {
      if (error instanceof Error && error.message.includes("HTTP 404"))
        return null;
      throw new Error("Could not safely read the publisher's robots.txt.");
    }
  })();

  robotsRules.set(origin, pending);
  void pending.catch(() => robotsRules.delete(origin));
  return pending;
}

async function waitForCrawlDelay(
  hostname: string,
  delaySeconds: number | undefined,
) {
  const delayMs = Math.min(Math.max(delaySeconds ?? 0, 0), 30) * 1000;
  const previousRequestAt = lastRequestByHost.get(hostname);
  if (previousRequestAt !== undefined && delayMs > 0) {
    const remaining = previousRequestAt + delayMs - Date.now();
    if (remaining > 0)
      await new Promise((resolve) => setTimeout(resolve, remaining));
  }
  lastRequestByHost.set(hostname, Date.now());
}

async function fetchRobotsAllowedText(
  value: string,
  source: PublisherSource,
  maxBytes: number,
  contentType: RegExp,
) {
  const sourceDomain = normalizeSourceDomain(source.homepage);
  const url = assertHttpsUrl(value, sourceDomain);
  const rules = await getRobots(url.origin);
  if (rules?.isAllowed(url.toString(), INGEST_USER_AGENT) === false) {
    throw new Error("The publisher's robots.txt disallows this request.");
  }
  await waitForCrawlDelay(
    url.hostname,
    Math.max(
      rules?.getCrawlDelay(INGEST_USER_AGENT) ?? 0,
      isArxivHost(url.hostname) ? 3 : 0,
    ),
  );
  return requestText(url.toString(), sourceDomain, maxBytes, contentType);
}

export async function fetchRssDocument(value: string, source: PublisherSource) {
  const result = await fetchRobotsAllowedText(
    value,
    source,
    MAX_XML_BYTES,
    /xml|rss|atom|text\/plain/i,
  );
  return result.text;
}

export async function fetchArticlePageText(
  value: string,
  source: PublisherSource,
): Promise<ArticlePageResult> {
  const result = await fetchRobotsAllowedText(
    value,
    source,
    MAX_HTML_BYTES,
    /text\/html|application\/xhtml\+xml/i,
  );
  const { document } = parseHTML(result.text);
  const ogImage = document
    .querySelector('meta[property="og:image"]')
    ?.getAttribute("content");
  const imageUrl = ogImage ? new URL(ogImage, result.finalUrl) : null;
  const ogImageUrl =
    imageUrl?.protocol === "https:" ? imageUrl.toString().slice(0, 2048) : null;

  const article = new Readability(document as unknown as Document, {
    charThreshold: 250,
    disableJSONLD: true,
  }).parse();
  const text = (article?.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\t\r\f]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim()
    .slice(0, MAX_ARTICLE_TEXT_LENGTH);

  return { text, ogImageUrl };
}
