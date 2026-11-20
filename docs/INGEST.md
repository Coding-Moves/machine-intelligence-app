# RSS ingestion

The scheduled ingest route reads active, explicitly trusted sources from Supabase, accepts only HTTPS
article links on each source's own domain, and keeps article text private in the
editor database. It checks every valid item returned by each feed within the
30-day recent window, then keeps only items published since the current issue
window began. Newly seen items without a feed date are kept for review. It uses
the text supplied by a feed first. When a source allows
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

These four feeds form the initial trusted-source allowlist. New feed rows are
excluded until an admin explicitly marks them trusted. The arXiv feeds share one
host. The fetcher obeys their published crawl delay,
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
days. Gemini writes source-grounded summaries, links key facts to the evidence
article, assigns an AI section and relevance scores, and marks stories that are
not about AI. A code check flags numbers in the summary or key facts that do not
appear in the trusted source text. This catches unsupported numeric claims; it
does not prove every sentence, so an editor must still read the source links and
approve or reject each AI story. RSS excerpts with at least 100 characters are
used as fallbacks when page extraction is unavailable. Shorter items are
reported as incomplete source coverage, retried by a later scheduled run, and
keep publishing locked until Gemini has enough text to review them.

Gemini checks up to six pending stories per run. The twice-daily schedule can
leave a queue when feeds are especially busy; the publish checklist blocks the
issue until every pending AI check and editor decision is complete. A successful
full pass across all trusted feeds is also required in each issue cycle. The
latest ingest attempt in the cycle must succeed; a newer partial or failed pass
keeps publishing locked until the feeds are checked successfully again.

GitHub Actions runs at 03:00 and 15:00 UTC (08:00 and 20:00 Pakistan time). It
calls the route with `APP_URL` and `CRON_SECRET`; the route uses the server-side
Supabase service-role key. Each run records counts, source errors, and extraction
warnings in `public.runs`. After each scheduled ingest attempt, another workflow
downloads the current private TeX source with a short-lived signed URL, compiles
the magazine, uploads the PDF to private draft storage, and records the result.
