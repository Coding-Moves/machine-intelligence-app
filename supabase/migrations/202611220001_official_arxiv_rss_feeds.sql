-- Use arXiv's supported RSS host. Keep the existing trusted source rows so
-- their article history and trust settings stay attached to the same IDs.
update public.sources
set feed_url = 'https://rss.arxiv.org/rss/cs.AI'
where feed_url = 'https://export.arxiv.org/rss/cs.AI';

update public.sources
set feed_url = 'https://rss.arxiv.org/rss/cs.CL'
where feed_url = 'https://export.arxiv.org/rss/cs.CL';
