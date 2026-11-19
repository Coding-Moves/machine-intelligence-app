create schema if not exists extensions;
create extension if not exists vector with schema extensions;

alter table public.runs
  add column new_articles integer not null default 0 check (new_articles >= 0),
  add column new_stories integer not null default 0 check (new_stories >= 0),
  add column errors jsonb not null default '[]'::jsonb;

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique check (feed_url like 'https://%'),
  homepage text not null check (homepage like 'https://%'),
  region text not null check (region in ('pakistan', 'global')),
  kind text not null check (kind in ('news', 'official_blog', 'research', 'government')),
  trust_weight numeric not null default 1.0 check (trust_weight between 0.5 and 1.5),
  fetch_full_text boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  title_fingerprint text not null,
  summary text,
  key_facts jsonb not null default '[]'::jsonb,
  section text check (section in ('pakistan', 'global', 'research', 'industry')),
  ai_importance integer check (ai_importance between 1 and 10),
  ai_pakistan_relevance integer check (ai_pakistan_relevance between 1 and 10),
  final_score numeric,
  status text not null default 'candidate'
    check (status in ('candidate', 'approved', 'rejected', 'published')),
  reject_reason text,
  first_seen_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  needs_reprocess boolean not null default true,
  edition_id uuid references public.editions(id) on delete set null,
  verification jsonb,
  embedding extensions.vector(768)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  url text not null unique,
  url_hash text not null unique check (url_hash ~ '^[0-9a-f]{64}$'),
  title text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  content_text text not null default '',
  content_origin text not null default 'rss'
    check (content_origin in ('rss', 'article_page', 'rss_fallback')),
  og_image_url text,
  story_id uuid references public.stories(id) on delete set null
);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete set null,
  storage_path text not null unique,
  credit text not null,
  license text not null check (
    license in ('press_kit', 'wikimedia_cc', 'own', 'source_og_needs_review')
  ),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index articles_source_published_idx
  on public.articles (source_id, published_at desc);
create index articles_story_idx on public.articles (story_id);
create index stories_status_first_seen_idx
  on public.stories (status, first_seen_at desc);
create index stories_fingerprint_idx on public.stories (title_fingerprint);
create index stories_embedding_hnsw_idx
  on public.stories using hnsw (embedding extensions.vector_cosine_ops);

create unique index editions_single_draft_idx
  on public.editions ((status)) where status = 'draft';

insert into public.editions (slug, title, status)
select 'current-draft', 'Living Draft', 'draft'
where not exists (
  select 1 from public.editions where status = 'draft'
)
on conflict (slug) do update
set title = excluded.title,
    status = excluded.status;

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.stories enable row level security;
alter table public.images enable row level security;

create policy "Editors can read sources"
  on public.sources for select
  to authenticated
  using (public.is_editor());
create policy "Editors can add sources"
  on public.sources for insert
  to authenticated
  with check (public.is_editor());
create policy "Editors can update sources"
  on public.sources for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());
create policy "Editors can remove sources"
  on public.sources for delete
  to authenticated
  using (public.is_editor());

create policy "Editors can read articles"
  on public.articles for select
  to authenticated
  using (public.is_editor());
create policy "Editors can add articles"
  on public.articles for insert
  to authenticated
  with check (public.is_editor());
create policy "Editors can update articles"
  on public.articles for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());
create policy "Editors can remove articles"
  on public.articles for delete
  to authenticated
  using (public.is_editor());

create policy "Editors can read stories"
  on public.stories for select
  to authenticated
  using (public.is_editor());
create policy "Editors can add stories"
  on public.stories for insert
  to authenticated
  with check (public.is_editor());
create policy "Editors can update stories"
  on public.stories for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());
create policy "Editors can remove stories"
  on public.stories for delete
  to authenticated
  using (public.is_editor());

create policy "Editors can read images"
  on public.images for select
  to authenticated
  using (public.is_editor());
create policy "Editors can add images"
  on public.images for insert
  to authenticated
  with check (public.is_editor());
create policy "Editors can update images"
  on public.images for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());
create policy "Editors can remove images"
  on public.images for delete
  to authenticated
  using (public.is_editor());

grant select, insert, update, delete on public.sources to authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant select, insert, update, delete on public.stories to authenticated;
grant select, insert, update, delete on public.images to authenticated;

create function public.store_ingested_article(
  p_source_id uuid,
  p_url text,
  p_url_hash text,
  p_title text,
  p_published_at timestamptz,
  p_content_text text,
  p_content_origin text,
  p_og_image_url text,
  p_matching_story_id uuid,
  p_title_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article_id uuid;
  v_story_id uuid;
  v_story_created boolean := false;
begin
  insert into public.articles (
    source_id,
    url,
    url_hash,
    title,
    published_at,
    content_text,
    content_origin,
    og_image_url
  ) values (
    p_source_id,
    p_url,
    p_url_hash,
    p_title,
    p_published_at,
    p_content_text,
    p_content_origin,
    p_og_image_url
  )
  on conflict do nothing
  returning id into v_article_id;

  if v_article_id is null then
    select a.id, a.story_id
      into v_article_id, v_story_id
      from public.articles as a
      where a.url_hash = p_url_hash or a.url = p_url
      limit 1;

    if v_article_id is null then
      raise exception 'Conflicting article URL could not be found';
    end if;

    return jsonb_build_object(
      'article_id', v_article_id,
      'story_id', v_story_id,
      'created', false,
      'story_created', false
    );
  end if;

  if p_matching_story_id is not null then
    update public.stories as s
      set needs_reprocess = true,
          last_updated_at = now()
      where s.id = p_matching_story_id
        and s.status <> 'published'
        and s.first_seen_at >= now() - interval '5 days'
      returning s.id into v_story_id;
  end if;

  if v_story_id is null then
    insert into public.stories (
      headline,
      title_fingerprint,
      first_seen_at,
      last_updated_at,
      needs_reprocess
    ) values (
      p_title,
      p_title_fingerprint,
      now(),
      now(),
      true
    )
    returning id into v_story_id;
    v_story_created := true;
  end if;

  update public.articles
    set story_id = v_story_id
    where id = v_article_id;

  return jsonb_build_object(
    'article_id', v_article_id,
    'story_id', v_story_id,
    'created', true,
    'story_created', v_story_created
  );
end;
$$;

revoke all on function public.store_ingested_article(
  uuid, text, text, text, timestamptz, text, text, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.store_ingested_article(
  uuid, text, text, text, timestamptz, text, text, text, uuid, text
) to service_role;

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
