alter table public.editions
  add column tex_hash text,
  add column pdf_tex_hash text;

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
  v_approved_count integer;
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

  if v_edition.created_at > now() - interval '14 days' then
    raise exception 'The issue must remain in draft for at least 14 days.';
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

  v_issue_start := coalesce(v_edition.window_start, v_edition.created_at);
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
    raise exception 'Wait for the latest successful pass across the current trusted source list.';
  end if;

  v_plan_items := v_edition.layout #> '{plan,items}';
  if v_edition.layout #>> '{plan,provider}' is distinct from 'gemini'
     or v_edition.layout #> '{plan,warning}' is distinct from 'null'::jsonb then
    raise exception 'Gemini must produce a valid complete magazine layout before publishing.';
  end if;
  if jsonb_typeof(v_plan_items) is distinct from 'array' then
    raise exception 'The issue needs an approved story plan.';
  end if;
  if jsonb_array_length(v_plan_items) = 0 then
    raise exception 'The issue needs an approved story plan.';
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
         or story.status <> 'approved'
         or story.is_ai_related is distinct from true
         or story.last_updated_at < v_issue_start
         or coalesce(story.verification ->> 'failed', 'true') <> 'false'
         or not exists (
           select 1
             from public.articles as article
             join public.sources as trusted_source on trusted_source.id = article.source_id
             where article.story_id = story.id
               and trusted_source.trusted is true
         )
  ) then
    raise exception 'Every story must be current, AI-confirmed, editor-approved, evidence-checked, and backed by a trusted source.';
  end if;

  select count(*)
    into v_approved_count
    from public.stories as story
    where story.status = 'approved'
      and story.is_ai_related is true
      and story.last_updated_at >= v_issue_start;

  if cardinality(v_story_ids) <> v_approved_count then
    raise exception 'Rebuild the issue to include every approved story from this cycle.';
  end if;

  if exists (
    select 1
      from public.stories as story
      where story.status = 'candidate'
        and story.needs_reprocess is true
        and story.last_updated_at >= v_issue_start
  ) then
    raise exception 'Wait for Gemini to check every new story in this issue cycle.';
  end if;

  if exists (
    select 1
      from public.stories as story
      where story.status = 'candidate'
        and story.is_ai_related is true
        and story.needs_reprocess is false
        and story.last_updated_at >= v_issue_start
  ) then
    raise exception 'Editors must approve or reject every AI-related candidate before publishing.';
  end if;

  update public.stories as story
    set status = 'published',
        edition_id = v_edition.id
    where story.id = any(v_story_ids)
      and story.status = 'approved'
      and story.is_ai_related is true
      and story.last_updated_at >= v_issue_start;
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
    layout
  ) values (
    'current-draft',
    'Living Draft',
    'draft',
    now() - interval '2 days',
    jsonb_build_object('template', coalesce(v_edition.layout -> 'template', '{}'::jsonb))
  ) returning id into v_next_draft_id;

  return v_next_draft_id;
end;
$$;

revoke all on function public.publish_draft_edition(uuid)
  from public, anon, authenticated;
grant execute on function public.publish_draft_edition(uuid)
  to service_role;
