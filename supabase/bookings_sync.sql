-- TutorPro English shared bookings and classroom IDs
-- Run once in Supabase SQL Editor. Safe to run more than once.

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

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
end $$;

select 'TutorPro English bookings sync is ready' as result;
