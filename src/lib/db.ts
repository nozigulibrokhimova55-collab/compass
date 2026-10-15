// Every Supabase query the app makes lives here, so pages never talk to the database directly.
// Table and column names match supabase/schema.sql. Row level security decides who can see what.

import { supabase } from './supabase'
import type { Mark } from './attendance'
import type { Role } from './roles'

function client() {
  if (!supabase) throw new Error('Supabase is not set up. Add the two keys from .env.example.')
  return supabase
}

/** Plain text for a thrown value. Supabase errors are objects with a `message`, not always `Error`s. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.') {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) return err.message
  return fallback
}

export type Profile = { id: string; name: string; email: string; role: Role; language: string; inviteCode: string | null }
export type ClassInfo = { id: string; name: string; code: string; unit: string | null }
export type RosterStudent = { id: string; name: string }
export type QuizSummary = { id: string; title: string; dueDate: string | null; status: 'draft' | 'published'; createdAt: string }
export type AttendanceRow = { studentId: string; day: string; mark: Mark }
export type QuizQuestionInput = { topicId: string; text: string; options: string[]; answer: number; why: string }

// ---------------------------------------------------------------------------
// Profile and class
// ---------------------------------------------------------------------------

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await client().from('profiles').select('id, name, email, role, language, invite_code').eq('id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { id: data.id, name: data.name, email: data.email, role: data.role, language: data.language, inviteCode: data.invite_code }
}

/** The signed-in person's class: a teacher's own class, or the class a student joined. Parents get null. */
export async function fetchMyClass(): Promise<ClassInfo | null> {
  const { data, error } = await client().from('classes').select('id, name, code, unit').order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (error) throw error
  return data ?? null
}

/** Students in a class, by name. Only the class's teacher can read this. */
export async function fetchRoster(classId: string): Promise<RosterStudent[]> {
  const { data, error } = await client().from('class_members').select('student_id, profiles(id, name)').eq('class_id', classId)
  if (error) throw error
  const students: RosterStudent[] = []
  for (const row of data ?? []) {
    // The join returns one profile per member (a single object), but guard against an array just in case.
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    if (profile) students.push({ id: profile.id, name: profile.name })
  }
  return students.sort((a, b) => a.name.localeCompare(b.name))
}

// ---------------------------------------------------------------------------
// Sign-up checks (the trigger does the real work; these just let the form say "we couldn't find that code")
// ---------------------------------------------------------------------------

export async function classCodeExists(code: string): Promise<boolean> {
  const { data, error } = await client().rpc('class_code_exists', { p_code: code })
  if (error) throw error
  return data === true
}

export async function inviteCodeExists(code: string): Promise<boolean> {
  const { data, error } = await client().rpc('invite_code_exists', { p_code: code })
  if (error) throw error
  return data === true
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

/** All marks for a class from one date to another, inclusive (YYYY-MM-DD). */
export async function fetchAttendance(classId: string, fromDay: string, toDay: string): Promise<AttendanceRow[]> {
  const { data, error } = await client().from('attendance').select('student_id, day, mark').eq('class_id', classId).gte('day', fromDay).lte('day', toDay)
  if (error) throw error
  return (data ?? []).map((r) => ({ studentId: r.student_id, day: r.day, mark: r.mark }))
}

/** Save one day for the whole class. Saving the same day again replaces the earlier marks. */
export async function saveAttendance(classId: string, day: string, marks: Record<string, Mark>) {
  const now = new Date().toISOString()
  const rows = Object.entries(marks).map(([studentId, mark]) => ({ class_id: classId, student_id: studentId, day, mark, updated_at: now }))
  if (rows.length === 0) return
  const { error } = await client().from('attendance').upsert(rows, { onConflict: 'class_id,student_id,day' })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export async function fetchQuizzes(classId: string): Promise<QuizSummary[]> {
  const { data, error } = await client().from('quizzes').select('id, title, due_date, status, created_at').eq('class_id', classId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((q) => ({ id: q.id, title: q.title, dueDate: q.due_date, status: q.status, createdAt: q.created_at }))
}

/** Saves a quiz and all its questions in one step (the publish_quiz function in schema.sql). Returns the new quiz id. */
export async function publishQuiz(input: { classId: string; title: string; topicId: string; dueDate: string; questions: QuizQuestionInput[] }): Promise<string> {
  const { data, error } = await client().rpc('publish_quiz', {
    p_class: input.classId,
    p_title: input.title,
    p_topic: input.topicId,
    p_due: input.dueDate,
    p_questions: input.questions.map((q) => ({ topic_id: q.topicId, text: q.text, options: q.options, answer: q.answer, why: q.why })),
  })
  if (error) throw error
  return data as string
}

// ---------------------------------------------------------------------------
// Students taking quizzes (my_quizzes, quiz_for_student and submit_quiz in schema.sql)
// ---------------------------------------------------------------------------

export type StudentQuiz = { id: string; title: string; dueDate: string | null; questionCount: number; finished: boolean; score: number }
/** One question as a student sees it. `answer`, `why` and `choice` only come back once the quiz is finished. */
export type StudentQuestion = { id: string; text: string; options: string[]; answer?: number; why?: string; choice?: number }
export type StudentQuizDetail = { id: string; title: string; dueDate: string | null; finished: boolean; questions: StudentQuestion[] }
export type QuizAnswer = { questionId: string; choice: number }

type RawQuizDetail = { id: string; title: string; due_date: string | null; finished: boolean; questions: StudentQuestion[] }

function toDetail(raw: RawQuizDetail): StudentQuizDetail {
  return { id: raw.id, title: raw.title, dueDate: raw.due_date, finished: raw.finished, questions: raw.questions ?? [] }
}

/** Published quizzes for the student's class, with whether they finished and their score. */
export async function fetchMyQuizzes(): Promise<StudentQuiz[]> {
  const { data, error } = await client().rpc('my_quizzes')
  if (error) throw error
  return (data ?? []).map((q: { id: string; title: string; due_date: string | null; question_count: number; finished: boolean; score: number }) => ({
    id: q.id,
    title: q.title,
    dueDate: q.due_date,
    questionCount: Number(q.question_count),
    finished: q.finished,
    score: Number(q.score),
  }))
}

export async function fetchQuizForStudent(quizId: string): Promise<StudentQuizDetail> {
  const { data, error } = await client().rpc('quiz_for_student', { p_quiz: quizId })
  if (error) throw error
  return toDetail(data as RawQuizDetail)
}

/** Saves every answer at once. Returns the finished quiz with the right answers and reasons. */
export async function submitQuiz(quizId: string, answers: QuizAnswer[]): Promise<StudentQuizDetail> {
  const { data, error } = await client().rpc('submit_quiz', {
    p_quiz: quizId,
    p_answers: answers.map((a) => ({ question_id: a.questionId, choice: a.choice })),
  })
  if (error) throw error
  return toDetail(data as RawQuizDetail)
}

/** Every student's marks for one quiz. Teachers see their class; the number of rows per student is the quiz length. */
export async function fetchQuizResults(quizId: string): Promise<{ studentId: string; correct: boolean }[]> {
  const { data, error } = await client().from('quiz_responses').select('student_id, correct').eq('quiz_id', quizId)
  if (error) throw error
  return (data ?? []).map((r) => ({ studentId: r.student_id, correct: r.correct }))
}
