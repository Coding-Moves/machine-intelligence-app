# RSS ingestion

The scheduled ingest route reads active sources from Supabase, accepts only HTTPS
article links on each source's own domain, and keeps article text private in the
editor database. It uses the text supplied by a feed first. When a source allows
page extraction and the feed only has a short excerpt, it checks `robots.txt`
before using Mozilla Readability. Requests have DNS/IP checks, same-origin
redirects, response-size limits, timeouts, and the publisher's crawl delay.

## Seed feeds

These feeds were checked on 18 November 2026. Each returned parseable RSS with
recent entries:

| Source      | Feed                                 | Article text behavior                                                          |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Dawn        | <https://www.dawn.com/feeds/home>    | Uses the article text included in the feed.                                    |
| OpenAI News | <https://openai.com/news/rss.xml>    | Uses feed text, then tries the article page when the feed only has an excerpt. |
| arXiv cs.AI | <https://export.arxiv.org/rss/cs.AI> | Uses the abstract in the feed; article-page fetching is disabled.              |
| arXiv cs.CL | <https://export.arxiv.org/rss/cs.CL> | Uses the abstract in the feed; article-page fetching is disabled.              |

The arXiv feeds share one host. The fetcher obeys their published crawl delay,
so a run pauses between those feed requests.

## Feeds left out

- Google News Pakistan AI RSS returned XML, but its entries link to different
  publishers. Those publisher domains are not in the source allowlist, so the
  feed is not seeded.
- TechCrunch's general feed works, but it supplies short excerpts. Its [RSS
  terms](https://techcrunch.com/rss-terms-of-use/) limit use to the content in
  the feed with attribution and a link to TechCrunch. It is not seeded for the
  full-text pipeline.
- ScienceDaily's AI feed works, but its [RSS terms](https://www.sciencedaily.com/terms.htm)
  require using feed content as supplied and do not permit publishing full
  story text. It is not seeded for the text processing pipeline.
- The tested Anthropic RSS URL returned 404 and the Microsoft AI feed returned 410. The tested DeepMind, NVIDIA, ProPakistani, TechJuice, Express Tribune,
  and APP URLs timed out from the development environment; those timeouts do
  not establish whether the feeds are unavailable, so they are not seeded.

## Deduplication and grouping

URLs are normalized by removing fragments and common tracking parameters, then
hashed with SHA-256. A unique database constraint prevents repeat imports. The
database function inserts the article and its story link in one transaction.

The ingest route groups stories by a conservative title-token match within five
days. If `GEMINI_API_KEY` is configured, it summarizes and scores up to 12
pending candidate stories per run. The numeric claim check flags numbers in the
summary or key facts that do not appear in the collected source text; it does
not replace an editor's source review. Without the key, stories remain available
for manual editing and review. Short RSS excerpts are retained as fallbacks
when a publisher does not permit page extraction.

The GitHub Actions workflow runs at 01:00, 08:00, and 15:00 UTC. It calls the
route with `APP_URL` and `CRON_SECRET`; the route uses the server-side Supabase
service-role key. Each run records counts, source errors, and extraction
warnings in `public.runs`.
