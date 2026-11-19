-- Uploaded materials: a teacher's own PDF, .md or .txt file, its page text, and its chapters.
--
-- Run AFTER supabase/schema.sql and 20261106000001_syllabus_calendar.sql, in the Supabase SQL Editor
-- (paste the whole file, then Run). Safe to run again.
--
--   materials          one uploaded file per row, for one class
--   material_pages     the clean text of every page (for .md / .txt: every line), used to write quizzes
--   material_chapters  the chapters the teacher checked, as page ranges
--
-- Who sees what:
--   the class's teacher   everything, and is the only one who can change anything
--   students and parents  the file's title and its chapter names and page ranges (for the class calendar),
--                         never the page text and never the original file
--
-- Storage: the original file goes in the private bucket "course-materials" at
-- <class_id>/<material_id>/original.<pdf|md|txt>. Only the class's teacher can upload, read or delete it.
--
-- Saving goes through create_material() and save_material_chapters(), which check the page ranges.
-- A class calendar can use an uploaded file as its book: class_schedules.book_id = 'upload-<material id>'.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.materials (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references public.classes (id) on delete cascade,
  uploaded_by      uuid not null references public.profiles (id) default auth.uid(),
  title            text not null check (length(trim(title)) between 1 and 200),
  file_path        text not null unique,
  file_type        text not null check (file_type in ('pdf', 'md', 'txt')),
  page_count       int  not null check (page_count between 1 and 20000),
  rights_confirmed boolean not null check (rights_confirmed),   -- "I have the right to use this material with AI tools."
  attribution      text check (attribution is null or length(attribution) <= 300),  -- e.g. "Based on … CC BY-SA 3.0"
  created_at       timestamptz not null default now()
);
create index if not exists materials_class_idx on public.materials (class_id, created_at desc);

create table if not exists public.material_pages (
  material_id uuid not null references public.materials (id) on delete cascade,
  page_number int  not null check (page_number >= 1),
  text        text not null default '',
  primary key (material_id, page_number)
);

create table if not exists public.material_chapters (
  id          uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  position    int  not null check (position >= 0),
  title       text not null check (length(trim(title)) between 1 and 200),
  start_page  int  not null check (start_page >= 1),
  end_page    int  not null,
  created_at  timestamptz not null default now(),
  check (end_page >= start_page),
  unique (material_id, position) deferrable initially deferred
);
create index if not exists material_chapters_material_idx on public.material_chapters (material_id, position);

