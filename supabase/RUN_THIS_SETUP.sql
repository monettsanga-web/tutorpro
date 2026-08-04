-- TutorPro Online English — run-once database setup
--
-- WHAT THIS DOES
--   1. Creates the site_settings table, which stores the Admin → Website
--      controls switch (public / parents-only / hidden teacher directory).
--      Without it that switch only applies to the browser you set it in.
--   2. Creates get_public_teachers(), the function the website uses to list
--      approved teachers. Without it the site falls back to placeholder
--      teachers instead of your real ones.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → paste all of this → Run.
--
-- Safe to run more than once. Nothing is deleted and no data is changed.

-- ===== 1. Website settings =====

-- TutorPro Online English — shared website settings
-- Run once in Supabase Dashboard → SQL Editor. Safe to run repeatedly.
--
-- Holds settings the administrator changes from the Admin dashboard, such as
-- whether the public teacher directory is visible to everyone, to logged-in
-- parents only, or hidden entirely.
--
-- Anyone may READ the settings (the website needs them before login).
-- Only administrators may WRITE them.

create table if not exists public.site_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, settings)
values ('public', jsonb_build_object('teacherDirectoryVisibility', 'public'))
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can change site settings" on public.site_settings;
create policy "Admins can change site settings"
  on public.site_settings for all
  to authenticated
  using (public.is_tutorpro_admin())
  with check (public.is_tutorpro_admin());

-- Live updates so a change on one admin device reaches every open browser.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.site_settings;
    exception when duplicate_object then
      null;
    end;
  end if;
end
$$;

select 'TutorPro site settings table is ready' as result;


-- ===== 2. Public teacher directory =====

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
    -- Admins can hide an individual teacher from the public directory.
    -- Absent flag means visible, so existing profiles are unaffected.
    and coalesce((p.profile_data->'teacher'->>'hiddenFromWebsite')::boolean, false) = false
  order by p.updated_at desc;
$$;

revoke all on function public.get_public_teachers() from public;
grant execute on function public.get_public_teachers() to anon, authenticated;

select 'TutorPro English approved teacher directory is ready' as result;
