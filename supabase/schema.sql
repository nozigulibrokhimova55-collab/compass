-- Compass: Supabase schema
--
-- How to use: Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
-- It is safe to run again (tables use "if not exists", policies are dropped and recreated).
--
-- What this sets up:
--   profiles        one row per user (teacher, student or parent), created by a trigger on sign-up
--   classes         a teacher's class, with a join code students type at sign-up
--   class_members   which students are in which class
--   parent_links    which parents can see which student (via the student's invite code)
--   attendance      one mark per student per day
--   quizzes / quiz_questions   published quizzes
--   quiz_responses  each student's answers, saved by submit_quiz (one attempt per quiz)
--   Row level security on every table, so people only see what they should.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('teacher', 'student', 'parent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_mark as enum ('present', 'late', 'absent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quiz_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  role        public.app_role not null,
  language    text not null default 'English',
  invite_code text unique,                       -- students only: parents use it to link up
  created_at  timestamptz not null default now()
);

create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  code       text not null unique,               -- students type this at sign-up
  unit       text,
  created_at timestamptz not null default now()
);
create index if not exists classes_teacher_idx on public.classes (teacher_id);

create table if not exists public.class_members (
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index if not exists class_members_student_idx on public.class_members (student_id);

create table if not exists public.parent_links (
  parent_id  uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);
create index if not exists parent_links_student_idx on public.parent_links (student_id);

create table if not exists public.attendance (
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  day        date not null,
  mark       public.attendance_mark not null,
  marked_by  uuid references public.profiles (id) default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (class_id, student_id, day)
);
create index if not exists attendance_day_idx on public.attendance (class_id, day);

create table if not exists public.quizzes (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  created_by uuid not null references public.profiles (id) default auth.uid(),
  title      text not null check (length(trim(title)) > 0),
  topic_id   text,
  due_date   date,
  status     public.quiz_status not null default 'published',
  created_at timestamptz not null default now()
);
create index if not exists quizzes_class_idx on public.quizzes (class_id, created_at desc);

create table if not exists public.quiz_questions (
  id       uuid primary key default gen_random_uuid(),
  quiz_id  uuid not null references public.quizzes (id) on delete cascade,
  position int not null,
  topic_id text,
  text     text not null check (length(trim(text)) > 0),
  options  jsonb not null check (jsonb_typeof(options) = 'array'),
  answer   int not null check (answer >= 0),
  why      text not null default '',
  unique (quiz_id, position)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- "Park" -> "PARK", "김민지" -> the fallback. Used to build friendly codes like PARK-7KQ2X.
create or replace function public.code_prefix(p_text text, p_fallback text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(upper(left(regexp_replace(coalesce(p_text, ''), '[^A-Za-z]', '', 'g'), 6)), ''),
    p_fallback
  );
$$;

-- Prefix plus 5 characters from an alphabet with no 0/O/1/I.
create or replace function public.random_code(p_prefix text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  suffix text := '';
begin
  for i in 1..5 loop
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return p_prefix || '-' || suffix;
end;
$$;

-- These run as the table owner so policies can look at other tables without recursing.
create or replace function public.my_role()
returns public.app_role
language sql
security definer
stable
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_class_teacher(p_class uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = auth.uid());
$$;

create or replace function public.is_class_member(p_class uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.class_members m where m.class_id = p_class and m.student_id = auth.uid());
$$;

create or replace function public.is_parent_of(p_student uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.parent_links l where l.parent_id = auth.uid() and l.student_id = p_student);
$$;

-- Is p_student in any class taught by the signed-in teacher?
create or replace function public.teaches_student(p_student uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = p_student and c.teacher_id = auth.uid()
  );
$$;

-- Is p_teacher the teacher of any class the signed-in student is in?
create or replace function public.has_teacher(p_teacher uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = auth.uid() and c.teacher_id = p_teacher
  );
$$;

create or replace function public.is_quiz_teacher(p_quiz uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.quizzes q
    join public.classes c on c.id = q.class_id
    where q.id = p_quiz and c.teacher_id = auth.uid()
  );
$$;

-- The sign-up form checks codes before it creates the account, so it can show a
-- friendly "we couldn't find that code" message. Anyone can call these two.
create or replace function public.class_code_exists(p_code text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.classes where code = upper(trim(p_code)));
$$;

create or replace function public.invite_code_exists(p_code text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where role = 'student' and invite_code = upper(trim(p_code))
  );
$$;

grant execute on function public.class_code_exists(text) to anon, authenticated;
grant execute on function public.invite_code_exists(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up trigger: profile, plus class / invite code / link, by role
-- ---------------------------------------------------------------------------
-- The app sends these in the sign-up metadata: name, role, language,
-- class_name (teacher), class_code (student), invite_code (parent).
-- If the role is missing or unknown the account becomes a student (least access).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta       jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role     public.app_role;
  v_name     text;
  v_prefix   text;
  v_code     text;
  v_class_id uuid;
begin
  begin
    v_role := (meta ->> 'role')::public.app_role;
  exception when others then
    v_role := null;
  end;
  v_role := coalesce(v_role, 'student');
  v_name := coalesce(nullif(trim(meta ->> 'name'), ''), split_part(coalesce(new.email, 'user'), '@', 1));

  insert into public.profiles (id, name, email, role, language)
  values (
    new.id,
    v_name,
    coalesce(new.email, ''),
    v_role,
    coalesce(nullif(trim(meta ->> 'language'), ''), 'English')
  );

  if v_role = 'teacher' then
    v_prefix := public.code_prefix((regexp_match(v_name, '(\S+)\s*$'))[1], 'CLASS');
    loop
      v_code := public.random_code(v_prefix);
      exit when not exists (select 1 from public.classes where code = v_code);
    end loop;
    insert into public.classes (teacher_id, name, code)
    values (new.id, coalesce(nullif(trim(meta ->> 'class_name'), ''), 'My class'), v_code);

  elsif v_role = 'student' then
    v_prefix := public.code_prefix(split_part(v_name, ' ', 1), 'KID');
    loop
      v_code := public.random_code(v_prefix);
      exit when not exists (select 1 from public.profiles where invite_code = v_code);
    end loop;
    update public.profiles set invite_code = v_code where id = new.id;

    select c.id into v_class_id
    from public.classes c
    where c.code = upper(trim(coalesce(meta ->> 'class_code', '')));
    if v_class_id is not null then
      insert into public.class_members (class_id, student_id)
      values (v_class_id, new.id)
      on conflict do nothing;
    end if;

  elsif v_role = 'parent' then
    insert into public.parent_links (parent_id, student_id)
    select new.id, p.id
    from public.profiles p
    where p.role = 'student'
      and p.invite_code = upper(trim(coalesce(meta ->> 'invite_code', '')))
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Publish a quiz and its questions in one go (runs with the caller's permissions)
-- ---------------------------------------------------------------------------

create or replace function public.publish_quiz(
  p_class     uuid,
  p_title     text,
  p_topic     text,
  p_due       date,
  p_questions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'A quiz needs at least one question.';
  end if;

  insert into public.quizzes (class_id, created_by, title, topic_id, due_date, status)
  values (p_class, auth.uid(), trim(p_title), p_topic, p_due, 'published')
  returning id into v_id;

  insert into public.quiz_questions (quiz_id, position, topic_id, text, options, answer, why)
  select
    v_id,
    (q.ord - 1)::int,
    q.value ->> 'topic_id',
    q.value ->> 'text',
    q.value -> 'options',
    (q.value ->> 'answer')::int,
    coalesce(q.value ->> 'why', '')
  from jsonb_array_elements(p_questions) with ordinality as q(value, ord);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.classes        enable row level security;
alter table public.class_members  enable row level security;
alter table public.parent_links   enable row level security;
alter table public.attendance     enable row level security;
alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;

-- profiles: yourself, your students, your child, your teacher
drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.teaches_student(id)
    or public.is_parent_of(id)
    or public.has_teacher(id)
  );

-- People can change their own name and language, but never their role.
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (name, language) on public.profiles to authenticated;

-- classes
drop policy if exists "classes: read" on public.classes;
create policy "classes: read" on public.classes
  for select to authenticated
  using (teacher_id = auth.uid() or public.is_class_member(id));

drop policy if exists "classes: teacher creates" on public.classes;
create policy "classes: teacher creates" on public.classes
  for insert to authenticated
  with check (teacher_id = auth.uid() and public.my_role() = 'teacher');

drop policy if exists "classes: teacher updates" on public.classes;
create policy "classes: teacher updates" on public.classes
  for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "classes: teacher deletes" on public.classes;
create policy "classes: teacher deletes" on public.classes
  for delete to authenticated
  using (teacher_id = auth.uid());

-- class_members (students join at sign-up through the trigger, so there is no insert policy)
drop policy if exists "class_members: read" on public.class_members;
create policy "class_members: read" on public.class_members
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_class_teacher(class_id)
    or public.is_parent_of(student_id)
  );

drop policy if exists "class_members: teacher removes" on public.class_members;
create policy "class_members: teacher removes" on public.class_members
  for delete to authenticated
  using (public.is_class_teacher(class_id));

-- parent_links
drop policy if exists "parent_links: read" on public.parent_links;
create policy "parent_links: read" on public.parent_links
  for select to authenticated
  using (parent_id = auth.uid() or student_id = auth.uid());

drop policy if exists "parent_links: parent removes" on public.parent_links;
create policy "parent_links: parent removes" on public.parent_links
  for delete to authenticated
  using (parent_id = auth.uid());

-- attendance: the class's teacher manages it; a student sees their own; a parent sees their child's
drop policy if exists "attendance: read" on public.attendance;
create policy "attendance: read" on public.attendance
  for select to authenticated
  using (
    public.is_class_teacher(class_id)
    or student_id = auth.uid()
    or public.is_parent_of(student_id)
  );

drop policy if exists "attendance: teacher inserts" on public.attendance;
create policy "attendance: teacher inserts" on public.attendance
  for insert to authenticated
  with check (
    public.is_class_teacher(class_id)
    and exists (
      select 1 from public.class_members m
      where m.class_id = attendance.class_id and m.student_id = attendance.student_id
    )
  );

drop policy if exists "attendance: teacher updates" on public.attendance;
create policy "attendance: teacher updates" on public.attendance
  for update to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

drop policy if exists "attendance: teacher deletes" on public.attendance;
create policy "attendance: teacher deletes" on public.attendance
  for delete to authenticated
  using (public.is_class_teacher(class_id));

-- quizzes: the class's teacher manages them; students see published ones for their class
drop policy if exists "quizzes: read" on public.quizzes;
create policy "quizzes: read" on public.quizzes
  for select to authenticated
  using (
    public.is_class_teacher(class_id)
    or (status = 'published' and public.is_class_member(class_id))
  );

drop policy if exists "quizzes: teacher inserts" on public.quizzes;
create policy "quizzes: teacher inserts" on public.quizzes
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_class_teacher(class_id));

drop policy if exists "quizzes: teacher updates" on public.quizzes;
create policy "quizzes: teacher updates" on public.quizzes
  for update to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

drop policy if exists "quizzes: teacher deletes" on public.quizzes;
create policy "quizzes: teacher deletes" on public.quizzes
  for delete to authenticated
  using (public.is_class_teacher(class_id));

-- quiz_questions: teachers only. Students never read this table, because it holds the answers.
-- They use my_quizzes(), quiz_for_student() and submit_quiz() below instead.
drop policy if exists "quiz_questions: teacher all" on public.quiz_questions;
create policy "quiz_questions: teacher all" on public.quiz_questions
  for all to authenticated
  using (public.is_quiz_teacher(quiz_id))
  with check (public.is_quiz_teacher(quiz_id));

-- ---------------------------------------------------------------------------
-- Student quizzes: taking a quiz and seeing the results
-- ---------------------------------------------------------------------------
-- Students can't read quiz_questions (that would hand them the answers). Instead they call three
-- functions that run with extra rights and check who is asking:
--   my_quizzes()              published quizzes for the student's class, with question count and result
--   quiz_for_student(quiz)    the questions with no answers. Once the student has finished, it also
--                             returns the right answers, the reasons, and what they picked.
--   submit_quiz(quiz, list)   saves the answers (one attempt per quiz) and returns the same as above.

create table if not exists public.quiz_responses (
  question_id  uuid not null references public.quiz_questions (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  quiz_id      uuid not null references public.quizzes (id) on delete cascade,
  choice       int  not null check (choice >= 0),
  correct      boolean not null,
  submitted_at timestamptz not null default now(),
  primary key (question_id, student_id)
);
create index if not exists quiz_responses_quiz_idx on public.quiz_responses (quiz_id, student_id);

alter table public.quiz_responses enable row level security;

-- Read only: a student sees their own, the quiz's teacher sees the class's, a parent sees their child's.
-- There is no insert, update or delete policy: answers only get in through submit_quiz().
drop policy if exists "quiz_responses: read" on public.quiz_responses;
create policy "quiz_responses: read" on public.quiz_responses
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_quiz_teacher(quiz_id)
    or public.is_parent_of(student_id)
  );

create or replace function public.my_quizzes()
returns table (id uuid, title text, due_date date, question_count int, finished boolean, score int)
language sql
security definer
set search_path = ''
as $$
  select
    q.id,
    q.title,
    q.due_date,
    (select count(*)::int from public.quiz_questions qq where qq.quiz_id = q.id),
    exists (select 1 from public.quiz_responses r where r.quiz_id = q.id and r.student_id = auth.uid()),
    (select count(*) filter (where r.correct)::int from public.quiz_responses r where r.quiz_id = q.id and r.student_id = auth.uid())
  from public.quizzes q
  join public.class_members m on m.class_id = q.class_id and m.student_id = auth.uid()
  where q.status = 'published'
  order by q.created_at desc;
$$;

create or replace function public.quiz_for_student(p_quiz uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_due   date;
  v_class uuid;
  v_done  boolean;
begin
  select q.title, q.due_date, q.class_id into v_title, v_due, v_class
  from public.quizzes q
  where q.id = p_quiz and q.status = 'published';

  if v_class is null or not public.is_class_member(v_class) then
    raise exception 'We could not find that quiz.';
  end if;

  v_done := exists (select 1 from public.quiz_responses r where r.quiz_id = p_quiz and r.student_id = auth.uid());

  return jsonb_build_object(
    'id', p_quiz,
    'title', v_title,
    'due_date', v_due,
    'finished', v_done,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', qq.id, 'text', qq.text, 'options', qq.options)
        || case
             when v_done then jsonb_build_object('answer', qq.answer, 'why', qq.why, 'choice', r.choice)
             else '{}'::jsonb
           end
        order by qq.position
      )
      from public.quiz_questions qq
      left join public.quiz_responses r on r.question_id = qq.id and r.student_id = auth.uid()
      where qq.quiz_id = p_quiz
    ), '[]'::jsonb)
  );
end;
$$;

-- p_answers is a list like [{"question_id": "...", "choice": 2}, ...] with one entry for every question.
create or replace function public.submit_quiz(p_quiz uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_total int;
  v_saved int;
begin
  select q.class_id into v_class
  from public.quizzes q
  where q.id = p_quiz and q.status = 'published';

  if v_class is null or not public.is_class_member(v_class) then
    raise exception 'We could not find that quiz.';
  end if;
  if exists (select 1 from public.quiz_responses r where r.quiz_id = p_quiz and r.student_id = auth.uid()) then
    raise exception 'You already finished this quiz.';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Send your answers as a list.';
  end if;

  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz;

  insert into public.quiz_responses (question_id, student_id, quiz_id, choice, correct)
  select distinct on (qq.id)
    qq.id,
    auth.uid(),
    p_quiz,
    (a.value ->> 'choice')::int,
    (a.value ->> 'choice')::int = qq.answer
  from jsonb_array_elements(p_answers) as a(value)
  join public.quiz_questions qq
    on qq.id = (a.value ->> 'question_id')::uuid and qq.quiz_id = p_quiz
  where (a.value ->> 'choice')::int between 0 and jsonb_array_length(qq.options) - 1
  order by qq.id;

  get diagnostics v_saved = row_count;
  if v_saved <> v_total then
    raise exception 'Answer every question before you finish.';
  end if;

  return public.quiz_for_student(p_quiz);
end;
$$;

revoke execute on function public.my_quizzes() from public, anon;
revoke execute on function public.quiz_for_student(uuid) from public, anon;
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
grant execute on function public.my_quizzes() to authenticated;
grant execute on function public.quiz_for_student(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
