create table public.daily_questions (
  id            uuid primary key default gen_random_uuid(),
  date          date unique not null,
  question_tr   text not null,
  options       jsonb not null,
  correct_index smallint,
  question_type text not null,
  reveal_at     timestamptz not null,
  source_note   text,
  created_at    timestamptz default now()
);

create table public.daily_question_answers (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  question_id   uuid not null references public.daily_questions(id) on delete cascade,
  chosen_index  smallint not null,
  is_correct    boolean,
  xp_earned     integer default 0,
  answered_at   timestamptz default now(),
  unique (user_id, question_id)
);

create table public.daily_fish_challenges (
  id            uuid primary key default gen_random_uuid(),
  date          date unique not null,
  catch_id      uuid references public.catches(id) on delete set null,
  photo_url     text not null,
  correct_species_id   integer references public.fish_species(id),
  correct_species_name text not null,
  options       jsonb not null,
  fun_fact_tr   text,
  created_at    timestamptz default now()
);

create table public.daily_fish_answers (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  challenge_id  uuid not null references public.daily_fish_challenges(id) on delete cascade,
  chosen_option text not null,
  is_correct    boolean not null,
  xp_earned     integer default 0,
  answered_at   timestamptz default now(),
  unique (user_id, challenge_id)
);

alter table public.daily_questions enable row level security;
alter table public.daily_question_answers enable row level security;
alter table public.daily_fish_challenges enable row level security;
alter table public.daily_fish_answers enable row level security;

create policy "dq_select" on public.daily_questions for select using (true);
create policy "dfc_select" on public.daily_fish_challenges for select using (true);

create policy "dqa_insert" on public.daily_question_answers
  for insert with check (auth.uid() = user_id);
create policy "dqa_select" on public.daily_question_answers
  for select using (auth.uid() = user_id);

create policy "dfa_insert" on public.daily_fish_answers
  for insert with check (auth.uid() = user_id);
create policy "dfa_select" on public.daily_fish_answers
  for select using (auth.uid() = user_id);

insert into public.badge_definitions (slug, name_tr, description_tr, xp_reward, category)
values
  ('daily_first_answer',   'İlk Tahmin',      'İlk günlük oyunu oyna',             25, 'daily'),
  ('daily_correct_3',      'Üçlü Kahin',      '3 günlük tahmini doğru bil',        60, 'daily'),
  ('daily_correct_7',      'Usta Kahin',      '7 günlük tahmini doğru bil',       150, 'daily'),
  ('fish_id_first',        'Balık Tanıyıcı',  'İlk balık tanıma oyununu tamamla',  25, 'daily'),
  ('fish_id_correct_5',    'Tür Uzmanı',      '5 balık tanıma sorusunu doğru bil', 75, 'daily'),
  ('fish_id_correct_20',   'Ansiklopedi',     '20 balık tanıma sorusunu doğru bil', 200, 'daily'),
  ('daily_streak_7',       '7 Günlük Oyuncu', '7 gün üst üste günlük oyun oyna',   80, 'daily'),
  ('daily_streak_30',      'Aylık Oyuncu',    '30 gün üst üste günlük oyun oyna', 300, 'daily')
on conflict (slug) do update set
  name_tr = excluded.name_tr,
  description_tr = excluded.description_tr,
  xp_reward = excluded.xp_reward,
  category = excluded.category;
