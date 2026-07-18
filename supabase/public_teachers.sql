-- TutorPro English public approved-teacher directory
-- Run once in Supabase Dashboard → SQL Editor. Safe to run repeatedly.
-- Returns only public profile fields; login details and classroom links stay private.

create or replace function public.get_public_teachers()
returns table (
  id uuid,
  full_name text,
  teacher jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    coalesce(nullif(p.full_name, ''), nullif(p.display_name, ''), 'TutorPro English Teacher') as full_name,
    jsonb_build_object(
      'specialization', coalesce(p.profile_data->'teacher'->>'specialization', 'Both Curricula'),
      'bio', coalesce(p.profile_data->'teacher'->>'bio', 'TutorPro English teacher profile.'),
      'education', coalesce(p.profile_data->'teacher'->>'education', 'To be updated'),
      'experience', coalesce((p.profile_data->'teacher'->>'experience')::numeric, 0),
      'languages', coalesce(p.profile_data->'teacher'->>'languages', 'English'),
      'rating', coalesce((p.profile_data->'teacher'->>'rating')::numeric, 0),
      'ratingCount', coalesce((p.profile_data->'teacher'->>'ratingCount')::integer, 0),
      'lessonsCompleted', coalesce((p.profile_data->'teacher'->>'lessonsCompleted')::integer, 0),
      'availabilitySlots', coalesce(p.profile_data->'teacher'->'availabilitySlots', '[]'::jsonb)
    ) as teacher,
    p.updated_at
  from public.profiles p
  where p.role = 'teacher'
    and p.status = 'approved'
  order by p.updated_at desc;
$$;

revoke all on function public.get_public_teachers() from public;
grant execute on function public.get_public_teachers() to anon, authenticated;

select 'TutorPro English approved teacher directory is ready' as result;
