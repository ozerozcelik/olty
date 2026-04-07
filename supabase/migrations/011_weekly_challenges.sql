create table public.weekly_challenges (
  id             uuid primary key default gen_random_uuid(),
  week_start     date unique not null,
  title_tr       text not null,
  description_tr text not null,
  challenge_type text not null,
  target_species_id integer references public.fish_species(id),
  min_length_cm  numeric,
  xp_reward      integer default 200,
  badge_slug     text,
  ends_at        timestamptz not null,
  created_at     timestamptz default now()
);

create table public.weekly_challenge_entries (
  id            bigserial primary key,
  challenge_id  uuid not null references public.weekly_challenges(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  catch_id      uuid references public.catches(id) on delete set null,
  value         numeric,
  rank          integer,
  xp_earned     integer default 0,
  completed_at  timestamptz default now(),
  unique (challenge_id, user_id)
);

alter table public.weekly_challenges enable row level security;
alter table public.weekly_challenge_entries enable row level security;

create policy "wc_select" on public.weekly_challenges for select using (true);
create policy "wce_select" on public.weekly_challenge_entries for select using (true);
create policy "wce_insert" on public.weekly_challenge_entries
  for insert with check (auth.uid() = user_id);

insert into public.weekly_challenges (week_start, title_tr, description_tr, challenge_type, xp_reward, ends_at)
values
  (
    date_trunc('week', current_date)::date,
    'Bu Haftanın En Büyük Balığı',
    'Bu hafta en büyük balığı tutan 3 kişi özel rozet kazanır!',
    'biggest_fish',
    300,
    date_trunc('week', current_date) + interval '6 days 23 hours 59 minutes'
  ),
  (
    date_trunc('week', current_date + interval '7 days')::date,
    'Sazan Sezonu',
    'Bu hafta en fazla sazan tutan kazanır.',
    'species_hunt',
    250,
    date_trunc('week', current_date + interval '7 days') + interval '6 days 23 hours 59 minutes'
  )
on conflict (week_start) do nothing;
