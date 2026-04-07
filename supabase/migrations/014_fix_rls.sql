-- user_badges insert policy
drop policy if exists "user_badges_insert_own" on public.user_badges;
create policy "user_badges_insert_own" on public.user_badges
  for insert with check (user_id = auth.uid());

-- xp_transactions select policy (needed for gamification reads)
drop policy if exists "xp_transactions_select_own" on public.xp_transactions;
create policy "xp_transactions_select_own" on public.xp_transactions
  for select using (user_id = auth.uid());
