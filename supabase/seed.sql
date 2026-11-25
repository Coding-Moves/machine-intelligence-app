insert into public.editors (email, name, role)
values ('admin@example.com', 'Replace with the admin name', 'admin')
on conflict (email) do nothing;

insert into public.sources (name, feed_url, homepage, region, kind, fetch_full_text, trusted)
values
  (
    'Dawn',
    'https://www.dawn.com/feeds/home',
    'https://www.dawn.com/',
    'pakistan',
    'news',
    true,
    true
  ),
  (
    'OpenAI News',
    'https://openai.com/news/rss.xml',
    'https://openai.com/',
    'global',
    'official_blog',
    true,
    true
  ),
  (
    'arXiv cs.AI',
    'https://rss.arxiv.org/rss/cs.AI',
    'https://arxiv.org/',
    'global',
    'research',
    false,
    true
  ),
  (
    'arXiv cs.CL',
    'https://rss.arxiv.org/rss/cs.CL',
    'https://arxiv.org/',
    'global',
    'research',
    false,
    true
  )
on conflict (feed_url) do nothing;
