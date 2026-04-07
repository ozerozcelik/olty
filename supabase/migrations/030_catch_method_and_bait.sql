alter table public.catches
  add column if not exists bait_name text;

drop view if exists public.catches_public;

create view public.catches_public as
select
  id,
  user_id,
  species_id,
  species_custom,
  length_cm,
  weight_g,
  photo_url,
  photo_blur_hash,
  location_name,
  case
    when show_exact_location = true then st_astext(location::geometry)
    else st_astext(st_snaptogrid(location::geometry, 0.02)::geometry)
  end as location,
  is_catch_release,
  fishing_type,
  bait_name,
  notes,
  like_count,
  comment_count,
  xp_earned,
  created_at
from public.catches c
where is_public = true;
