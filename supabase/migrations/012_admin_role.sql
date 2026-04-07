alter table public.profiles
  add column if not exists is_admin boolean default false;

create or replace function is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create policy "catches_admin_select" on public.catches
  for select using (is_admin());

create policy "profiles_admin_select" on public.profiles
  for select using (is_admin());

create policy "dq_admin_insert" on public.daily_questions
  for insert with check (is_admin());
create policy "dq_admin_update" on public.daily_questions
  for update using (is_admin());

create policy "dfc_admin_insert" on public.daily_fish_challenges
  for insert with check (is_admin());
create policy "dfc_admin_update" on public.daily_fish_challenges
  for update using (is_admin());

create policy "wc_admin_insert" on public.weekly_challenges
  for insert with check (is_admin());
create policy "wc_admin_update" on public.weekly_challenges
  for update using (is_admin());
