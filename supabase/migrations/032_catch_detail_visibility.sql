alter table public.catches
  add column if not exists show_measurements_public boolean not null default true,
  add column if not exists show_location_public boolean not null default true,
  add column if not exists show_method_public boolean not null default true,
  add column if not exists show_notes_public boolean not null default true,
  add column if not exists show_conditions_public boolean not null default true;

drop view if exists public.catches_public;
drop view if exists public.catches_public_detail;

create view public.catches_public as
select
  id,
  user_id,
  species_id,
  species_custom,
  case when show_measurements_public then length_cm else null end as length_cm,
  case when show_measurements_public then weight_g else null end as weight_g,
  photo_url,
  photo_blur_hash,
  case when show_location_public then location_name else null end as location_name,
  case
    when show_location_public = false then null
    when show_exact_location = true then st_astext(location::geometry)
    else st_astext(st_snaptogrid(location::geometry, 0.02)::geometry)
  end as location,
  is_catch_release,
  case when show_method_public then fishing_type else null end as fishing_type,
  case when show_method_public then bait_name else null end as bait_name,
  case when show_notes_public then notes else null end as notes,
  like_count,
  comment_count,
  xp_earned,
  created_at
from public.catches c
where is_public = true;

create view public.catches_public_detail as
select
  id,
  user_id,
  species_id,
  species_custom,
  case when show_measurements_public then length_cm else null end as length_cm,
  case when show_measurements_public then weight_g else null end as weight_g,
  photo_url,
  photo_blur_hash,
  case
    when show_location_public = false then null
    when show_exact_location = true then st_astext(location::geometry)
    else st_astext(st_snaptogrid(location::geometry, 0.02)::geometry)
  end as location,
  case when show_location_public then location_name else null end as location_name,
  show_exact_location,
  show_measurements_public,
  show_location_public,
  show_method_public,
  show_notes_public,
  show_conditions_public,
  is_catch_release,
  case when show_method_public then fishing_type else null end as fishing_type,
  case when show_method_public then bait_name else null end as bait_name,
  case when show_notes_public then notes else null end as notes,
  xp_earned,
  like_count,
  comment_count,
  is_public,
  case when show_conditions_public then captured_at else null end as captured_at,
  case when show_conditions_public then air_temp_c else null end as air_temp_c,
  case when show_conditions_public then pressure_hpa else null end as pressure_hpa,
  case when show_conditions_public then humidity_pct else null end as humidity_pct,
  case when show_conditions_public then weather_code else null end as weather_code,
  case when show_conditions_public then weather_label else null end as weather_label,
  case when show_conditions_public then wind_speed_kmh else null end as wind_speed_kmh,
  case when show_conditions_public then wind_direction_deg else null end as wind_direction_deg,
  case when show_conditions_public then wind_direction_label else null end as wind_direction_label,
  case when show_conditions_public then uv_index else null end as uv_index,
  case when show_conditions_public then wave_height_m else null end as wave_height_m,
  case when show_conditions_public then wave_direction_deg else null end as wave_direction_deg,
  case when show_conditions_public then sea_temp_c else null end as sea_temp_c,
  case when show_conditions_public then sea_depth_m else null end as sea_depth_m,
  case when show_conditions_public then sea_depth_source else null end as sea_depth_source,
  case when show_conditions_public then sea_depth_is_approximate else false end as sea_depth_is_approximate,
  case when show_conditions_public then moon_phase_label else null end as moon_phase_label,
  case when show_conditions_public then moon_phase_emoji else null end as moon_phase_emoji,
  case when show_conditions_public then fishing_score else null end as fishing_score,
  case when show_conditions_public then fishing_score_label else null end as fishing_score_label,
  created_at
from public.catches c
where is_public = true;
