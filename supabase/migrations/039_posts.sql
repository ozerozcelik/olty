create type post_type as enum ('tip', 'story', 'gear_review', 'spot_guide');

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type post_type not null default 'tip',
  title text not null check (char_length(title) <= 120),
  body text not null check (char_length(body) <= 5000),
  cover_image_url text,
  images text[] not null default '{}',
  like_count int not null default 0,
  comment_count int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;

drop policy if exists "posts_select" on posts;
create policy "posts_select" on posts for select using (is_published = true);
drop policy if exists "posts_insert" on posts;
create policy "posts_insert" on posts for insert with check (auth.uid() = user_id);
drop policy if exists "posts_update" on posts;
create policy "posts_update" on posts for update using (auth.uid() = user_id);
drop policy if exists "posts_delete" on posts;
create policy "posts_delete" on posts for delete using (auth.uid() = user_id);

drop policy if exists "post_likes_select" on post_likes;
create policy "post_likes_select" on post_likes for select using (true);
drop policy if exists "post_likes_insert" on post_likes;
create policy "post_likes_insert" on post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "post_likes_delete" on post_likes;
create policy "post_likes_delete" on post_likes for delete using (auth.uid() = user_id);

drop policy if exists "post_comments_select" on post_comments;
create policy "post_comments_select" on post_comments for select using (true);
drop policy if exists "post_comments_insert" on post_comments;
create policy "post_comments_insert" on post_comments for insert with check (auth.uid() = user_id);
drop policy if exists "post_comments_delete" on post_comments;
create policy "post_comments_delete" on post_comments for delete using (auth.uid() = user_id);

create or replace function update_post_like_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update posts set like_count = like_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set like_count = greatest(like_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create or replace function update_post_comment_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create or replace function touch_post_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists on_post_like on post_likes;
create trigger on_post_like after insert or delete on post_likes
  for each row execute function update_post_like_count();

drop trigger if exists on_post_comment on post_comments;
create trigger on_post_comment after insert or delete on post_comments
  for each row execute function update_post_comment_count();

drop trigger if exists posts_touch_updated_at on posts;
create trigger posts_touch_updated_at before update on posts
  for each row execute function touch_post_updated_at();

create index if not exists posts_user_id_idx on posts(user_id);
create index if not exists posts_created_at_idx on posts(created_at desc);
create index if not exists posts_type_idx on posts(type);
