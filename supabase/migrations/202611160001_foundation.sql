create schema if not exists extensions;
create extension if not exists vector with schema extensions;

create table if not exists public.editors (
  email text primary key check (email = lower(email)),
  name text not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.editions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  window_start timestamptz,
  layout jsonb not null default '{}'::jsonb,
  tex_path text,
  pdf_path text,
  cover_path text,
  in_this_issue text[] not null default '{}'::text[],
  editor_note text,
  editor_note_approved boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  details jsonb not null default '{}'::jsonb
);

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.editors
    where lower(email) = lower((select auth.jwt() ->> 'email'))
  );
$$;

alter table public.editors enable row level security;
alter table public.editions enable row level security;
alter table public.runs enable row level security;

create policy "Editors can read the editor list"
  on public.editors for select
  to authenticated
  using (public.is_editor());

create policy "Public can read published editions"
  on public.editions for select
  to anon
  using (status = 'published');

create policy "Editors can read all editions"
  on public.editions for select
  to authenticated
  using (public.is_editor());

create policy "Editors can add editions"
  on public.editions for insert
  to authenticated
  with check (public.is_editor());

create policy "Editors can update editions"
  on public.editions for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

create policy "Editors can remove editions"
  on public.editions for delete
  to authenticated
  using (public.is_editor());

create policy "Editors can read run history"
  on public.runs for select
  to authenticated
  using (public.is_editor());

insert into storage.buckets (id, name, public)
values
  ('issues', 'issues', true),
  ('drafts', 'drafts', false)
on conflict (id) do update
set public = excluded.public;

create policy "Editors can upload issue files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'issues'
    and public.is_editor()
  );

create policy "Editors can update issue files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'issues'
    and public.is_editor()
  )
  with check (
    bucket_id = 'issues'
    and public.is_editor()
  );

create policy "Editors can remove issue files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'issues'
    and public.is_editor()
  );

create policy "Editors can read draft files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'drafts'
    and public.is_editor()
  );

create policy "Editors can upload draft files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'drafts'
    and public.is_editor()
  );

create policy "Editors can update draft files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'drafts'
    and public.is_editor()
  )
  with check (
    bucket_id = 'drafts'
    and public.is_editor()
  );

create policy "Editors can remove draft files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'drafts'
    and public.is_editor()
  );

revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

grant select on public.editors to authenticated;
grant select, insert, update, delete on public.editions to authenticated;
grant select on public.editions to anon;
grant select on public.runs to authenticated;
