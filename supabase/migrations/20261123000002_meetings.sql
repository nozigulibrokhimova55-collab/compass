-- Meetings: a teacher posts free 60 minute slots, a parent books one for their child, both can move or cancel.
--
-- Run AFTER supabase/schema.sql and the other migrations, in the Supabase SQL Editor (paste the whole file, then Run).
-- Safe to run again. It only adds one table and new functions; nothing that exists is changed or dropped.
--
--   meeting_slots  one row per slot. A free slot has booked_by null. A booked slot says which parent booked it and
--                  for which child. Times are timestamptz (the app shows them in Asia/Seoul).
--
-- Who sees what:
--   Nobody reads or writes meeting_slots directly: row level security is on and there are no policies on purpose.
--   Parents can't read class names or teacher profiles, so everything goes through the functions below, which check
--   who is asking:
--
--   teacher:  post_meeting_slots, remove_meeting_slot, teacher_meetings (bookings with a progress summary)
--   parent:   my_meeting_teachers, list_free_slots, book_slot, my_meetings
--   both:     cancel_meeting, reschedule_meeting
--
-- No double booking: book_slot and reschedule_meeting lock the slot row first, then check it is still free, so two
-- parents who tap at the same moment can't both get it. A teacher's slots can't overlap, and a child can have only
-- one upcoming meeting with the same teacher.
-- The progress summary uses real data only: the child's finished quizzes with this teacher and their average.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.meeting_slots (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  booked_by  uuid references public.profiles (id) on delete set null,   -- the parent. Null means the slot is free.
  student_id uuid references public.profiles (id) on delete set null,   -- the child the meeting is about
  booked_at  timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at - starts_at = interval '60 minutes')
);
-- A teacher can't post the same start time twice.
create unique index if not exists meeting_slots_teacher_start on public.meeting_slots (teacher_id, starts_at);
create index if not exists meeting_slots_booked_by_idx on public.meeting_slots (booked_by) where booked_by is not null;

alter table public.meeting_slots enable row level security;
revoke all on public.meeting_slots from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Teacher: post and remove slots
-- ---------------------------------------------------------------------------

