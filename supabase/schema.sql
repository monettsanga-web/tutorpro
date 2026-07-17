-- TutorPro English shared registration profiles
-- Run this file once in Supabase Dashboard → SQL Editor.

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
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, role, status, email, login_id, auth_provider,
    display_name, parent_name, full_name, profile_data
  ) values (
    new.id,
    coalesce(meta->>'role', 'student'),
    coalesce(meta->>'status', case when meta->>'role' = 'teacher' then 'pending' else 'active' end),
    new.email,
    coalesce(meta->>'login_id', new.email, new.phone),
    coalesce(meta->>'auth_provider', case when new.phone is not null then 'whatsapp' else 'email' end),
    meta->>'display_name',
    meta->'profile_data'->>'parentName',
    meta->'profile_data'->>'fullName',
    coalesce(meta->'profile_data', '{}'::jsonb)
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    profile_data = excluded.profile_data,
    updated_at = now();
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
