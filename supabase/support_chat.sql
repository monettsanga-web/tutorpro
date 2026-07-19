-- TutorPro English bilingual parent-to-administrator support chat
-- Run once in Supabase Dashboard → SQL Editor. Safe to run repeatedly.

create extension if not exists pgcrypto;

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  access_token_hash text not null,
  parent_name text not null,
  email text not null,
  language text not null default 'en',
  account_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender text not null check (sender in ('parent', 'admin')),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.support_messages add column if not exists attachment_path text;
alter table public.support_messages add column if not exists attachment_name text;
alter table public.support_messages add column if not exists attachment_type text;
alter table public.support_messages add column if not exists attachment_size integer;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists support_conversations_updated_idx on public.support_conversations(updated_at desc);
create index if not exists support_messages_conversation_idx on public.support_messages(conversation_id, created_at);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "Admins manage support conversations" on public.support_conversations;
create policy "Admins manage support conversations"
  on public.support_conversations for all
  using (public.is_tutorpro_admin())
  with check (public.is_tutorpro_admin());

drop policy if exists "Admins manage support messages" on public.support_messages;
create policy "Admins manage support messages"
  on public.support_messages for all
  using (public.is_tutorpro_admin())
  with check (public.is_tutorpro_admin());

drop policy if exists "Support participants upload attachments" on storage.objects;
create policy "Support participants upload attachments"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'support-attachments'
    and (
      public.is_tutorpro_admin()
      or exists (
        select 1 from public.support_conversations c
        where c.id::text = (storage.foldername(name))[1]
          and c.access_token_hash = encode(extensions.digest((storage.foldername(name))[2], 'sha256'), 'hex')
      )
    )
  );

drop policy if exists "Support participants read attachments" on storage.objects;
create policy "Support participants read attachments"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      public.is_tutorpro_admin()
      or exists (
        select 1 from public.support_conversations c
        where c.id::text = (storage.foldername(name))[1]
          and c.access_token_hash = encode(extensions.digest((storage.foldername(name))[2], 'sha256'), 'hex')
      )
    )
  );

create or replace function public.create_support_conversation(
  parent_name text,
  parent_email text,
  visitor_language text,
  first_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_id uuid;
  access_token text := encode(extensions.gen_random_bytes(24), 'hex');
  normalized_name text := trim(parent_name);
  normalized_email text := lower(trim(parent_email));
  normalized_message text := trim(first_message);
begin
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 100 then
    raise exception 'Enter a valid parent name';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(normalized_email) > 180 then
    raise exception 'Enter a valid email address';
  end if;
  if char_length(normalized_message) < 1 or char_length(normalized_message) > 1000 then
    raise exception 'Message must contain between 1 and 1000 characters';
  end if;

  insert into public.support_conversations (
    access_token_hash, parent_name, email, language, account_id
  ) values (
    encode(extensions.digest(access_token, 'sha256'), 'hex'),
    normalized_name,
    normalized_email,
    coalesce(nullif(trim(visitor_language), ''), 'en'),
    auth.uid()
  ) returning id into conversation_id;

  insert into public.support_messages (conversation_id, sender, body)
  values (conversation_id, 'parent', normalized_message);

  return jsonb_build_object('conversationId', conversation_id, 'accessToken', access_token);
end;
$$;

create or replace function public.verify_support_access(target_conversation_id uuid, visitor_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.support_conversations c
    where c.id = target_conversation_id
      and c.access_token_hash = encode(extensions.digest(visitor_token, 'sha256'), 'hex')
  );
$$;

create or replace function public.get_support_thread(target_conversation_id uuid, visitor_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.verify_support_access(target_conversation_id, visitor_token) then
    raise exception 'Support conversation could not be verified';
  end if;

  update public.support_messages
  set read_at = now()
  where support_messages.conversation_id = target_conversation_id
    and sender = 'admin'
    and read_at is null;

  select jsonb_build_object(
    'status', c.status,
    'parentName', c.parent_name,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'sender', m.sender,
        'body', m.body,
        'createdAt', m.created_at,
        'attachment', case when m.attachment_path is null then null else jsonb_build_object(
          'path', m.attachment_path,
          'name', m.attachment_name,
          'type', m.attachment_type,
          'size', m.attachment_size
        ) end
      ) order by m.created_at)
      from public.support_messages m
      where m.conversation_id = c.id
    ), '[]'::jsonb)
  ) into result
  from public.support_conversations c
  where c.id = target_conversation_id;

  return result;
