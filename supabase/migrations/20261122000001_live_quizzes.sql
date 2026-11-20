-- Live quizzes: the teacher runs a session, students answer on their phones at the same time.
-- Run this in the Supabase SQL Editor after schema.sql and the other migrations (it copies questions from
-- quiz_questions, so 20261121000001_chapter_quizzes.sql has to be there first). Safe to run again.
--
--   live_sessions   one per run. status: lobby -> open -> revealed -> open -> ... -> ended.
--                   A class can have only one session that isn't ended.
--   live_questions  the session's own copy of its questions (copied from a published quiz when it starts, plus any
--                   quick questions the teacher adds mid-class). Only the teacher reads this table: it holds answers.
--   live_answers    each student's answer, saved by live_answer() (one per question).
--
--   start_live_session()  teacher: starts a session from a published quiz, or empty (quick questions only)
--   live_add_question()   teacher: adds a quick question to the end
--   live_control()        teacher: 'start', 'reveal', 'next' or 'end'
--   live_state()          student: what to show right now. Never returns the answer before the teacher reveals it.
--   live_answer()         student: sends an answer for the open question
--
-- No leaderboard on purpose: a student only ever sees their own results, plus how many in the class picked each
-- option (no names) after the teacher reveals the answer.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.live_sessions (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  quiz_id    uuid references public.quizzes (id) on delete set null,
  created_by uuid not null references public.profiles (id) default auth.uid(),
  title      text not null check (length(trim(title)) > 0),
  status     text not null default 'lobby' check (status in ('lobby', 'open', 'revealed', 'ended')),
  -- 1-based position of the question on screen. 0 while in the lobby.
  position   int  not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  ended_at   timestamptz
);
create index if not exists live_sessions_class_idx on public.live_sessions (class_id, created_at desc);
-- One running session per class.
create unique index if not exists live_sessions_one_running on public.live_sessions (class_id) where status <> 'ended';

create table if not exists public.live_questions (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.live_sessions (id) on delete cascade,
  position      int  not null check (position >= 1),
  type          text not null default 'multiple_choice' check (type in ('multiple_choice', 'numeric')),
  text          text not null check (length(trim(text)) > 0),
  options       jsonb not null default '[]' check (jsonb_typeof(options) = 'array'),
  answer        int  not null default 0 check (answer >= 0),
  answer_number numeric,
  tolerance     numeric check (tolerance is null or tolerance >= 0),
  unit          text,
  why           text not null default '',
  unique (session_id, position),
  check (type <> 'numeric' or answer_number is not null)
);

