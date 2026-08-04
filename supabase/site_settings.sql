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
