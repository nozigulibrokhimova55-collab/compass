// Chapter quizzes: asking the generate-quiz Edge Function for questions from a saved chapter, and keeping them
// as a draft until the teacher approves them. Tables and functions come from
// supabase/migrations/20261121000001_chapter_quizzes.sql. Pages never import the Supabase client directly.

import { supabase } from './supabase'

export const CHAPTER_QUIZ_MIGRATION = 'supabase/migrations/20261121000001_chapter_quizzes.sql'

export class ChapterQuizzesNotSetUpError extends Error {
  constructor() {
    super(`Chapter quizzes aren’t switched on yet. Run ${CHAPTER_QUIZ_MIGRATION} in the Supabase SQL Editor.`)
  }
}

function client() {
  if (!supabase) throw new Error('Supabase is not set up. Add the two keys from .env.example.')
  return supabase
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return
  // Missing function, table or column: the migration hasn't run.
  if (['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'].includes(error.code ?? '')) throw new ChapterQuizzesNotSetUpError()
  throw error
}

export type QuestionType = 'multiple_choice' | 'numeric'
export type Difficulty = 'gentle' | 'medium' | 'stretch'
export type QuizSettings = { count: number; types: QuestionType[]; difficulty: Difficulty }

export const COUNT_CHOICES = [5, 8, 10, 15, 20]
export const DEFAULT_SETTINGS: QuizSettings = { count: 10, types: ['multiple_choice'], difficulty: 'medium' }

/** A question in a chapter quiz draft. For numeric questions `options` is empty and `answerNumber` is the answer. */
export type ChapterQuestion = {
  type: QuestionType
  text: string
  options: string[]
  answer: number
  /** Per option: why a student might pick it. Null for the right answer. */
  misconceptions: (string | null)[]
  answerNumber: number | null
  tolerance: number | null
  unit: string | null
  why: string
  concept: string
  sourcePages: number[]
  approved: boolean
}

/** The function answers errors with `{ error: "plain words" }`. Pull that out of the failed response. */
async function functionError(err: unknown): Promise<string> {
  const response = err && typeof err === 'object' && 'context' in err ? (err.context as Response | undefined) : undefined
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json()
      if (body && typeof body.error === 'string') return body.error
    } catch {
      // Not JSON. Fall through to the generic message.
    }
  }
  return 'We couldn’t reach the question writer. Check your connection and try again.'
}

type RawGenerated = Omit<ChapterQuestion, 'approved'>

/** The longest description the Edge Function takes (MAX_FOCUS in chapter.ts). */
export const MAX_FOCUS = 600

/**
 * Asks the Edge Function for questions from a saved chapter. `focus` is the teacher's description of what to cover. It loads the chapter's text on the server, so only
 * the chapter id and the settings leave the browser. Questions come back unapproved.
 */
export async function generateChapterQuestions(chapterId: string, settings: QuizSettings, exclude: string[] = [], focus = ''): Promise<{ questions: ChapterQuestion[]; requested: number }> {
  const { data, error } = await client().functions.invoke('generate-quiz', {
    body: { chapter_id: chapterId, options: { count: settings.count, types: settings.types, difficulty: settings.difficulty, exclude: exclude.slice(0, 40), focus: focus.trim() } },
  })
  if (error) throw new Error(await functionError(error))
  const list: RawGenerated[] = data && Array.isArray(data.questions) ? data.questions : []
  if (list.length === 0) throw new Error('The AI did not send back any questions. Try again.')
  return {
    requested: Number(data.requested) || settings.count,
    questions: list.map((q) => ({
      type: q.type === 'numeric' ? 'numeric' : 'multiple_choice',
      text: q.text,
      options: q.options ?? [],
      answer: q.answer ?? 0,
      misconceptions: q.misconceptions ?? [],
      answerNumber: q.answerNumber ?? null,
      tolerance: q.tolerance ?? null,
      unit: q.unit ?? null,
      why: q.why ?? '',
      concept: q.concept ?? '',
      sourcePages: q.sourcePages ?? [],
      approved: false,
    })),
  }
}

