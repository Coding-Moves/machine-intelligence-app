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

The official [arXiv RSS documentation](https://github.com/arXiv/arxiv-docs/blob/develop/source/help/rss.md)
specifies the `rss.arxiv.org` feed host. We verified the two category feeds
returned HTTP 200 on 22 November 2026 after the old export host rejected
scheduled requests:

| Source      | Feed                              | Article text behavior                                                          |
| ----------- | --------------------------------- | ------------------------------------------------------------------------------ |
| Dawn        | <https://www.dawn.com/feeds/home> | Uses the article text included in the feed.                                    |
| OpenAI News | <https://openai.com/news/rss.xml> | Uses feed text, then tries the article page when the feed only has an excerpt. |
| arXiv cs.AI | <https://rss.arxiv.org/rss/cs.AI> | Uses the abstract in the feed; article-page fetching is disabled.              |
| arXiv cs.CL | <https://rss.arxiv.org/rss/cs.CL> | Uses the abstract in the feed; article-page fetching is disabled.              |

These four feeds form the initial trusted-source allowlist. New feed rows are
excluded until an admin explicitly marks them trusted. The arXiv feeds share one
host. The fetcher waits at least three seconds between arXiv requests, including
the `robots.txt` check, and respects any longer delay published by the host.

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
not about AI. Each story also gets a plain-language editorial assessment that
states why it matters, what the available evidence supports, and any important
limits.

The priority score combines AI news value (35%), Pakistan relevance (25%),
trusted-source coverage (20%), and freshness (20%), then adjusts it by the
average trust weight of its sources. The editor desk shows these four values and
the calculation. It is a sorting aid, not a fact-check or an approval decision.
A code check flags numbers in the summary or key facts that do not appear in the
trusted source text. This catches unsupported numeric claims; it does not prove
every sentence, so an editor must still read the source links and approve or
reject each AI story. RSS excerpts with at least 100 characters are used as
fallbacks when page extraction is unavailable. Shorter items are reported as
incomplete source coverage, retried by a later scheduled run, and keep
publishing locked until Gemini has enough text to review them.

For eligible AI stories, Gemini creates up to two original editorial
illustrations per ingest run, starting with the highest-scoring stories that do
not already have a publication-owned illustration. The illustration is stored
in the private `drafts` bucket and appears in the editor's Images page as
pending review. Only an editor-approved illustration enters the LaTeX issue;
the PDF workflow downloads it through a short-lived signed URL and checks its
file type and size. Generated art is labeled as an illustration, not as a real
news photograph. The app does not copy a publisher's Open Graph image because a
trusted news source does not by itself grant image reuse rights. Failed image
generation stays queued for a later ingest run.

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
