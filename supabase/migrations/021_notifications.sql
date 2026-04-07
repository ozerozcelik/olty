do $$
begin
  create type notification_type as enum (
    'like',
    'comment',
    'follow',
    'badge',
    'level_up',
    'weekly_challenge',
    'daily_game',
    'tournament'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.notifications
  add column if not exists title text,
  add column if not exists ref_type text;

alter table public.notifications
  alter column ref_id type text using ref_id::text,
  alter column body type text,
  alter column type type notification_type using type::notification_type;

update public.notifications
set title = case type
  when 'like' then 'Yeni begeni'
  when 'comment' then 'Yeni yorum'
  when 'follow' then 'Yeni takipci'
  when 'badge' then 'Yeni rozet kazandin!'
  when 'level_up' then 'Seviye atladin!'
  when 'weekly_challenge' then 'Haftalik meydan okuma'
  when 'daily_game' then 'Gunluk oyun'
  when 'tournament' then 'Turnuva guncellemesi'
  else 'Yeni bildirim'
end
where title is null;

update public.notifications
set body = case type
  when 'like' then coalesce(body, 'Avini biri begendi.')
  when 'comment' then coalesce(body, 'Avina yeni bir yorum geldi.')
  when 'follow' then coalesce(body, 'Seni takip etmeye baslayan biri var.')
  when 'badge' then coalesce(body, 'Yeni bir rozet kazandin.')
  when 'level_up' then coalesce(body, 'Yeni seviyene ulastin.')
  when 'weekly_challenge' then coalesce(body, 'Haftalik gorevinde bir guncelleme var.')
  when 'daily_game' then coalesce(body, 'Gunluk oyunda yeni bir gelisme var.')
  when 'tournament' then coalesce(body, 'Turnuva durumunda bir degisiklik var.')
  else coalesce(body, 'Yeni bildirimin var.')
end
where body is null;

alter table public.notifications
  alter column title set not null,
  alter column body set not null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_insert_service_role" on public.notifications;
drop policy if exists "notifications_insert" on public.notifications;

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications
  for insert with check (true);

create index if not exists notifications_user_id_idx
  on public.notifications(user_id);

create index if not exists notifications_created_at_idx
  on public.notifications(created_at desc);

drop trigger if exists likes_notification_trigger on public.likes;
drop trigger if exists comments_notification_trigger on public.comments;
drop trigger if exists follows_notification_trigger on public.follows;
drop trigger if exists user_badges_notification_trigger on public.user_badges;
drop trigger if exists on_like_created on public.likes;
drop trigger if exists on_comment_created on public.comments;
drop trigger if exists on_follow_created on public.follows;

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
as $$
declare
  v_catch_owner uuid;
  v_liker_username text;
begin
  select user_id into v_catch_owner from public.catches where id = new.catch_id;
  select username into v_liker_username from public.profiles where id = new.user_id;

  if v_catch_owner is not null and v_catch_owner <> new.user_id then
    insert into public.notifications (user_id, type, title, body, ref_id, ref_type, actor_id)
    values (
      v_catch_owner,
      'like',
      'Yeni begeni',
      coalesce(v_liker_username, 'Bir kullanici') || ' avini begendi.',
      new.catch_id::text,
      'catch',
      new.user_id
    );
  end if;

  return new;
end;
$$;

create trigger on_like_created
after insert on public.likes
for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
as $$
declare
  v_catch_owner uuid;
  v_commenter_username text;
begin
  select user_id into v_catch_owner from public.catches where id = new.catch_id;
  select username into v_commenter_username from public.profiles where id = new.user_id;

  if v_catch_owner is not null and v_catch_owner <> new.user_id then
    insert into public.notifications (user_id, type, title, body, ref_id, ref_type, actor_id)
    values (
      v_catch_owner,
      'comment',
      'Yeni yorum',
      coalesce(v_commenter_username, 'Bir kullanici') || ' avina yorum yapti.',
      new.catch_id::text,
      'catch',
      new.user_id
    );
  end if;

  return new;
end;
$$;

create trigger on_comment_created
after insert on public.comments
for each row execute function public.notify_on_comment();

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
as $$
declare
  v_follower_username text;
begin
  select username into v_follower_username from public.profiles where id = new.follower_id;

  insert into public.notifications (user_id, type, title, body, ref_id, ref_type, actor_id)
  values (
    new.following_id,
    'follow',
    'Yeni takipci',
    coalesce(v_follower_username, 'Bir kullanici') || ' seni takip etmeye basladi.',
    new.follower_id::text,
    'profile',
    new.follower_id
  );

  return new;
end;
$$;

create trigger on_follow_created
after insert on public.follows
for each row execute function public.notify_on_follow();
