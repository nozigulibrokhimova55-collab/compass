-- Syllabus calendar, stage 1: course materials (textbooks), class schedules and class sessions.
--
-- Run AFTER supabase/schema.sql, in the Supabase SQL Editor (paste the whole file, then Run).
-- Safe to run again. It only adds new tables, functions, policies and a storage bucket;
-- nothing in schema.sql is changed.
--
--   course_materials  which textbook a class uses (book_id matches a folder in src/data/books/)
--   class_schedules   the setup a teacher chose: dates, class days, time, days off, chapters
--   class_sessions    one row per class day: a lesson on a section, a chapter quiz, review, or cancelled
--
-- Storage: a private bucket "course-materials" holding the chapter PDFs under <book_id>/<file>.
-- Only people in a class that uses the book (its teacher, its students, their parents) can read them.

-- ---------------------------------------------------------------------------
-- Helpers (same style as schema.sql: run as owner, so policies don't recurse)
-- ---------------------------------------------------------------------------

-- True if the signed-in parent has a child in the class.
create or replace function public.is_parent_in_class(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_members m
    join public.parent_links l on l.student_id = m.student_id
    where m.class_id = p_class and l.parent_id = auth.uid()
  );
$$;

-- True for the class's teacher, its students, and their parents.
create or replace function public.can_view_class(p_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_class_teacher(p_class)
      or public.is_class_member(p_class)
      or public.is_parent_in_class(p_class);
$$;

revoke execute on function public.is_parent_in_class(uuid) from public, anon;
revoke execute on function public.can_view_class(uuid) from public, anon;
grant execute on function public.is_parent_in_class(uuid) to authenticated;
grant execute on function public.can_view_class(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.course_materials (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  book_id    text not null check (book_id ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now(),
  unique (class_id, book_id)
);

create table if not exists public.class_schedules (
  class_id       uuid primary key references public.classes (id) on delete cascade,
  book_id        text not null check (book_id ~ '^[a-z0-9-]+$'),
  start_date     date not null,
  end_date       date not null,
  class_days     smallint[] not null,               -- 0 Sunday … 6 Saturday
  class_time     time,
  no_class_dates date[] not null default '{}',
  chapters       smallint[] not null,               -- teaching order
  squeezed       boolean not null default false,    -- one class per section
  updated_at     timestamptz not null default now(),
  check (end_date >= start_date),
  check (cardinality(class_days) between 1 and 7),
  check (cardinality(chapters) >= 1)
);

create table if not exists public.class_sessions (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  day        date not null,
  starts_at  time,
  kind       text not null check (kind in ('lesson', 'chapter_quiz', 'review', 'cancelled')),
  chapter    smallint,
  section_id text,                                  -- e.g. '2.3' (lessons only)
  part       smallint not null default 1 check (part >= 1),
  parts      smallint not null default 1 check (parts >= part),
  note       text,
  created_at timestamptz not null default now(),
  check (kind <> 'lesson' or (chapter is not null and section_id is not null)),
  check (kind <> 'chapter_quiz' or chapter is not null)
);

create index if not exists class_sessions_class_day_idx on public.class_sessions (class_id, day);
-- One class per day. Attendance is saved per day, so this keeps attendance and sessions in step.
create unique index if not exists class_sessions_one_per_day on public.class_sessions (class_id, day) where kind <> 'cancelled';

-- ---------------------------------------------------------------------------
-- Row level security: the teacher edits; students and parents in the class read.
-- Past sessions can't be changed or deleted.
-- ---------------------------------------------------------------------------

alter table public.course_materials enable row level security;
alter table public.class_schedules  enable row level security;
alter table public.class_sessions   enable row level security;

drop policy if exists "course_materials: read" on public.course_materials;
create policy "course_materials: read" on public.course_materials
  for select to authenticated using (public.can_view_class(class_id));

drop policy if exists "course_materials: teacher adds" on public.course_materials;
create policy "course_materials: teacher adds" on public.course_materials
  for insert to authenticated with check (public.is_class_teacher(class_id));

drop policy if exists "course_materials: teacher removes" on public.course_materials;
create policy "course_materials: teacher removes" on public.course_materials
  for delete to authenticated using (public.is_class_teacher(class_id));

drop policy if exists "class_schedules: read" on public.class_schedules;
create policy "class_schedules: read" on public.class_schedules
  for select to authenticated using (public.can_view_class(class_id));

drop policy if exists "class_schedules: teacher writes" on public.class_schedules;
create policy "class_schedules: teacher writes" on public.class_schedules
  for all to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

drop policy if exists "class_sessions: read" on public.class_sessions;
create policy "class_sessions: read" on public.class_sessions
  for select to authenticated using (public.can_view_class(class_id));

drop policy if exists "class_sessions: teacher adds" on public.class_sessions;
create policy "class_sessions: teacher adds" on public.class_sessions
  for insert to authenticated with check (public.is_class_teacher(class_id));

drop policy if exists "class_sessions: teacher changes upcoming" on public.class_sessions;
create policy "class_sessions: teacher changes upcoming" on public.class_sessions
  for update to authenticated
  using (public.is_class_teacher(class_id) and day >= current_date)
  with check (public.is_class_teacher(class_id) and day >= current_date);

drop policy if exists "class_sessions: teacher removes upcoming" on public.class_sessions;
create policy "class_sessions: teacher removes upcoming" on public.class_sessions
  for delete to authenticated
  using (public.is_class_teacher(class_id) and day >= current_date);

-- ---------------------------------------------------------------------------
-- Save a whole calendar in one step (runs with the caller's permissions, so the policies above apply).
-- Upcoming sessions are replaced; past ones stay. If the calendar already has past sessions,
-- only the new sessions from today on are added.
-- ---------------------------------------------------------------------------

create or replace function public.save_class_calendar(p_class uuid, p_schedule jsonb, p_sessions jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_has_past boolean;
  v_count    integer;
begin
  if not public.is_class_teacher(p_class) then
    raise exception 'Only this class''s teacher can change its calendar.';
  end if;
  if p_sessions is null or jsonb_typeof(p_sessions) <> 'array' then
    raise exception 'The calendar needs a list of sessions.';
  end if;

  insert into public.class_schedules (class_id, book_id, start_date, end_date, class_days, class_time, no_class_dates, chapters, squeezed, updated_at)
  values (
    p_class,
    p_schedule ->> 'book_id',
    (p_schedule ->> 'start_date')::date,
    (p_schedule ->> 'end_date')::date,
    array(select jsonb_array_elements_text(p_schedule -> 'class_days')::smallint),
    nullif(p_schedule ->> 'class_time', '')::time,
    array(select jsonb_array_elements_text(coalesce(p_schedule -> 'no_class_dates', '[]'::jsonb))::date),
    array(select jsonb_array_elements_text(p_schedule -> 'chapters')::smallint),
    coalesce((p_schedule ->> 'squeezed')::boolean, false),
    now()
  )
  on conflict (class_id) do update set
    book_id = excluded.book_id,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    class_days = excluded.class_days,
    class_time = excluded.class_time,
    no_class_dates = excluded.no_class_dates,
    chapters = excluded.chapters,
    squeezed = excluded.squeezed,
    updated_at = now();

  v_has_past := exists (select 1 from public.class_sessions where class_id = p_class and day < current_date);

  delete from public.class_sessions where class_id = p_class and day >= current_date;

  insert into public.class_sessions (class_id, day, starts_at, kind, chapter, section_id, part, parts)
  select
    p_class,
    (s ->> 'day')::date,
    nullif(p_schedule ->> 'class_time', '')::time,
    s ->> 'kind',
    nullif(s ->> 'chapter', '')::smallint,
    nullif(s ->> 'section_id', ''),
    coalesce((s ->> 'part')::smallint, 1),
    coalesce((s ->> 'parts')::smallint, 1)
  from jsonb_array_elements(p_sessions) as s
  where not v_has_past or (s ->> 'day')::date >= current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.save_class_calendar(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_class_calendar(uuid, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: chapter PDFs, private. Path: <book_id>/<file name from syllabus.json>.
-- Uploads happen with the service role (npm run seed:materials), so there is no upload policy.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('course-materials', 'course-materials', false, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "course-materials: class can read" on storage.objects;
create policy "course-materials: class can read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-materials'
    and exists (
      select 1
      from public.course_materials cm
      where cm.book_id = split_part(name, '/', 1)
        and public.can_view_class(cm.class_id)
    )
  );
