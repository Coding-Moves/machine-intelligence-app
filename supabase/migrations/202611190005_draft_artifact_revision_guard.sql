alter table public.editions
  add column draft_revision integer not null default 0;

create or replace function public.invalidate_draft_edition_artifacts(
  p_edition_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision integer;
begin
  update public.editions
    set draft_revision = draft_revision + 1,
        tex_path = null,
        tex_hash = null,
        pdf_path = null,
        pdf_tex_hash = null
    where id = p_edition_id
      and status = 'draft'
    returning draft_revision into v_revision;

  if not found then
    raise exception 'This issue is no longer the current draft.';
  end if;

  return v_revision;
end;
$$;

create or replace function public.save_draft_edition_template(
  p_edition_id uuid,
  p_title text,
  p_template jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.editions
    set title = p_title,
        layout = jsonb_set(
          coalesce(layout, '{}'::jsonb),
          '{template}',
          p_template,
          true
        ),
        editor_note_approved = false,
        draft_revision = draft_revision + 1,
        tex_path = null,
        tex_hash = null,
        pdf_path = null,
        pdf_tex_hash = null
    where id = p_edition_id
      and status = 'draft';

  if not found then
    raise exception 'This issue is no longer the current draft.';
  end if;

  return p_edition_id;
end;
$$;

create or replace function public.save_draft_edition_editor_note(
  p_edition_id uuid,
  p_editor_note text,
  p_approved boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.editions
    set editor_note = p_editor_note,
        editor_note_approved = p_approved,
        draft_revision = draft_revision + 1,
        tex_path = null,
        tex_hash = null,
        pdf_path = null,
        pdf_tex_hash = null
    where id = p_edition_id
      and status = 'draft';

  if not found then
    raise exception 'This issue is no longer the current draft.';
  end if;

  return p_edition_id;
end;
$$;

create or replace function public.invalidate_draft_after_story_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' and new.status <> 'approved' then
    return new;
  end if;

  if TG_OP = 'UPDATE'
     and old.status <> 'approved'
     and new.status <> 'approved' then
    return new;
  end if;

  -- Publishing changes approved stories to published inside the same database
  -- transaction that publishes their edition. Keep that edition's PDF intact.
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

drop trigger if exists invalidate_draft_after_story_change
  on public.stories;
create trigger invalidate_draft_after_story_change
  after insert or update on public.stories
  for each row execute function public.invalidate_draft_after_story_change();

revoke all on function public.invalidate_draft_edition_artifacts(uuid)
  from public, anon, authenticated;
revoke all on function public.save_draft_edition_template(uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.save_draft_edition_editor_note(uuid, text, boolean)
  from public, anon, authenticated;
revoke all on function public.invalidate_draft_after_story_change()
  from public, anon, authenticated;

grant execute on function public.invalidate_draft_edition_artifacts(uuid)
  to service_role;
grant execute on function public.save_draft_edition_template(uuid, text, jsonb)
  to service_role;
grant execute on function public.save_draft_edition_editor_note(uuid, text, boolean)
  to service_role;
