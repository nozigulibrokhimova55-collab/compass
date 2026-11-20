// Live quizzes: the teacher runs a session, students answer on their phones at the same time. Tables and functions come
// from supabase/migrations/20261122000001_live_quizzes.sql. Pages never import the Supabase client directly.

import { supabase } from './supabase'

export const LIVE_MIGRATION = 'supabase/migrations/20261122000001_live_quizzes.sql'

export class LiveNotSetUpError extends Error {
  constructor() {
    super(`Live quizzes aren’t switched on yet. Run ${LIVE_MIGRATION} in the Supabase SQL Editor.`)
  }
}

function client() {
  if (!supabase) throw new Error('Supabase is not set up. Add the two keys from .env.example.')
  return supabase
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return
  // Missing function, table or column: the migration hasn't run.
  if (['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'].includes(error.code ?? '')) throw new LiveNotSetUpError()
  throw error
}

export type LiveStatus = 'lobby' | 'open' | 'revealed' | 'ended'
export type LiveQuestionType = 'multiple_choice' | 'numeric'

export type LiveSession = {
  id: string
  classId: string
  quizId: string | null
  title: string
  status: LiveStatus
  /** 1-based number of the question on screen. 0 in the lobby. */
  position: number
  createdAt: string
  endedAt: string | null
}

/** A question as the teacher sees it (answers included). */
export type LiveQuestion = {
  id: string
  position: number
  type: LiveQuestionType
  text: string
  options: string[]
  answer: number
  answerNumber: number | null
  tolerance: number | null
  unit: string | null
  why: string
}

export type LiveAnswer = { questionId: string; studentId: string; choice: number | null; value: number | null; correct: boolean }

export type LiveHost = { session: LiveSession; questions: LiveQuestion[]; answers: LiveAnswer[] }

/** A quick question the teacher adds mid-class. */
export type LiveQuestionInput =
  | { type: 'multiple_choice'; text: string; options: string[]; answer: number; why?: string }
  | { type: 'numeric'; text: string; answerNumber: number; tolerance: number | null; unit?: string; why?: string }

// ---------------------------------------------------------------------------
// Teacher
// ---------------------------------------------------------------------------

type SessionRow = { id: string; class_id: string; quiz_id: string | null; title: string; status: LiveStatus; position: number; created_at: string; ended_at: string | null }
const SESSION_COLUMNS = 'id, class_id, quiz_id, title, status, position, created_at, ended_at'

function toSession(r: SessionRow): LiveSession {
  return { id: r.id, classId: r.class_id, quizId: r.quiz_id, title: r.title, status: r.status, position: r.position, createdAt: r.created_at, endedAt: r.ended_at }
}

/** The class's live sessions, newest first. */
export async function listLiveSessions(classId: string): Promise<LiveSession[]> {
  const { data, error } = await client().from('live_sessions').select(SESSION_COLUMNS).eq('class_id', classId).order('created_at', { ascending: false }).limit(30)
  check(error)
  return (data ?? []).map((r) => toSession(r as SessionRow))
}

