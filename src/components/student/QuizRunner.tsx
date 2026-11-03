import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Confidence } from '../../lib/sampleData'
import { CONFIDENCE_LABEL, CONFIDENCE_OPTIONS } from './confidence'
import { Icon } from '../Icon'
import { Button } from '../ui/Button'
import { Frame } from '../ui/Frame'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export type RunnerQuestion = { id: string; text: string; options: string[] }
export type RunnerAnswer = { questionId: string; choice: number; confidence: Confidence }
export type ResultQuestion = RunnerQuestion & { answer: number; why: string; choice: number }

export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/85 px-4 font-inter text-[15px] font-semibold text-navy backdrop-blur-sm hover:bg-white">
      <Icon name="arrow_back" className="text-[18px]" />
      {children}
    </Link>
  )
}

type RunnerProps = {
  title: string
  /** Small mono line above the title, e.g. "Retry" or "Catch-up check". */
  eyebrow: string
  questions: RunnerQuestion[]
  backTo: string
  backLabel: string
  /** Called once every question has an answer and a confidence. Throw to show an error and let them try again. */
  onFinish: (answers: RunnerAnswer[]) => Promise<void>
}

/** One question at a time: pick an answer, say how sure you are, then Next. Built for thumbs. */
export function QuizRunner({ title, eyebrow, questions, backTo, backLabel, onFinish }: RunnerProps) {
  const total = questions.length
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<(number | undefined)[]>(() => questions.map(() => undefined))
  const [sure, setSure] = useState<(Confidence | undefined)[]>(() => questions.map(() => undefined))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [index])

  if (total === 0) {
    return (
      <Frame label="empty.frame" className="mt-6 max-w-xl" bodyClassName="p-6">
        <p className="font-inter text-[16px] leading-7">This one has no questions. Ask your teacher to check it.</p>
      </Frame>
    )
  }

  const q = questions[index]
  const picked = picks[index]
  const confidence = sure[index]
  const ready = picked !== undefined && confidence !== undefined
  const last = index === total - 1
  const setAt = <T,>(list: T[], value: T) => list.map((v, j) => (j === index ? value : v))

  const finish = async () => {
    setSaving(true)
    setError(null)
    try {
      await onFinish(questions.map((question, i) => ({ questionId: question.id, choice: picks[i] as number, confidence: sure[i] as Confidence })))
    } catch (err) {
      console.error('Could not save the answers', err)
      setError(err instanceof Error && err.message ? err.message : 'We couldn’t save your answers. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink to={backTo}>{backLabel}</BackLink>

      <div className="mt-6 rounded-2xl bg-white/85 p-4 backdrop-blur-sm">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-navy-soft">{eyebrow}</p>
        <p className="mt-1 font-grotesk text-[20px] font-extrabold leading-tight tracking-[-0.01em]">{title}</p>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E3ECF7]"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            aria-label={`Question ${index + 1} of ${total}`}
          >
            <div className="h-full rounded-full bg-accent-strong transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
          <span className="shrink-0 font-mono text-[13px] font-semibold text-navy">
            {index + 1} / {total}
          </span>
        </div>
      </div>

      <Frame key={q.id} label={`q${String(index + 1).padStart(2, '0')}.frame`} className="mt-6" bodyClassName="p-5 md:p-8">
        <h1 ref={headingRef} tabIndex={-1} className="font-grotesk text-[22px] font-extrabold leading-snug tracking-[-0.01em] outline-none md:text-[26px]">
          {q.text}
        </h1>
        <div role="radiogroup" aria-label="Answers" className="mt-5 grid gap-3">
          {q.options.map((option, i) => {
            const on = picked === i
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPicks((p) => setAt(p, i))}
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

        {picked !== undefined && (
          <fieldset className="step-in mt-6 rounded-2xl bg-[#F3F7FC] p-4">
            <legend className="sr-only">How sure are you?</legend>
            <p aria-hidden="true" className="font-inter text-[16px] font-semibold">
              How sure are you?
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {CONFIDENCE_OPTIONS.map((c) => {
                const on = confidence === c.id
                return (
                  <label
                    key={c.id}
                    className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-2 font-inter text-[15px] font-semibold transition-colors duration-150 active:scale-[0.97] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-select ${
                      on ? 'border-accent-strong bg-[#FBE1D8] text-[#9C3412]' : 'border-card-line bg-white text-navy hover:border-navy'
                    }`}
                  >
                    <input type="radio" name={`sure-${q.id}`} checked={on} onChange={() => setSure((s) => setAt(s, c.id))} className="sr-only" />
                    <Icon name={c.icon} className="text-[22px]" filled={on} />
                    {c.label}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}
      </Frame>

      {error && (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-[#FBE1D8] px-4 py-3 font-inter text-[15px] leading-6 text-[#9C3412]">
          <Icon name="error" className="mt-0.5 text-[20px]" />
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-[auto_1fr] gap-3">
        <Button variant="outline" size="lg" icon="arrow_back" disabled={index === 0 || saving} onClick={() => setIndex((i) => i - 1)}>
          <span className="sr-only">Back</span>
        </Button>
        {last ? (
          <Button variant="orange" size="lg" icon={saving ? undefined : 'check'} disabled={!ready || saving} onClick={finish}>
            {saving ? 'Saving…' : 'Finish'}
          </Button>
        ) : (
          <Button variant="navy" size="lg" icon="arrow_forward" disabled={!ready} onClick={() => setIndex((i) => i + 1)}>
            Next
          </Button>
        )}
      </div>
      {!ready && <p className="mt-3 text-center font-inter text-[14px] text-navy-soft">{picked === undefined ? 'Tap an answer.' : 'Now tap how sure you are.'}</p>}
    </div>
  )
}

type ResultsProps = {
  title: string
  eyebrow: string
  questions: ResultQuestion[]
  confidence: Partial<Record<string, Confidence>>
  /** One plain line under the score, e.g. what happens to missed questions. */
  note?: string
  actions: ReactNode
}

/** Score, then every question with the right answer, their pick, how sure they were, and why. */
export function QuizResults({ title, eyebrow, questions, confidence, note, actions }: ResultsProps) {
  const total = questions.length
  const right = questions.filter((q) => q.choice === q.answer).length
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-white/90 p-5 backdrop-blur-sm md:p-7">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-navy-soft">
          {eyebrow} · {title}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-2 font-grotesk text-[32px] font-black leading-tight tracking-[-0.03em] outline-none">
          You got {right} of {total} <span className="text-accent">right.</span>
        </h1>
        <p className="mt-2 font-inter text-[16px] leading-7 text-navy-soft">
          {right === total ? 'Every answer was right. Nice work.' : 'Read the “why” on the ones you missed. It’s the fastest way to fix the idea.'}
          {note ? ` ${note}` : ''}
        </p>
      </div>

      <ol className="mt-8 grid gap-6">
        {questions.map((q, n) => {
          const ok = q.choice === q.answer
          const c = confidence[q.id]
          return (
            <li key={q.id}>
              <Frame
                label={`q${String(n + 1).padStart(2, '0')}.frame`}
                tabEnd={
                  <span className={`rounded-full px-2.5 py-0.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] ${ok ? 'bg-[#E3F5EA] text-[#1F5C35]' : 'bg-[#FBE1D8] text-[#9C3412]'}`}>
                    {ok ? 'Right' : 'Missed'}
                  </span>
                }
                bodyClassName="p-5 md:p-6"
              >
                <h2 className="font-grotesk text-[19px] font-extrabold leading-snug tracking-[-0.01em]">{q.text}</h2>
                <ul className="mt-4 grid gap-2">
                  {q.options.map((option, i) => {
                    const isAnswer = i === q.answer
                    const isPick = i === q.choice
                    if (!isAnswer && !isPick) return null
                    return (
                      <li
                        key={i}
                        className={`flex items-start gap-3 rounded-xl border-2 px-4 py-2.5 font-inter text-[15px] leading-6 ${isAnswer ? 'border-[#1F6B3A] bg-[#E3F5EA] text-[#1F5C35]' : 'border-accent-strong bg-[#FBE1D8] text-[#9C3412]'}`}
                      >
                        <Icon name={isAnswer ? 'check_circle' : 'cancel'} className="mt-0.5 text-[18px]" filled />
                        <span className="flex-1">
                          <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">{isAnswer ? (isPick ? 'Right answer · your pick' : 'Right answer') : 'Your pick'}</span>
                          {option}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {c && (
                  <p className="mt-3 font-inter text-[14px] text-navy-soft">
                    {CONFIDENCE_LABEL[c]}.{!ok && c === 'sure' ? ' This one’s worth a second look: sure-but-wrong ideas stick around.' : ''}
                  </p>
                )}
                {q.why && (
                  <p className="mt-3 rounded-xl bg-[#F3F7FC] px-4 py-3 font-inter text-[15px] leading-6">
                    <span className="font-semibold">Why: </span>
                    {q.why}
                  </p>
                )}
              </Frame>
            </li>
          )
        })}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
    </div>
  )
}
