import { useEffect, useState } from 'react'
import type { ClassStudent } from './classData'
import { errorMessage, fetchQuizResults } from './db'

export type StudentScore = { student: ClassStudent; right: number; total: number }

type Loaded = { quizId: string; rows: StudentScore[]; error: string | null }

/**
 * Real scores for one quiz, from quiz_responses. Only students who finished show up
 * (a quiz is saved all at once). Pass `undefined` to skip loading.
 */
export function useQuizResults(quizId: string | undefined, students: ClassStudent[]) {
  const [result, setResult] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!quizId) return
    let live = true
    fetchQuizResults(quizId)
      .then((marks) => {
        const rows = students
          .map((student) => {
            const mine = marks.filter((m) => m.studentId === student.id)
            return { student, right: mine.filter((m) => m.correct).length, total: mine.length }
          })
          .filter((r) => r.total > 0)
        if (live) setResult({ quizId, rows, error: null })
      })
      .catch((err) => {
        console.error('Could not load quiz scores', err)
        if (live) setResult({ quizId, rows: [], error: errorMessage(err, 'We couldn’t load the scores.') })
      })
    return () => {
      live = false
    }
  }, [quizId, students])

  const current = result && result.quizId === quizId ? result : null
  const rows = current?.rows ?? []
  const average = rows.length ? Math.round((rows.reduce((sum, r) => sum + r.right / r.total, 0) / rows.length) * 100) : null
  return { loading: Boolean(quizId) && !current, error: current?.error ?? null, rows, finished: rows.length, average }
}