/** Everything the host screen needs, in one go: the session, its questions (with answers) and every answer so far. */
export async function fetchLiveHost(sessionId: string): Promise<LiveHost> {
  const db = client()
  const [s, q, a] = await Promise.all([
    db.from('live_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle(),
    db.from('live_questions').select('id, position, type, text, options, answer, answer_number, tolerance, unit, why').eq('session_id', sessionId).order('position', { ascending: true }),
    db.from('live_answers').select('question_id, student_id, choice, value, correct').eq('session_id', sessionId),
  ])
  check(s.error)
  check(q.error)
  check(a.error)
  if (!s.data) throw new Error('We could not find that live quiz.')
  return {
    session: toSession(s.data as SessionRow),
    questions: (q.data ?? []).map((r) => ({
      id: r.id,
      position: r.position,
      type: r.type as LiveQuestionType,
      text: r.text,
      options: Array.isArray(r.options) ? (r.options as string[]) : [],
      answer: r.answer,
      answerNumber: r.answer_number === null ? null : Number(r.answer_number),
      tolerance: r.tolerance === null ? null : Number(r.tolerance),
      unit: r.unit,
      why: r.why ?? '',
    })),
    answers: (a.data ?? []).map((r) => ({ questionId: r.question_id, studentId: r.student_id, choice: r.choice, value: r.value === null ? null : Number(r.value), correct: r.correct })),
  }
}

/** Starts a session in the lobby. Pass a published quiz id to copy its approved questions, or null to start empty. Returns the new session's id. */
export async function startLiveSession(classId: string, quizId: string | null, title?: string): Promise<string> {
  const { data, error } = await client().rpc('start_live_session', { p_class: classId, p_quiz: quizId, p_title: title ?? null })
  check(error)
  return data as string
}

export async function addLiveQuestion(sessionId: string, input: LiveQuestionInput): Promise<void> {
  const payload =
    input.type === 'numeric'
      ? { type: 'numeric', text: input.text, answer_number: input.answerNumber, tolerance: input.tolerance, unit: input.unit ?? '', why: input.why ?? '' }
      : { type: 'multiple_choice', text: input.text, options: input.options, answer: input.answer, why: input.why ?? '' }
  const { error } = await client().rpc('live_add_question', { p_session: sessionId, p_question: payload })
  check(error)
}

export type LiveAction = 'start' | 'reveal' | 'next' | 'end'

export async function liveControl(sessionId: string, action: LiveAction): Promise<void> {
  const { error } = await client().rpc('live_control', { p_session: sessionId, p_action: action })
  check(error)
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

export type LiveStudentQuestion = { id: string; type: LiveQuestionType; text: string; options: string[]; unit: string | null }
export type LiveMyAnswer = { choice: number | null; value: number | null; correct: boolean }
export type LiveReveal = { answer: number; answerNumber: number | null; tolerance: number | null; why: string; answered: number; correctCount: number; counts: number[] }
export type LiveReviewItem = LiveStudentQuestion & { answer: number; answerNumber: number | null; tolerance: number | null; why: string; choice: number | null; value: number | null; correct: boolean | null }

/** What a student's screen shows right now. The answer only appears once the teacher reveals it. */
export type LiveState = {
  id: string
  title: string
  status: LiveStatus
  position: number
  total: number
  /** How many this student has right so far. */
  right: number
  question: LiveStudentQuestion | null
  my: LiveMyAnswer | null
  reveal: LiveReveal | null
  /** Only once the session has ended. */
  review: LiveReviewItem[] | null
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))

type RawQuestion = { id: string; type: LiveQuestionType; text: string; options?: string[]; unit?: string | null }
type RawState = {
  id: string
  title: string
  status: LiveStatus
  position: number
  total: number
  right?: number
  question?: RawQuestion
  my?: { choice: number | null; value: number | string | null; correct: boolean } | null
  reveal?: { answer: number; answer_number: number | string | null; tolerance: number | string | null; why?: string; answered?: number; correct_count?: number; counts?: (number | string)[] }
  review?: (RawQuestion & { answer: number; answer_number: number | string | null; tolerance: number | string | null; why?: string; choice: number | null; value: number | string | null; correct: boolean | null })[]
}

const toQuestion = (q: RawQuestion): LiveStudentQuestion => ({ id: q.id, type: q.type, text: q.text, options: Array.isArray(q.options) ? q.options : [], unit: q.unit ?? null })

export async function fetchLiveState(sessionId: string): Promise<LiveState> {
  const { data, error } = await client().rpc('live_state', { p_session: sessionId })
  check(error)
  const d = data as RawState
  return {
    id: d.id,
    title: d.title,
    status: d.status,
    position: d.position,
    total: d.total,
    right: d.right ?? 0,
    question: d.question ? toQuestion(d.question) : null,
    my: d.my ? { choice: d.my.choice ?? null, value: num(d.my.value), correct: d.my.correct === true } : null,
    reveal: d.reveal
      ? {
          answer: d.reveal.answer,
          answerNumber: num(d.reveal.answer_number),
          tolerance: num(d.reveal.tolerance),
          why: d.reveal.why ?? '',
          answered: d.reveal.answered ?? 0,
          correctCount: d.reveal.correct_count ?? 0,
          counts: (d.reveal.counts ?? []).map(Number),
        }
      : null,
    review: Array.isArray(d.review)
      ? d.review.map((r) => ({
          ...toQuestion(r),
          answer: r.answer,
          answerNumber: num(r.answer_number),
          tolerance: num(r.tolerance),
          why: r.why ?? '',
          choice: r.choice ?? null,
          value: num(r.value),
          correct: typeof r.correct === 'boolean' ? r.correct : null,
        }))
      : null,
  }
}

export async function sendLiveAnswer(sessionId: string, questionId: string, answer: { choice: number } | { value: number }): Promise<void> {
  const { error } = await client().rpc('live_answer', {
    p_session: sessionId,
    p_question: questionId,
    p_choice: 'choice' in answer ? answer.choice : null,
    p_value: 'value' in answer ? answer.value : null,
  })
  check(error)
}

/** The class's running session, for the "Live now" banner. Null when there isn't one (or live quizzes aren't set up). */
export async function fetchMyLiveSession(): Promise<{ id: string; title: string; status: LiveStatus } | null> {
  const { data, error } = await client().rpc('my_live_session')
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  return row ? { id: row.id, title: row.title, status: row.status } : null
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/** Calls `onChange` whenever a row changes in one of the tables (row level security still decides what each person hears). Returns a stop function. */
export function watchTables(name: string, specs: { table: 'live_sessions' | 'live_answers'; filter?: string }[], onChange: () => void): () => void {
  const db = client()
  const channel = db.channel(name)
  for (const spec of specs) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: spec.table, filter: spec.filter }, () => onChange())
  }
  channel.subscribe()
  return () => {
    void db.removeChannel(channel)
  }
}

/**
 * Who is in the room. Students pass their own id and are counted; the host passes null and only listens.
 * `onSync` gets the ids of everyone currently here.
 */
export function watchPresence(sessionId: string, me: string | null, onSync: (ids: string[]) => void): () => void {
  const db = client()
  const channel = db.channel(`live-room-${sessionId}`, { config: { presence: { key: me ?? `host-${Math.random().toString(36).slice(2)}` } } })
  channel.on('presence', { event: 'sync' }, () => {
    onSync(Object.keys(channel.presenceState()).filter((k) => !k.startsWith('host-')))
  })
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED' && me) void channel.track({ at: Date.now() })
  })
  return () => {
    void db.removeChannel(channel)
  }
}
