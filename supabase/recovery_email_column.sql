-- TutorPro: make the password-recovery email visible as its own profile column.
-- Run once in Supabase Dashboard -> SQL Editor.
-- Safe to run repeatedly.

alter table public.profiles
  add column if not exists recovery_email text;

-- Move any recovery emails that were already saved inside profile_data.
update public.profiles
set recovery_email = nullif(profile_data->>'recoveryEmail', '')
where recovery_email is null
  and nullif(profile_data->>'recoveryEmail', '') is not null;

comment on column public.profiles.recovery_email is
  'Optional email used only for password reset. It does not replace the login email.';

select id, parent_name, login_id, email, recovery_email
from public.profiles
where recovery_email is not null
order by updated_at desc;
