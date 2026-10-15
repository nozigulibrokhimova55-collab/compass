// Sample quizzes for the student side of the demo. Real accounts get theirs from Supabase (see db.ts).

import type { QuizAnswer, StudentQuiz, StudentQuizDetail } from './db'
import { QUESTION_BANK, QUIZZES, type Question } from './sample'

const byIds = (ids: string[]): Question[] => ids.map((id) => QUESTION_BANK.find((q) => q.id === id)).filter((q): q is Question => Boolean(q))

/** Which sample questions are in each sample quiz, and its due date. */
const DEMO_QUIZ_SETUP: Record<string, { ids: string[]; due: string }> = {
  q4: { ids: ['s1', 's2', 's3', 's4', 't1', 't2', 't3', 't4'], due: '2026-10-16' },
  q3: { ids: ['d1', 'd2', 'd3', 'd4', 's1', 's2'], due: '2026-10-09' },
  q2: { ids: ['f1', 'f2', 'f3', 'f4', 'd1', 'd2'], due: '2026-10-02' },
}

export function demoStudentQuizzes(): StudentQuiz[] {
  return QUIZZES.map((q) => ({
    id: q.id,
    title: q.title,
    dueDate: DEMO_QUIZ_SETUP[q.id]?.due ?? null,
    questionCount: DEMO_QUIZ_SETUP[q.id]?.ids.length ?? q.questions,
    finished: q.done,
    score: q.done ? (q.score ?? 0) : 0,
  }))
}

/** For quizzes Minji already finished, the last few answers are the wrong ones, so the score matches the list. */
function pastChoices(quizId: string, questions: Question[]) {
  const score = QUIZZES.find((q) => q.id === quizId)?.score ?? questions.length
  return questions.map((q, i) => (i < score ? q.answer : (q.answer + 1) % q.options.length))
}

/**
 * The quiz as the student sees it. Pass `choices` once the quiz is finished to get the answers and reasons too.
 * Quizzes the sample student already finished fill in their own choices.
 */
export function demoQuizDetail(quizId: string, choices?: number[]): StudentQuizDetail | null {
  const setup = DEMO_QUIZ_SETUP[quizId]
  const meta = QUIZZES.find((q) => q.id === quizId)
  if (!setup || !meta) return null
  const questions = byIds(setup.ids)
  const picked = choices ?? (meta.done ? pastChoices(quizId, questions) : undefined)
  return {
    id: quizId,
    title: meta.title,
    dueDate: setup.due,
    finished: Boolean(picked),
    questions: questions.map((q, i) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      ...(picked ? { answer: q.answer, why: q.why, choice: picked[i] } : {}),
    })),
  }
}

/** Marks a sample quiz from the student's answers. */
export function demoSubmit(quizId: string, answers: QuizAnswer[]) {
  const detail = demoQuizDetail(quizId)
  if (!detail) throw new Error('We could not find that quiz.')
  const choices = detail.questions.map((q) => answers.find((a) => a.questionId === q.id)?.choice)
  if (choices.some((c) => c === undefined)) throw new Error('Answer every question before you finish.')
  const final = choices as number[]
  const questions = byIds(DEMO_QUIZ_SETUP[quizId].ids)
  const score = final.filter((c, i) => c === questions[i].answer).length
  return { choices: final, score }
}
