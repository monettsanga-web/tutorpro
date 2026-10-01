-- ============================================================
-- URGENT · Stop a parent editing their own role and their own price
-- ============================================================
--
-- WHAT IS WRONG RIGHT NOW
-- -----------------------
-- The profiles table has this rule:
--
--     create policy "Users can update own profile"
--       on public.profiles for update
--       using (id = auth.uid()) with check (id = auth.uid());
--
-- It controls WHICH ROW someone may change. It does not control WHICH
-- COLUMNS. So anyone who signs up through the normal form can then send one
-- request to the database and rewrite their own row.
--
-- I tested both of these against the live site:
--
--   1. Set their own role to "admin".
--      -> succeeded (HTTP 200)
--
--   2. Give themselves 90% off.
--      -> a $16.00 order became $1.60 (verified through the real
--         /api/paypal/create-order endpoint)
--
-- The website code is not at fault: it deliberately reads the price from the
-- family's profile instead of from the web page, exactly so a parent cannot
-- name their own price. The gap is that the parent can edit the profile
-- itself.
--
-- WHAT THIS FILE DOES
-- -------------------
-- Keeps everything a parent SHOULD be able to change (their name, their
-- children, their timezone, their language) and freezes the four things only
-- you should control: their role, their account status, their pricing, and
-- any bill you have raised.
--
-- Nothing else changes. Administrators are unaffected: they update profiles
-- through the "Admins can update all profiles" policy, which this does not
-- touch.
--
-- HOW TO RUN IT
-- -------------
-- 1. Open https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/sql/new
-- 2. Copy EVERYTHING below the line marked "COPY FROM HERE".
-- 3. Paste it in and press Run.
-- 4. You should see "Success. No rows returned."
--
-- It is safe to run more than once.


-- ============================================================
-- COPY FROM HERE
-- ============================================================

create or replace function public.tutorpro_guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Administrators may change anything.
  --
  -- So may anything with no end-user attached: that is the website's own
  -- server key and the SQL editor. This exemption is NOT optional. Without
  -- it the first version of this file broke two things:
  --
  --   * a verified PayPal payment could no longer add the lessons it paid
  --     for, and a paid invoice stayed marked unpaid, because
  --     api/_paypal.js writes credits and clears paymentRequest with the
  --     server key;
  --   * a teacher created from the admin dashboard stayed a student,
  --     because api/teachers/create.js sets role on an existing row.
  --
  -- It is safe: a signed-out visitor cannot reach this trigger at all. The
  -- row-level security policy on profiles is `using (id = auth.uid())`,
  -- which matches no row when there is no user, so their UPDATE is refused
  -- before the trigger ever runs. Only the service key, which never leaves
  -- the server, gets here with no user.
  if auth.uid() is null or public.is_tutorpro_admin() then
    return new;
  end if;

  -- Everyone else keeps the values already stored for the fields that
  -- decide what they can see and what they pay.
  new.role   := old.role;
  new.status := old.status;

  -- Inside profile_data, the pricing arrangement and any bill you raised
  -- are yours, not theirs. Everything else in there is the family's own
  -- information and stays editable.
  --
  -- Take what the caller sent, remove the four protected keys, then put the
  -- stored values back. jsonb_strip_nulls drops any that were never set, so
  -- a family with no special pricing does not gain an empty "pricing": null.
  new.profile_data :=
      (coalesce(new.profile_data, '{}'::jsonb)
         - 'pricing' - 'discount' - 'paymentRequest' - 'credits')
      || jsonb_strip_nulls(jsonb_build_object(
           'pricing',        coalesce(old.profile_data, '{}'::jsonb) -> 'pricing',
           'discount',       coalesce(old.profile_data, '{}'::jsonb) -> 'discount',
           'paymentRequest', coalesce(old.profile_data, '{}'::jsonb) -> 'paymentRequest',
           'credits',        coalesce(old.profile_data, '{}'::jsonb) -> 'credits'
         ));

  return new;
end;
$$;

drop trigger if exists tutorpro_guard_profile_update on public.profiles;
create trigger tutorpro_guard_profile_update
  before update on public.profiles
  for each row execute function public.tutorpro_guard_profile_update();


-- ============================================================
-- CHECK IT WORKED (optional)
-- ============================================================
-- This should list one trigger:

select tgname as trigger_name
from pg_trigger
where tgrelid = 'public.profiles'::regclass
  and not tgisinternal;
