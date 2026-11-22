// Flashcards: missed quiz questions that come back for another try. Tables and functions come from
// supabase/migrations/20261123000001_flashcards.sql. Pages never import the Supabase client directly.

import { supabase } from './supabase'

export const FLASHCARDS_MIGRATION = 'supabase/migrations/20261123000001_flashcards.sql'

export class FlashcardsNotSetUpError extends Error {
  constructor() {
    super(`Retry cards aren’t switched on yet. Run ${FLASHCARDS_MIGRATION} in the Supabase SQL Editor.`)
  }
}

function client() {
  if (!supabase) throw new Error('Supabase is not set up. Add the two keys from .env.example.')
  return supabase
}

function check(error: { code?: string; message: string } | null) {
  if (!error) return
  // Missing function, table or column: the migration hasn't run.
  if (['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'].includes(error.code ?? '')) throw new FlashcardsNotSetUpError()
  // A real Error, so the quiz runner can show the plain message the database wrote.
  throw new Error(error.message)
}

/** Right answers in a row before a card counts as learned. The database uses the same number (review_flashcards). */
export const RETRY_GOAL = 2

/** One missed question. The right answer is not here: it only comes back after the student answers. */
export type Flashcard = {
  questionId: string
  quizId: string
  quizTitle: string
  text: string
  options: string[]
  /** What they picked the first time. */
  firstChoice: number | null
  /** Right answers in a row on retries. */
  streak: number
  /** YYYY-MM-DD, a Seoul calendar day. */
  dueOn: string
  learned: boolean
  dueNow: boolean
}

type RawCard = {
  question_id: string
  quiz_id: string
  quiz_title: string
  question_text: string
  options: unknown
  first_choice: number | null
  streak: number | string
  due_on: string
  learned: boolean
  due_now: boolean
}

/**
 * The student's cards. It first makes any cards that are missing from their wrong answers
 * (sync_my_flashcards), so a quiz they just finished shows up straight away.
 */
export async function fetchFlashcards(): Promise<Flashcard[]> {
  const db = client()
  const synced = await db.rpc('sync_my_flashcards')
  check(synced.error)
  const { data, error } = await db.rpc('my_flashcards')
  check(error)
  return ((data ?? []) as RawCard[]).map((r) => ({
    questionId: r.question_id,
    quizId: r.quiz_id,
    quizTitle: r.quiz_title,
    text: r.question_text,
    options: Array.isArray(r.options) ? (r.options as string[]) : [],
    firstChoice: r.first_choice,
    streak: Number(r.streak),
    dueOn: r.due_on,
    learned: r.learned,
    dueNow: r.due_now,
  }))
}

/** What the database says about one card after a retry. Safe to show: the student has just answered. */
export type ReviewedCard = {
  questionId: string
  correct: boolean
  answer: number
  why: string
  streak: number
  dueOn: string
  learned: boolean
}

type RawReviewed = { question_id: string; correct: boolean; answer: number; why?: string | null; streak: number | string; due_on: string; learned: boolean }

/** Sends a retry's answers to be graded and saved. Every card has to be due. */
export async function reviewFlashcards(answers: { questionId: string; choice: number }[]): Promise<ReviewedCard[]> {
  const { data, error } = await client().rpc('review_flashcards', {
    p_answers: answers.map((a) => ({ question_id: a.questionId, choice: a.choice })),
  })
  check(error)
  return ((data ?? []) as RawReviewed[]).map((r) => ({
    questionId: r.question_id,
    correct: r.correct === true,
    answer: r.answer,
    why: r.why ?? '',
    streak: Number(r.streak),
    dueOn: r.due_on,
    learned: r.learned === true,
  }))
}
