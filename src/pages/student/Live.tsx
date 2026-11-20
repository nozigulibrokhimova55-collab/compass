import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loading } from '../../components/area/AreaBits'
import { useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { LETTERS, numberAnswerText } from '../../components/live/format'
import { Callout, OptionBars, StatusPill } from '../../components/live/LiveBits'
import { BackLink } from '../../components/student/QuizRunner'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { errorMessage } from '../../lib/db'
import { sendLiveAnswer, type LiveReviewItem, type LiveState, type LiveStudentQuestion } from '../../lib/liveDb'
import { parseNumber } from '../../lib/numbers'
import { useSession } from '../../lib/session'
import { useLiveState, usePresence } from '../../lib/useLive'

/** Student: the live quiz on their phone. Wait, answer when the question opens, see the answer when the teacher shows it. */
export default function StudentLive() {
  const gate = useClassGate({ student: true })
  const { sessionId } = useParams()
  return gate ?? (sessionId ? <Player sessionId={sessionId} /> : null)
}

function Player({ sessionId }: { sessionId: string }) {
  const live = useLiveState(sessionId)
  const { user } = useSession()
  usePresence(sessionId, user.id ?? null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const stage = live.data ? `${live.data.status}-${live.data.position}` : ''

  // Move focus to the new heading when the stage changes (a new question, the answer, the end) so screen readers follow along.
  const first = useRef(true)
  useEffect(() => {
    if (!stage) return
    if (first.current) {
      first.current = false
      return
    }
    headingRef.current?.focus()
  }, [stage])

  if (live.loading) return <Loading />
  if (!live.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <BackLink to="/student/quizzes">Quizzes</BackLink>
        <PageNotice label="error.frame" title="We couldn’t open this live quiz" alert>
          {live.error}
        </PageNotice>
      </div>
    )
  }

  const s = live.data

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to="/student">Home</BackLink>

      <div className="mt-6 rounded-2xl bg-white/85 p-4 backdrop-blur-sm">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-navy-soft">Live quiz</p>
        <p className="mt-1 font-grotesk text-[20px] font-extrabold leading-tight tracking-[-0.01em]">{s.title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3" aria-live="polite">
          <StatusPill status={s.status} position={s.position} total={s.total} />
          {s.status !== 'lobby' && s.status !== 'ended' && <span className="font-inter text-[14px] font-semibold text-navy">{s.right} right so far</span>}
        </div>
      </div>

      {s.status === 'lobby' && <Lobby headingRef={headingRef} />}
      {(s.status === 'open' || s.status === 'revealed') && s.question && <QuestionStage key={s.question.id} state={s} question={s.question} headingRef={headingRef} onSent={() => void live.reload()} />}
      {s.status === 'ended' && <Ended state={s} headingRef={headingRef} />}
    </div>
  )
}

type HeadingRef = React.RefObject<HTMLHeadingElement | null>

function Lobby({ headingRef }: { headingRef: HeadingRef }) {
  return (
    <Frame label="lobby.frame" className="mt-6" bodyClassName="p-6 md:p-8">
      <span className="grid size-12 place-items-center rounded-full bg-[#FBE1D8] text-accent-strong">
        <Icon name="hourglass_top" className="text-[26px]" />
      </span>
      <h1 ref={headingRef} tabIndex={-1} className="mt-4 font-grotesk text-[26px] font-extrabold leading-tight tracking-[-0.01em] outline-none">
        You’re in. Hang tight.
      </h1>
      <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">Your teacher will start the quiz in a moment. This page changes by itself, so keep it open.</p>
    </Frame>
  )
}

function QuestionStage({ state, question, headingRef, onSent }: { state: LiveState; question: LiveStudentQuestion; headingRef: HeadingRef; onSent: () => void }) {
  const numeric = question.type === 'numeric'
  const revealed = state.status === 'revealed'
  const reveal = state.reveal
  const my = state.my

  return (
    <Frame label={`q${String(state.position).padStart(2, '0')}.frame`} className="mt-6" bodyClassName="p-5 md:p-8">
      <h1 ref={headingRef} tabIndex={-1} className="font-grotesk text-[22px] font-extrabold leading-snug tracking-[-0.01em] outline-none md:text-[26px]">
        {question.text}
      </h1>

      {!revealed && !my && <AnswerForm sessionId={state.id} question={question} onSent={onSent} />}

      {!revealed && my && (
        <div className="mt-6 grid gap-4">
          {!numeric && (
            <ol className="grid gap-3">
              {question.options.map((o, i) => (
                <li key={i} className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 font-inter text-[17px] leading-6 ${my.choice === i ? 'border-navy bg-navy text-white' : 'border-card-line bg-white opacity-60'}`}>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] font-mono text-[14px] font-semibold ${my.choice === i ? 'border-white' : 'border-navy/40'}`}>{LETTERS[i]}</span>
                  {o}
                </li>
              ))}
            </ol>
          )}
          {numeric && <p className="font-inter text-[18px] font-semibold">You answered {`${my.value}${question.unit ? ` ${question.unit}` : ''}`}</p>}
          <Callout tone="info" icon="hourglass_top">
            Answer sent. Waiting for your teacher to show the answer.
          </Callout>
        </div>
      )}

      {revealed && reveal && (
        <div className="mt-6 grid gap-4">
          {my ? (
            my.correct ? (
              <Callout tone="good" icon="check_circle">
                You got it right.
              </Callout>
            ) : (
              <Callout tone="miss" icon="close">
                Not this time.
              </Callout>
            )
          ) : (
            <Callout tone="info" icon="timer_off">
              You didn’t answer this one.
            </Callout>
          )}

          {numeric ? (
            <div className="rounded-2xl bg-[#F3F7FC] p-4 font-inter text-[16px] leading-7">
              <p>
                <span className="font-semibold">Right answer:</span> {numberAnswerText(reveal.answerNumber, question.unit, reveal.tolerance)}
              </p>
              {my && (
                <p>
                  <span className="font-semibold">You typed:</span> {`${my.value}${question.unit ? ` ${question.unit}` : ''}`}
                </p>
              )}
            </div>
          ) : (
            <OptionBars options={question.options} counts={reveal.counts} answered={reveal.answered} correct={reveal.answer} mine={my?.choice ?? null} />
          )}

          <p className="font-inter text-[15px] text-navy-soft">
            {reveal.correctCount} of {reveal.answered} in the class got this one right.
          </p>
          {reveal.why && (
            <div className="rounded-2xl bg-[#F3F7FC] p-4">
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-navy-soft">Why</p>
              <p className="mt-1 font-inter text-[16px] leading-7">{reveal.why}</p>
            </div>
          )}
          <p className="font-inter text-[15px] font-semibold text-navy">Waiting for the next question…</p>
        </div>
      )}
    </Frame>
  )
}

