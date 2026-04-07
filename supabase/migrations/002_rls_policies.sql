alter table public.profiles enable row level security;
alter table public.fish_species enable row level security;
alter table public.catches enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.badge_definitions enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_consents enable row level security;
alter table public.gear_items enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "fish_species_select" on public.fish_species for select using (true);

create policy "catches_select" on public.catches for select
  using (is_public = true or auth.uid() = user_id);
-- Note: private account visibility is tightened in 007_private_accounts.sql.
create policy "catches_insert" on public.catches for insert
  with check (auth.uid() = user_id);
create policy "catches_update" on public.catches for update
  using (auth.uid() = user_id);
create policy "catches_delete" on public.catches for delete
  using (auth.uid() = user_id);
create policy "catches_location_owner" on public.catches for select
  using (auth.uid() = user_id);

create policy "follows_select" on public.follows for select using (true);
create policy "follows_insert_own" on public.follows for insert
  to authenticated
  with check (follower_id = auth.uid());
create policy "follows_delete_own" on public.follows for delete
  to authenticated
  using (follower_id = auth.uid());

create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert
  to authenticated
  with check (user_id = auth.uid());
create policy "likes_delete_own" on public.likes for delete
  to authenticated
  using (user_id = auth.uid());

create policy "comments_select_public" on public.comments for select using (
  exists (
    select 1
    from public.catches c
    where c.id = comments.catch_id
      and (c.is_public = true or c.user_id = auth.uid())
  )
);
create policy "comments_insert_own" on public.comments for insert
  to authenticated
  with check (user_id = auth.uid());
create policy "comments_delete_owner" on public.comments for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.catches c
      where c.id = comments.catch_id
        and c.user_id = auth.uid()
    )
  );

create policy "xp_transactions_select_own" on public.xp_transactions for select
  using (user_id = auth.uid());
create policy "xp_transactions_insert_service_role" on public.xp_transactions for insert
  to service_role
  with check (true);

create policy "badge_definitions_select" on public.badge_definitions for select using (true);

create policy "user_badges_select_own" on public.user_badges for select
  using (user_id = auth.uid());
create policy "user_badges_insert_service_role" on public.user_badges for insert
  to service_role
  with check (true);

create policy "user_consents_select_own" on public.user_consents for select
  using (user_id = auth.uid());
create policy "user_consents_insert_own" on public.user_consents for insert
  to authenticated
  with check (user_id = auth.uid());
create policy "user_consents_update_own" on public.user_consents for update
  to authenticated
  using (user_id = auth.uid());

create policy "gear_items_select_own" on public.gear_items for select
  using (user_id = auth.uid());
create policy "gear_items_insert_own" on public.gear_items for insert
  to authenticated
  with check (user_id = auth.uid());
create policy "gear_items_update_own" on public.gear_items for update
  to authenticated
  using (user_id = auth.uid());
create policy "gear_items_delete_own" on public.gear_items for delete
  to authenticated
  using (user_id = auth.uid());

create policy "reports_select_own" on public.reports for select
  using (reporter_id = auth.uid());
create policy "reports_insert_own" on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "notifications_select_own" on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update
  to authenticated
  using (user_id = auth.uid());
create policy "notifications_insert_service_role" on public.notifications for insert
  to service_role
  with check (true);
