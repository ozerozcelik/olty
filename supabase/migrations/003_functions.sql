create or replace function increment_xp(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
declare
  new_xp integer;
  new_level smallint;
begin
  update public.profiles
  set total_xp = total_xp + p_amount
  where id = p_user_id
  returning total_xp into new_xp;

  new_level := case
    when new_xp >= 25000 then 5
    when new_xp >= 8000  then 4
    when new_xp >= 2000  then 3
    when new_xp >= 500   then 2
    else 1
  end;

  update public.profiles set level = new_level where id = p_user_id;
end;
$$;

create or replace function get_user_streak(p_user_id uuid)
returns integer language plpgsql security definer as $$
declare
  streak integer := 0;
  cursor_day date := current_date;
begin
  loop
    exit when not exists (
      select 1
      from public.catches
      where user_id = p_user_id
        and created_at >= cursor_day
        and created_at < cursor_day + interval '1 day'
    );

    streak := streak + 1;
    cursor_day := cursor_day - interval '1 day';
  end loop;

  return streak;
end;
$$;

create or replace function update_follower_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.following_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function update_catch_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set catch_count = catch_count + 1 where id = new.user_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.profiles set catch_count = greatest(catch_count - 1, 0) where id = old.user_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function update_like_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.catches set like_count = like_count + 1 where id = new.catch_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.catches set like_count = greatest(like_count - 1, 0) where id = old.catch_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function update_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.catches set comment_count = comment_count + 1 where id = new.catch_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.catches set comment_count = greatest(comment_count - 1, 0) where id = old.catch_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists follows_count_trigger on public.follows;
create trigger follows_count_trigger
after insert or delete on public.follows
for each row execute function update_follower_counts();

drop trigger if exists catches_count_trigger on public.catches;
create trigger catches_count_trigger
after insert or delete on public.catches
for each row execute function update_catch_count();

drop trigger if exists likes_count_trigger on public.likes;
create trigger likes_count_trigger
after insert or delete on public.likes
for each row execute function update_like_count();

drop trigger if exists comments_count_trigger on public.comments;
create trigger comments_count_trigger
after insert or delete on public.comments
for each row execute function update_comment_count();
