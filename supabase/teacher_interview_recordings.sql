-- TutorPro English private recorded teacher interviews
-- Run the complete file in Supabase Dashboard → SQL Editor. Safe to run repeatedly.

create extension if not exists pgcrypto;

create table if not exists public.teacher_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  access_token_hash text not null,
  applicant_name text not null,
  applicant_login text not null,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  completed_at timestamptz
);

create table if not exists public.teacher_interview_recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.teacher_interview_sessions(id) on delete cascade,
  question_index integer not null check (question_index between 0 and 13),
  stage text not null,
  question text not null,
  transcript text not null,
  storage_path text not null unique,
  mime_type text not null,
  byte_size integer not null,
  duration_seconds integer not null,
  created_at timestamptz not null default now(),
  unique (session_id, question_index)
);

create index if not exists teacher_interview_sessions_profile_idx on public.teacher_interview_sessions(profile_id);
create index if not exists teacher_interview_recordings_session_idx on public.teacher_interview_recordings(session_id, question_index);

alter table public.teacher_interview_sessions enable row level security;
alter table public.teacher_interview_recordings enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-interview-recordings',
  'teacher-interview-recordings',
  false,
  8388608,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Interview participants upload private recordings" on storage.objects;
create policy "Interview participants upload private recordings"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'teacher-interview-recordings'
    and exists (
      select 1
      from public.teacher_interview_sessions s
      where s.id::text = (storage.foldername(name))[1]
        and s.access_token_hash = encode(extensions.digest((storage.foldername(name))[2], 'sha256'), 'hex')
        and s.completed_at is null
        and s.expires_at > now()
    )
  );

drop policy if exists "Admins read private interview recordings" on storage.objects;
create policy "Admins read private interview recordings"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'teacher-interview-recordings' and public.is_tutorpro_admin());

drop policy if exists "Admins delete private interview recordings" on storage.objects;
create policy "Admins delete private interview recordings"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'teacher-interview-recordings' and public.is_tutorpro_admin());

drop policy if exists "Admins read interview sessions" on public.teacher_interview_sessions;
create policy "Admins read interview sessions"
  on public.teacher_interview_sessions for select
  to authenticated
  using (public.is_tutorpro_admin());

drop policy if exists "Admins read interview recording metadata" on public.teacher_interview_recordings;
create policy "Admins read interview recording metadata"
  on public.teacher_interview_recordings for select
  to authenticated
  using (public.is_tutorpro_admin());

