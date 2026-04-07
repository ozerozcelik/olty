create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1 uuid not null references public.profiles(id) on delete cascade,
  participant_2 uuid not null references public.profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique(participant_1, participant_2),
  check (participant_1 <> participant_2)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations
  for select using (participant_1 = auth.uid() or participant_2 = auth.uid());

drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert" on public.conversations
  for insert with check (participant_1 = auth.uid() or participant_2 = auth.uid());

drop policy if exists "conversations_update" on public.conversations;
create policy "conversations_update" on public.conversations
  for update using (participant_1 = auth.uid() or participant_2 = auth.uid());

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (sender_id = auth.uid());

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update using (sender_id = auth.uid());

create or replace function public.sync_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message = new.body,
      last_message_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists messages_sync_conversation_trigger on public.messages;
create trigger messages_sync_conversation_trigger
after insert on public.messages
for each row execute function public.sync_conversation_last_message();

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages m
  set is_read = true
  where m.conversation_id = p_conversation_id
    and m.sender_id <> auth.uid()
    and m.is_read = false
    and exists (
      select 1
      from public.conversations c
      where c.id = p_conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    );
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
create index if not exists conversations_participant_1_idx on public.conversations(participant_1);
create index if not exists conversations_participant_2_idx on public.conversations(participant_2);
