create type location_type as enum ('spot', 'marina', 'shop', 'hazard', 'other');

create table if not exists fishing_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (char_length(name) <= 100),
  description text check (char_length(description) <= 500),
  type location_type not null default 'spot',
  location geography(Point, 4326) not null,
  photo_url text,
  is_public boolean not null default true,
  fish_species text[] not null default '{}',
  best_season text,
  like_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists location_likes (
  location_id uuid not null references fishing_locations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (location_id, user_id)
);

alter table fishing_locations enable row level security;
alter table location_likes enable row level security;

drop policy if exists "fishing_locations_select" on fishing_locations;
create policy "fishing_locations_select" on fishing_locations
  for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "fishing_locations_insert" on fishing_locations;
create policy "fishing_locations_insert" on fishing_locations
  for insert with check (auth.uid() = user_id);
drop policy if exists "fishing_locations_update" on fishing_locations;
create policy "fishing_locations_update" on fishing_locations
  for update using (auth.uid() = user_id);
drop policy if exists "fishing_locations_delete" on fishing_locations;
create policy "fishing_locations_delete" on fishing_locations
  for delete using (auth.uid() = user_id);

drop policy if exists "location_likes_select" on location_likes;
create policy "location_likes_select" on location_likes for select using (true);
drop policy if exists "location_likes_insert" on location_likes;
create policy "location_likes_insert" on location_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists "location_likes_delete" on location_likes;
create policy "location_likes_delete" on location_likes
  for delete using (auth.uid() = user_id);

create or replace function update_location_like_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update fishing_locations set like_count = like_count + 1 where id = NEW.location_id;
  elsif TG_OP = 'DELETE' then
    update fishing_locations set like_count = greatest(like_count - 1, 0) where id = OLD.location_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_location_like on location_likes;
create trigger on_location_like after insert or delete on location_likes
  for each row execute function update_location_like_count();

create index if not exists fishing_locations_user_id_idx on fishing_locations(user_id);
