create or replace function create_notification(
  p_user_id   uuid,
  p_type      text,
  p_actor_id  uuid,
  p_ref_id    uuid,
  p_body      text
) returns void language plpgsql security definer as $$
begin
  if p_user_id = p_actor_id then
    return;
  end if;

  insert into public.notifications(user_id, type, actor_id, ref_id, body)
  values (p_user_id, p_type, p_actor_id, p_ref_id, p_body);
end;
$$;

create or replace function on_like_insert()
returns trigger language plpgsql security definer as $$
declare
  target_user_id uuid;
begin
  select user_id into target_user_id
  from public.catches
  where id = new.catch_id;

  perform create_notification(target_user_id, 'like', new.user_id, new.catch_id, null);

  return new;
end;
$$;

create or replace function on_comment_insert()
returns trigger language plpgsql security definer as $$
declare
  target_user_id uuid;
begin
  select user_id into target_user_id
  from public.catches
  where id = new.catch_id;

  perform create_notification(target_user_id, 'comment', new.user_id, new.catch_id, new.body);

  return new;
end;
$$;

create or replace function on_follow_insert()
returns trigger language plpgsql security definer as $$
begin
  perform create_notification(new.following_id, 'follow', new.follower_id, null, null);

  return new;
end;
$$;

create or replace function on_badge_insert()
returns trigger language plpgsql security definer as $$
declare
  badge_name text;
  badge_ref_id uuid;
begin
  select name_tr into badge_name
  from public.badge_definitions
  where id = new.badge_id;

  badge_ref_id := ('00000000-0000-0000-0000-' || lpad(new.badge_id::text, 12, '0'))::uuid;

  perform create_notification(new.user_id, 'badge', new.user_id, badge_ref_id, badge_name);

  return new;
end;
$$;

drop trigger if exists likes_notification_trigger on public.likes;
create trigger likes_notification_trigger
after insert on public.likes
for each row execute function on_like_insert();

drop trigger if exists comments_notification_trigger on public.comments;
create trigger comments_notification_trigger
after insert on public.comments
for each row execute function on_comment_insert();

drop trigger if exists follows_notification_trigger on public.follows;
create trigger follows_notification_trigger
after insert on public.follows
for each row execute function on_follow_insert();

drop trigger if exists user_badges_notification_trigger on public.user_badges;
create trigger user_badges_notification_trigger
after insert on public.user_badges
for each row execute function on_badge_insert();

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
for select using (user_id = auth.uid());