const toRow = (q: ChapterQuestion) => ({
  type: q.type,
  text: q.text.trim(),
  options: q.type === 'numeric' ? [] : q.options,
  answer: q.type === 'numeric' ? 0 : q.answer,
  misconceptions: q.type === 'numeric' ? [] : q.misconceptions,
  answer_number: q.type === 'numeric' ? q.answerNumber : null,
  tolerance: q.type === 'numeric' ? q.tolerance : null,
  unit: q.type === 'numeric' ? q.unit : null,
  why: q.why.trim(),
  concept: q.concept.trim(),
  source_pages: q.sourcePages,
  approved: q.approved,
})

/** Creates (quizId null) or replaces a draft and its questions. Returns the draft's quiz id. */
export async function saveQuizDraft(input: { quizId: string | null; chapterId: string; title: string; questions: ChapterQuestion[] }): Promise<string> {
  const { data, error } = await client().rpc('save_quiz_draft', {
    p_quiz: input.quizId,
    p_chapter: input.chapterId,
    p_title: input.title.trim(),
    p_questions: input.questions.map(toRow),
  })
  check(error)
  return data as string
}

export type DraftSummary = { id: string; title: string; chapterId: string | null; materialId: string | null; questionCount: number; approvedCount: number; createdAt: string }

/** A class's chapter quiz drafts, newest first. */
export async function fetchDrafts(classId: string): Promise<DraftSummary[]> {
  const { data, error } = await client()
    .from('quizzes')
    .select('id, title, chapter_id, material_id, created_at, quiz_questions(approved)')
    .eq('class_id', classId)
    .eq('status', 'draft')
    .not('chapter_id', 'is', null)
    .order('created_at', { ascending: false })
  check(error)
  return (data ?? []).map((q) => {
    const qs = (q.quiz_questions ?? []) as { approved: boolean }[]
    return { id: q.id, title: q.title, chapterId: q.chapter_id, materialId: q.material_id, questionCount: qs.length, approvedCount: qs.filter((x) => x.approved).length, createdAt: q.created_at }
  })
}

type QuestionRow = { type: string; text: string; options: string[]; answer: number; misconceptions: (string | null)[] | null; answer_number: number | string | null; tolerance: number | string | null; unit: string | null; why: string; concept: string; source_pages: number[] | null; approved: boolean }

/** One draft with its questions, or null when it's gone or already published. */
export async function fetchDraft(quizId: string): Promise<{ id: string; title: string; chapterId: string; materialId: string | null; questions: ChapterQuestion[] } | null> {
  const { data, error } = await client().from('quizzes').select('id, title, status, chapter_id, material_id').eq('id', quizId).maybeSingle()
  check(error)
  if (!data || data.status !== 'draft' || !data.chapter_id) return null
  const { data: rows, error: qError } = await client()
    .from('quiz_questions')
    .select('type, text, options, answer, misconceptions, answer_number, tolerance, unit, why, concept, source_pages, approved')
    .eq('quiz_id', quizId)
    .order('position')
  check(qError)
  const n = (v: number | string | null) => (v === null ? null : Number(v))
  return {
    id: data.id,
    title: data.title,
    chapterId: data.chapter_id,
    materialId: data.material_id,
    questions: ((rows ?? []) as QuestionRow[]).map((r) => ({
      type: r.type === 'numeric' ? 'numeric' : 'multiple_choice',
      text: r.text,
      options: r.options ?? [],
      answer: r.answer,
      misconceptions: r.misconceptions ?? [],
      answerNumber: n(r.answer_number),
      tolerance: n(r.tolerance),
      unit: r.unit,
      why: r.why,
      concept: r.concept,
      sourcePages: r.source_pages ?? [],
      approved: r.approved,
    })),
  }
}

/** Publishes only the approved questions. Returns how many went out. */
export async function publishQuizDraft(quizId: string, title: string, dueDate: string): Promise<number> {
  const { data, error } = await client().rpc('publish_quiz_draft', { p_quiz: quizId, p_title: title.trim(), p_due: dueDate })
  check(error)
  return Number(data ?? 0)
}

/** Deletes a draft. Row level security lets only the class's teacher do this. */
export async function deleteDraft(quizId: string): Promise<void> {
  const { error } = await client().from('quizzes').delete().eq('id', quizId).eq('status', 'draft')
  check(error)
}

/** "From pages 41-43", "From page 45". */
export function pagesNote(pages: number[], unit: 'page' | 'line' = 'page'): string {
  if (!pages.length) return ''
  const sorted = [...pages].sort((a, b) => a - b)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return first === last ? `From ${unit} ${first}` : `From ${unit}s ${first}-${last}`
}
