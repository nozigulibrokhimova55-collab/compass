import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useClassData } from './classData'
import { errorMessage } from './db'
import { fetchFlashcards, reviewFlashcards, type Flashcard, type ReviewedCard } from './flashcardsDb'

export type { Flashcard, ReviewedCard }

type State = { cards: Flashcard[] | null; error: string | null }

/**
 * The student's retry cards, saved in Supabase (see flashcardsDb.ts). Replaces useMistakes and the browser-only
 * useRetrySchedule. Reloads when the student finishes another quiz, so new mistakes show up on their own.
 * A failed refresh keeps showing the cards we already have.
 */
export function useFlashcards() {
  const { studentQuizzes } = useClassData()
  const [state, setState] = useState<State>({ cards: null, error: null })
  const latest = useRef(0)
  const finishedKey = studentQuizzes
    .filter((q) => q.finished)
    .map((q) => q.id)
    .join(',')

  const load = useCallback(async () => {
    const run = ++latest.current
    try {
      const cards = await fetchFlashcards()
      if (run === latest.current) setState({ cards, error: null })
    } catch (err) {
      console.error('Could not load retry cards', err)
      if (run === latest.current) setState((s) => ({ cards: s.cards, error: s.cards ? null : errorMessage(err, 'We couldn’t load your retries.') }))
    }
  }, [])

  useEffect(() => {
    // `load` only sets state after its network calls finish, never synchronously.
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
  }, [load, finishedKey])

  useEffect(
    () => () => {
      // `latest` is a plain counter (not a DOM node): bumping it makes any answer still on its way get ignored.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      latest.current++
    },
    [],
  )

  /** Grades a retry on the server. Throws a plain message when it fails, so the quiz runner can show it. */
  const review = useCallback(
    async (answers: { questionId: string; choice: number }[]) => {
      const results = await reviewFlashcards(answers)
      void load()
      return results
    },
    [load],
  )

  const cards = useMemo(() => state.cards ?? [], [state.cards])
  const due = useMemo(() => cards.filter((c) => c.dueNow), [cards])
  const upcoming = useMemo(() => cards.filter((c) => !c.learned && !c.dueNow).sort((a, b) => a.dueOn.localeCompare(b.dueOn)), [cards])
  const learned = useMemo(() => cards.filter((c) => c.learned), [cards])

  return { loading: state.cards === null && !state.error, error: state.error, cards, due, upcoming, learned, review, reload: load }
}