create or replace function public.create_teacher_interview_session(
  applicant_name text,
  applicant_login text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
  access_token text := encode(extensions.gen_random_bytes(24), 'hex');
  normalized_name text := trim(applicant_name);
  normalized_login text := lower(regexp_replace(trim(applicant_login), '[[:space:]()-]', '', 'g'));
begin
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 100 then
    raise exception 'Enter a valid applicant name';
  end if;
  if char_length(normalized_login) < 3 or char_length(normalized_login) > 180 then
    raise exception 'Enter a valid applicant login';
  end if;
  if (
    select count(*) from public.teacher_interview_sessions s
    where s.applicant_login = normalized_login and s.created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Too many interview upload attempts. Please try again later.';
  end if;

  insert into public.teacher_interview_sessions (
    access_token_hash, applicant_name, applicant_login
  ) values (
    encode(extensions.digest(access_token, 'sha256'), 'hex'), normalized_name, normalized_login
  ) returning id into session_id;

  return jsonb_build_object('sessionId', session_id, 'accessToken', access_token);
end;
$$;

create or replace function public.verify_teacher_interview_access(
  target_session_id uuid,
  visitor_token text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teacher_interview_sessions s
    where s.id = target_session_id
      and s.access_token_hash = encode(extensions.digest(visitor_token, 'sha256'), 'hex')
      and s.completed_at is null
      and s.expires_at > now()
  );
$$;

create or replace function public.register_teacher_interview_recording(
  target_session_id uuid,
  visitor_token text,
  answer_index integer,
  answer_stage text,
  answer_question text,
  answer_transcript text,
  uploaded_path text,
  mime_type text,
  byte_size integer,
  duration_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.verify_teacher_interview_access(target_session_id, visitor_token) then
    raise exception 'Interview session could not be verified';
  end if;
  if answer_index < 0 or answer_index > 13 then raise exception 'Invalid interview question number'; end if;
  if char_length(trim(answer_stage)) < 1 or char_length(answer_stage) > 100 then raise exception 'Invalid interview stage'; end if;
  if char_length(trim(answer_question)) < 1 or char_length(answer_question) > 1000 then raise exception 'Invalid interview question'; end if;
  if char_length(trim(answer_transcript)) < 8 or char_length(answer_transcript) > 5000 then raise exception 'Invalid interview transcript'; end if;
  if uploaded_path not like (target_session_id::text || '/' || visitor_token || '/%') then raise exception 'Recording path could not be verified'; end if;
  if mime_type not in ('audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav') then raise exception 'Recording type is not allowed'; end if;
  if byte_size < 1 or byte_size > 8388608 then raise exception 'Recording must be smaller than 8 MB'; end if;
  if duration_seconds < 1 or duration_seconds > 300 then raise exception 'Recording must be five minutes or shorter'; end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'teacher-interview-recordings' and o.name = uploaded_path
  ) then raise exception 'Uploaded recording was not found'; end if;

  insert into public.teacher_interview_recordings (
    session_id, question_index, stage, question, transcript,
    storage_path, mime_type, byte_size, duration_seconds
  ) values (
    target_session_id, answer_index, trim(answer_stage), trim(answer_question), trim(answer_transcript),
    uploaded_path, mime_type, byte_size, duration_seconds
  )
  on conflict (session_id, question_index) do update set
    stage = excluded.stage,
    question = excluded.question,
    transcript = excluded.transcript,
    storage_path = excluded.storage_path,
    mime_type = excluded.mime_type,
    byte_size = excluded.byte_size,
    duration_seconds = excluded.duration_seconds,
    created_at = now();
  return true;
end;
$$;

create or replace function public.complete_teacher_interview_session(
  target_session_id uuid,
  visitor_token text,
  target_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_login text;
  profile_login text;
begin
  if not public.verify_teacher_interview_access(target_session_id, visitor_token) then
    raise exception 'Interview session could not be verified';
  end if;
  select s.applicant_login into session_login
  from public.teacher_interview_sessions s where s.id = target_session_id;
  select lower(regexp_replace(trim(coalesce(p.login_id, p.email, '')), '[[:space:]()-]', '', 'g'))
  into profile_login
  from public.profiles p where p.id = target_profile_id and p.role = 'teacher';
  if profile_login is null or (profile_login <> session_login and auth.uid() is distinct from target_profile_id) then
    raise exception 'The recording does not match this teacher profile';
  end if;
  if (select count(*) from public.teacher_interview_recordings r where r.session_id = target_session_id) < 14 then
    raise exception 'The recorded interview is incomplete';
  end if;
  update public.teacher_interview_sessions
  set profile_id = target_profile_id, completed_at = now()
  where id = target_session_id;
  return found;
end;
$$;

create or replace function public.get_admin_teacher_interview_recordings(target_session_id uuid)
returns table (
  question_index integer,
  stage text,
  question text,
  transcript text,
  storage_path text,
  mime_type text,
  byte_size integer,
  duration_seconds integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.question_index, r.stage, r.question, r.transcript, r.storage_path,
         r.mime_type, r.byte_size, r.duration_seconds, r.created_at
  from public.teacher_interview_recordings r
  join public.teacher_interview_sessions s on s.id = r.session_id
  where public.is_tutorpro_admin()
    and s.id = target_session_id
    and s.completed_at is not null
  order by r.question_index;
$$;

revoke all on function public.create_teacher_interview_session(text, text) from public;
revoke all on function public.verify_teacher_interview_access(uuid, text) from public;
revoke all on function public.register_teacher_interview_recording(uuid, text, integer, text, text, text, text, text, integer, integer) from public;
revoke all on function public.complete_teacher_interview_session(uuid, text, uuid) from public;
revoke all on function public.get_admin_teacher_interview_recordings(uuid) from public;

grant execute on function public.create_teacher_interview_session(text, text) to anon, authenticated;
grant execute on function public.register_teacher_interview_recording(uuid, text, integer, text, text, text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.complete_teacher_interview_session(uuid, text, uuid) to anon, authenticated;
grant execute on function public.get_admin_teacher_interview_recordings(uuid) to authenticated;

select 'TutorPro English recorded teacher interviews are ready' as result;