end;
$$;

create or replace function public.send_support_message(target_conversation_id uuid, visitor_token text, message_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id uuid;
  normalized_message text := trim(message_body);
begin
  if not public.verify_support_access(target_conversation_id, visitor_token) then
    raise exception 'Support conversation could not be verified';
  end if;
  if char_length(normalized_message) < 1 or char_length(normalized_message) > 1000 then
    raise exception 'Message must contain between 1 and 1000 characters';
  end if;

  insert into public.support_messages (conversation_id, sender, body)
  values (target_conversation_id, 'parent', normalized_message)
  returning id into message_id;

  update public.support_conversations
  set status = 'open', updated_at = now()
  where id = target_conversation_id;

  return jsonb_build_object('id', message_id, 'createdAt', now());
end;
$$;

create or replace function public.send_support_attachment(
  target_conversation_id uuid,
  visitor_token text,
  message_body text,
  uploaded_path text,
  original_name text,
  mime_type text,
  byte_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id uuid;
  normalized_message text := coalesce(nullif(trim(message_body), ''), 'Shared a file');
begin
  if not public.verify_support_access(target_conversation_id, visitor_token) then
    raise exception 'Support conversation could not be verified';
  end if;
  if uploaded_path not like (target_conversation_id::text || '/' || visitor_token || '/%') then
    raise exception 'Attachment path could not be verified';
  end if;
  if mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain')
     or byte_size < 1 or byte_size > 3145728
     or char_length(original_name) > 180 then
    raise exception 'Attachment type or size is not allowed';
  end if;
  if char_length(normalized_message) > 1000 then raise exception 'Message is too long'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'support-attachments' and o.name = uploaded_path) then
    raise exception 'Uploaded attachment was not found';
  end if;

  insert into public.support_messages (
    conversation_id, sender, body, attachment_path, attachment_name, attachment_type, attachment_size
  ) values (
    target_conversation_id, 'parent', normalized_message, uploaded_path, original_name, mime_type, byte_size
  ) returning id into message_id;

  update public.support_conversations set status = 'open', updated_at = now() where id = target_conversation_id;
  return jsonb_build_object('id', message_id, 'createdAt', now());
end;
$$;

create or replace function public.get_admin_support_conversations()
returns table (
  id uuid,
  parent_name text,
  email text,
  language text,
  status text,
  updated_at timestamptz,
  last_message text,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.parent_name,
    c.email,
    c.language,
    c.status,
    c.updated_at,
    coalesce((select m.body from public.support_messages m where m.conversation_id = c.id order by m.created_at desc limit 1), ''),
    (select count(*) from public.support_messages m where m.conversation_id = c.id and m.sender = 'parent' and m.read_at is null)
  from public.support_conversations c
  where public.is_tutorpro_admin()
  order by c.updated_at desc;
$$;

create or replace function public.get_admin_support_thread(target_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_tutorpro_admin() then
    raise exception 'Administrator access is required';
  end if;

  update public.support_messages
  set read_at = now()
  where conversation_id = target_conversation_id and sender = 'parent' and read_at is null;

  select jsonb_build_object(
    'id', c.id,
    'parentName', c.parent_name,
    'email', c.email,
    'language', c.language,
    'status', c.status,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'sender', m.sender,
        'body', m.body,
        'createdAt', m.created_at,
        'attachment', case when m.attachment_path is null then null else jsonb_build_object(
          'path', m.attachment_path,
          'name', m.attachment_name,
          'type', m.attachment_type,
          'size', m.attachment_size
        ) end
      ) order by m.created_at)
      from public.support_messages m
      where m.conversation_id = c.id
    ), '[]'::jsonb)
  ) into result
  from public.support_conversations c
  where c.id = target_conversation_id;

  return result;
