import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { useClassData } from '../../lib/classData'
import { errorMessage, type StudentQuizDetail } from '../../lib/db'

type Load = { quiz: StudentQuizDetail | null; error: string | null }

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** Takes one quiz, one question at a time, and shows the results and reasons afterwards. */
export default function StudentQuiz() {
  const { quizId = '' } = useParams()
  const { openQuiz } = useClassData()
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
    // Only reopen when the link changes. Finishing a quiz sets the result from the answer, not from a refetch.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId])

  if (!load) return <p className="pt-24 text-center font-inter text-[15px] text-navy">Loading…</p>
  if (!load.quiz) {
    return (
      <PageNotice label="error.frame" title="We couldn’t open this quiz" alert>
        {load.error}
        <div className="mt-4">
          <Button to="/student" variant="outline" icon="arrow_back">
            Back to quizzes
          </Button>
        </div>
      </PageNotice>
    )
  }
  return load.quiz.finished ? <Results quiz={load.quiz} /> : <Taking key={load.quiz.id} quiz={load.quiz} onDone={(quiz) => setLoad({ quiz, error: null })} />
}

function BackLink() {
  return (
    <Link to="/student" className="inline-flex min-h-11 items-center gap-1.5 font-inter text-[15px] font-medium text-navy hover:underline">
      <Icon name="arrow_back" className="text-[20px]" />
      All quizzes
    </Link>
  )
}

function Taking({ quiz, onDone }: { quiz: StudentQuizDetail; onDone: (quiz: StudentQuizDetail) => void }) {
  const { finishQuiz } = useClassData()
  const total = quiz.questions.length
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<(number | undefined)[]>(() => quiz.questions.map(() => undefined))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [index])

  if (total === 0) {
    return (
      <PageNotice label="empty.frame" title="This quiz has no questions">
        Ask your teacher to check it.
      </PageNotice>
    )
  }

  const q = quiz.questions[index]
  const answered = picks.filter((p) => p !== undefined).length
  const last = index === total - 1
  const missing = total - answered

  const finish = async () => {
    setSaving(true)
    setError(null)
    try {
      const answers = quiz.questions.map((question, i) => ({ questionId: question.id, choice: picks[i] as number }))
      onDone(await finishQuiz(quiz.id, answers))
    } catch (err) {
      console.error('Could not save the quiz', err)
      setError(errorMessage(err, 'We couldn’t save your answers. Try again.'))
      setSaving(false)
    }
  }

  return (
    <>
      <BackLink />
      <p className="mt-6 font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-navy-soft">{quiz.title}</p>
      <div className="mt-3 flex max-w-2xl gap-1.5" aria-hidden="true">
        {quiz.questions.map((question, i) => (
          <span key={question.id} className={`h-1.5 flex-1 rounded-full ${i === index ? 'bg-accent-strong' : picks[i] !== undefined ? 'bg-navy' : 'bg-navy/20'}`} />
        ))}
      </div>

      <Frame label={`question ${index + 1} of ${total}`} className="mt-6 max-w-2xl" bodyClassName="p-6 md:p-8">
        <h1 ref={headingRef} tabIndex={-1} className="font-grotesk text-[24px] font-extrabold leading-snug tracking-[-0.01em] outline-none">
          {q.text}
        </h1>
        <div role="radiogroup" aria-label="Answers" className="mt-6 grid gap-3">
          {q.options.map((option, i) => {
            const selected = picks[index] === i
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPicks((p) => p.map((v, j) => (j === index ? i : v)))}
                className={`flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-inter text-[16px] transition-[background-color,color,transform] duration-200 active:scale-[0.99] ${
                  selected ? 'border-navy bg-navy text-white' : 'border-navy/30 bg-white/85 hover:border-navy'
                }`}
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] font-mono text-[13px] font-semibold ${selected ? 'border-white' : 'border-navy/40'}`}>{LETTERS[i]}</span>
                {option}
              </button>
            )
          })}
        </div>
      </Frame>

      {error && (
        <p role="alert" className="mt-5 max-w-2xl rounded-xl border-2 border-accent-strong bg-white/85 px-4 py-3 font-inter text-[15px]">
          {error}
        </p>
      )}

      <div className="mt-6 flex max-w-2xl flex-wrap items-center gap-3">
        <Button variant="outline" icon="arrow_back" disabled={index === 0 || saving} onClick={() => setIndex((i) => i - 1)}>
          Back
        </Button>
        {last ? (
          <Button variant="orange" icon="check" disabled={missing > 0 || saving} onClick={finish}>
            {saving ? 'Saving…' : 'Finish quiz'}
          </Button>
        ) : (
          <Button variant="navy" icon="arrow_forward" disabled={picks[index] === undefined} onClick={() => setIndex((i) => i + 1)}>
            Next
          </Button>
        )}
        <span className="font-inter text-[14px] text-navy-soft">
          Question {index + 1} of {total}
          {last && missing > 0 ? ` · ${missing} still to answer` : ''}
        </span>
      </div>
    </>
  )
}

function Results({ quiz }: { quiz: StudentQuizDetail }) {
  const total = quiz.questions.length
  const right = quiz.questions.filter((q) => q.choice === q.answer).length
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <>
      <BackLink />
      <p className="mt-6 font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-navy-soft">{quiz.title}</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 font-grotesk text-[34px] font-extrabold leading-tight tracking-[-0.02em] outline-none">
        You got {right} of {total} right
      </h1>
      <p className="mt-2 max-w-2xl font-inter text-[17px] leading-7 text-navy-soft">
        {right === total ? 'Nice work. Every answer was right.' : 'Read the reasons below for the ones you missed. They are the quickest way to fix the idea.'}
      </p>

      <ol className="mt-8 grid max-w-2xl gap-6">
        {quiz.questions.map((q, n) => {
          const ok = q.choice === q.answer
          return (
            <li key={q.id}>
              <Frame label={`question ${n + 1}`} tabEnd={<span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[12px] text-navy">{ok ? 'Right' : 'Missed'}</span>} bodyClassName="p-6">
                <h2 className="font-grotesk text-[20px] font-extrabold leading-snug tracking-[-0.01em]">{q.text}</h2>
                <ul className="mt-4 grid gap-2">
                  {q.options.map((option, i) => {
                    const isAnswer = i === q.answer
                    const isPick = i === q.choice
                    return (
                      <li
                        key={i}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 font-inter text-[15px] ${
                          isAnswer ? 'border-navy bg-white' : isPick ? 'border-accent-strong bg-white/85' : 'border-navy/15 bg-white/60 text-navy-soft'
                        }`}
                      >
                        <span className="font-mono text-[13px] font-semibold">{LETTERS[i]}</span>
                        <span className="flex-1">{option}</span>
                        {isAnswer && <span className="font-inter text-[13px] font-semibold">Right answer{isPick ? ' · your pick' : ''}</span>}
                        {isPick && !isAnswer && <span className="font-inter text-[13px] font-semibold text-accent-strong">Your pick</span>}
                      </li>
                    )
                  })}
                </ul>
                {q.why && <p className="mt-4 font-inter text-[15px] leading-6 text-navy-soft">{q.why}</p>}
              </Frame>
            </li>
          )
        })}
      </ol>

      <div className="mt-8">
        <Button to="/student" variant="navy" icon="arrow_forward">
          Back to quizzes
        </Button>
      </div>
    </>
  )
}
