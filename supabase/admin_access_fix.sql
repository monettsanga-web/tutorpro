-- TutorPro English administrator access repair
-- Safe to run more than once in Supabase SQL Editor.

create extension if not exists pgcrypto;

insert into public.profiles (
  id, role, status, email, login_id, auth_provider,
  display_name, full_name, profile_data
)
select
  id,
  'admin',
  'active',
  email,
  email,
  'email',
  'TutorPro English Administrator',
  'TutorPro English Administrator',
  jsonb_build_object(
    'id', id,
    'role', 'admin',
    'status', 'active',
    'fullName', 'TutorPro English Administrator',
    'email', email
  )
from auth.users
where encode(digest(lower(coalesce(email, '')), 'sha256'), 'hex') = 'bf6e66f2c7c1acfaa4a3899a3e054f5bf185f18456c35cde73c36c9176102a33'
on conflict (id) do update set
  role = 'admin',
  status = 'active',
  display_name = 'TutorPro English Administrator',
  full_name = 'TutorPro English Administrator',
  updated_at = now();

insert into public.admin_members(user_id)
select id
from auth.users
where encode(digest(lower(coalesce(email, '')), 'sha256'), 'hex') = 'bf6e66f2c7c1acfaa4a3899a3e054f5bf185f18456c35cde73c36c9176102a33'
on conflict (user_id) do nothing;

select p.id, p.role, p.status, p.display_name,
       exists(select 1 from public.admin_members a where a.user_id = p.id) as is_admin_member
from public.profiles p
where p.role = 'admin';
