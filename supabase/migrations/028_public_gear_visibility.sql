drop policy if exists "gear_items_select_own" on public.gear_items;

create policy "gear_items_select_public" on public.gear_items for select
  using (true);