/** Pick an answer (or type a number), then send it. One try per question. */
function AnswerForm({ sessionId, question, onSent }: { sessionId: string; question: LiveStudentQuestion; onSent: () => void }) {
  const numeric = question.type === 'numeric'
  const [pick, setPick] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const typedValue = parseNumber(typed)
  const ready = numeric ? typedValue !== null : pick !== null

  const send = async () => {
    if (!ready) return
    setSending(true)
    setError(null)
    try {
      await sendLiveAnswer(sessionId, question.id, numeric ? { value: typedValue as number } : { choice: pick as number })
      onSent()
    } catch (err) {
      console.error('Could not send the answer', err)
      const message = errorMessage(err, 'We couldn’t send your answer. Try again.')
      setError(message)
      // Already answered (a second tab, say) or the question closed: show what the server has.
      if (/already answered|closed|isn’t open/.test(message)) onSent()
      setSending(false)
    }
  }

  return (
    <div className="mt-5">
      {numeric ? (
        <div>
          <label htmlFor={`live-answer-${question.id}`} className="font-inter text-[16px] font-semibold">
            Your answer
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id={`live-answer-${question.id}`}
              inputMode="decimal"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={typed.trim() !== '' && typedValue === null}
              className="block min-h-16 w-full max-w-[14rem] rounded-2xl border-2 border-card-line bg-white px-4 font-inter text-[20px] text-navy focus:border-navy focus:outline-none focus:ring-4 focus:ring-select/20 aria-[invalid=true]:border-accent-strong"
            />
            {question.unit && <span className="font-inter text-[18px] font-semibold">{question.unit}</span>}
          </div>
          <p className={`mt-2 font-inter text-[14px] ${typed.trim() !== '' && typedValue === null ? 'font-medium text-accent-strong' : 'text-navy-soft'}`}>
            {typed.trim() !== '' && typedValue === null ? 'Type just a number, like 12.5.' : 'Just the number. Close enough counts.'}
          </p>
        </div>
      ) : (
        <div role="radiogroup" aria-label="Answers" className="grid gap-3">
          {question.options.map((option, i) => {
            const on = pick === i
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPick(i)}
                className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-inter text-[17px] leading-6 transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98] ${
                  on ? 'border-navy bg-navy text-white' : 'border-card-line bg-white hover:border-navy'
                }`}
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] font-mono text-[14px] font-semibold ${on ? 'border-white' : 'border-navy/40'}`}>{LETTERS[i]}</span>
                {option}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
          <Icon name="error" className="mt-0.5 text-[20px]" />
          {error}
        </p>
      )}

      <Button variant="orange" size="lg" icon={sending ? undefined : 'send'} disabled={!ready || sending} onClick={send} className="mt-6 w-full">
        {sending ? 'Sending…' : 'Send answer'}
      </Button>
      {!ready && <p className="mt-3 text-center font-inter text-[14px] text-navy-soft">{numeric ? 'Type your answer.' : 'Tap an answer, then send it.'}</p>}
    </div>
  )
}

