create or replace function public.can_access_catch(
  p_catch_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.catches c
    join public.profiles p on p.id = c.user_id
    where c.id = p_catch_id
      and (
        p_user_id = c.user_id
        or (
          c.is_public = true
          and p.is_private = false
        )
        or (
          p_user_id is not null
          and c.is_public = true
          and p.is_private = true
          and exists (
            select 1
            from public.follows f
            where f.following_id = c.user_id
              and f.follower_id = p_user_id
          )
        )
      )
  );
$$;

grant execute on function public.can_access_catch(uuid, uuid) to authenticated;

drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes for select
  using (public.can_access_catch(catch_id, auth.uid()));

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access_catch(catch_id, auth.uid())
  );

drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public" on public.comments for select
  using (public.can_access_catch(catch_id, auth.uid()));

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access_catch(catch_id, auth.uid())
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

drop policy if exists "notifications_insert" on public.notifications;
drop policy if exists "notifications_insert_service_role" on public.notifications;
create policy "notifications_insert_service_role" on public.notifications
  for insert
  to service_role
  with check (true);

create table if not exists public.function_daily_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  function_name text not null,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, function_name, usage_date)
);

alter table public.function_daily_usage enable row level security;

create or replace function public.consume_function_quota(
  p_user_id uuid,
  p_function_name text,
  p_daily_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_count integer;
begin
  if p_user_id is null or p_function_name is null or p_daily_limit is null or p_daily_limit <= 0 then
    return false;
  end if;

  insert into public.function_daily_usage (
    user_id,
    function_name,
    usage_date,
    request_count,
    updated_at
  )
  values (
    p_user_id,
    p_function_name,
    current_date,
    1,
    now()
  )
  on conflict (user_id, function_name, usage_date)
  do update set
    request_count = public.function_daily_usage.request_count + 1,
    updated_at = now()
  where public.function_daily_usage.request_count < p_daily_limit
  returning request_count into v_request_count;

  return v_request_count is not null;
end;
$$;

revoke all on function public.consume_function_quota(uuid, text, integer) from public;
grant execute on function public.consume_function_quota(uuid, text, integer) to service_role;
