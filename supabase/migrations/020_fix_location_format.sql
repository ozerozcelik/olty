drop view if exists catches_public;

create view catches_public as
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
  notes,
  like_count,
  comment_count,
  xp_earned,
  created_at
from catches c
where is_public = true;
