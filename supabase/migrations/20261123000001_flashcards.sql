-- Flashcards: wrong answers on finished quizzes become cards that come back for another try.
--
-- Run AFTER supabase/schema.sql and the other migrations, in the Supabase SQL Editor (paste the whole file, then Run).
-- It reads quiz_responses and quiz_questions, and uses the "type" and "approved" columns that
-- 20261121000001_chapter_quizzes.sql adds. Safe to run again. It only adds one table and three functions;
-- nothing that exists is changed or dropped.
--
--   flashcards  one row per student per missed question: when it is due, how many right in a row, when it was learned
--
-- The rules (the same ones the app used before, now saved for real):
--   a missed question becomes a card, due 2 days after the quiz was finished
--   a right answer on a retry puts the card back 7 days
--   two right answers in a row means learned, and the card leaves the deck
--   a wrong answer on a retry starts it over: streak 0, back in 2 days
-- Days are counted in Seoul time (Asia/Seoul). Only multiple choice questions become cards for now.
--
-- Who sees what:
--   a student reads only their own cards. Nobody writes the table directly: cards are made by
--   sync_my_flashcards() and graded by review_flashcards(). The functions never send the right answer
--   before a student has answered, and they refuse a card that is not due yet.
--
--   sync_my_flashcards()      makes any missing cards from the student's wrong answers. Safe to call often.
--   my_flashcards()           the student's cards with the question and the options, never the answer
--   review_flashcards(list)   grades a set of retry answers on the server and moves the cards along

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.flashcards (
  student_id  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  quiz_id     uuid not null references public.quizzes (id) on delete cascade,
  streak      smallint not null default 0 check (streak >= 0),   -- right answers in a row on retries
  due_on      date not null,                                     -- a Seoul calendar day
  learned_at  timestamptz,                                       -- set when the streak reaches 2; the card then leaves the deck
  reviews     int not null default 0 check (reviews >= 0),
  created_at  timestamptz not null default now(),
  primary key (student_id, question_id)
);
create index if not exists flashcards_due_idx on public.flashcards (student_id, due_on) where learned_at is null;

-- ---------------------------------------------------------------------------
-- Row level security: a student reads their own cards, and nobody writes directly
-- ---------------------------------------------------------------------------

alter table public.flashcards enable row level security;

drop policy if exists "flashcards: read own" on public.flashcards;
create policy "flashcards: read own" on public.flashcards
  for select to authenticated
  using (student_id = auth.uid());

revoke insert, update, delete, truncate on public.flashcards from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Making cards
-- ---------------------------------------------------------------------------

-- Turns the signed-in student's wrong answers into cards. A card that already exists is left alone, so a card
-- that was learned never comes back. Returns how many new cards were made.
create or replace function public.sync_my_flashcards()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Log in first.';
  end if;

  insert into public.flashcards (student_id, question_id, quiz_id, due_on)
  select
    r.student_id,
    r.question_id,
    r.quiz_id,
    (r.submitted_at at time zone 'Asia/Seoul')::date + 2
  from public.quiz_responses r
  join public.quiz_questions qq on qq.id = r.question_id
  join public.quizzes q on q.id = r.quiz_id
  where r.student_id = auth.uid()
    and not r.correct
    and qq.type = 'multiple_choice'
    and qq.approved
    and q.status = 'published'
    and public.is_class_member(q.class_id)
  on conflict (student_id, question_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reading cards (no answers here)
-- ---------------------------------------------------------------------------

create or replace function public.my_flashcards()
returns table (
  question_id   uuid,
  quiz_id       uuid,
  quiz_title    text,
  question_text text,
  options       jsonb,
  first_choice  int,
  streak        int,
  due_on        date,
  learned       boolean,
  due_now       boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.question_id,
    f.quiz_id,
    q.title,
    qq.text,
    qq.options,
    r.choice,
    f.streak::int,
    f.due_on,
    f.learned_at is not null,
    f.learned_at is null and f.due_on <= (now() at time zone 'Asia/Seoul')::date
  from public.flashcards f
  join public.quiz_questions qq on qq.id = f.question_id and qq.type = 'multiple_choice' and qq.approved
  join public.quizzes q on q.id = f.quiz_id and q.status = 'published'
  left join public.quiz_responses r on r.question_id = f.question_id and r.student_id = f.student_id
  where f.student_id = auth.uid()
  order by f.due_on, q.created_at, qq.position;
$$;

-- ---------------------------------------------------------------------------
-- Grading a retry
-- ---------------------------------------------------------------------------

-- p_answers: [{"question_id": "...", "choice": 2}, ...]. Every card in the list has to be due and not learned yet,
-- otherwise nothing is saved and the student gets a plain message. Returns, for each card, whether it was right,
-- the right answer and the reason (safe now, the student has just answered), and where the card stands.
create or replace function public.review_flashcards(p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today  date := (now() at time zone 'Asia/Seoul')::date;
  v_asked  int;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Log in first.';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 then
    raise exception 'Send your answers as a list.';
  end if;
  if jsonb_array_length(p_answers) > 100 then
    raise exception 'That is too many questions at once.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_answers) as a(value)
    where coalesce(a.value ->> 'question_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(a.value ->> 'choice', '') !~ '^\d{1,3}$'
  ) then
    raise exception 'Those answers did not look right. Try again.';
  end if;

  select count(distinct (a.value ->> 'question_id')::uuid) into v_asked
  from jsonb_array_elements(p_answers) as a(value);

  with graded as (
    select distinct on (qq.id)
      f.question_id,
      qq.answer,
      qq.why,
      ((a.value ->> 'choice')::int = qq.answer) as ok
    from jsonb_array_elements(p_answers) as a(value)
    join public.flashcards f
      on f.question_id = (a.value ->> 'question_id')::uuid
     and f.student_id = auth.uid()
     and f.learned_at is null
     and f.due_on <= v_today
    join public.quiz_questions qq
      on qq.id = f.question_id and qq.type = 'multiple_choice' and qq.approved
    where (a.value ->> 'choice')::int between 0 and jsonb_array_length(qq.options) - 1
    order by qq.id
  ),
  changed as (
    update public.flashcards f
    set streak     = case when g.ok then f.streak + 1 else 0 end,
        due_on     = v_today + case when g.ok then 7 else 2 end,
        learned_at = case when g.ok and f.streak + 1 >= 2 then now() end,
        reviews    = f.reviews + 1
    from graded g
    where f.student_id = auth.uid() and f.question_id = g.question_id
    returning f.question_id, g.ok, g.answer, g.why, f.streak, f.due_on, f.learned_at
  )
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'question_id', c.question_id,
      'correct', c.ok,
      'answer', c.answer,
      'why', c.why,
      'streak', c.streak,
      'due_on', c.due_on,
      'learned', c.learned_at is not null
    )),
    '[]'::jsonb
  )
  into v_result
  from changed c;

  -- Raising an error here undoes the update above, so a half-saved retry can't happen.
  if jsonb_array_length(v_result) <> v_asked then
    raise exception 'Some of these questions are not due for a retry yet.';
  end if;

  return v_result;
end;
$$;

revoke execute on function public.sync_my_flashcards() from public, anon;
revoke execute on function public.my_flashcards() from public, anon;
revoke execute on function public.review_flashcards(jsonb) from public, anon;
grant execute on function public.sync_my_flashcards() to authenticated;
grant execute on function public.my_flashcards() to authenticated;
grant execute on function public.review_flashcards(jsonb) to authenticated;
