create extension if not exists pgcrypto;
create extension if not exists postgis;

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (length(username) between 3 and 30),
  display_name  text,
  avatar_url    text,
  bio           text check (length(bio) <= 160),
  city          text,
  fishing_type  text[] default '{}',
  total_xp      integer default 0,
  level         smallint default 1,
  follower_count  integer default 0,
  following_count integer default 0,
  catch_count     integer default 0,
  is_verified     boolean default false,
  kvkk_consent    boolean default false,
  marketing_consent boolean default false,
  onboarding_completed boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table public.fish_species (
  id          serial primary key,
  name_tr     text not null,
  name_en     text,
  name_scientific text,
  category    text,
  image_url   text,
  is_active   boolean default true
);

create table public.catches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  species_id    integer references public.fish_species(id),
  species_custom text,
  length_cm     numeric(5,1),
  weight_g      integer,
  photo_url     text,
  photo_blur_hash text,
  location      geography(point, 4326),
  location_name text,
  show_exact_location boolean default false,
  is_catch_release boolean default false,
  fishing_type  text,
  notes         text check (length(notes) <= 500),
  xp_earned     integer default 0,
  like_count    integer default 0,
  comment_count integer default 0,
  is_public     boolean default true,
  created_at    timestamptz default now()
);

create table public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create table public.likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  catch_id    uuid not null references public.catches(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, catch_id)
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  catch_id    uuid not null references public.catches(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (length(body) between 1 and 280),
  created_at  timestamptz default now()
);

create table public.xp_transactions (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      integer not null,
  reason      text not null,
  ref_id      uuid,
  created_at  timestamptz default now()
);

create table public.badge_definitions (
  id          serial primary key,
  slug        text unique not null,
  name_tr     text not null,
  description_tr text,
  icon_url    text,
  xp_reward   integer default 0,
  category    text
);

create table public.user_badges (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_id    integer not null references public.badge_definitions(id),
  earned_at   timestamptz default now(),
  primary key (user_id, badge_id)
);

create table public.user_consents (
  id          bigserial primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  consent_type text not null,
  granted     boolean not null,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz default now()
);

create table public.gear_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category    text not null,
  brand       text,
  model       text,
  tier        smallint default 1,
  photo_url   text,
  notes       text,
  created_at  timestamptz default now()
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  catch_id    uuid not null references public.catches(id) on delete cascade,
  reason      text not null check (length(reason) between 3 and 280),
  created_at  timestamptz default now()
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  ref_id      uuid,
  body        text,
  is_read     boolean default false,
  created_at  timestamptz default now()
);

create index idx_catches_user_id     on public.catches(user_id);
create index idx_catches_created_at  on public.catches(created_at desc);
create index idx_catches_location    on public.catches using gist(location);
create index idx_follows_follower    on public.follows(follower_id);
create index idx_follows_following   on public.follows(following_id);
create index idx_likes_catch_id      on public.likes(catch_id);
create index idx_xp_user_id          on public.xp_transactions(user_id, created_at desc);

create view public.catches_public as
select
  c.id, c.user_id, c.species_id, c.species_custom,
  c.length_cm, c.weight_g, c.photo_url, c.photo_blur_hash,
  c.location_name,
  case
    when c.show_exact_location = true then c.location
    else ST_SnapToGrid(c.location::geometry, 0.02)::geography
  end as location,
  c.is_catch_release, c.fishing_type, c.notes,
  c.like_count, c.comment_count, c.xp_earned,
  c.created_at
from public.catches c
where c.is_public = true;
