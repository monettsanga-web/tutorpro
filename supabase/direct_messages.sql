-- =============================================================================
-- Direct messages between admin, teachers and parents — with email alerts
-- =============================================================================
-- Run this once in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/sql/new
--
-- WHY THIS IS NEEDED
-- ------------------
-- Direct chat currently writes to the browser's localStorage only. That means
-- a message you send is saved on YOUR device and never reaches the other
-- person at all — they see nothing, on any device, ever. No email could be
-- sent for it either, because the server never learns the message exists.
--
-- This table makes messages real: they are stored centrally, delivered to the
-- other person's dashboard on any device, and can trigger an email.
--
-- SAFETY
-- ------
-- This only CREATES a new table. It does not touch profiles, bookings,
-- payments, support chat or any existing data or policy.
-- =============================================================================

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  -- Both sides of the conversation, so either can read the thread.
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  -- Set once the recipient opens the thread; drives the unread badge.
  read_at timestamptz,
  -- Set once an email alert has gone out, so a resend or a retry can never
  -- email the same message twice.
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

-- A thread is looked up by the pair of people in it, newest last.
create index if not exists direct_messages_pair_idx
  on public.direct_messages (sender_id, recipient_id, created_at);
create index if not exists direct_messages_recipient_idx
  on public.direct_messages (recipient_id, read_at);

alter table public.direct_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Policies: you may only ever see or write your own conversations.
-- ---------------------------------------------------------------------------
drop policy if exists "read own conversations" on public.direct_messages;
create policy "read own conversations" on public.direct_messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- You can only send AS yourself. Without this check a user could forge a
-- message that appears to come from someone else.
drop policy if exists "send as self" on public.direct_messages;
create policy "send as self" on public.direct_messages
  for insert with check (auth.uid() = sender_id);

-- The recipient marks messages read. Restricted to rows addressed to them.
drop policy if exists "recipient marks read" on public.direct_messages;
create policy "recipient marks read" on public.direct_messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- Live delivery to an open dashboard, the same mechanism bookings already use.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;

-- =============================================================================
-- Check it worked — this should return the three policies above.
-- =============================================================================
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'direct_messages'
order by policyname;
