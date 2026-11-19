alter table public.stories
  add column is_ai_related boolean;

create index stories_ai_approved_section_score_idx
  on public.stories (section, final_score desc)
  where status = 'approved' and is_ai_related is distinct from false;