create table if not exists public.live_answers (
  question_id uuid not null references public.live_questions (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  session_id  uuid not null references public.live_sessions (id) on delete cascade,
  choice      int,
  value       numeric,
  correct     boolean not null,
  answered_at timestamptz not null default now(),
  primary key (question_id, student_id),
  check (choice is not null or value is not null)
);
create index if not exists live_answers_session_idx on public.live_answers (session_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

create or replace function public.is_live_teacher(p_session uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.live_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = p_session and c.teacher_id = auth.uid()
  );
$$;

alter table public.live_sessions  enable row level security;
alter table public.live_questions enable row level security;
alter table public.live_answers   enable row level security;

-- Sessions: the class's teacher and the class's students can see them (status and position only, nothing secret).
-- Nobody writes to the tables directly: every change goes through the functions below.
drop policy if exists "live_sessions: read" on public.live_sessions;
create policy "live_sessions: read" on public.live_sessions
  for select to authenticated
  using (public.is_class_teacher(class_id) or public.is_class_member(class_id));

-- Questions hold the answers, so only the teacher reads them. Students use live_state().
drop policy if exists "live_questions: teacher read" on public.live_questions;
create policy "live_questions: teacher read" on public.live_questions
  for select to authenticated
  using (public.is_live_teacher(session_id));

-- Answers: the teacher sees the class's, a student sees only their own.
drop policy if exists "live_answers: read" on public.live_answers;
create policy "live_answers: read" on public.live_answers
  for select to authenticated
  using (public.is_live_teacher(session_id) or student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Teacher functions
-- ---------------------------------------------------------------------------

-- Starts a session in the lobby. p_quiz: a published quiz of the class whose approved questions are copied in,
-- or null to start empty and add quick questions as you go.
create or replace function public.start_live_session(p_class uuid, p_quiz uuid default null, p_title text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_title text;
  v_n     int;
begin
  if not public.is_class_teacher(p_class) then
    raise exception 'Only the class’s teacher can start a live quiz.';
  end if;
  if exists (select 1 from public.live_sessions where class_id = p_class and status <> 'ended') then
    raise exception 'A live quiz is already running for this class. End it first.';
  end if;

  if p_quiz is not null then
    select q.title into v_title
    from public.quizzes q
    where q.id = p_quiz and q.class_id = p_class and q.status = 'published';
    if v_title is null then
      raise exception 'We could not find that quiz.';
    end if;
  end if;

  v_title := left(coalesce(nullif(trim(p_title), ''), v_title, 'Live quiz'), 120);

  insert into public.live_sessions (class_id, quiz_id, created_by, title)
  values (p_class, p_quiz, auth.uid(), v_title)
  returning id into v_id;

  if p_quiz is not null then
    insert into public.live_questions (session_id, position, type, text, options, answer, answer_number, tolerance, unit, why)
    select v_id, (row_number() over (order by qq.position))::int, qq.type, qq.text, qq.options, qq.answer, qq.answer_number, qq.tolerance, qq.unit, qq.why
    from public.quiz_questions qq
    where qq.quiz_id = p_quiz and qq.approved
    order by qq.position;

    get diagnostics v_n = row_count;
    if v_n = 0 then
      raise exception 'That quiz has no approved questions.';
    end if;
  end if;

  return v_id;
end;
$$;

-- Adds a quick question to the end of a session that hasn't ended.
-- p_question: { type, text, options, answer, answer_number, tolerance, unit, why }
create or replace function public.live_add_question(p_session uuid, p_question jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_type   text;
  v_text   text;
  v_opts   jsonb;
  v_answer int := 0;
  v_num    numeric;
  v_tol    numeric;
  v_count  int;
begin
  if not public.is_live_teacher(p_session) then
    raise exception 'Only the class’s teacher can add questions.';
  end if;

  select status into v_status from public.live_sessions where id = p_session for update;
  if v_status = 'ended' then
    raise exception 'This live quiz has ended.';
  end if;

  select count(*) into v_count from public.live_questions where session_id = p_session;
  if v_count >= 60 then
    raise exception 'A live quiz can have up to 60 questions.';
  end if;

  v_type := coalesce(p_question ->> 'type', 'multiple_choice');
  v_text := trim(coalesce(p_question ->> 'text', ''));
  if v_text = '' then
    raise exception 'Type the question first.';
  end if;
  if length(v_text) > 500 then
    raise exception 'Keep the question under 500 characters.';
  end if;

  if v_type = 'numeric' then
    if jsonb_typeof(p_question -> 'answer_number') is distinct from 'number' then
      raise exception 'Type the right answer as a number.';
    end if;
    v_num := (p_question ->> 'answer_number')::numeric;
    if jsonb_typeof(p_question -> 'tolerance') = 'number' then
      v_tol := (p_question ->> 'tolerance')::numeric;
      if v_tol < 0 then
        raise exception 'Close enough can’t be negative.';
      end if;
    end if;
    v_opts := '[]'::jsonb;
  elsif v_type = 'multiple_choice' then
    v_opts := p_question -> 'options';
    if v_opts is null or jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) not between 2 and 4 then
      raise exception 'Give 2 to 4 answers.';
    end if;
    if exists (select 1 from jsonb_array_elements(v_opts) o where jsonb_typeof(o) <> 'string' or length(trim(o #>> '{}')) = 0 or length(o #>> '{}') > 200) then
      raise exception 'Every answer needs some text (up to 200 characters).';
    end if;
    if jsonb_typeof(p_question -> 'answer') is distinct from 'number' then
      raise exception 'Pick the right answer.';
    end if;
    v_answer := (p_question ->> 'answer')::int;
    if v_answer < 0 or v_answer >= jsonb_array_length(v_opts) then
      raise exception 'Pick the right answer.';
    end if;
  else
    raise exception 'Unknown question type.';
  end if;

  insert into public.live_questions (session_id, position, type, text, options, answer, answer_number, tolerance, unit, why)
  values (
    p_session, v_count + 1, v_type, v_text, v_opts, v_answer, v_num, v_tol,
    nullif(left(trim(coalesce(p_question ->> 'unit', '')), 20), ''),
    left(trim(coalesce(p_question ->> 'why', '')), 500)
  );
end;
$$;

-- Moves the session along.
--   start   lobby -> first question open
--   reveal  question open -> answer shown to everyone
--   next    answer shown -> next question open
--   end     anything -> ended
create or replace function public.live_control(p_session uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s       record;
  v_total int;
begin
  if not public.is_live_teacher(p_session) then
    raise exception 'Only the class’s teacher can run a live quiz.';
  end if;

  select * into s from public.live_sessions where id = p_session for update;
  select count(*) into v_total from public.live_questions where session_id = p_session;

  if s.status = 'ended' then
    raise exception 'This live quiz has ended.';
  end if;

  if p_action = 'start' then
    if s.status <> 'lobby' then raise exception 'It already started.'; end if;
    if v_total = 0 then raise exception 'Add a question first.'; end if;
    update public.live_sessions set status = 'open', position = 1 where id = p_session;
  elsif p_action = 'reveal' then
    if s.status <> 'open' then raise exception 'There is no open question to reveal.'; end if;
    update public.live_sessions set status = 'revealed' where id = p_session;
  elsif p_action = 'next' then
    if s.status <> 'revealed' then raise exception 'Reveal the answer first.'; end if;
    if s.position >= v_total then raise exception 'That was the last question. Add another or end the quiz.'; end if;
    update public.live_sessions set status = 'open', position = s.position + 1 where id = p_session;
  elsif p_action = 'end' then
    update public.live_sessions set status = 'ended', ended_at = now() where id = p_session;
  else
    raise exception 'Unknown action.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Student functions
-- ---------------------------------------------------------------------------

-- What a student's screen shows right now. The answer and the "why" only come back once the teacher has revealed
-- them (or the session has ended). Counts are anonymous.
create or replace function public.live_state(p_session uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  s        record;
  q        record;
  v_total  int;
  v_right  int;
  v_result jsonb;
  v_my     jsonb;
begin
  select * into s from public.live_sessions where id = p_session;
  if s.id is null or not public.is_class_member(s.class_id) then
    raise exception 'We could not find that live quiz.';
  end if;

  select count(*) into v_total from public.live_questions where session_id = p_session;
  select count(*) filter (where a.correct) into v_right
  from public.live_answers a where a.session_id = p_session and a.student_id = auth.uid();

  v_result := jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'position', s.position, 'total', v_total, 'right', v_right);

  if s.status in ('open', 'revealed') then
    select * into q from public.live_questions where session_id = p_session and position = s.position;
    v_my := (
      select jsonb_build_object('choice', a.choice, 'value', a.value, 'correct', a.correct)
      from public.live_answers a where a.question_id = q.id and a.student_id = auth.uid()
    );
    v_result := v_result
      || jsonb_build_object('question', jsonb_build_object('id', q.id, 'type', q.type, 'text', q.text, 'options', q.options, 'unit', q.unit))
      || jsonb_build_object('my', v_my);

    if s.status = 'revealed' then
      v_result := v_result || jsonb_build_object('reveal', jsonb_build_object(
        'answer', q.answer,
        'answer_number', q.answer_number,
        'tolerance', q.tolerance,
        'why', q.why,
        'answered', (select count(*) from public.live_answers a where a.question_id = q.id),
        'correct_count', (select count(*) from public.live_answers a where a.question_id = q.id and a.correct),
        'counts', coalesce((
          select jsonb_agg(c.n order by c.i)
          from (
            select i, (select count(*) from public.live_answers a where a.question_id = q.id and a.choice = i) as n
            from generate_series(0, greatest(jsonb_array_length(q.options) - 1, -1)) as i
          ) c
        ), '[]'::jsonb)
      ));
    end if;
  elsif s.status = 'ended' then
    v_result := v_result || jsonb_build_object('review', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', lq.id, 'type', lq.type, 'text', lq.text, 'options', lq.options, 'unit', lq.unit,
          'answer', lq.answer, 'answer_number', lq.answer_number, 'tolerance', lq.tolerance, 'why', lq.why,
          'choice', a.choice, 'value', a.value, 'correct', a.correct
        ) order by lq.position
      )
      from public.live_questions lq
      left join public.live_answers a on a.question_id = lq.id and a.student_id = auth.uid()
      where lq.session_id = p_session
    ), '[]'::jsonb));
  end if;

  return v_result;
end;
$$;

-- Saves an answer for the question that is open right now. One answer per question, no changes.
create or replace function public.live_answer(p_session uuid, p_question uuid, p_choice int default null, p_value numeric default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s    record;
  q    record;
  v_ok boolean;
  v_n  int;
begin
  -- "for share" waits for the teacher's own update (reveal / next) to finish, so an answer can't slip in late.
  select * into s from public.live_sessions where id = p_session for share;
  if s.id is null or not public.is_class_member(s.class_id) then
    raise exception 'We could not find that live quiz.';
  end if;
  if s.status <> 'open' then
    raise exception 'This question is closed.';
  end if;

  select * into q from public.live_questions where id = p_question and session_id = p_session and position = s.position;
  if q.id is null then
    raise exception 'That question isn’t open any more.';
  end if;

  if q.type = 'numeric' then
    if p_value is null then
      raise exception 'Type a number.';
    end if;
    v_ok := abs(p_value - q.answer_number) <= coalesce(q.tolerance, abs(q.answer_number) * 0.01) + 1e-9;
  else
    if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(q.options) then
      raise exception 'Pick one of the answers.';
    end if;
    v_ok := p_choice = q.answer;
  end if;

  insert into public.live_answers (question_id, student_id, session_id, choice, value, correct)
  values (q.id, auth.uid(), p_session, case when q.type = 'numeric' then null else p_choice end, case when q.type = 'numeric' then p_value else null end, v_ok)
  on conflict (question_id, student_id) do nothing;

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'You already answered this one.';
  end if;
end;
$$;

-- The running session for the signed-in student's class, if any (for the "Live now" banner).
create or replace function public.my_live_session()
returns table (id uuid, title text, status text)
language sql
security definer
stable
set search_path = ''
as $$
  select s.id, s.title, s.status
  from public.live_sessions s
  where s.status <> 'ended' and public.is_class_member(s.class_id)
  order by s.created_at desc
  limit 1;
$$;

revoke execute on function public.start_live_session(uuid, uuid, text) from public, anon;
revoke execute on function public.live_add_question(uuid, jsonb) from public, anon;
revoke execute on function public.live_control(uuid, text) from public, anon;
revoke execute on function public.live_state(uuid) from public, anon;
revoke execute on function public.live_answer(uuid, uuid, int, numeric) from public, anon;
revoke execute on function public.my_live_session() from public, anon;
grant execute on function public.start_live_session(uuid, uuid, text) to authenticated;
grant execute on function public.live_add_question(uuid, jsonb) to authenticated;
grant execute on function public.live_control(uuid, text) to authenticated;
grant execute on function public.live_state(uuid) to authenticated;
grant execute on function public.live_answer(uuid, uuid, int, numeric) to authenticated;
grant execute on function public.my_live_session() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: lets the browser hear about changes the moment they happen.
-- (Row level security still decides who hears what. The app also checks every few seconds, in case a connection drops.)
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.live_sessions;
exception when duplicate_object then null; when undefined_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.live_answers;
exception when duplicate_object then null; when undefined_object then null; end $$;
