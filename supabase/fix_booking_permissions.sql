-- ============================================================================
-- TutorPro Online English
-- FIX: "new row violates row-level security policy for table bookings"
--      Teachers can see their lessons but every save is refused, so feedback
--      and "completed" statuses never reach the other devices.
-- ----------------------------------------------------------------------------
-- HOW TO RUN
--   1. Open https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/sql/new
--   2. Paste this whole file in.
--   3. Press RUN.
--   4. Copy the three result tables it prints and send them back.
--
-- This changes PERMISSIONS ONLY. It does not touch, move or delete a single
-- lesson, feedback note, booking or account. Safe to run more than once.
--
-- WHY THIS HAPPENED
--   The rule for who may CREATE a booking listed only the student and the
--   admin, not the teacher. The app saved with an "upsert" (save-or-create in
--   one step), and PostgreSQL checks the CREATE rule on every row an upsert
--   offers it -- even when the row already exists and it only ends up updating
--   it. So a teacher saving feedback on an existing lesson was judged by the
--   "may this teacher create bookings?" rule, failed it, and was refused every
--   single time. Nothing was wrong with the login, the account or the network.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1 OF 3 -- THE FIX: let teachers write to their own lessons
-- ----------------------------------------------------------------------------

drop policy if exists "Students and admins can create bookings" on public.bookings;
drop policy if exists "Participants and admins can create bookings" on public.bookings;

create policy "Participants and admins can create bookings"
  on public.bookings for insert
  with check (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
    or public.is_tutorpro_admin()
  );

-- Make sure the read and update rules are right too, so a teacher can both
-- see and change their own lessons. Unchanged in meaning; re-stated so one
-- run of this file leaves everything in a known-good state.

drop policy if exists "Participants can read bookings" on public.bookings;
create policy "Participants can read bookings"
  on public.bookings for select
  using (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
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


-- ----------------------------------------------------------------------------
-- RESULT 1 -- confirm the new rules are in place
-- Expect four rows: INSERT, SELECT, UPDATE, DELETE.
-- The INSERT row must now mention teacher_id.
-- ----------------------------------------------------------------------------

select
  cmd                        as applies_to,
  policyname                 as policy_name,
  coalesce(with_check, qual) as the_rule
from pg_policies
where schemaname = 'public'
  and tablename  = 'bookings'
order by cmd;


-- ----------------------------------------------------------------------------
-- RESULT 2 -- how many lessons actually reached the shared database
--
-- If total_lessons is 0 or far below 159, the lessons live only on the laptop
-- and have to be CREATED in the cloud -- which is exactly what the old rule
-- forbade, and what STEP 1 above has just allowed.
-- ----------------------------------------------------------------------------

select
  count(*)                                          as total_lessons,
  count(*) filter (where status = 'completed')      as completed,
  count(*) filter (where booking_data ? 'teacherFeedback'
                     and booking_data->>'teacherFeedback' <> '') as with_feedback,
  min(created_at)::date                             as earliest,
  max(created_at)::date                             as latest
from public.bookings;


-- ----------------------------------------------------------------------------
-- RESULT 3 -- does every lesson point at a real login?
--
-- teacher_has_login must be TRUE. If it says FALSE, that teacher's lessons are
-- filed under an id that does not belong to any account, and no permission
-- rule can ever let them save -- the lessons would need re-linking. This is
-- the one remaining thing I cannot see from outside, so please send this back.
-- ----------------------------------------------------------------------------

select
  b.teacher_id,
  count(*)                        as lessons,
  exists (select 1 from auth.users u where u.id::text = b.teacher_id) as teacher_has_login,
  coalesce(
    (select p.full_name from public.profiles p where p.id::text = b.teacher_id),
    '(no profile row)'
  )                               as teacher_name
from public.bookings b
group by b.teacher_id
order by lessons desc;


select 'Done. Teachers can now save lessons to the shared database.' as result;
