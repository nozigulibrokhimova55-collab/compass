-- Chapter quizzes: questions written from an uploaded file's chapter, kept as a draft until the teacher
-- approves them, plus short numeric questions.
--
-- Run AFTER supabase/schema.sql, 20261106000001_syllabus_calendar.sql and 20261120000001_uploaded_materials.sql,
-- in the Supabase SQL Editor. Safe to run again. If you rerun schema.sql later, rerun this file after it:
-- it replaces quiz_for_student() and submit_quiz() from schema.sql with versions that know numeric questions.
--
--   quizzes         + material_id, chapter_id (where a chapter quiz came from)
--   quiz_questions  + type ('multiple_choice' or 'numeric'), concept, source_pages, misconceptions (one note per
--                     option: why a student might pick it, null for the right one), answer_number, tolerance, unit,
--                     approved (drafts start unapproved; only approved questions get published)
--   quiz_responses  + value (a numeric answer); choice may now be empty for numeric questions
--
--   save_quiz_draft()     creates or replaces a draft chapter quiz and its questions, checking pages and answers
--   publish_quiz_draft()  publishes only the approved questions, after the teacher checked them
--
-- Students still never read quiz_questions. They get questions through quiz_for_student(), which never returns
-- a draft, an unapproved question, the answers before they finish, or the misconception notes.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.quizzes add column if not exists material_id uuid references public.materials (id) on delete set null;
alter table public.quizzes add column if not exists chapter_id  uuid references public.material_chapters (id) on delete set null;
create index if not exists quizzes_chapter_idx on public.quizzes (chapter_id);

alter table public.quiz_questions add column if not exists type           text    not null default 'multiple_choice';
alter table public.quiz_questions add column if not exists concept        text    not null default '';
alter table public.quiz_questions add column if not exists source_pages   int[]   not null default '{}';
alter table public.quiz_questions add column if not exists misconceptions jsonb   not null default '[]';
alter table public.quiz_questions add column if not exists answer_number  numeric;
alter table public.quiz_questions add column if not exists tolerance      numeric;
alter table public.quiz_questions add column if not exists unit           text;
-- Questions that already exist were published by a teacher, so they count as approved.
alter table public.quiz_questions add column if not exists approved       boolean not null default true;

do $$ begin
  alter table public.quiz_questions add constraint quiz_questions_type_check check (type in ('multiple_choice', 'numeric'));
