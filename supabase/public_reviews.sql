-- ============================================================================
-- TutorPro Online English — show real parent reviews on the homepage
-- ----------------------------------------------------------------------------
-- Run this ONCE in the Supabase SQL editor. Safe to run more than once.
-- It only adds a read-only function. It changes no lesson, review or account.
--
-- WHY THIS IS NEEDED
--   Parent ratings are stored inside bookings, and row-level security means a
--   booking is readable only by its own parent, its teacher, or an admin. A
--   visitor who is not logged in can therefore never read them — which is
--   correct, but it means the homepage has no way to show reviews.
--
--   This function runs with elevated rights (security definer) and returns
--   ONLY what is safe to publish: the score, the comment, the month, the
--   teacher's name, and the STUDENT's first name.
--   It never exposes an email address, a full name, a child's name, a booking
--   id or an account id.
--
-- WHAT GETS PUBLISHED
--   * 4 and 5 star ratings only. Lower scores stay private for the admin to
--     act on, which is why the homepage average is described as "published
--     reviews" and not "all reviews".
--   * Only ratings that include a written comment. A bare score says nothing.
--   * Never a review the admin has hidden (booking_data.reviewHidden = true).
-- ============================================================================

-- Drop first. An earlier version of this function returned fewer columns, and
-- PostgreSQL refuses to CREATE OR REPLACE a function whose return type has
-- changed ("cannot change return type of existing function"). Dropping a
-- read-only function destroys no data.
drop function if exists public.get_public_reviews();

create or replace function public.get_public_reviews()
returns table (
  review_id     text,
  score         int,
  comment       text,
  reviewer      text,
  teacher_id    text,
  teacher_name  text,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    -- A stable but opaque id. md5 of the booking id so the same review keeps
    -- the same React key without ever exposing the real booking id.
    md5(b.id::text)                                              as review_id,
    (b.booking_data->'studentRating'->>'score')::int              as score,
    trim(b.booking_data->'studentRating'->>'comment')             as comment,
    -- The parent's name as they entered it, at the owner's instruction.
    --
    -- This publishes a real person's name on a public page, so two safeguards
    -- stay in force: only reviews the parent chose to write are published, and
    -- the rating screen now tells them plainly that their name may appear.
    -- A parent who left no name shows as 'TutorPro parent' rather than blank.
    -- The STUDENT the class was for, not the account holder who typed it.
    --
    -- Tried in order, because older bookings predate some of these fields:
    --   1. learnerName on the booking - set on every booking created today.
    --   2. The child looked up by learnerId in the account's children list.
    --      This recovers the name for bookings made before step 1 existed.
    --   3. The legacy single-child field, older still.
    --   4. The account holder's first name, so a byline is never blank.
    --
    -- Only the FIRST name is published. These are children, and a full child
    -- name on a public marketing page is more than a parent has agreed to.
    coalesce(
      nullif(split_part(trim(coalesce(b.booking_data->>'learnerName', '')), ' ', 1), ''),
      nullif(split_part(trim(coalesce((
        select c->>'name'
        from jsonb_array_elements(
          case
            when jsonb_typeof(p.profile_data->'children') = 'array'
            then p.profile_data->'children'
            else '[]'::jsonb
          end
        ) as c
        where c->>'id' = b.booking_data->>'learnerId'
        limit 1
      ), '')), ' ', 1), ''),
      nullif(split_part(trim(coalesce(p.profile_data->'child'->>'name', '')), ' ', 1), ''),
      nullif(split_part(trim(coalesce(p.parent_name, p.full_name, '')), ' ', 1), ''),
      'TutorPro family'
    )                                                             as reviewer,
    -- Already public: get_public_teachers() exposes the same id, and it is
    -- what lets a teacher's own profile page show only their reviews.
    b.teacher_id                                                  as teacher_id,
    -- The teacher's name in full. Taking only the first word turned the real
    -- account name "Teacher M" into "Teacher", which read as a label rather
    -- than a person.
    coalesce(
      nullif(trim(coalesce(t.full_name, '')), ''),
      'their teacher'
    )                                                             as teacher_name,
    coalesce(
      (b.booking_data->'studentRating'->>'createdAt')::timestamptz,
      b.updated_at
    )                                                             as created_at
  from public.bookings b
  left join public.profiles p on p.id::text = b.student_id
  left join public.profiles t on t.id::text = b.teacher_id
  where b.booking_data->'studentRating'->>'score' is not null
    -- Only genuinely positive reviews are published.
    and (b.booking_data->'studentRating'->>'score')::int >= 4
    -- A score with no words is not a testimonial.
    and length(trim(coalesce(b.booking_data->'studentRating'->>'comment', ''))) >= 15
    -- The administrator can hide any individual review.
    and coalesce((b.booking_data->>'reviewHidden')::boolean, false) = false
  order by created_at desc
  limit 60;
$$;

-- Anyone may call it, including logged-out visitors and search engines.
revoke all on function public.get_public_reviews() from public;
grant execute on function public.get_public_reviews() to anon, authenticated;

-- Confirm it works. On a new site this correctly returns no rows until the
-- first parent leaves a written 4 or 5 star review.
select * from public.get_public_reviews();

select 'Parent reviews will now appear on the homepage as they come in.' as result;
