-- TutorPro English shared bookings, classroom IDs and durable WebRTC signaling
-- Run the complete file in Supabase SQL Editor. Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key,
  student_id text not null,
  teacher_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'declined')),
  booking_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_student_id_idx on public.bookings(student_id);
create index if not exists bookings_teacher_id_idx on public.bookings(teacher_id);
create index if not exists bookings_status_idx on public.bookings(status);

alter table public.bookings enable row level security;

drop policy if exists "Participants can read bookings" on public.bookings;
create policy "Participants can read bookings"
  on public.bookings for select
  using (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
    or public.is_tutorpro_admin()
  );

drop policy if exists "Students and admins can create bookings" on public.bookings;
create policy "Students and admins can create bookings"
  on public.bookings for insert
  with check (
    student_id = auth.uid()::text
    or public.is_tutorpro_admin()
  );

drop policy if exists "Participants and admins can update bookings" on public.bookings;
create policy "Participants and admins can update bookings"
  on public.bookings for update
  using (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
    or public.is_tutorpro_admin()
  )
  with check (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
    or public.is_tutorpro_admin()
  );

drop policy if exists "Participants and admins can delete bookings" on public.bookings;
create policy "Participants and admins can delete bookings"
  on public.bookings for delete
  using (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
    or public.is_tutorpro_admin()
  );

-- Short-lived signaling messages provide an HTTPS/polling fallback when a
-- browser, school network or region blocks Supabase Realtime WebSockets.
create table if not exists public.classroom_signals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  room_id text not null check (char_length(room_id) between 8 and 64),
  sender_id text not null check (char_length(sender_id) between 3 and 120),
  sender_user_id uuid not null default auth.uid(),
  signal_type text not null check (signal_type in ('join-request', 'offer', 'answer', 'ice', 'annotation-permission', 'screen-state')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (octet_length(payload::text) <= 131072)
);

create index if not exists classroom_signals_booking_created_idx
  on public.classroom_signals(booking_id, created_at desc);

alter table public.classroom_signals enable row level security;

drop policy if exists "Classroom participants read signals" on public.classroom_signals;
create policy "Classroom participants read signals"
  on public.classroom_signals for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.student_id = auth.uid()::text
          or b.teacher_id = auth.uid()::text
          or public.is_tutorpro_admin()
        )
    )
  );

drop policy if exists "Classroom participants send signals" on public.classroom_signals;
create policy "Classroom participants send signals"
  on public.classroom_signals for insert
  to authenticated
  with check (
    (sender_user_id = auth.uid() or public.is_tutorpro_admin())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.student_id = auth.uid()::text
          or b.teacher_id = auth.uid()::text
          or public.is_tutorpro_admin()
        )
    )
  );

drop policy if exists "Classroom participants remove own signals" on public.classroom_signals;
create policy "Classroom participants remove own signals"
  on public.classroom_signals for delete
  to authenticated
  using (sender_user_id = auth.uid() or public.is_tutorpro_admin());

grant select, insert, delete on public.classroom_signals to authenticated;

create or replace function public.prune_expired_classroom_signals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.classroom_signals where created_at < now() - interval '15 minutes';
  return new;
end;
$$;

drop trigger if exists prune_classroom_signals_on_insert on public.classroom_signals;
create trigger prune_classroom_signals_on_insert
  before insert on public.classroom_signals
  for each statement execute function public.prune_expired_classroom_signals();

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.classroom_signals;
exception
  when duplicate_object then null;
end $$;

select 'TutorPro English bookings and classroom signaling are ready' as result;
