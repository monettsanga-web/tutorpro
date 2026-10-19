-- TutorPro English interview upload policy fix
-- Run the complete file in Supabase Dashboard -> SQL Editor. Safe to run repeatedly.
--
-- Why: the storage upload policy checked the interview session with the
-- applicant's own role, but row-level security on teacher_interview_sessions
-- hides those rows from anon - so the check saw nothing and every recorded
-- answer was rejected with "new row violates row-level security policy".
-- The check now runs inside a security-definer helper that can see the
-- session row without exposing it to anyone.

create or replace function public.teacher_interview_upload_allowed(session_id text, token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_interview_sessions s
    where s.id::text = session_id
      and s.access_token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
      and s.completed_at is null
      and s.expires_at > now()
  );
$$;

revoke all on function public.teacher_interview_upload_allowed(text, text) from public;
grant execute on function public.teacher_interview_upload_allowed(text, text) to anon, authenticated;

drop policy if exists "Interview participants upload private recordings" on storage.objects;
create policy "Interview participants upload private recordings"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'teacher-interview-recordings'
    and public.teacher_interview_upload_allowed((storage.foldername(name))[1], (storage.foldername(name))[2])
  );

select 'TutorPro English interview upload policy fixed' as result;
