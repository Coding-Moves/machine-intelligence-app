alter table public.stories
  drop constraint if exists stories_status_check;

alter table public.stories
  add constraint stories_status_check
  check (status in ('candidate', 'ready', 'approved', 'rejected', 'published'));

alter table public.editions
  add column if not exists publish_not_before timestamptz;

-- Do not treat an old editor approval as the new automatic quality screen.
-- Promote only stories whose stored AI, numeric, and trusted-source checks pass.
update public.stories as story
  set status = 'ready'
  where story.status = 'approved'
    and story.needs_reprocess is false
    and story.is_ai_related is true
    and length(trim(coalesce(story.summary, ''))) > 0
    and story.section in ('pakistan', 'global', 'research', 'industry')
    and coalesce(story.verification ->> 'failed', 'true') = 'false'
    and exists (
      select 1
        from public.articles as article
        join public.sources as source on source.id = article.source_id
        where article.story_id = story.id
          and source.trusted is true
    );

-- Re-screen remaining legacy approvals that can appear in the current issue.
-- Stories older than the rolling 30-day window cannot enter a future draft.
update public.stories as story
  set status = 'candidate',
      needs_reprocess = true,
      verification = null,
      reject_reason = null
  where story.status = 'approved'
    and story.first_seen_at >= now() - interval '30 days';

-- Automatically prepare old, completed AI candidates that have the required
-- trusted evidence. Unchecked or unsafe stories stay out of the issue.
update public.stories as story
  set status = 'ready'
  where story.status = 'candidate'
    and story.needs_reprocess is false
    and story.is_ai_related is true
    and story.summary is not null
    and story.section is not null
    and coalesce(story.verification ->> 'failed', 'true') = 'false'
    and exists (
      select 1
        from public.articles as article
        join public.sources as source on source.id = article.source_id
        where article.story_id = story.id
          and source.trusted is true
    );

update public.stories as story
  set status = 'rejected',
      reject_reason = case
        when story.is_ai_related is false then
          'Outside publication scope: not centrally about AI, computer science, data science, or a related computing field.'
        when coalesce(story.verification ->> 'failed', 'true') = 'true' then
          'The earlier automatic numeric check found unsupported claims. New trusted evidence can trigger another check.'
        else
          'The earlier story does not meet the automatic scope, source, or completeness checks. New trusted evidence can trigger another check.'
      end
  where story.status = 'candidate'
    and story.needs_reprocess is false
    and (
      story.is_ai_related is false
      or story.is_ai_related is true
      or story.verification ->> 'failed' = 'true'
    );

update public.stories
  set needs_reprocess = true
  where status = 'candidate'
    and needs_reprocess is false
    and is_ai_related is null;

drop index if exists public.stories_ai_approved_section_score_idx;
create index stories_ai_ready_section_score_idx
  on public.stories (section, final_score desc)
  where status in ('ready', 'approved') and is_ai_related is true;

-- The automatic illustration is publication-owned art, not a news photo.
-- Existing generated illustrations can therefore enter the draft directly.
update public.images
  set approved = true
  where license = 'own'
    and credit = 'AI-generated illustration (Google Gemini)'
    and approved is false;

update public.editions
  set window_start = now() - interval '30 days'
  where status = 'draft';

create or replace function public.invalidate_draft_after_story_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' and new.status not in ('ready', 'approved') then
    return new;
  end if;

  if TG_OP = 'UPDATE'
     and old.status not in ('ready', 'approved')
     and new.status not in ('ready', 'approved') then
    return new;
  end if;

  -- Keep the just-published issue's artifacts intact during its transaction.
  if new.status = 'published' and new.edition_id is not null then
    return new;
  end if;

  update public.editions as edition
    set draft_revision = edition.draft_revision + 1,
        tex_path = null,
        tex_hash = null,
        pdf_path = null,
        pdf_tex_hash = null
    where edition.status = 'draft';

  return new;
end;
$$;

revoke all on function public.invalidate_draft_after_story_change()
  from public, anon, authenticated;

