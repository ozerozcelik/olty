create table if not exists public.catch_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  catch_id uuid not null references public.catches(id) on delete cascade,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, catch_id)
);

alter table public.catch_highlights enable row level security;

drop policy if exists "highlights_select" on public.catch_highlights;
create policy "highlights_select" on public.catch_highlights for select using (true);

drop policy if exists "highlights_insert" on public.catch_highlights;
create policy "highlights_insert" on public.catch_highlights
  for insert with check (auth.uid() = user_id);

drop policy if exists "highlights_delete" on public.catch_highlights;
create policy "highlights_delete" on public.catch_highlights
  for delete using (auth.uid() = user_id);

create index if not exists highlights_user_id_idx on public.catch_highlights(user_id);
