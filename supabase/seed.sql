insert into public.editors (email, name, role)
values ('admin@example.com', 'Replace with the admin name', 'admin')
on conflict (email) do nothing;

insert into public.sources (name, feed_url, homepage, region, kind, fetch_full_text)
values
  (
    'Dawn',
    'https://www.dawn.com/feeds/home',
    'https://www.dawn.com/',
    'pakistan',
    'news',
    true
  ),
  (
    'OpenAI News',
    'https://openai.com/news/rss.xml',
    'https://openai.com/',
    'global',
    'official_blog',
    true
  ),
  (
    'arXiv cs.AI',
    'https://export.arxiv.org/rss/cs.AI',
    'https://arxiv.org/',
    'global',
    'research',
    false
  ),
  (
    'arXiv cs.CL',
    'https://export.arxiv.org/rss/cs.CL',
    'https://arxiv.org/',
    'global',
    'research',
    false
  )
on conflict (feed_url) do nothing;
