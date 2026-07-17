-- TutorPro English shared registration profiles
-- Run this file once in Supabase Dashboard → SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'admin')),
  status text not null default 'active',
  email text,
  login_id text,
  auth_provider text not null default 'email',
  display_name text,
  parent_name text,
  full_name text,
  profile_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.admin_members enable row level security;

create or replace function public.is_tutorpro_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_members where user_id = auth.uid());
$$;

create or replace function public.handle_tutorpro_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  authorized_admin boolean := encode(digest(lower(coalesce(new.email, '')), 'sha256'), 'hex') = 'bf6e66f2c7c1acfaa4a3899a3e054f5bf185f18456c35cde73c36c9176102a33';
  resolved_role text := case when authorized_admin then 'admin' else coalesce(meta->>'role', 'student') end;
  resolved_status text := case when authorized_admin then 'active' else coalesce(meta->>'status', case when meta->>'role' = 'teacher' then 'pending' else 'active' end) end;
begin
  insert into public.profiles (
    id, role, status, email, login_id, auth_provider,
    display_name, parent_name, full_name, profile_data
  ) values (
    new.id,
    resolved_role,
    resolved_status,
    new.email,
    coalesce(meta->>'login_id', new.email, new.phone),
    coalesce(meta->>'auth_provider', case when new.phone is not null then 'whatsapp' else 'email' end),
    case when authorized_admin then 'TutorPro English Administrator' else meta->>'display_name' end,
    meta->'profile_data'->>'parentName',
    case when authorized_admin then 'TutorPro English Administrator' else meta->'profile_data'->>'fullName' end,
    coalesce(meta->'profile_data', '{}'::jsonb)
  )
  on conflict (id) do update set
    role = excluded.role,
    status = excluded.status,
    email = excluded.email,
    login_id = excluded.login_id,
    auth_provider = excluded.auth_provider,
    display_name = excluded.display_name,
    parent_name = excluded.parent_name,
    full_name = excluded.full_name,
    profile_data = excluded.profile_data,
    updated_at = now();

  if authorized_admin then
    insert into public.admin_members(user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_tutorpro_user_created on auth.users;
create trigger on_tutorpro_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute procedure public.handle_tutorpro_user();

create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_tutorpro_admin());

create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_tutorpro_admin())
  with check (public.is_tutorpro_admin());

create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.is_tutorpro_admin());

create policy "Users can check own admin membership"
  on public.admin_members for select
  using (user_id = auth.uid());

-- Enable real-time profile updates. Ignore the duplicate-object error if already enabled.
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;

-- After creating the administrator in Authentication → Users, replace the UUID and run:
-- insert into public.admin_members(user_id) values ('YOUR-ADMIN-AUTH-USER-UUID');
-- TutorPro English shared bookings and classroom IDs
-- Run once in Supabase SQL Editor. Safe to run more than once.

create table if not exists public.bookings (
  id uuid primary key,
  student_id text not null,
  teacher_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'declined')),
  booking_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_student_id_idx on public.bookings(student_id);
create index if not exists bookings_teacher_id_idx on public.bookings(teacher_id);
create index if not exists bookings_status_idx on public.bookings(status);

alter table public.bookings enable row level security;

drop policy if exists "Participants can read bookings" on public.bookings;
create policy "Participants can read bookings"
  on public.bookings for select
  using (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
    or public.is_tutorpro_admin()
  );

drop policy if exists "Students and admins can create bookings" on public.bookings;
create policy "Students and admins can create bookings"
  on public.bookings for insert
  with check (
    student_id = auth.uid()::text
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

drop policy if exists "Participants and admins can delete bookings" on public.bookings;
create policy "Participants and admins can delete bookings"
  on public.bookings for delete
  using (
    student_id = auth.uid()::text
    or teacher_id = auth.uid()::text
    or public.is_tutorpro_admin()
  );

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
end $$;

select 'TutorPro English bookings sync is ready' as result;
