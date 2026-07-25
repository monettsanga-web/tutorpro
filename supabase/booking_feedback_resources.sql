-- TutorPro English: Feedback Resource Links
-- Teachers can attach resource URLs (worksheets, videos, practice pages)
-- to their post-class feedback. Students and parents see these links alongside
-- the feedback summary on completed lessons.
--
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.

create table if not exists public.booking_feedback_resources (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  url text not null check (char_length(url) between 5 and 2048),
  resource_type text not null default 'link'
    check (resource_type in ('link', 'video', 'worksheet', 'quiz', 'reading', 'audio', 'other')),
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order < 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fast lookups by booking, and ordered retrieval
create index if not exists feedback_resources_booking_idx
  on public.booking_feedback_resources(booking_id, sort_order);

alter table public.booking_feedback_resources enable row level security;

-- Booking participants can read their feedback resources
drop policy if exists "Feedback resource readers" on public.booking_feedback_resources;
create policy "Feedback resource readers"
  on public.booking_feedback_resources for select
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

-- Teachers and admins can create resource links
drop policy if exists "Feedback resource writers" on public.booking_feedback_resources;
create policy "Feedback resource writers"
  on public.booking_feedback_resources for insert
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.teacher_id = auth.uid()::text
          or public.is_tutorpro_admin()
        )
    )
  );

-- Teachers and admins can update their resource links
drop policy if exists "Feedback resource updaters" on public.booking_feedback_resources;
create policy "Feedback resource updaters"
  on public.booking_feedback_resources for update
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.teacher_id = auth.uid()::text
          or public.is_tutorpro_admin()
        )
    )
  )
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.teacher_id = auth.uid()::text
          or public.is_tutorpro_admin()
        )
    )
  );

-- Teachers and admins can delete their resource links
drop policy if exists "Feedback resource deleters" on public.booking_feedback_resources;
create policy "Feedback resource deleters"
  on public.booking_feedback_resources for delete
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.teacher_id = auth.uid()::text
          or public.is_tutorpro_admin()
        )
    )
  );

-- Realtime subscription for live resource link updates
do $$
begin
  alter publication supabase_realtime add table public.booking_feedback_resources;
exception
  when duplicate_object then null;
end $$;

-- Upsert helper: replace all resource links for a booking in one call.
-- The application sends the full list; this function deletes old rows and
-- inserts the new set atomically.
create or replace function public.set_feedback_resources(
  p_booking_id uuid,
  p_resources jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the booking's teacher or an admin may call this
  if not exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and (b.teacher_id = auth.uid()::text or public.is_tutorpro_admin())
  ) then
    raise exception 'Not authorized to modify feedback resources for this booking';
  end if;

  delete from public.booking_feedback_resources where booking_id = p_booking_id;

  insert into public.booking_feedback_resources (booking_id, title, url, resource_type, sort_order)
  select
    p_booking_id,
    trim(r->>'title'),
    trim(r->>'url'),
    coalesce(nullif(trim(r->>'resource_type'), ''), 'link'),
    coalesce((r->>'sort_order')::integer, row_number() over () - 1)
  from jsonb_array_elements(p_resources) as r
  where char_length(trim(r->>'title')) between 1 and 120
    and char_length(trim(r->>'url')) between 5 and 2048
  limit 10;
end;
$$;

revoke all on function public.set_feedback_resources(uuid, jsonb) from public;
grant execute on function public.set_feedback_resources(uuid, jsonb) to authenticated;

select 'TutorPro English feedback resource links are ready' as result;