-- ---------------------------------------------------------------------------
-- Helpers (run as owner, so policies don't recurse)
-- ---------------------------------------------------------------------------

create or replace function public.is_material_teacher(p_material uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.materials m
    join public.classes c on c.id = m.class_id
    where m.id = p_material and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.can_view_material(p_material uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.materials m where m.id = p_material and public.can_view_class(m.class_id));
$$;

-- True when a storage path is <class_id>/<material_id>/original.<ext> and the signed-in teacher teaches that class.
-- Checks the shape first, so other folders in the bucket (book ids like "conceptual-physics") never hit the uuid cast.
create or replace function public.is_upload_teacher(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/original\.(pdf|md|txt)$' then
    return false;
  end if;
  return public.is_class_teacher(split_part(p_name, '/', 1)::uuid);
end;
$$;

-- The first problem with a list of chapters, or null when it's fine: names, ranges inside the file, no overlaps.
-- p_chapters: [{ "title": "...", "start_page": 7, "end_page": 36 }, ...]
create or replace function public.material_chapters_problem(p_page_count int, p_chapters jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  c        record;
  prev_end int := 0;
begin
  if p_chapters is null or jsonb_typeof(p_chapters) <> 'array' or jsonb_array_length(p_chapters) = 0 then
    return 'Add at least one chapter.';
  end if;
  if jsonb_array_length(p_chapters) > 500 then
    return 'That is too many chapters.';
  end if;
  for c in
    select
      coalesce(trim(x ->> 'title'), '') as title,
      case when x ->> 'start_page' ~ '^\d{1,6}$' then (x ->> 'start_page')::int end as s,
      case when x ->> 'end_page' ~ '^\d{1,6}$' then (x ->> 'end_page')::int end as e
    from jsonb_array_elements(p_chapters) as x
    order by case when x ->> 'start_page' ~ '^\d{1,6}$' then (x ->> 'start_page')::int end nulls first
  loop
    if c.title = '' or length(c.title) > 200 then return 'Every chapter needs a name (up to 200 characters).'; end if;
    if c.s is null or c.e is null or c.s < 1 or c.e > p_page_count then
      return format('Chapter pages have to be between 1 and %s.', p_page_count);
    end if;
    if c.s > c.e then return format('“%s” ends before it starts.', c.title); end if;
    if c.s <= prev_end then return format('“%s” overlaps the chapter before it.', c.title); end if;
    prev_end := c.e;
  end loop;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.materials         enable row level security;
alter table public.material_pages    enable row level security;
alter table public.material_chapters enable row level security;

-- materials: the teacher manages; students and parents in the class can read the row (title, attribution)
drop policy if exists "materials: read" on public.materials;
create policy "materials: read" on public.materials
  for select to authenticated using (public.can_view_class(class_id));

drop policy if exists "materials: teacher adds" on public.materials;
create policy "materials: teacher adds" on public.materials
  for insert to authenticated
  with check (public.is_class_teacher(class_id) and uploaded_by = auth.uid());

drop policy if exists "materials: teacher updates" on public.materials;
create policy "materials: teacher updates" on public.materials
  for update to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

drop policy if exists "materials: teacher deletes" on public.materials;
create policy "materials: teacher deletes" on public.materials
  for delete to authenticated using (public.is_class_teacher(class_id));

-- Only title and attribution can change after upload.
revoke update on public.materials from authenticated;
grant update (title, attribution) on public.materials to authenticated;

-- material_pages: the teacher only. Students and parents never read page text.
drop policy if exists "material_pages: teacher all" on public.material_pages;
create policy "material_pages: teacher all" on public.material_pages
  for all to authenticated
  using (public.is_material_teacher(material_id))
  with check (public.is_material_teacher(material_id));

-- material_chapters: the teacher manages; students and parents in the class can read names and ranges (calendar).
-- Changes go through save_material_chapters(), which checks the ranges.
drop policy if exists "material_chapters: read" on public.material_chapters;
create policy "material_chapters: read" on public.material_chapters
  for select to authenticated using (public.can_view_material(material_id));

drop policy if exists "material_chapters: teacher writes" on public.material_chapters;
create policy "material_chapters: teacher writes" on public.material_chapters
  for all to authenticated
  using (public.is_material_teacher(material_id))
  with check (public.is_material_teacher(material_id));

-- ---------------------------------------------------------------------------
-- Saving (runs with the caller's permissions, so the policies above apply too)
-- ---------------------------------------------------------------------------

-- p_material: { id, class_id, title, file_type, rights_confirmed, attribution }
-- p_pages:    [ "text of page 1", "text of page 2", ... ]  (page numbers are the positions)
-- p_chapters: [ { title, start_page, end_page }, ... ]
-- The browser uploads the file to <class_id>/<id>/original.<file_type> first, then calls this.
create or replace function public.create_material(p_material jsonb, p_pages jsonb, p_chapters jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id      uuid := (p_material ->> 'id')::uuid;
  v_class   uuid := (p_material ->> 'class_id')::uuid;
  v_type    text := p_material ->> 'file_type';
  v_count   int;
  v_problem text;
begin
  if not public.is_class_teacher(v_class) then
    raise exception 'Only this class''s teacher can add materials.';
  end if;
  if coalesce((p_material ->> 'rights_confirmed')::boolean, false) is not true then
    raise exception 'Confirm you have the right to use this material with AI tools first.';
  end if;
  if p_pages is null or jsonb_typeof(p_pages) <> 'array' or jsonb_array_length(p_pages) = 0 then
    raise exception 'The file has no pages.';
  end if;
  v_count := jsonb_array_length(p_pages);
  v_problem := public.material_chapters_problem(v_count, p_chapters);
  if v_problem is not null then raise exception '%', v_problem; end if;

  insert into public.materials (id, class_id, uploaded_by, title, file_path, file_type, page_count, rights_confirmed, attribution)
  values (
    v_id,
    v_class,
    auth.uid(),
    trim(p_material ->> 'title'),
    v_class::text || '/' || v_id::text || '/original.' || v_type,
    v_type,
    v_count,
    true,
    nullif(trim(coalesce(p_material ->> 'attribution', '')), '')
  );

  insert into public.material_pages (material_id, page_number, text)
  select v_id, p.ord::int, coalesce(p.value #>> '{}', '')
  from jsonb_array_elements(p_pages) with ordinality as p(value, ord);

  insert into public.material_chapters (material_id, position, title, start_page, end_page)
  select v_id, (row_number() over (order by (c ->> 'start_page')::int) - 1)::int, trim(c ->> 'title'), (c ->> 'start_page')::int, (c ->> 'end_page')::int
  from jsonb_array_elements(p_chapters) as c;

  return v_id;
end;
$$;

-- Replaces a material's chapters after "Re-check chapters". Chapters sent with an existing id keep that id
-- (so anything linked to them later, like quiz drafts, stays linked); others are added; missing ones are removed.
-- p_chapters: [ { id?, title, start_page, end_page }, ... ]
create or replace function public.save_material_chapters(p_material uuid, p_chapters jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count   int;
  v_problem text;
  v_saved   int;
begin
  if not public.is_material_teacher(p_material) then
    raise exception 'Only this class''s teacher can change these chapters.';
  end if;
  select page_count into v_count from public.materials where id = p_material;
  v_problem := public.material_chapters_problem(v_count, p_chapters);
  if v_problem is not null then raise exception '%', v_problem; end if;

  -- One statement, so every part sees the chapters as they were before it. Positions are only checked
  -- for uniqueness at commit (the constraint is deferred), so reordering can't trip over itself.
  with incoming as (
    select
      case when c ->> 'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (c ->> 'id')::uuid end as id,
      (row_number() over (order by (c ->> 'start_page')::int) - 1)::int as position,
      trim(c ->> 'title') as title,
      (c ->> 'start_page')::int as start_page,
      (c ->> 'end_page')::int as end_page
    from jsonb_array_elements(p_chapters) as c
  ),
  removed as (
    delete from public.material_chapters mc
    where mc.material_id = p_material
      and not exists (select 1 from incoming i where i.id = mc.id)
    returning mc.id
  ),
  changed as (
    update public.material_chapters mc
    set position = i.position, title = i.title, start_page = i.start_page, end_page = i.end_page
    from incoming i
    where mc.id = i.id and mc.material_id = p_material
    returning mc.id
  )
  insert into public.material_chapters (material_id, position, title, start_page, end_page)
  select p_material, i.position, i.title, i.start_page, i.end_page
  from incoming i
  where i.id is null
     or not exists (select 1 from public.material_chapters mc where mc.id = i.id and mc.material_id = p_material);

  select count(*) into v_saved from public.material_chapters where material_id = p_material;
  return v_saved;
end;
$$;

-- Deletes a material that no calendar uses, and its link to the class. Returns the storage path so the
-- browser can remove the file. (A calendar that uses it has to switch books first.)
create or replace function public.delete_material(p_material uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_class uuid;
  v_path  text;
begin
  if not public.is_material_teacher(p_material) then
    raise exception 'Only this class''s teacher can delete this file.';
  end if;
  select class_id, file_path into v_class, v_path from public.materials where id = p_material;
  if exists (select 1 from public.class_schedules where class_id = v_class and book_id = 'upload-' || p_material::text) then
    raise exception 'Your class calendar uses this file. Build the calendar from another book first.';
  end if;
  delete from public.course_materials where class_id = v_class and book_id = 'upload-' || p_material::text;
  delete from public.materials where id = p_material;
  return v_path;
end;
$$;

revoke execute on function public.is_material_teacher(uuid) from public, anon;
revoke execute on function public.can_view_material(uuid) from public, anon;
revoke execute on function public.is_upload_teacher(text) from public, anon;
revoke execute on function public.create_material(jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.save_material_chapters(uuid, jsonb) from public, anon;
revoke execute on function public.delete_material(uuid) from public, anon;
grant execute on function public.is_material_teacher(uuid) to authenticated;
grant execute on function public.can_view_material(uuid) to authenticated;
grant execute on function public.is_upload_teacher(text) to authenticated;
grant execute on function public.material_chapters_problem(int, jsonb) to authenticated;
grant execute on function public.create_material(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.save_material_chapters(uuid, jsonb) to authenticated;
grant execute on function public.delete_material(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Allow .md and .txt originals next to PDFs, up to 50 MB.
update storage.buckets
set allowed_mime_types = array['application/pdf', 'text/plain', 'text/markdown'],
    file_size_limit = 52428800
where id = 'course-materials';

-- The book-folder rule from the calendar migration let anyone in a class read files under a folder named
-- like any book_id that class added. A teacher could add a class id as a "book" and read that class's
-- uploads. Uploads live under uuid folders, so the book rule now skips them.
drop policy if exists "course-materials: class can read" on storage.objects;
create policy "course-materials: class can read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-materials'
    and split_part(name, '/', 1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1
      from public.course_materials cm
      where cm.book_id = split_part(name, '/', 1)
        and public.can_view_class(cm.class_id)
    )
  );

drop policy if exists "course-materials: teacher reads uploads" on storage.objects;
create policy "course-materials: teacher reads uploads" on storage.objects
  for select to authenticated
  using (bucket_id = 'course-materials' and public.is_upload_teacher(name));

drop policy if exists "course-materials: teacher uploads" on storage.objects;
create policy "course-materials: teacher uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-materials' and public.is_upload_teacher(name));

drop policy if exists "course-materials: teacher deletes uploads" on storage.objects;
create policy "course-materials: teacher deletes uploads" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-materials' and public.is_upload_teacher(name));
