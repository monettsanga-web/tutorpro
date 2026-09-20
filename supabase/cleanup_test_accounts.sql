-- ============================================================
-- Remove the test accounts created while diagnosing PayPal
-- ============================================================
--
-- WHAT HAPPENED
-- -------------
-- To test the payment button I had to be signed in, because the checkout
-- API refuses anonymous requests. Each test signed up a throwaway user.
-- A database trigger (`on_tutorpro_user_created` in schema.sql) then
-- automatically created a matching row in `profiles` with role 'student',
-- which is why they appear in your Students list.
--
-- That was my mistake: those signups went to your LIVE database instead of
-- a test one. This file removes them.
--
-- WHY THIS IS SAFE
-- ----------------
-- Every account I made uses the domain `@example.com`, which is reserved by
-- internet standard (RFC 2606) and can NEVER belong to a real person or be
-- registered by anyone. No real parent can ever have such an address, so
-- matching on it cannot touch a genuine family.
--
-- Deleting the auth user cascades to `profiles`, so both disappear together.
--
-- HOW TO RUN
-- ----------
-- 1. Open https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/sql/new
-- 2. Paste STEP 1, press Run, and read the list.
-- 3. If it looks right, paste STEP 2 and press Run.


-- ============================================================
-- STEP 1 — LOOK FIRST. This deletes nothing.
-- ============================================================

select
  u.email,
  p.role,
  p.parent_name,
  u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where u.email like '%@example.com'
order by u.created_at desc;

-- I created 17 of these. Every one uses a timestamp, so the numbers differ,
-- but the prefix before the dot will be one of exactly these 13:
--
--   paypal.diag.…@example.com   (x2)  first PayPal API test
--   pp.diag.…@example.com       (x1)
--   realpay.…@example.com       (x2)  real-session checkout test
--   insp.…@example.com          (x1)  dashboard crash hunt
--   insp2.…@example.com         (x1)
--   insp3.…@example.com         (x1)  ← this one found the crash
--   insp4.…@example.com         (x1)
--   final.…@example.com         (x2)  post-fix verification
--   f2.…@example.com            (x1)
--   rc.…@example.com            (x1)  re-check after your screenshot
--   hdr.…@example.com           (x1)  PayPal response headers
--   cf.…@example.com            (x1)
--   dg.…@example.com            (x2)  the /api/paypal/diagnose endpoint
--
-- Step 1 shows you the true number. If it says 17, that is all of them and
-- nothing else has been affected.
--
-- 🔴 STOP if you see ANY address that is not @example.com.
--    Do not run Step 2. Tell me instead.


-- ============================================================
-- STEP 2 — DELETE. Only run after Step 1 looked correct.
-- ============================================================

-- Belt and braces: the WHERE clause is written so that even if it were
-- somehow run against the wrong table, it can only ever match the reserved
-- example.com domain. Your admin account (a real yahoo.com address) and
-- every real parent are impossible to match.

delete from auth.users
where email like '%@example.com';

-- The `profiles` row is removed automatically:
--   profiles.id references auth.users(id) ON DELETE CASCADE


-- ============================================================
-- STEP 3 — CONFIRM. Should return 0.
-- ============================================================

select count(*) as remaining_test_accounts
from auth.users
where email like '%@example.com';

-- And your real students are untouched:
select count(*) as real_student_profiles
from public.profiles
where role = 'student';
