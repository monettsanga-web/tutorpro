-- TutorPro English secure teacher profile deletion
-- Run once in Supabase Dashboard → SQL Editor. Safe to run repeatedly.
-- This avoids exposing a service_role key to the browser.

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

  select role into target_role
  from public.profiles
  where id = target_user_id;

  if target_role is null then
    return false;
  end if;

  if target_role <> 'teacher' then
    raise exception 'Only teacher profiles can be deleted with this function';
  end if;

  -- Bookings store participant IDs as text, so remove them before the Auth user.
  delete from public.bookings where teacher_id = target_user_id::text;

  -- Remove private applicant audio when recorded-interview storage is enabled.
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

select 'TutorPro English secure teacher deletion is ready' as result;
