alter table public.profiles
  add column if not exists show_city_public boolean not null default true,
  add column if not exists show_bio_public boolean not null default true,
  add column if not exists show_fishing_types_public boolean not null default true,
  add column if not exists show_social_links_public boolean not null default true,
  add column if not exists show_gear_public boolean not null default true,
  add column if not exists show_fishdex_public boolean not null default true;