end;
$$;

create or replace function public.admin_send_support_message(target_conversation_id uuid, message_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id uuid;
  normalized_message text := trim(message_body);
begin
  if not public.is_tutorpro_admin() then
    raise exception 'Administrator access is required';
  end if;
  if char_length(normalized_message) < 1 or char_length(normalized_message) > 1000 then
    raise exception 'Message must contain between 1 and 1000 characters';
  end if;

  insert into public.support_messages (conversation_id, sender, body)
  values (target_conversation_id, 'admin', normalized_message)
  returning id into message_id;

  update public.support_conversations set updated_at = now() where id = target_conversation_id;
  return jsonb_build_object('id', message_id, 'createdAt', now());
end;
$$;

create or replace function public.admin_send_support_attachment(
  target_conversation_id uuid,
  message_body text,
  uploaded_path text,
  original_name text,
  mime_type text,
  byte_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id uuid;
  normalized_message text := coalesce(nullif(trim(message_body), ''), 'Shared a file');
begin
  if not public.is_tutorpro_admin() then raise exception 'Administrator access is required'; end if;
  if uploaded_path not like (target_conversation_id::text || '/admin/%') then raise exception 'Attachment path could not be verified'; end if;
  if mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain')
     or byte_size < 1 or byte_size > 3145728
     or char_length(original_name) > 180 then
    raise exception 'Attachment type or size is not allowed';
  end if;
  if char_length(normalized_message) > 1000 then raise exception 'Message is too long'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'support-attachments' and o.name = uploaded_path) then
    raise exception 'Uploaded attachment was not found';
  end if;

  insert into public.support_messages (
    conversation_id, sender, body, attachment_path, attachment_name, attachment_type, attachment_size
  ) values (
    target_conversation_id, 'admin', normalized_message, uploaded_path, original_name, mime_type, byte_size
  ) returning id into message_id;

  update public.support_conversations set updated_at = now() where id = target_conversation_id;
  return jsonb_build_object('id', message_id, 'createdAt', now());
end;
$$;

create or replace function public.set_support_conversation_status(target_conversation_id uuid, next_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_tutorpro_admin() then raise exception 'Administrator access is required'; end if;
  if next_status not in ('open', 'closed') then raise exception 'Invalid support status'; end if;
  update public.support_conversations set status = next_status, updated_at = now() where id = target_conversation_id;
  return found;
end;
$$;

revoke all on function public.create_support_conversation(text, text, text, text) from public;
revoke all on function public.verify_support_access(uuid, text) from public;
revoke all on function public.get_support_thread(uuid, text) from public;
revoke all on function public.send_support_message(uuid, text, text) from public;
revoke all on function public.send_support_attachment(uuid, text, text, text, text, text, integer) from public;
revoke all on function public.get_admin_support_conversations() from public;
revoke all on function public.get_admin_support_thread(uuid) from public;
revoke all on function public.admin_send_support_message(uuid, text) from public;
revoke all on function public.admin_send_support_attachment(uuid, text, text, text, text, integer) from public;
revoke all on function public.set_support_conversation_status(uuid, text) from public;

grant execute on function public.create_support_conversation(text, text, text, text) to anon, authenticated;
grant execute on function public.get_support_thread(uuid, text) to anon, authenticated;
grant execute on function public.send_support_message(uuid, text, text) to anon, authenticated;
grant execute on function public.send_support_attachment(uuid, text, text, text, text, text, integer) to anon, authenticated;
grant execute on function public.get_admin_support_conversations() to authenticated;
grant execute on function public.get_admin_support_thread(uuid) to authenticated;
grant execute on function public.admin_send_support_message(uuid, text) to authenticated;
grant execute on function public.admin_send_support_attachment(uuid, text, text, text, text, integer) to authenticated;
grant execute on function public.set_support_conversation_status(uuid, text) to authenticated;

select 'TutorPro English support chat is ready' as result;
