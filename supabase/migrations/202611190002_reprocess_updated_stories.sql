-- A new article changes the evidence behind a story. Re-run AI checks and
-- require a fresh editor approval before that story can appear in an issue.
create or replace function public.store_ingested_article(
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
          status = 'candidate',
          verification = null,
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
