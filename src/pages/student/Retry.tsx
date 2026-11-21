import { useState } from 'react'
import { Loading } from '../../components/area/AreaBits'
import { QuizResults, QuizRunner, type ResultQuestion, type RunnerAnswer } from '../../components/student/QuizRunner'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Confidence } from '../../lib/sampleData'
import { useFlashcards, type Flashcard } from '../../lib/useFlashcards'

/** Today's retry: every missed question that's due, one at a time. The database grades it and moves the cards along. */
export default function StudentRetry() {
  const retries = useFlashcards()
  // The questions are fixed when the retry starts, so finishing (which moves due dates) doesn't change them mid-way.
  const [set, setSet] = useState<Flashcard[] | null>(null)
  const [result, setResult] = useState<{ questions: ResultQuestion[]; confidence: Record<string, Confidence>; learnedNow: number } | null>(null)

  if (retries.loading) return <Loading />
  if (retries.error && !set) {
    return (
      <EmptyState label="retry.frame" icon="error" title="We couldn’t load your retries" className="mx-auto mt-6 max-w-xl" action={{ label: 'Back to my gaps', to: '/student/gaps', icon: 'arrow_back' }}>
        {retries.error}
      </EmptyState>
    )
  }
  const questions = set ?? retries.due
  if (!set && questions.length > 0) setSet(questions)

  if (result) {
    const total = result.questions.length
    const missed = result.questions.filter((q) => q.choice !== q.answer).length
    const learnedNow = result.learnedNow
    const rightToKeep = total - missed - learnedNow
    const note = [
      missed > 0 ? 'Missed ones come back in 2 days.' : '',
      rightToKeep > 0 ? 'Right ones come back in 7 days. Get them right once more and they’re learned.' : '',
      learnedNow > 0 ? `${learnedNow === 1 ? '1 question is' : `${learnedNow} questions are`} learned now.` : '',
    ]
      .filter(Boolean)
      .join(' ')
    return (
      <QuizResults
        eyebrow="Retry"
        title="Questions you missed before"
        questions={result.questions}
        confidence={result.confidence}
        note={note}
        actions={
          <Button to="/student/gaps" variant="navy" icon="arrow_forward">
            Back to my gaps
          </Button>
        }
      />
    )
  }

  if (questions.length === 0) {
    return (
      <EmptyState label="retry.frame" icon="check_circle" title="Nothing to retry today" className="mx-auto mt-6 max-w-xl" action={{ label: 'Back to my gaps', to: '/student/gaps', icon: 'arrow_back' }}>
        Missed questions come back here 2 days after you miss them.
      </EmptyState>
    )
  }

  const finish = async (answers: RunnerAnswer[]) => {
    const picked = questions.map((m) => {
      const a = answers.find((x) => x.questionId === m.questionId)
      if (a?.choice === undefined) throw new Error('Answer every question before you finish.')
      return { m, choice: a.choice, confidence: a.confidence }
    })
    // The right answers only come back from the database now, after the answers are sent.
    const reviewed = await retries.review(picked.map((p) => ({ questionId: p.m.questionId, choice: p.choice })))
    const byId = new Map(reviewed.map((r) => [r.questionId, r]))
    const rows = picked.map((p) => {
      const r = byId.get(p.m.questionId)
      if (!r) throw new Error('We couldn’t check one of your answers. Try again.')
      return { ...p, answer: r.answer, why: r.why, learned: r.learned }
    })
    setResult({
      questions: rows.map((r) => ({ id: r.m.questionId, text: r.m.text, options: r.m.options, answer: r.answer, why: r.why, choice: r.choice })),
      confidence: Object.fromEntries(rows.map((r) => [r.m.questionId, r.confidence])),
      learnedNow: rows.filter((r) => r.learned).length,
    })
  }

  return (
    <QuizRunner
      eyebrow="Retry"
      title="Questions you missed before"
      questions={questions.map((m) => ({ id: m.questionId, text: m.text, options: m.options }))}
      backTo="/student/gaps"
      backLabel="My gaps"
      onFinish={finish}
    />
  )
}