function Ended({ state, headingRef }: { state: LiveState; headingRef: HeadingRef }) {
  const review = state.review ?? []
  const answered = review.filter((r) => r.correct !== null).length
  const right = review.filter((r) => r.correct === true).length

  return (
    <>
      <div className="mt-6 rounded-3xl bg-white/90 p-5 backdrop-blur-sm md:p-7">
        <h1 ref={headingRef} tabIndex={-1} className="font-grotesk text-[30px] font-black leading-tight tracking-[-0.03em] outline-none">
          {answered === 0 ? 'That’s the end.' : <>You got {right} of {answered} <span className="text-accent">right.</span></>}
        </h1>
        <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">
          {answered === 0 ? 'You didn’t answer any questions this time.' : answered < review.length ? `You answered ${answered} of ${review.length} questions. Here’s how it went.` : 'Read the “why” on the ones you missed. It’s the fastest way to fix the idea.'}
        </p>
        <div className="mt-4">
          <Button to="/student" variant="navy" icon="arrow_forward">
            Back home
          </Button>
        </div>
      </div>

      <ol className="mt-8 grid gap-6">
        {review.map((r, n) => (
          <ReviewCard key={r.id} item={r} number={n + 1} />
        ))}
      </ol>
    </>
  )
}

function ReviewCard({ item, number }: { item: LiveReviewItem; number: number }) {
  const numeric = item.type === 'numeric'
  const unit = item.unit ? ` ${item.unit}` : ''
  return (
    <li>
      <Frame label={`q${String(number).padStart(2, '0')}.frame`} bodyClassName="p-5 md:p-7">
        <h2 className="font-grotesk text-[20px] font-extrabold leading-snug tracking-[-0.01em]">{item.text}</h2>
        <div className="mt-3">
          {item.correct === null ? (
            <Callout tone="info" icon="timer_off">
              You didn’t answer this one.
            </Callout>
          ) : item.correct ? (
            <Callout tone="good" icon="check_circle">
              Right
            </Callout>
          ) : (
            <Callout tone="miss" icon="close">
              Not this time
            </Callout>
          )}
        </div>
        <div className="mt-3 font-inter text-[16px] leading-7">
          {numeric ? (
            <>
              <p>
                <span className="font-semibold">Right answer:</span> {numberAnswerText(item.answerNumber, item.unit, item.tolerance)}
              </p>
              {item.value !== null && (
                <p>
                  <span className="font-semibold">You typed:</span> {`${item.value}${unit}`}
                </p>
              )}
            </>
          ) : (
            <>
              <p>
                <span className="font-semibold">Right answer:</span> {LETTERS[item.answer]}. {item.options[item.answer]}
              </p>
              {item.choice !== null && (
                <p>
                  <span className="font-semibold">You picked:</span> {LETTERS[item.choice]}. {item.options[item.choice]}
                </p>
              )}
            </>
          )}
          {item.why && <p className="mt-2 text-navy-soft">{item.why}</p>}
        </div>
      </Frame>
    </li>
  )
}