create or replace function public.publish_draft_edition(p_edition_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edition public.editions%rowtype;
  v_plan_items jsonb;
  v_story_ids uuid[];
  v_issue_start timestamptz;
  v_ready_count integer;
  v_updated_count integer;
  v_published_slug text;
  v_next_draft_id uuid;
  v_latest_ingest_ok boolean;
  v_scanned_source_ids jsonb;
  v_current_source_ids jsonb;
begin
  select *
    into v_edition
    from public.editions
    where id = p_edition_id
      and status = 'draft'
    for update;

  if not found then
    raise exception 'This issue is no longer the current draft.';
  end if;

  if coalesce(
       v_edition.publish_not_before,
       v_edition.created_at + interval '7 days'
     ) > now() then
    raise exception 'The issue must remain in draft for at least 7 days.';
  end if;

  if v_edition.editor_note_approved is distinct from true
     or length(trim(coalesce(v_edition.editor_note, ''))) < 40 then
    raise exception 'An editor must review and approve the editor note.';
  end if;

  if v_edition.pdf_path is distinct from (
       v_edition.id::text || '/' || v_edition.tex_hash || '.pdf'
     )
     or v_edition.tex_hash is null
     or v_edition.pdf_tex_hash is distinct from v_edition.tex_hash
     or not exists (
       select 1
         from storage.objects as storage_object
         where storage_object.bucket_id = 'drafts'
           and storage_object.name = v_edition.id::text || '/' || v_edition.tex_hash || '.pdf'
     ) then
    raise exception 'Compile the current draft PDF before publishing.';
  end if;

  v_issue_start := greatest(
    coalesce(v_edition.window_start, v_edition.created_at),
    now() - interval '30 days'
  );
  select coalesce(jsonb_agg(source.id::text order by source.id), '[]'::jsonb)
    into v_current_source_ids
    from public.sources as source
    where source.active is true
      and source.trusted is true;

  select ingest_run.ok, ingest_run.details -> 'scannedTrustedSourceIds'
    into v_latest_ingest_ok, v_scanned_source_ids
    from public.runs as ingest_run
    where ingest_run.kind = 'ingest'
      and ingest_run.started_at >= v_issue_start
    order by ingest_run.started_at desc, ingest_run.id desc
    limit 1;

  if v_latest_ingest_ok is distinct from true
     or v_scanned_source_ids is distinct from v_current_source_ids then
    raise exception 'Wait for one successful pass across the current trusted source list.';
  end if;

  v_plan_items := v_edition.layout #> '{plan,items}';
  if v_edition.layout #>> '{plan,provider}' is distinct from 'gemini'
     or v_edition.layout #> '{plan,warning}' is distinct from 'null'::jsonb then
    raise exception 'Gemini must produce a valid complete magazine layout before publishing.';
  end if;
  if jsonb_typeof(v_plan_items) is distinct from 'array' then
    raise exception 'A valid complete magazine layout is required.';
  end if;
  if jsonb_array_length(v_plan_items) = 0 then
    raise exception 'At least one automatically eligible story is required for a complete issue.';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_plan_items) as item(value)
      where coalesce(item.value ->> 'storyId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'Rebuild the issue; its story plan is invalid.';
  end if;

  select array_agg((item.value ->> 'storyId')::uuid)
    into v_story_ids
    from jsonb_array_elements(v_plan_items) as item(value);

  if cardinality(v_story_ids) <> (
    select count(distinct story_id)
      from unnest(v_story_ids) as selected(story_id)
  ) then
    raise exception 'Rebuild the issue; its plan contains duplicate stories.';
  end if;

  if exists (
    select 1
      from unnest(v_story_ids) as selected(story_id)
      left join public.stories as story on story.id = selected.story_id
      where story.id is null
         or story.status not in ('ready', 'approved')
         or story.is_ai_related is distinct from true
         or story.first_seen_at < v_issue_start
         or coalesce(story.verification ->> 'failed', 'true') <> 'false'
         or not exists (
           select 1
             from public.articles as article
             join public.sources as trusted_source on trusted_source.id = article.source_id
             where article.story_id = story.id
               and trusted_source.trusted is true
         )
  ) then
    raise exception 'Every story must pass the automatic scope, evidence, and trusted-source checks.';
  end if;

  select count(*)
    into v_ready_count
    from public.stories as story
    where story.status in ('ready', 'approved')
      and story.is_ai_related is true
      and story.first_seen_at >= v_issue_start;

  if cardinality(v_story_ids) <> v_ready_count then
    raise exception 'Rebuild the issue to include every automatically eligible story from this coverage window.';
  end if;

  if exists (
    select 1
      from public.stories as story
      where story.status = 'candidate'
        and story.needs_reprocess is true
        and story.first_seen_at >= v_issue_start
  ) then
    raise exception 'Wait for the automatic AI checks to finish for all new stories.';
  end if;

  update public.stories as story
    set status = 'published',
        edition_id = v_edition.id
    where story.id = any(v_story_ids)
      and story.status in ('ready', 'approved')
      and story.is_ai_related is true
      and story.first_seen_at >= v_issue_start;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> cardinality(v_story_ids) then
    raise exception 'A story changed during publication. Reload the draft and try again.';
  end if;

  v_published_slug := 'issue-'
    || to_char(now() at time zone 'Asia/Karachi', 'YYYY-MM-DD')
    || '-'
    || left(replace(v_edition.id::text, '-', ''), 8);

  update public.editions
    set status = 'published',
        slug = v_published_slug,
        published_at = now()
    where id = v_edition.id
      and status = 'draft';

  insert into public.editions (
    slug,
    title,
    status,
    window_start,
    publish_not_before,
    layout
  ) values (
    'current-draft',
    'Living Draft',
    'draft',
    now() - interval '30 days',
    now() + interval '7 days',
    jsonb_build_object('template', coalesce(v_edition.layout -> 'template', '{}'::jsonb))
  ) returning id into v_next_draft_id;

  return v_next_draft_id;
end;
$$;

revoke all on function public.publish_draft_edition(uuid)
  from public, anon, authenticated;
grant execute on function public.publish_draft_edition(uuid)
  to service_role;

-- Force the next scheduled run to regenerate TeX with stories moved into the
-- automatic-ready state by this migration.
update public.editions
  set draft_revision = draft_revision + 1,
      publish_not_before = now() + interval '7 days',
      editor_note_approved = false,
      tex_path = null,
      tex_hash = null,
      pdf_path = null,
      pdf_tex_hash = null
  where status = 'draft';
