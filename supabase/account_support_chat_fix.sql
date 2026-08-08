-- TutorPro account-mode support chat fix
-- Run this whole file in Supabase Dashboard -> SQL Editor.
-- Do NOT run just the function name.

create or replace function public.support_thread_json(target_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
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

create or replace function public.get_or_create_account_support_conversation(
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
  normalized_name text := trim(parent_name);
  normalized_email text := lower(trim(parent_email));
  normalized_message text := trim(first_message);
begin
  if auth.uid() is null then
    raise exception 'Please log in before opening support chat';
  end if;
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 100 then
    raise exception 'Enter a valid name';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(normalized_email) > 180 then
    raise exception 'Enter a valid email address';
  end if;

  select c.id into conversation_id
  from public.support_conversations c
  where c.account_id = auth.uid()
    and c.status = 'open'
  order by c.updated_at desc
  limit 1;

  if conversation_id is null then
    insert into public.support_conversations (
      access_token_hash, parent_name, email, language, account_id
    ) values (
      'account:' || auth.uid()::text,
      normalized_name,
      normalized_email,
      coalesce(nullif(trim(visitor_language), ''), 'en'),
      auth.uid()
    ) returning id into conversation_id;

    if char_length(normalized_message) between 1 and 1000 then
      insert into public.support_messages (conversation_id, sender, body)
      values (conversation_id, 'parent', normalized_message);
    end if;
  else
    update public.support_conversations
    set parent_name = normalized_name,
        email = normalized_email,
        language = coalesce(nullif(trim(visitor_language), ''), language),
        updated_at = now()
    where id = conversation_id;
  end if;

  return jsonb_build_object('conversationId', conversation_id, 'accountMode', true);
end;
$$;

create or replace function public.get_account_support_thread(target_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Please log in before opening support chat';
  end if;
  if not exists (select 1 from public.support_conversations c where c.id = target_conversation_id and c.account_id = auth.uid()) then
    raise exception 'Support conversation could not be verified';
  end if;

  update public.support_messages
  set read_at = now()
  where support_messages.conversation_id = target_conversation_id
    and sender = 'admin'
    and read_at is null;

  return public.support_thread_json(target_conversation_id);
end;
$$;

create or replace function public.send_account_support_message(target_conversation_id uuid, message_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id uuid;
  normalized_message text := trim(message_body);
begin
  if auth.uid() is null then
    raise exception 'Please log in before sending support messages';
  end if;
  if not exists (select 1 from public.support_conversations c where c.id = target_conversation_id and c.account_id = auth.uid()) then
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

create or replace function public.send_account_support_attachment(
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
  if auth.uid() is null then
    raise exception 'Please log in before sending support attachments';
  end if;
  if not exists (select 1 from public.support_conversations c where c.id = target_conversation_id and c.account_id = auth.uid()) then
    raise exception 'Support conversation could not be verified';
  end if;
  if uploaded_path not like (target_conversation_id::text || '/account/%') then
    raise exception 'Attachment path could not be verified';
  end if;
  if mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain')
     or byte_size < 1 or byte_size > 3145728
     or char_length(original_name) > 180 then
    raise exception 'Attachment type or size is not allowed';
  end if;
  if char_length(normalized_message) > 1000 then raise exception 'Message is too long'; end if;

  insert into public.support_messages (
    conversation_id, sender, body, attachment_path, attachment_name, attachment_type, attachment_size
  ) values (
    target_conversation_id, 'parent', normalized_message, uploaded_path, original_name, mime_type, byte_size
  ) returning id into message_id;

  update public.support_conversations
  set status = 'open', updated_at = now()
  where id = target_conversation_id;

  return jsonb_build_object('id', message_id, 'createdAt', now());
end;
$$;

drop policy if exists "Support account participants upload attachments" on storage.objects;
create policy "Support account participants upload attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.support_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (storage.foldername(name))[2] = 'account'
        and c.account_id = auth.uid()
    )
  );

drop policy if exists "Support account participants read attachments" on storage.objects;
create policy "Support account participants read attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from public.support_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (storage.foldername(name))[2] = 'account'
        and c.account_id = auth.uid()
    )
  );
