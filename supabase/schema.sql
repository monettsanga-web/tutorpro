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
    check (status in ('pending', 'confirmed', 'ongoing', 'completed', 'absent', 'cancelled', 'declined')),
  booking_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'ongoing', 'completed', 'absent', 'cancelled', 'declined'));

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

-- Short-lived signaling messages provide an HTTPS/polling fallback when a
-- browser, school network or region blocks Supabase Realtime WebSockets.
create table if not exists public.classroom_signals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  room_id text not null check (char_length(room_id) between 8 and 64),
  sender_id text not null check (char_length(sender_id) between 3 and 120),
  sender_user_id uuid not null default auth.uid(),
  signal_type text not null check (signal_type in ('join-request', 'offer', 'answer', 'ice', 'annotation-permission', 'screen-state')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (octet_length(payload::text) <= 131072)
);

create index if not exists classroom_signals_booking_created_idx
  on public.classroom_signals(booking_id, created_at desc);

alter table public.classroom_signals enable row level security;

drop policy if exists "Classroom participants read signals" on public.classroom_signals;
create policy "Classroom participants read signals"
  on public.classroom_signals for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.student_id = auth.uid()::text
          or b.teacher_id = auth.uid()::text
          or public.is_tutorpro_admin()
        )
    )
  );

drop policy if exists "Classroom participants send signals" on public.classroom_signals;
create policy "Classroom participants send signals"
  on public.classroom_signals for insert
  to authenticated
  with check (
    (sender_user_id = auth.uid() or public.is_tutorpro_admin())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.student_id = auth.uid()::text
          or b.teacher_id = auth.uid()::text
          or public.is_tutorpro_admin()
        )
    )
  );

drop policy if exists "Classroom participants remove own signals" on public.classroom_signals;
create policy "Classroom participants remove own signals"
  on public.classroom_signals for delete
  to authenticated
  using (sender_user_id = auth.uid() or public.is_tutorpro_admin());

grant select, insert, delete on public.classroom_signals to authenticated;

create or replace function public.prune_expired_classroom_signals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.classroom_signals where created_at < now() - interval '15 minutes';
  return new;
end;
$$;

drop trigger if exists prune_classroom_signals_on_insert on public.classroom_signals;
create trigger prune_classroom_signals_on_insert
  before insert on public.classroom_signals
  for each statement execute function public.prune_expired_classroom_signals();

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.classroom_signals;
exception
  when duplicate_object then null;
end $$;

select 'TutorPro English bookings and classroom signaling are ready' as result;

-- Secure administrator-only teacher deletion (Auth user, profile and bookings).
create or replace function public.delete_teacher_profile(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
begin
  if not public.is_tutorpro_admin() then
    raise exception 'Administrator access is required';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'An administrator cannot delete their own account here';
  end if;

  select role into target_role from public.profiles where id = target_user_id;
  if target_role is null then return false; end if;
  if target_role <> 'teacher' then
    raise exception 'Only teacher profiles can be deleted with this function';
  end if;

  delete from public.bookings where teacher_id = target_user_id::text;
  if to_regclass('public.teacher_interview_sessions') is not null then
    execute $cleanup$
      delete from storage.objects
      where bucket_id = 'teacher-interview-recordings'
        and name in (
          select r.storage_path
          from public.teacher_interview_recordings r
          join public.teacher_interview_sessions s on s.id = r.session_id
          where s.profile_id = $1
        )
    $cleanup$ using target_user_id;
  end if;
  delete from auth.users where id = target_user_id;
  return found;
end;
$$;

revoke all on function public.delete_teacher_profile(uuid) from public;
grant execute on function public.delete_teacher_profile(uuid) to authenticated;

-- Public, sanitized directory used by the homepage and student booking screen.
create or replace function public.get_public_teachers()
returns table (id uuid, full_name text, teacher jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    coalesce(nullif(p.full_name, ''), nullif(p.display_name, ''), 'TutorPro English Teacher'),
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
    ),
    p.updated_at
  from public.profiles p
  where p.role = 'teacher' and p.status = 'approved'
  order by p.updated_at desc;
$$;

revoke all on function public.get_public_teachers() from public;
grant execute on function public.get_public_teachers() to anon, authenticated;
