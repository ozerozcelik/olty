do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'tournament_status'
  ) then
    create type public.tournament_status as enum ('draft', 'active', 'finished');
  end if;
end $$;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 100),
  description text check (char_length(description) <= 1000),
  cover_image_url text,
  status public.tournament_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  city text,
  fishing_type text,
  scoring_type text not null default 'length',
  max_participants int,
  entry_fee int not null default 0,
  prize_description text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (scoring_type in ('length', 'weight', 'count')),
  check (max_participants is null or max_participants > 0),
  check (entry_fee >= 0)
);

create table if not exists public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(tournament_id, user_id)
);

create table if not exists public.tournament_catches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  catch_id uuid not null references public.catches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score numeric not null default 0,
  submitted_at timestamptz not null default now(),
  unique(tournament_id, catch_id)
);

alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_catches enable row level security;

drop policy if exists "tournaments_select" on public.tournaments;
create policy "tournaments_select" on public.tournaments for select using (true);

drop policy if exists "tournaments_insert" on public.tournaments;
create policy "tournaments_insert" on public.tournaments for insert with check (auth.uid() = created_by);

drop policy if exists "tournaments_update" on public.tournaments;
create policy "tournaments_update" on public.tournaments for update using (auth.uid() = created_by);

drop policy if exists "tournament_participants_select" on public.tournament_participants;
create policy "tournament_participants_select" on public.tournament_participants for select using (true);

drop policy if exists "tournament_participants_insert" on public.tournament_participants;
create policy "tournament_participants_insert" on public.tournament_participants
  for insert with check (auth.uid() = user_id);

drop policy if exists "tournament_participants_delete" on public.tournament_participants;
create policy "tournament_participants_delete" on public.tournament_participants
  for delete using (auth.uid() = user_id);

drop policy if exists "tournament_catches_select" on public.tournament_catches;
create policy "tournament_catches_select" on public.tournament_catches for select using (true);

drop policy if exists "tournament_catches_insert" on public.tournament_catches;
create policy "tournament_catches_insert" on public.tournament_catches
  for insert with check (auth.uid() = user_id);

create index if not exists tournaments_status_idx on public.tournaments(status);
create index if not exists tournaments_starts_at_idx on public.tournaments(starts_at);
create index if not exists tournament_participants_tournament_id_idx on public.tournament_participants(tournament_id);
create index if not exists tournament_catches_tournament_id_idx on public.tournament_catches(tournament_id);
