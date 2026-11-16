-- RLS filters which editions are visible, while column grants control which
-- fields the public API can return from those published rows.
revoke select on table public.editions from anon;

grant select (
  id,
  slug,
  title,
  status,
  published_at,
  in_this_issue,
  pdf_path,
  cover_path
)
on table public.editions to anon;
