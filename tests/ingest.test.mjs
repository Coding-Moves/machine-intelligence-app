import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedSourceUrl,
  normalizeArticleUrl,
  parseFeed,
} from "../lib/ingest/rss.ts";
import { findMatchingStory, fingerprintTitle } from "../lib/ingest/cluster.ts";

const source = {
  id: "source-1",
  name: "Example News",
  feed_url: "https://news.example.test/feed.xml",
  homepage: "https://www.example.test/",
  region: "global",
  kind: "news",
  fetch_full_text: false,
};

test("article URLs stay on the source domain and lose tracking fragments", () => {
  assert.equal(
    normalizeArticleUrl(
      "https://news.example.test/story/1?utm_source=feed#top",
      source.homepage,
    ),
    "https://news.example.test/story/1",
  );
  assert.equal(
    isAllowedSourceUrl("http://news.example.test/story/1", source.homepage),
    false,
  );
  assert.equal(
    isAllowedSourceUrl("https://attacker.test/story/1", source.homepage),
    false,
  );
});

test("RSS parsing strips markup, rejects off-domain links, and skips old entries", async () => {
  const xml = `<?xml version="1.0"?>
    <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
      <channel><title>Example</title>
        <item>
          <title>New AI research update</title>
          <link>https://news.example.test/story/1?utm_source=feed#top</link>
          <pubDate>${new Date().toUTCString()}</pubDate>
          <content:encoded><![CDATA[<p>Researchers released an important AI update.</p><script>bad()</script>]]></content:encoded>
        </item>
        <item>
          <title>Outside source</title>
          <link>https://other.test/story/2</link>
          <description>Should not enter the source allowlist.</description>
        </item>
        <item>
          <title>Old item</title>
          <link>https://news.example.test/story/old</link>
          <pubDate>Mon, 01 Jan 2001 00:00:00 GMT</pubDate>
          <description>Old story.</description>
        </item>
      </channel>
    </rss>`;

  const articles = await parseFeed(xml, source);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].url, "https://news.example.test/story/1");
  assert.equal(
    articles[0].rssText,
    "Researchers released an important AI update.",
  );
  assert.equal(articles[0].rssText.includes("bad()"), false);
  assert.equal(articles[0].urlHash.length, 64);
});

test("title grouping matches close recent headlines but excludes old or published stories", () => {
  const now = Date.now();
  const candidates = [
    {
      id: "recent",
      headline: "OpenAI launches new reasoning model for science teams",
      title_fingerprint: fingerprintTitle(
        "OpenAI launches new reasoning model for science teams",
      ),
      first_seen_at: new Date(now - 60_000).toISOString(),
      status: "candidate",
    },
    {
      id: "published",
      headline: "OpenAI launches new reasoning model for science teams",
      title_fingerprint: fingerprintTitle(
        "OpenAI launches new reasoning model for science teams",
      ),
      first_seen_at: new Date(now - 60_000).toISOString(),
      status: "published",
    },
    {
      id: "old",
      headline: "OpenAI launches new reasoning model for science teams",
      title_fingerprint: fingerprintTitle(
        "OpenAI launches new reasoning model for science teams",
      ),
      first_seen_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      status: "candidate",
    },
  ];

  assert.equal(
    findMatchingStory(
      "OpenAI launches a new reasoning model for science teams today",
      candidates,
      now,
    )?.id,
    "recent",
  );
  assert.equal(findMatchingStory("AI news", candidates, now), null);
});
