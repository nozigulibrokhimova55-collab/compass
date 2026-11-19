import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loading } from '../../components/area/AreaBits'
import { QuizResults, QuizRunner, type ResultQuestion } from '../../components/student/QuizRunner'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useClassData } from '../../lib/classData'
import { errorMessage, type StudentQuizDetail } from '../../lib/db'
import { useConfidence } from '../../lib/sampleData'
import { useSession } from '../../lib/session'

type Load = { quiz: StudentQuizDetail | null; error: string | null }

/** Takes one quiz, one question at a time, and shows the results and reasons afterwards. One attempt only. */
export default function StudentQuiz() {
  const { quizId = '' } = useParams()
  const { user } = useSession()
  const { openQuiz, finishQuiz } = useClassData()
  const { confidence, save } = useConfidence(user.id, quizId)
  const [load, setLoad] = useState<Load | null>(null)

  useEffect(() => {
    let live = true
    openQuiz(quizId)
      .then((quiz) => live && setLoad({ quiz, error: null }))
      .catch((err) => {
        console.error('Could not open the quiz', err)
        if (live) setLoad({ quiz: null, error: errorMessage(err, 'We couldn’t open this quiz.') })
      })
    return () => {
      live = false
    }
    // Only reopen when the link changes. Finishing sets the result from the answer, not from a refetch.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId])

  if (!load) return <Loading />
  if (!load.quiz) {
    return (
      <EmptyState label="quiz.frame" icon="error" title="We couldn’t open this quiz" className="mx-auto mt-6 max-w-xl" action={{ label: 'Back to quizzes', to: '/student/quizzes', icon: 'arrow_back' }}>
        {load.error}
      </EmptyState>
    )
  }

  const quiz = load.quiz
  if (quiz.finished) {
    const questions: ResultQuestion[] = quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      unit: q.unit,
      text: q.text,
      options: q.options,
      answer: q.answer ?? -1,
      why: q.why ?? '',
      choice: q.choice ?? -1,
      answerNumber: q.answerNumber,
      value: q.value,
      correct: q.correct,
    }))
    // Retries only bring back multiple choice questions for now.
    const missed = questions.some((q) => q.type !== 'numeric' && q.choice !== q.answer)
    return (
      <>
      <QuizResults
        eyebrow="Results"
        title={quiz.title}
        questions={questions}
        confidence={confidence}
        note={missed ? 'The ones you missed come back as a retry in 2 days.' : undefined}
        actions={
          <>
            <Button to="/student/gaps" variant="navy" icon="arrow_forward">
              See my gaps
            </Button>
            <Button to="/student/quizzes" variant="outline">
              All quizzes
            </Button>
          </>
        }
      />
      <Credit text={quiz.attribution} />
      </>
    )
  }

  return (
    <>
    <QuizRunner
      key={quiz.id}
      eyebrow="Quiz"
      title={quiz.title}
      questions={quiz.questions}
      backTo="/student/quizzes"
      backLabel="All quizzes"
      onFinish={async (answers) => {
        try {
          const done = await finishQuiz(
            quiz.id,
            answers.map((a) => (a.value !== undefined ? { questionId: a.questionId, value: a.value } : { questionId: a.questionId, choice: a.choice })),
          )
          save(Object.fromEntries(answers.map((a) => [a.questionId, a.confidence])))
          setLoad({ quiz: done, error: null })
        } catch (err) {
          throw new Error(errorMessage(err, 'We couldn’t save your answers. Try again.'))
        }
      }}
    />
    <Credit text={quiz.attribution} />
    </>
  )
}

/** "Based on Conceptual Physics by Benjamin Crowell, CC BY-SA 3.0", when the quiz came from a book that has one. */
function Credit({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="mx-auto mt-8 flex max-w-2xl items-start gap-2 rounded-2xl bg-white/90 px-4 py-3 font-inter text-[14px] leading-6 text-navy-soft backdrop-blur-sm">
      <Icon name="menu_book" className="mt-0.5 text-[18px] text-select" />
      {text}
    </p>
  )
}
