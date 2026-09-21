-- TutorPro Online English — shared dashboard announcements
-- Run once in Supabase Dashboard → SQL Editor. Safe to run repeatedly.
--
-- WHY THIS EXISTS
-- ---------------
-- Dashboard announcements used to live only in `localStorage`. That meant an
-- announcement was saved in the ADMIN's own browser and never travelled
-- anywhere, so parents and teachers never actually saw the banner — only the
-- email reached them. Storing them here makes the banner real: the admin
-- posts once, and every signed-in family sees it on their own device.
--
-- Rows are small (a subject, a body and a few translations), so this adds a
-- negligible amount of database egress.

create table if not exists public.announcements (
  id text primary key,
  subject text not null,
  body text not null,
  -- 'ALL' | 'STUDENT' | 'TEACHER'
  target text not null default 'ALL',
  -- Pre-translated copies, so each reader does not call the translation API.
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- When the banner stops being shown. The app also filters on this, but
  -- keeping it in the row lets expired records be deleted server-side.
  expires_at timestamptz not null
);

create index if not exists announcements_expires_at_idx
  on public.announcements (expires_at desc);

alter table public.announcements enable row level security;

-- Any signed-in person may READ announcements. Logged-out visitors get
-- nothing: an announcement is for families, not for the public website.
drop policy if exists "Signed-in users can read announcements" on public.announcements;
create policy "Signed-in users can read announcements"
  on public.announcements for select
  to authenticated
  using (true);

-- Only administrators may post or remove them.
drop policy if exists "Admins can write announcements" on public.announcements;
create policy "Admins can write announcements"
  on public.announcements for all
  to authenticated
  using (public.is_tutorpro_admin())
  with check (public.is_tutorpro_admin());

-- Live updates, so a parent with the dashboard already open sees a new
-- announcement appear, and sees a withdrawn one disappear, without
-- refreshing the page.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.announcements;
    exception when duplicate_object then
      null;
    end;
  end if;
end
$$;

select 'TutorPro announcements table is ready' as result;