-- p_starts: the start of each slot. Every slot lasts exactly 60 minutes. Either all of them are saved or none.
-- Returns how many were added.
create or replace function public.post_meeting_slots(p_starts timestamptz[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sorted timestamptz[];
  v_start  timestamptz;
  v_count  integer := 0;
begin
  if auth.uid() is null or public.my_role() is distinct from 'teacher' then
    raise exception 'Only teachers can post meeting times.';
  end if;
  if p_starts is null or cardinality(p_starts) = 0 then
    raise exception 'Pick at least one time.';
  end if;
  if cardinality(p_starts) > 60 then
    raise exception 'Post up to 60 times at once.';
  end if;

  select array_agg(distinct t order by t) into v_sorted from unnest(p_starts) as t;

  -- One teacher posting twice at the same moment can't sneak overlapping slots past the check below.
  perform pg_advisory_xact_lock(hashtext('meeting_slots:' || auth.uid()::text));

  foreach v_start in array v_sorted loop
    if v_start <> date_trunc('minute', v_start) then
      raise exception 'Times need to be on a whole minute.';
    end if;
    if v_start <= now() then
      raise exception 'Pick a time in the future.';
    end if;
    if v_start > now() + interval '1 year' then
      raise exception 'Pick a time within the next year.';
    end if;
    if exists (
      select 1 from public.meeting_slots s
      where s.teacher_id = auth.uid()
        and s.starts_at > v_start - interval '60 minutes'
        and s.starts_at < v_start + interval '60 minutes'
    ) then
      raise exception 'That time overlaps another time you posted (%).', to_char(v_start at time zone 'Asia/Seoul', 'Mon DD HH24:MI');
    end if;

    insert into public.meeting_slots (teacher_id, starts_at, ends_at)
    values (auth.uid(), v_start, v_start + interval '60 minutes');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Removes a free slot. A booked one has to be cancelled first.
create or replace function public.remove_meeting_slot(p_slot uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.meeting_slots where id = p_slot and teacher_id = auth.uid() for update;
  if s.id is null then
    raise exception 'We could not find that time.';
  end if;
  if s.booked_by is not null then
    raise exception 'Someone booked this time. Cancel the meeting first.';
  end if;
  delete from public.meeting_slots where id = p_slot;
end;
$$;

-- ---------------------------------------------------------------------------
-- Progress summary (internal: only the functions below call it, nobody else may)
-- ---------------------------------------------------------------------------

-- The child's finished quizzes in this teacher's classes: how many, the average, and the last five. Real data only.
create or replace function public.meeting_progress(p_student uuid, p_teacher uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with per_quiz as (
    select
      q.id,
      q.title,
      q.created_at,
      (count(*) filter (where r.correct))::int as right_count,
      count(*)::int as total
    from public.quiz_responses r
    join public.quizzes q on q.id = r.quiz_id
    join public.classes c on c.id = q.class_id
    where r.student_id = p_student and c.teacher_id = p_teacher and q.status = 'published'
    group by q.id, q.title, q.created_at
  )
  select jsonb_build_object(
    'quizzes', (select count(*) from per_quiz),
    'average', (select round(avg(right_count::numeric / total) * 100) from per_quiz),
    'recent', coalesce(
      (
        select jsonb_agg(jsonb_build_object('title', x.title, 'right', x.right_count, 'total', x.total) order by x.created_at desc)
        from (select * from per_quiz order by created_at desc limit 5) x
      ),
      '[]'::jsonb
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Teacher: see slots and bookings
-- ---------------------------------------------------------------------------

-- The teacher's own slots from a week ago onward. Booked ones come with the parent's and child's names and the
-- child's progress summary.
create or replace function public.teacher_meetings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slot_id', s.id,
        'starts_at', s.starts_at,
        'ends_at', s.ends_at,
        'booked', s.booked_by is not null,
        'parent_name', pp.name,
        'student_id', s.student_id,
        'student_name', sp.name,
        'booked_at', s.booked_at,
        'progress', case when s.booked_by is not null and s.student_id is not null then public.meeting_progress(s.student_id, s.teacher_id) end
      )
      order by s.starts_at
    ),
    '[]'::jsonb
  )
  from public.meeting_slots s
  left join public.profiles pp on pp.id = s.booked_by
  left join public.profiles sp on sp.id = s.student_id
  where s.teacher_id = auth.uid()
    and s.ends_at > now() - interval '7 days';
$$;

-- ---------------------------------------------------------------------------
-- Parent: find teachers, see free slots, book
-- ---------------------------------------------------------------------------

-- One row for each child of this parent and each teacher who teaches that child.
create or replace function public.my_meeting_teachers()
returns table (child_id uuid, child_name text, teacher_id uuid, teacher_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct l.student_id, sp.name, c.teacher_id, tp.name
  from public.parent_links l
  join public.profiles sp on sp.id = l.student_id
  join public.class_members m on m.student_id = l.student_id
  join public.classes c on c.id = m.class_id
  join public.profiles tp on tp.id = c.teacher_id
  where l.parent_id = auth.uid()
  order by sp.name, tp.name;
$$;

-- Free, upcoming slots of a teacher, for one of the parent's children. Empty unless the child really is in
-- one of that teacher's classes.
create or replace function public.list_free_slots(p_teacher uuid, p_student uuid)
returns table (slot_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.starts_at, s.ends_at
  from public.meeting_slots s
  where s.teacher_id = p_teacher
    and s.booked_by is null
    and s.starts_at > now()
    and public.is_parent_of(p_student)
    and exists (
      select 1
      from public.class_members m
      join public.classes c on c.id = m.class_id
      where m.student_id = p_student and c.teacher_id = p_teacher
    )
  order by s.starts_at;
$$;

-- Books a free slot for one of the parent's children.
create or replace function public.book_slot(p_slot uuid, p_student uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher uuid;
  s         record;
begin
  if auth.uid() is null or not public.is_parent_of(p_student) then
    raise exception 'We could not find that child.';
  end if;

  select teacher_id into v_teacher from public.meeting_slots where id = p_slot;
  if v_teacher is null then
    raise exception 'We could not find that time.';
  end if;
  if not exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = p_student and c.teacher_id = v_teacher
  ) then
    raise exception 'That teacher doesn’t teach this child.';
  end if;

  -- Two taps at the same moment for the same child and teacher wait for each other here.
  perform pg_advisory_xact_lock(hashtext('meeting_book:' || v_teacher::text || p_student::text));

  select * into s from public.meeting_slots where id = p_slot for update;
  if s.id is null then
    raise exception 'We could not find that time.';
  end if;
  if s.booked_by is not null then
    raise exception 'Someone just booked that time. Pick another one.';
  end if;
  if s.starts_at <= now() then
    raise exception 'That time has already passed.';
  end if;
  if exists (
    select 1 from public.meeting_slots x
    where x.teacher_id = v_teacher and x.student_id = p_student and x.booked_by is not null and x.starts_at > now()
  ) then
    raise exception 'You already have a meeting with this teacher. Move it or cancel it first.';
  end if;

  update public.meeting_slots
  set booked_by = auth.uid(), student_id = p_student, booked_at = now()
  where id = p_slot;
end;
$$;

-- The parent's own bookings from a week ago onward, with the teacher's and child's names.
create or replace function public.my_meetings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slot_id', s.id,
        'starts_at', s.starts_at,
        'ends_at', s.ends_at,
        'teacher_id', s.teacher_id,
        'teacher_name', tp.name,
        'student_id', s.student_id,
        'student_name', sp.name
      )
      order by s.starts_at
    ),
    '[]'::jsonb
  )
  from public.meeting_slots s
  join public.profiles tp on tp.id = s.teacher_id
  left join public.profiles sp on sp.id = s.student_id
  where s.booked_by = auth.uid()
    and s.ends_at > now() - interval '7 days';
$$;

-- ---------------------------------------------------------------------------
-- Both sides: cancel and reschedule
-- ---------------------------------------------------------------------------

-- Cancels a meeting that hasn't started. The slot becomes free again. A teacher can pass p_remove = true to
-- delete the slot as well (useful when they can't make that time any more). Parents can't remove slots.
create or replace function public.cancel_meeting(p_slot uuid, p_remove boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.meeting_slots where id = p_slot for update;
  if s.id is null or s.booked_by is null or auth.uid() is null or not (s.booked_by = auth.uid() or s.teacher_id = auth.uid()) then
    raise exception 'We could not find that meeting.';
  end if;
  if s.starts_at <= now() then
    raise exception 'That meeting has already started.';
  end if;

  if p_remove and s.teacher_id = auth.uid() then
    delete from public.meeting_slots where id = p_slot;
  else
    update public.meeting_slots set booked_by = null, student_id = null, booked_at = null where id = p_slot;
  end if;
end;
$$;

-- Moves a booking to another free slot of the same teacher. The old slot becomes free, in the same step.
create or replace function public.reschedule_meeting(p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from record;
  v_to   record;
begin
  if p_from is null or p_to is null or p_from = p_to then
    raise exception 'Pick a different time.';
  end if;

  -- Lock both rows in a fixed order, so two people moving meetings at once can't get stuck on each other.
  perform 1 from public.meeting_slots where id in (p_from, p_to) order by id for update;

  select * into v_from from public.meeting_slots where id = p_from;
  select * into v_to from public.meeting_slots where id = p_to;

  if v_from.id is null or v_from.booked_by is null or auth.uid() is null or not (v_from.booked_by = auth.uid() or v_from.teacher_id = auth.uid()) then
    raise exception 'We could not find that meeting.';
  end if;
  if v_to.id is null or v_to.teacher_id <> v_from.teacher_id then
    raise exception 'Pick one of this teacher’s free times.';
  end if;
  if v_from.starts_at <= now() then
    raise exception 'That meeting has already started.';
  end if;
  if v_to.booked_by is not null then
    raise exception 'Someone just booked that time. Pick another one.';
  end if;
  if v_to.starts_at <= now() then
    raise exception 'That time has already passed.';
  end if;

  update public.meeting_slots
  set booked_by = v_from.booked_by, student_id = v_from.student_id, booked_at = now()
  where id = p_to;
  update public.meeting_slots
  set booked_by = null, student_id = null, booked_at = null
  where id = p_from;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------

revoke execute on function public.post_meeting_slots(timestamptz[]) from public, anon;
revoke execute on function public.remove_meeting_slot(uuid) from public, anon;
revoke execute on function public.meeting_progress(uuid, uuid) from public, anon, authenticated;   -- internal only
revoke execute on function public.teacher_meetings() from public, anon;
revoke execute on function public.my_meeting_teachers() from public, anon;
revoke execute on function public.list_free_slots(uuid, uuid) from public, anon;
revoke execute on function public.book_slot(uuid, uuid) from public, anon;
revoke execute on function public.my_meetings() from public, anon;
revoke execute on function public.cancel_meeting(uuid, boolean) from public, anon;
revoke execute on function public.reschedule_meeting(uuid, uuid) from public, anon;

grant execute on function public.post_meeting_slots(timestamptz[]) to authenticated;
grant execute on function public.remove_meeting_slot(uuid) to authenticated;
grant execute on function public.teacher_meetings() to authenticated;
grant execute on function public.my_meeting_teachers() to authenticated;
grant execute on function public.list_free_slots(uuid, uuid) to authenticated;
grant execute on function public.book_slot(uuid, uuid) to authenticated;
grant execute on function public.my_meetings() to authenticated;
grant execute on function public.cancel_meeting(uuid, boolean) to authenticated;
grant execute on function public.reschedule_meeting(uuid, uuid) to authenticated;
