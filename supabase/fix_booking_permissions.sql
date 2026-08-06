-- ============================================================================
-- TutorPro Online English — fix teacher saves being rejected by the database
-- ----------------------------------------------------------------------------
-- Run this ONCE in the Supabase SQL editor. Safe to run more than once.
-- It changes permissions only. It does not touch, move or delete any lesson,
-- feedback, booking or account.
--
-- THE PROBLEM THIS FIXES
-- ----------------------
-- Teachers could read their lessons but every save was refused, so feedback
-- and "completed" statuses written on one laptop never reached the others.
--
-- The bookings table let students and admins INSERT, but not teachers:
--
--     with check (student_id = auth.uid()::text or public.is_tutorpro_admin())
--
-- The app saved with an "upsert" (INSERT ... ON CONFLICT DO UPDATE). PostgreSQL
-- checks the INSERT policy for every row an upsert proposes, even when the row
-- already exists and the UPDATE path is taken. So a teacher updating an
-- existing lesson was judged by the INSERT rule, failed it, and was rejected
-- every single time — while the login, the account and the network were all
-- fine.
--
-- The app no longer upserts existing lessons, so it works without this file.
-- This script closes the hole properly so the same trap cannot come back.
-- ============================================================================

drop policy if exists "Students and admins can create bookings" on public.bookings;
drop policy if exists "Participants and admins can create bookings" on public.bookings;

create policy "Participants and admins can create bookings"
  on public.bookings for insert
  with check (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
    or public.is_tutorpro_admin()
  );

-- Confirm what is now in place. Expect four rows: create / read / update /
-- delete, and the create row should mention teacher_id.
select
  policyname   as policy,
  cmd          as applies_to,
  coalesce(with_check, qual) as rule
from pg_policies
where schemaname = 'public'
  and tablename = 'bookings'
order by cmd;

select 'Teachers can now save lessons to the shared database' as result;
