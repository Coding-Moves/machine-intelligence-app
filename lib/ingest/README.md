# Ingestion

The scheduled route fetches active RSS sources, checks publisher domains and
robots rules, extracts available article text, normalizes URLs, and stores
articles with candidate stories in Supabase. It groups close titles
deterministically. When `GEMINI_API_KEY` is configured, it prepares summaries,
sections, scores, key facts, and a numeric claim warning for pending candidates.
Embedding-based clustering remains future work. See
[the ingest notes](../../docs/INGEST.md) for the feed allowlist and publisher
checks.
