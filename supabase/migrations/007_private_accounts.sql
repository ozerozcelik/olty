drop policy if exists "catches_select" on public.catches;
create policy "catches_select" on public.catches for select
using (
  auth.uid() = user_id
  or (
    is_public = true
    and exists (
      select 1
      from public.profiles p
      where p.id = catches.user_id
        and p.is_private = false
    )
  )
  or (
    is_public = true
    and exists (
      select 1
      from public.profiles p
      where p.id = catches.user_id
        and p.is_private = true
    )
    and exists (
      select 1
      from public.follows f
      where f.following_id = catches.user_id
        and f.follower_id = auth.uid()
    )
  )
);