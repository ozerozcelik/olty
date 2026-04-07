alter table public.notifications
  alter column ref_id type text using ref_id::text;

create or replace function create_notification(
  p_user_id   uuid,
  p_type      text,
  p_actor_id  uuid,
  p_ref_id    text,
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

create or replace function on_badge_insert_trigger()
returns trigger language plpgsql security definer as $$
declare
  badge_name text;
begin
  select name_tr into badge_name
  from public.badge_definitions
  where id = new.badge_id;

  perform create_notification(
    new.user_id,
    'badge',
    new.user_id,
    new.badge_id::text,
    badge_name
  );

  return new;
end;
$$;

drop trigger if exists user_badges_notification_trigger on public.user_badges;
create trigger user_badges_notification_trigger
after insert on public.user_badges
for each row execute function on_badge_insert_trigger();