exception when duplicate_object then null; end $$;
-- Numeric questions keep options = [] and answer = 0 (the old columns can't be empty); the real answer is answer_number.
do $$ begin
  alter table public.quiz_questions add constraint quiz_questions_numeric_check
    check (type <> 'numeric' or (answer_number is not null and coalesce(tolerance, 0) >= 0));
exception when duplicate_object then null; end $$;

alter table public.quiz_responses add column if not exists value numeric;
alter table public.quiz_responses alter column choice drop not null;
do $$ begin
  alter table public.quiz_responses add constraint quiz_responses_answer_check check (choice is not null or value is not null);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Drafts
-- ---------------------------------------------------------------------------

-- The first problem with a list of questions, or null. p_first / p_last: the chapter's pages (null for no chapter).
create or replace function public.quiz_questions_problem(p_questions jsonb, p_first int, p_last int)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  q     jsonb;
  n     int := 0;
  v_opt int;
  p     int;
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    return 'A quiz needs at least one question.';
  end if;
  if jsonb_array_length(p_questions) > 40 then
    return 'A quiz can have up to 40 questions.';
  end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    n := n + 1;
    if length(trim(coalesce(q ->> 'text', ''))) = 0 then return format('Question %s has no text.', n); end if;
    if coalesce(q ->> 'type', 'multiple_choice') = 'multiple_choice' then
      if coalesce(jsonb_typeof(q -> 'options'), '') <> 'array' then return format('Question %s needs answer choices.', n); end if;
      v_opt := jsonb_array_length(q -> 'options');
      if v_opt < 2 or v_opt > 6 then return format('Question %s needs 2 to 6 answer choices.', n); end if;
      if exists (select 1 from jsonb_array_elements_text(q -> 'options') o where length(trim(o)) = 0) then
        return format('Question %s has an empty answer choice.', n);
      end if;
      if coalesce(q ->> 'answer', '') !~ '^\d+$' or (q ->> 'answer')::int >= v_opt then
        return format('Question %s needs one right answer.', n);
      end if;
    elsif q ->> 'type' = 'numeric' then
      if coalesce(jsonb_typeof(q -> 'answer_number'), '') <> 'number' then return format('Question %s needs a number as its answer.', n); end if;
      if jsonb_typeof(q -> 'tolerance') = 'number' and (q ->> 'tolerance')::numeric < 0 then
        return format('Question %s has a negative tolerance.', n);
      end if;
    else
      return format('Question %s has a type we don''t know.', n);
    end if;
    if p_first is not null and jsonb_typeof(q -> 'source_pages') = 'array' then
      for p in select (x #>> '{}')::int from jsonb_array_elements(q -> 'source_pages') x where jsonb_typeof(x) = 'number' loop
        if p < p_first or p > p_last then
          return format('Question %s points to page %s, outside this chapter (pages %s to %s).', n, p, p_first, p_last);
        end if;
      end loop;
    end if;
  end loop;
  return null;
end;
$$;

-- Creates a draft chapter quiz (p_quiz null) or replaces a draft's title and questions. Returns the quiz id.
-- p_questions: [{ type, text, options, answer, misconceptions, answer_number, tolerance, unit, why, concept,
--                 source_pages, approved }, ...]
create or replace function public.save_quiz_draft(p_quiz uuid, p_chapter uuid, p_title text, p_questions jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id       uuid := p_quiz;
  v_class    uuid;
  v_material uuid;
  v_first    int;
  v_last     int;
  v_problem  text;
begin
  select m.class_id, m.id, c.start_page, c.end_page into v_class, v_material, v_first, v_last
  from public.material_chapters c
  join public.materials m on m.id = c.material_id
  where c.id = p_chapter;
  if v_class is null or not public.is_class_teacher(v_class) then
    raise exception 'We couldn''t find that chapter.';
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'Give the quiz a name.'; end if;
  v_problem := public.quiz_questions_problem(p_questions, v_first, v_last);
  if v_problem is not null then raise exception '%', v_problem; end if;

  if v_id is null then
    insert into public.quizzes (class_id, created_by, title, status, material_id, chapter_id)
    values (v_class, auth.uid(), trim(p_title), 'draft', v_material, p_chapter)
    returning id into v_id;
  else
    update public.quizzes set title = trim(p_title)
    where id = v_id and class_id = v_class and status = 'draft';
    if not found then raise exception 'That draft is gone, or it was already published.'; end if;
    delete from public.quiz_questions where quiz_id = v_id;
  end if;

  insert into public.quiz_questions (quiz_id, position, topic_id, text, options, answer, why, type, concept, source_pages, misconceptions, answer_number, tolerance, unit, approved)
  select
    v_id,
    (q.ord - 1)::int,
    null,
    trim(q.value ->> 'text'),
    case when q.value ->> 'type' = 'numeric' then '[]'::jsonb else q.value -> 'options' end,
    case when q.value ->> 'type' = 'numeric' then 0 else (q.value ->> 'answer')::int end,
    coalesce(trim(q.value ->> 'why'), ''),
    coalesce(q.value ->> 'type', 'multiple_choice'),
    coalesce(trim(q.value ->> 'concept'), ''),
    coalesce(array(select (x #>> '{}')::int from jsonb_array_elements(coalesce(q.value -> 'source_pages', '[]'::jsonb)) x where jsonb_typeof(x) = 'number'), '{}'),
    case when jsonb_typeof(q.value -> 'misconceptions') = 'array' then q.value -> 'misconceptions' else '[]'::jsonb end,
    case when q.value ->> 'type' = 'numeric' then (q.value ->> 'answer_number')::numeric end,
    case when q.value ->> 'type' = 'numeric' and jsonb_typeof(q.value -> 'tolerance') = 'number' then (q.value ->> 'tolerance')::numeric end,
    case when q.value ->> 'type' = 'numeric' then nullif(trim(coalesce(q.value ->> 'unit', '')), '') end,
    coalesce((q.value ->> 'approved')::boolean, false)
  from jsonb_array_elements(p_questions) with ordinality as q(value, ord);

  return v_id;
end;
$$;

-- Publishes a draft: drops the questions that weren't approved, numbers the rest from 0, and makes the quiz
-- visible to the class. Returns how many questions went out.
create or replace function public.publish_quiz_draft(p_quiz uuid, p_title text, p_due date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
begin
  if not public.is_quiz_teacher(p_quiz) then raise exception 'We couldn''t find that quiz.'; end if;
  if not exists (select 1 from public.quizzes where id = p_quiz and status = 'draft') then
    raise exception 'This quiz was already published.';
  end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'Give the quiz a name.'; end if;
  select count(*) into v_count from public.quiz_questions where quiz_id = p_quiz and approved;
  if v_count = 0 then raise exception 'Approve at least one question first.'; end if;

  delete from public.quiz_questions where quiz_id = p_quiz and not approved;
  -- Two steps, so the new numbers never collide with old ones on (quiz_id, position).
  update public.quiz_questions set position = position + 100000 where quiz_id = p_quiz;
  update public.quiz_questions qq set position = r.n
  from (select id, (row_number() over (order by position) - 1)::int as n from public.quiz_questions where quiz_id = p_quiz) r
  where qq.id = r.id;

  update public.quizzes set title = trim(p_title), due_date = p_due, status = 'published', created_at = now() where id = p_quiz;
  return v_count;
end;
$$;

revoke execute on function public.save_quiz_draft(uuid, uuid, text, jsonb) from public, anon;
revoke execute on function public.publish_quiz_draft(uuid, text, date) from public, anon;
grant execute on function public.quiz_questions_problem(jsonb, int, int) to authenticated;
grant execute on function public.save_quiz_draft(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.publish_quiz_draft(uuid, text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Students: the same three functions as schema.sql, now with numeric questions and the source's credit line
-- ---------------------------------------------------------------------------

create or replace function public.quiz_for_student(p_quiz uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title  text;
  v_due    date;
  v_class  uuid;
  v_credit text;
  v_done   boolean;
begin
  select q.title, q.due_date, q.class_id, m.attribution into v_title, v_due, v_class, v_credit
  from public.quizzes q
  left join public.materials m on m.id = q.material_id
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
    'attribution', v_credit,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', qq.id, 'type', qq.type, 'text', qq.text, 'options', qq.options, 'unit', qq.unit)
        || case
             when not v_done then '{}'::jsonb
             when qq.type = 'numeric' then jsonb_build_object('answer_number', qq.answer_number, 'tolerance', qq.tolerance, 'why', qq.why, 'value', r.value, 'correct', r.correct)
             else jsonb_build_object('answer', qq.answer, 'why', qq.why, 'choice', r.choice)
           end
        order by qq.position
      )
      from public.quiz_questions qq
      left join public.quiz_responses r on r.question_id = qq.id and r.student_id = auth.uid()
      where qq.quiz_id = p_quiz and qq.approved
    ), '[]'::jsonb)
  );
end;
$$;

-- p_answers: [{"question_id": "...", "choice": 2}, {"question_id": "...", "value": 12.5}, ...], one per question.
-- A numeric answer is right when it is within the question's tolerance (1% of the answer when none is set).
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

  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz and approved;

  insert into public.quiz_responses (question_id, student_id, quiz_id, choice, value, correct)
  select distinct on (qq.id)
    qq.id,
    auth.uid(),
    p_quiz,
    case when qq.type = 'multiple_choice' then (a.value ->> 'choice')::int end,
    case when qq.type = 'numeric' then (a.value ->> 'value')::numeric end,
    case
      when qq.type = 'numeric' then
        abs((a.value ->> 'value')::numeric - qq.answer_number) <= coalesce(qq.tolerance, abs(qq.answer_number) * 0.01) + 1e-9
      else (a.value ->> 'choice')::int = qq.answer
    end
  from jsonb_array_elements(p_answers) as a(value)
  join public.quiz_questions qq
    on qq.id = (a.value ->> 'question_id')::uuid and qq.quiz_id = p_quiz and qq.approved
  where case
          when qq.type = 'numeric' then jsonb_typeof(a.value -> 'value') = 'number'
          else coalesce(a.value ->> 'choice', '') ~ '^\d+$' and (a.value ->> 'choice')::int between 0 and jsonb_array_length(qq.options) - 1
        end
  order by qq.id;

  get diagnostics v_saved = row_count;
  if v_saved <> v_total then
    raise exception 'Answer every question before you finish.';
  end if;

  return public.quiz_for_student(p_quiz);
end;
$$;

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
    (select count(*)::int from public.quiz_questions qq where qq.quiz_id = q.id and qq.approved),
    exists (select 1 from public.quiz_responses r where r.quiz_id = q.id and r.student_id = auth.uid()),
    (select count(*) filter (where r.correct)::int from public.quiz_responses r where r.quiz_id = q.id and r.student_id = auth.uid())
  from public.quizzes q
  join public.class_members m on m.class_id = q.class_id and m.student_id = auth.uid()
  where q.status = 'published'
  order by q.created_at desc;
$$;

revoke execute on function public.my_quizzes() from public, anon;
revoke execute on function public.quiz_for_student(uuid) from public, anon;
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
grant execute on function public.my_quizzes() to authenticated;
grant execute on function public.quiz_for_student(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
