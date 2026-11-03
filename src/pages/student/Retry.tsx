import { useState } from 'react'
import { Loading } from '../../components/area/AreaBits'
import { QuizResults, QuizRunner, type ResultQuestion, type RunnerAnswer } from '../../components/student/QuizRunner'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Confidence } from '../../lib/sampleData'
import { useMistakes, type Mistake } from '../../lib/useMistakes'

/** Today's retry: every missed question that's due, one at a time, graded right here. */
export default function StudentRetry() {
  const retries = useMistakes()
  // The questions are fixed when the retry starts, so finishing (which moves due dates) doesn't change them mid-way.
  const [set, setSet] = useState<Mistake[] | null>(null)
  const [result, setResult] = useState<{ questions: ResultQuestion[]; confidence: Record<string, Confidence> } | null>(null)

  if (retries.loading) return <Loading />
  const questions = set ?? retries.due
  if (!set && questions.length > 0) setSet(questions)

  if (result) {
    const missed = result.questions.filter((q) => q.choice !== q.answer).length
    return (
      <QuizResults
        eyebrow="Retry"
        title="Questions you missed before"
        questions={result.questions}
        confidence={result.confidence}
        note={missed > 0 ? 'Right ones come back in 7 days. Missed ones come back in 2.' : 'They come back once more in 7 days. Get them right again and they’re learned.'}
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
    const graded = questions.map((m) => {
      const a = answers.find((x) => x.questionId === m.questionId)
      return { m, choice: a?.choice ?? -1, confidence: a?.confidence ?? 'guessed' }
    })
    retries.record(graded.map((g) => ({ questionId: g.m.questionId, right: g.choice === g.m.answer })))
    setResult({
      questions: graded.map((g) => ({ id: g.m.questionId, text: g.m.text, options: g.m.options, answer: g.m.answer, why: g.m.why, choice: g.choice })),
      confidence: Object.fromEntries(graded.map((g) => [g.m.questionId, g.confidence])),
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
