-- Only sources reviewed by the publication team may enter the AI pipeline.
alter table public.sources
  add column trusted boolean not null default false;

update public.sources
set trusted = true
where feed_url in (
  'https://www.dawn.com/feeds/home',
  'https://openai.com/news/rss.xml',
  'https://export.arxiv.org/rss/cs.AI',
  'https://export.arxiv.org/rss/cs.CL'
);

create index sources_trusted_active_idx
  on public.sources (name)
  where trusted and active;

-- Keep source approval and AI verdicts server-owned. The editor UI writes
-- through authenticated server actions, which validate each change.
drop policy if exists "Editors can add sources" on public.sources;
drop policy if exists "Editors can update sources" on public.sources;
drop policy if exists "Editors can remove sources" on public.sources;
drop policy if exists "Editors can add articles" on public.articles;
drop policy if exists "Editors can update articles" on public.articles;
drop policy if exists "Editors can remove articles" on public.articles;
drop policy if exists "Editors can add stories" on public.stories;
drop policy if exists "Editors can update stories" on public.stories;
drop policy if exists "Editors can remove stories" on public.stories;
drop policy if exists "Editors can add editions" on public.editions;
drop policy if exists "Editors can update editions" on public.editions;
drop policy if exists "Editors can remove editions" on public.editions;

revoke insert, update, delete on public.sources from authenticated;
revoke insert, update, delete on public.articles from authenticated;
revoke insert, update, delete on public.stories from authenticated;
revoke insert, update, delete on public.editions from authenticated;
