create index images_approved_story_idx
  on public.images (story_id)
  where approved and story_id is not null;

create unique index images_single_own_per_story_idx
  on public.images (story_id)
  where story_id is not null and license = 'own';
