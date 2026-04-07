create table public.user_push_tokens (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz default now(),
  primary key (user_id, token)
);

alter table public.user_push_tokens enable row level security;

create policy "push_tokens_own" on public.user_push_tokens
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
