import { useEffect, useMemo, useState } from 'react'
import { isoDate } from './attendance'
import { useClassData } from './classData'
import { RETRY_GOAL, useRetrySchedule, type RetryState } from './sampleData'
import { useSession } from './session'

/** A question the student got wrong, with its retry schedule. */
export type Mistake = {
  questionId: string
  quizId: string
  quizTitle: string
  text: string
  options: string[]
  answer: number
  why: string
  /** What they picked the first time. */
  firstChoice: number
  schedule: RetryState
  learned: boolean
  dueNow: boolean
}

type Loaded = { key: string; items: Omit<Mistake, 'schedule' | 'learned' | 'dueNow'>[]; missedOn: Record<string, string> }

/**
 * Every question the student missed on a finished quiz (real answers from quiz_for_student),
 * joined with when it comes back (the retry schedule in sampleData.ts).
 */
export function useMistakes() {
  const { user } = useSession()
  const { studentQuizzes, openQuiz } = useClassData()
  const { stateFor, record } = useRetrySchedule(user.id)
  const finished = useMemo(() => studentQuizzes.filter((q) => q.finished), [studentQuizzes])
  const key = finished.map((q) => q.id).join(',')
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = isoDate(new Date())

  useEffect(() => {
    let live = true
    Promise.all(finished.map((q) => openQuiz(q.id)))
      .then((details) => {
        const items: Loaded['items'] = []
        for (const d of details) {
          for (const q of d.questions) {
            if (q.answer === undefined || q.choice === undefined || q.choice === q.answer) continue
            items.push({ questionId: q.id, quizId: d.id, quizTitle: d.title, text: q.text, options: q.options, answer: q.answer, why: q.why ?? '', firstChoice: q.choice })
          }
        }
        // There is no "finished on" date yet, so a quiz's due date stands in for when the miss happened.
        const missedOn = Object.fromEntries(details.map((d) => [d.id, d.dueDate && d.dueDate < today ? d.dueDate : today]))
        if (live) {
          setLoaded({ key, items, missedOn })
          setError(null)
        }
      })
      .catch((err) => {
        console.error('Could not load past answers', err)
        if (live) setError('We couldn’t load your past answers.')
      })
    return () => {
      live = false
    }
    // Reload only when the set of finished quizzes changes. `openQuiz` changes identity on every class reload.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const mistakes: Mistake[] = useMemo(() => {
    if (!loaded) return []
    return loaded.items.map((m) => {
      const schedule = stateFor(m.questionId, loaded.missedOn[m.quizId] ?? today)
      const learned = schedule.streak >= RETRY_GOAL
      return { ...m, schedule, learned, dueNow: !learned && schedule.due <= today }
    })
  }, [loaded, stateFor, today])

  return {
    loading: !loaded && !error,
    error,
    mistakes,
    due: mistakes.filter((m) => m.dueNow),
    upcoming: mistakes.filter((m) => !m.learned && !m.dueNow).sort((a, b) => a.schedule.due.localeCompare(b.schedule.due)),
    learned: mistakes.filter((m) => m.learned),
    record: (results: { questionId: string; right: boolean }[]) => record(results, today),
  }
}
