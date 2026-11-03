import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { SampleNote } from '../../components/area/AreaBits'
import { QuizResults, QuizRunner, type RunnerAnswer } from '../../components/student/QuizRunner'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { longDay } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import { useCatchUpCheck, useDayTopic, type Confidence } from '../../lib/sampleData'
import { useSession } from '../../lib/session'

/** A 3-question catch-up check for a day the student missed. */
export default function StudentCheck() {
  const { day = '' } = useParams()
  const { user } = useSession()
  const { cls } = useClassData()
  const { topic } = useDayTopic(cls?.id, day)
  const check = useCatchUpCheck(user.id, day, topic)
  const [answers, setAnswers] = useState<RunnerAnswer[] | null>(null)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return (
      <EmptyState label="check.frame" icon="event_busy" title="We can’t find that day" className="mx-auto mt-6 max-w-xl" action={{ label: 'Back to attendance', to: '/student/attendance', icon: 'arrow_back' }}>
        Open the check from your attendance page.
      </EmptyState>
    )
  }

  const title = `${topic || check.topicName} · ${longDay(day)}`

  if (answers) {
    return (
      <>
        <QuizResults
          eyebrow="Catch-up check"
          title={title}
          questions={check.questions.map((q) => ({ ...q, choice: answers.find((a) => a.questionId === q.id)?.choice ?? -1 }))}
          confidence={Object.fromEntries(answers.map((a) => [a.questionId, a.confidence])) as Record<string, Confidence>}
          actions={
            <Button to="/student/attendance" variant="navy" icon="arrow_forward">
              Back to attendance
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <QuizRunner
        eyebrow="Catch-up check"
        title={title}
        questions={check.questions}
        backTo="/student/attendance"
        backLabel="Attendance"
        onFinish={async (a) => {
          check.saveScore(check.questions.filter((q) => a.find((x) => x.questionId === q.id)?.choice === q.answer).length)
          setAnswers(a)
        }}
      />
      <SampleNote className="mx-auto mt-8 max-w-2xl">Catch-up questions are sample questions on {check.topicName} for now. Your teacher’s own questions come later.</SampleNote>
    </>
  )
}
