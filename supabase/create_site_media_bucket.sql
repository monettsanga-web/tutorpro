-- ============================================================================
-- TutorPro Online English — a public folder for website media
-- ----------------------------------------------------------------------------
-- Creates a storage bucket called "site-media" that anyone can READ but only
-- you (signed in) can change. This is where the class video goes.
--
-- HOW TO RUN
--   1. Open https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/sql/new
--   2. Paste this whole file in.
--   3. Press RUN.
--
-- Safe to run more than once. It creates a new empty folder and touches
-- nothing that already exists — no lessons, no accounts, no bookings.
-- ============================================================================

-- A public bucket: visitors can watch the video without logging in.
insert into storage.buckets (id, name, public, file_size_limit)
values ('site-media', 'site-media', true, 104857600)   -- 100 MB ceiling
on conflict (id) do update
  set public = true,
      file_size_limit = 104857600;

-- Anyone may read. This is what lets the video play for visitors.
drop policy if exists "Public can read site media" on storage.objects;
create policy "Public can read site media"
  on storage.objects for select
  using (bucket_id = 'site-media');

-- Only signed-in staff may add, replace or remove files.
drop policy if exists "Signed in users can upload site media" on storage.objects;
create policy "Signed in users can upload site media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-media');

drop policy if exists "Signed in users can update site media" on storage.objects;
create policy "Signed in users can update site media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-media')
  with check (bucket_id = 'site-media');

drop policy if exists "Signed in users can delete site media" on storage.objects;
create policy "Signed in users can delete site media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-media');

-- Confirm it worked. Expect one row: site-media, public = true.
select id, name, public, file_size_limit
from storage.buckets
where id = 'site-media';

select 'Ready. Now upload your video to the site-media bucket.' as result;
