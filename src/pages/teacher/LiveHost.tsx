import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BlockTitle, Loading } from '../../components/area/AreaBits'
import { useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { AddQuestion } from '../../components/live/AddQuestion'
import { numberAnswerText } from '../../components/live/format'
import { Callout, OptionBars, StatusPill } from '../../components/live/LiveBits'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useClassData } from '../../lib/classData'
import { errorMessage } from '../../lib/db'
import { liveControl, type LiveAction, type LiveAnswer, type LiveQuestion } from '../../lib/liveDb'
import { useLiveHost, usePresence } from '../../lib/useLive'

/** Teacher: run one live quiz. Start it, show the answer, move on, add a quick question, end it. */
export default function TeacherLiveHost() {
  const gate = useClassGate()
  const { sessionId } = useParams()
  return gate ?? (sessionId ? <Host sessionId={sessionId} /> : null)
}

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)

function Host({ sessionId }: { sessionId: string }) {
  const live = useLiveHost(sessionId)
  const { students } = useClassData()
  const here = usePresence(sessionId, null)
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [showCounts, setShowCounts] = useState(true)

  if (live.loading) return <Loading />
  if (!live.data) {
    return (
      <PageNotice label="error.frame" title="We couldn’t open this live quiz" alert>
        {live.error}
      </PageNotice>
    )
  }

  const { session, questions, answers } = live.data
  const total = questions.length
  const names = new Map(students.map((s) => [s.id, s.name]))
  const hereNames = here.map((id) => names.get(id)).filter((n): n is string => Boolean(n)).sort((a, b) => a.localeCompare(b))
  const current = questions.find((q) => q.position === session.position) ?? null
  const currentAnswers = current ? answers.filter((a) => a.questionId === current.id) : []
  const answeredIds = new Set(currentAnswers.map((a) => a.studentId))
  const waiting = students.filter((s) => !answeredIds.has(s.id))

  const run = async (action: LiveAction) => {
    setBusy(true)
    setError(null)
    try {
      await liveControl(sessionId, action)
      await live.reload()
    } catch (err) {
      console.error('Could not change the live quiz', err)
      setError(errorMessage(err, 'That didn’t work. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  const endQuiz = () => {
    if (window.confirm('End this live quiz for everyone? Students will see their results.')) void run('end')
  }

  const addButton = (
    <Button variant="outline" icon="add" disabled={busy} onClick={() => setAdding(true)}>
      Add a question
    </Button>
  )

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="live quiz" title={session.title} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <StatusPill status={session.status} position={session.position} total={total} />
        {session.status !== 'ended' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 font-inter text-[14px] font-semibold text-navy backdrop-blur-sm">
            <Icon name="groups" className="text-[18px]" />
            {hereNames.length} of {students.length} here
          </span>
        )}
        {(session.status === 'open' || session.status === 'revealed') && (
          <button
            type="button"
            aria-pressed={!showCounts}
            onClick={() => setShowCounts((v) => !v)}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-3 font-inter text-[14px] font-semibold text-navy backdrop-blur-sm hover:bg-white"
          >
            <Icon name={showCounts ? 'visibility' : 'visibility_off'} className="text-[18px]" />
            {showCounts ? 'Hide counts' : 'Show counts'}
          </button>
        )}
      </div>

      <div className="mt-8 grid max-w-3xl gap-6">
        {session.status === 'lobby' && (
          <Frame label="lobby.frame" bodyClassName="p-6 md:p-8">
            <h2 className="font-grotesk text-[24px] font-extrabold tracking-[-0.01em]">Waiting for your students</h2>
            <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">They’ll see “Live now” at the top of their Compass home page. Start when enough of them are here.</p>
            <div className="mt-5">
              <BlockTitle>{`In the room · ${hereNames.length}`}</BlockTitle>
              {hereNames.length === 0 ? (
                <p className="mt-3 font-inter text-[15px] text-navy-soft">Nobody yet.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {hereNames.map((n) => (
                    <li key={n} className="rounded-full border border-card-line bg-white px-3 py-1 font-inter text-[15px] font-medium">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-6 border-t border-card-line pt-5">
              <p className="font-inter text-[15px] font-semibold">{total === 0 ? 'No questions yet' : `${total} ${total === 1 ? 'question' : 'questions'} ready`}</p>
              {total > 0 && <QuestionList questions={questions} />}
            </div>
          </Frame>
        )}

        {(session.status === 'open' || session.status === 'revealed') && current && (
          <Frame label={`q${String(current.position).padStart(2, '0')}.frame`} bodyClassName="p-6 md:p-8">
            <h2 className="font-grotesk text-[24px] font-extrabold leading-snug tracking-[-0.01em] md:text-[28px]">{current.text}</h2>
            <div className="mt-6">
              <QuestionBody question={current} answers={currentAnswers} revealed={session.status === 'revealed'} showCounts={showCounts} />
            </div>

            <div className="mt-6 rounded-2xl bg-[#F3F7FC] p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E3ECF7]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={students.length}
                  aria-valuenow={Math.min(answeredIds.size, students.length)}
                  aria-label="Students who answered"
                >
                  <div className="h-full rounded-full bg-accent-strong transition-[width] duration-300" style={{ width: `${pct(answeredIds.size, Math.max(students.length, answeredIds.size))}%` }} />
                </div>
                <span className="shrink-0 font-mono text-[13px] font-semibold">
                  {answeredIds.size} of {students.length} answered
                </span>
              </div>
              {session.status === 'open' && waiting.length > 0 && waiting.length <= 12 && (
                <p className="mt-3 font-inter text-[14px] leading-6 text-navy-soft">
                  <span className="font-semibold text-navy">Still thinking:</span> {waiting.map((s) => s.name).join(', ')}
                </p>
              )}
            </div>

            {session.status === 'revealed' && (
              <div className="mt-5 grid gap-3">
                <Callout tone="info" icon="insights">
                  {answeredIds.size === 0 ? 'Nobody answered this one.' : `${currentAnswers.filter((a) => a.correct).length} of ${answeredIds.size} got it right (${pct(currentAnswers.filter((a) => a.correct).length, answeredIds.size)}%).`}
                </Callout>
                {current.why && <p className="font-inter text-[16px] leading-7 text-navy-soft">{current.why}</p>}
              </div>
            )}
          </Frame>
        )}

        {session.status === 'ended' && <Summary questions={questions} answers={answers} students={students} />}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
            <Icon name="error" className="mt-0.5 text-[20px]" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {session.status === 'lobby' && (
            <>
              <Button variant="orange" size="lg" icon="play_arrow" disabled={busy || total === 0} onClick={() => void run('start')}>
                Start the quiz
              </Button>
              {addButton}
              <Button variant="outline" icon="close" disabled={busy} onClick={endQuiz}>
                Cancel
              </Button>
            </>
          )}
          {session.status === 'open' && (
            <>
              <Button variant="orange" size="lg" icon="visibility" disabled={busy} onClick={() => void run('reveal')}>
                Show the answer
              </Button>
              {addButton}
              <Button variant="outline" icon="stop" disabled={busy} onClick={endQuiz}>
                End quiz
              </Button>
            </>
          )}
          {session.status === 'revealed' && (
            <>
              {session.position < total ? (
                <Button variant="navy" size="lg" icon="arrow_forward" disabled={busy} onClick={() => void run('next')}>
                  Next question
                </Button>
              ) : (
                <Button variant="orange" size="lg" icon="flag" disabled={busy} onClick={endQuiz}>
                  That’s the last one. End quiz
                </Button>
              )}
              {addButton}
              {session.position < total && (
                <Button variant="outline" icon="stop" disabled={busy} onClick={endQuiz}>
                  End quiz
                </Button>
              )}
            </>
          )}
          {session.status === 'ended' && (
            <Button to="/teacher/live" variant="navy" icon="arrow_back">
              Back to live quizzes
            </Button>
          )}
        </div>

        {(session.status === 'open' || session.status === 'revealed') && session.position < total && (
          <p className="font-inter text-[14px] text-navy-soft">{total - session.position === 1 ? '1 more question after this one.' : `${total - session.position} more questions after this one.`}</p>
        )}
      </div>

      <AddQuestion
        sessionId={sessionId}
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={() => {
          setAdding(false)
          toast('Question added to the end.')
          void live.reload()
        }}
      />
    </>
  )
}

function QuestionList({ questions }: { questions: LiveQuestion[] }) {
  return (
    <ol className="mt-3 grid gap-2">
      {questions.map((q) => (
        <li key={q.id} className="flex gap-3 font-inter text-[15px] leading-6">
          <span className="w-6 shrink-0 font-mono text-[13px] font-semibold text-navy-soft">{q.position}</span>
          <span className="min-w-0">{q.text}</span>
        </li>
      ))}
    </ol>
  )
}

/** Options with live counts for pick-an-answer questions; the typed numbers for number questions. */
function QuestionBody({ question, answers, revealed, showCounts }: { question: LiveQuestion; answers: LiveAnswer[]; revealed: boolean; showCounts: boolean }) {
  if (question.type === 'multiple_choice') {
    const counts = question.options.map((_, i) => answers.filter((a) => a.choice === i).length)
    return <OptionBars options={question.options} counts={counts} answered={answers.length} correct={revealed ? question.answer : null} hideCounts={!showCounts} />
  }
  return (
    <div>
      {revealed && (
        <Callout tone="good" icon="check_circle">
          Right answer: {numberAnswerText(question.answerNumber, question.unit, question.tolerance)}
        </Callout>
      )}
      {showCounts && answers.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Numbers students typed">
          {[...answers]
            .sort((x, y) => (x.value ?? 0) - (y.value ?? 0))
            .map((a) => (
              <li
                key={a.studentId}
                className={`rounded-full border-2 px-3 py-1 font-mono text-[14px] font-semibold ${revealed ? (a.correct ? 'border-[#1F5C35] bg-[#E3F5EA] text-[#1F5C35]' : 'border-card-line bg-white text-navy') : 'border-card-line bg-white text-navy'}`}
              >
                {a.value}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

/** After the quiz: how each question went, and how each student did. */
function Summary({ questions, answers, students }: { questions: LiveQuestion[]; answers: LiveAnswer[]; students: { id: string; name: string }[] }) {
  const shown = questions.filter((q) => answers.some((a) => a.questionId === q.id))
  const rows = students
    .map((s) => {
      const mine = answers.filter((a) => a.studentId === s.id)
      return { id: s.id, name: s.name, answered: mine.length, right: mine.filter((a) => a.correct).length }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <Frame label="results.frame" bodyClassName="p-6 md:p-8">
        <h2 className="font-grotesk text-[24px] font-extrabold tracking-[-0.01em]">How each question went</h2>
        {shown.length === 0 ? (
          <p className="mt-3 font-inter text-[16px] leading-7 text-navy-soft">Nobody answered anything in this one.</p>
        ) : (
          <ol className="mt-5 divide-y divide-card-line">
            {shown.map((q) => {
              const a = answers.filter((x) => x.questionId === q.id)
              const right = a.filter((x) => x.correct).length
              return (
                <li key={q.id} className="flex items-start gap-3 py-3">
                  <span className="w-6 shrink-0 pt-0.5 font-mono text-[13px] font-semibold text-navy-soft">{q.position}</span>
                  <span className="min-w-0 flex-1 font-inter text-[16px] leading-6">
                    {q.text}
                    <span className="mt-1 block text-[14px] text-navy-soft">
                      {right} of {a.length} right
                    </span>
                  </span>
                  <span className={`shrink-0 font-grotesk text-[22px] font-extrabold ${pct(right, a.length) < 50 ? 'text-accent-strong' : 'text-navy'}`}>{pct(right, a.length)}%</span>
                </li>
              )
            })}
          </ol>
        )}
      </Frame>

      {students.length > 0 && (
        <Frame label="students.frame" bodyClassName="p-6 md:p-8">
          <h2 className="font-grotesk text-[24px] font-extrabold tracking-[-0.01em]">Each student</h2>
          <ul className="mt-4 divide-y divide-card-line">
            {rows.map((r) => (
              <li key={r.id} className="flex min-h-12 items-center justify-between gap-3 py-2 font-inter text-[16px]">
                <span className="font-semibold">{r.name}</span>
                <span className="text-navy-soft">{r.answered === 0 ? 'Wasn’t here' : `${r.right} right of ${r.answered} answered`}</span>
              </li>
            ))}
          </ul>
        </Frame>
      )}
    </>
  )
}
