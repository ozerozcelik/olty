alter table public.profiles
  add column if not exists notif_likes boolean default true,
  add column if not exists notif_comments boolean default true,
  add column if not exists notif_follows boolean default true,
  add column if not exists notif_weather boolean default true,
  add column if not exists location_private boolean default false,
  add column if not exists is_private boolean default false;

create table if not exists public.deletion_requests (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  requested_at  timestamptz default now(),
  scheduled_at  timestamptz default now() + interval '30 days',
  completed_at  timestamptz,
  status        text default 'pending'
);

alter table public.deletion_requests enable row level security;

create policy  "deletion_requests_own" on public.deletion_requests
for select using (auth.uid() = user_id);

create policy  "deletion_requests_insert_own" on public.deletion_requests
for insert to authenticated with check (auth.uid() = user_id);
