import { useEffect, useId, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { BlockTitle, SampleNote, SampleTag } from '../../components/area/AreaBits'
import { plural, useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { inputClass } from '../../components/ui/Field'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { longDay } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import type { QuizSummary } from '../../lib/db'
import { useMisconceptions, useReviewPlans, type Confidence, type Misconception, type PlanStep, type ReviewPlan } from '../../lib/sampleData'
import { useQuizResults } from '../../lib/useQuizResults'

const CONFIDENCE: Record<Confidence, { label: string; cls: string }> = {
  sure: { label: 'Sure', cls: 'border-accent-strong bg-[#FBE1D8] text-[#9C3412]' },
  not_sure: { label: 'Not sure', cls: 'border-[#9A5B12] bg-note text-[#6B3F0E]' },
  guessed: { label: 'Guessed', cls: 'border-card-line bg-[#F3F7FC] text-navy' },
}

export default function TeacherReport() {
  const gate = useClassGate()
  return gate ?? <ReportBody />
}

function ReportBody() {
  const { quizId } = useParams()
  const { quizzes } = useClassData()
  const isSampleQuiz = quizId === 'sample'
  const quiz = quizzes.find((q) => q.id === quizId)
  const report = useMisconceptions(quizId)
  const { hash } = useLocation()

  // Links from Home point at one review plan (#plan-…). Scroll to it once the page is drawn.
  useEffect(() => {
    if (!hash) return
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 50)
    return () => window.clearTimeout(t)
  }, [hash])

  if (!quiz && !isSampleQuiz) {
    return (
      <EmptyState label="report.frame" icon="search_off" title="We can’t find that quiz" className="mt-10 max-w-xl" action={{ label: 'Back to reports', to: '/teacher/reports', icon: 'arrow_back' }}>
        It may have been removed, or the link is from a different class.
      </EmptyState>
    )
  }

  const title = quiz?.title ?? report.quizTitle

  return (
    <>
      <Link to="/teacher/reports" className="mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/85 px-4 font-inter text-[15px] font-semibold text-navy backdrop-blur-sm hover:bg-white">
        <Icon name="arrow_back" className="text-[18px]" />
        All reports
      </Link>
      <SectionHeader as="h1" size="sm" align="left" script="quiz report" title={title} />

      {quiz ? <RealSummary quiz={quiz} /> : null}

      <SampleNote className="mt-8 max-w-3xl">
        {isSampleQuiz
          ? 'This whole report is sample data from Ms. Park’s Physics 1 class, to show what a report looks like.'
          : 'The mix-ups and review plans below are sample data from Ms. Park’s class. Compass can’t read your students’ answers for mix-ups yet. The numbers above are real.'}
      </SampleNote>

      <section aria-labelledby="mixups" className="mt-12">
        <BlockTitle id="mixups" end={<SampleTag />}>
          Most common mix-ups
        </BlockTitle>
        <p className="mt-3 w-fit rounded-xl bg-white/85 px-3 py-1.5 font-inter text-[15px] text-navy backdrop-blur-sm">
          From {report.quizTitle}, {report.className} · {plural(report.totalStudents, 'student')}
        </p>
        <ol className="mt-6 flex flex-col gap-12">
          {report.misconceptions.map((m, i) => (
            <li key={m.id}>
              <MixUp number={i + 1} m={m} total={report.totalStudents} onFlag={report.setFlag} />
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

/** Real numbers for a real quiz: who finished and the class average. */
function RealSummary({ quiz }: { quiz: QuizSummary }) {
  const { students } = useClassData()
  const results = useQuizResults(quiz.id, students)
  const stats = results.loading
    ? [
        { value: '…', label: 'Finished' },
        { value: '…', label: 'Average' },
      ]
    : [
        { value: String(results.finished), symbol: `/${students.length}`, label: 'Finished' },
        results.average === null ? { value: '–', label: 'Average' } : { value: String(results.average), symbol: '%', label: 'Average' },
      ]
  return (
    <StatCard
      className="mt-10 max-w-xl"
      title={quiz.dueDate ? `Due ${longDay(quiz.dueDate)}` : 'Your class'}
      stats={stats}
      note={results.error ?? (results.finished === 0 && !results.loading ? 'No one has finished yet. Numbers fill in as students finish.' : undefined)}
    />
  )
}

/** One misconception: who has it, the answers behind it, and its review plan beside it. */
function MixUp({ number, m, total, onFlag }: { number: number; m: Misconception; total: number; onFlag: (id: string, on: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { plans } = useReviewPlans()
  const plan = plans.find((p) => p.misconceptionId === m.id)
  const n = String(number).padStart(2, '0')
  const share = total ? m.students / total : 0

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
      <Frame label={`mixup_${n}.frame`} bodyClassName="p-6 md:p-8">
        <p className="font-grotesk text-[40px] font-black leading-none tracking-[-0.04em] text-accent" aria-hidden="true">
          {n}
        </p>
        <h3 className="mt-3 font-grotesk text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] md:text-[30px]">
          {m.students} of {total} students think <span className="text-accent-strong">{m.idea}</span>
        </h3>
        <p className="mt-3 font-inter text-[16px] leading-7 text-navy-soft">{m.detail}</p>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#EEF4FB]" role="img" aria-label={`${m.students} of ${total} students`}>
          <div className="h-full rounded-full bg-accent-strong transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#F3F7FC] p-3">
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-soft">Students</dt>
            <dd className="mt-1 font-grotesk text-[26px] font-black leading-none">{m.students}</dd>
          </div>
          <div className="rounded-2xl bg-[#FBE1D8] p-3">
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9C3412]">Sure but wrong</dt>
            <dd className="mt-1 font-grotesk text-[26px] font-black leading-none text-[#9C3412]">{m.confidentWrong}</dd>
          </div>
          <div className="col-span-2 rounded-2xl bg-[#F3F7FC] p-3 sm:col-span-1">
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-soft">Questions</dt>
            <dd className="mt-1 font-grotesk text-[26px] font-black leading-none">{m.questions.join(', ')}</dd>
          </div>
        </dl>
        {m.confidentWrong > 0 && (
          <p className="mt-3 font-inter text-[15px] leading-6 text-navy-soft">
            Students who were sure of a wrong answer usually need to see why, not just the right answer.
          </p>
        )}

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border-[1.5px] border-select bg-[#F2F8FE] px-4 text-left font-inter text-[15px] font-semibold text-navy transition-colors hover:bg-[#E6F1FD]"
        >
          <span className="flex items-center gap-2">
            <Icon name="help" className="text-[20px] text-select" />
            Why did Compass say this?
          </span>
          <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[22px]" />
        </button>
        <div id={panelId} hidden={!open} className="mt-4">
          <p className="font-inter text-[15px] leading-6 text-navy-soft">
            These are the answers it’s based on. If one doesn’t really show this idea, mark it and it stops counting.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {m.evidence.map((e) => {
              const flagged = m.flagged.has(e.id)
              const c = CONFIDENCE[e.confidence]
              return (
                <li key={e.id} className={`rounded-2xl border p-4 transition-opacity ${flagged ? 'border-dashed border-card-line bg-[#F8FAFD]' : 'border-card-line bg-white'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-inter text-[15px] font-semibold ${flagged ? 'text-navy-soft line-through' : ''}`}>{e.student}</span>
                    <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-navy-soft">Q{e.questionNumber}</span>
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${c.cls}`}>{c.label}</span>
                  </div>
                  <p className="mt-2 font-inter text-[15px] leading-6">{e.question}</p>
                  <p className="mt-2 font-inter text-[15px] leading-6">
                    <span className="text-navy-soft">Answered: </span>
                    <span className="font-semibold">{e.answer}</span>
                  </p>
                  <p className="font-inter text-[15px] leading-6">
                    <span className="text-navy-soft">Right answer: </span>
                    {e.rightAnswer}
                  </p>
                  <button
                    type="button"
                    onClick={() => onFlag(e.id, !flagged)}
                    aria-pressed={flagged}
                    className={`mt-3 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3 font-inter text-[14px] font-semibold transition-colors ${
                      flagged ? 'border-navy bg-navy text-white' : 'border-card-line bg-white text-navy hover:border-accent-strong hover:text-accent-strong'
                    }`}
                  >
                    <Icon name={flagged ? 'undo' : 'thumb_down'} className="text-[17px]" />
                    {flagged ? 'Marked wrong. Undo' : 'This is wrong'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </Frame>

      {plan && <PlanCard key={`${plan.id}-${plan.edited}`} plan={plan} number={n} />}
    </div>
  )
}

/** The suggested 10-minute review on a navy card: Approve, or Edit each step. */
function PlanCard({ plan, number }: { plan: ReviewPlan; number: string }) {
  const notify = useToast()
  const { approve, saveSteps } = useReviewPlans()
  const [editing, setEditing] = useState(false)
  const [steps, setSteps] = useState<PlanStep[]>(plan.steps)
  const [error, setError] = useState('')
  const base = useId()

  const saveEdit = () => {
    const clean = steps.map((s) => ({ ...s, title: s.title.trim(), text: s.text.trim() }))
    if (clean.some((s) => !s.title)) return setError('Give every step a short name.')
    if (clean.some((s) => !Number.isFinite(s.minutes) || s.minutes < 1)) return setError('Each step needs at least 1 minute.')
    saveSteps(plan.id, clean)
    setEditing(false)
    setError('')
    notify('Review plan saved and approved.')
  }
  const minutes = steps.reduce((sum, s) => sum + (Number.isFinite(s.minutes) ? s.minutes : 0), 0)

  return (
    <Frame label={`plan_${number}.frame`} tone="navy" id={`plan-${plan.id}`} className="scroll-mt-24" bodyClassName="p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-accent-soft">Suggested review</p>
        {plan.approved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E3F5EA] px-2.5 py-0.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-[#1F5C35]">
            <Icon name="check" className="text-[15px]" />
            Approved
          </span>
        )}
      </div>
      <h3 className="mt-2 font-grotesk text-[30px] font-black leading-none tracking-[-0.03em] text-white">
        {editing ? minutes : plan.minutes}
        <span className="text-accent"> min</span>
      </h3>
      <p className="mt-1 font-inter text-[15px] text-white/80">For next class, before anything new.</p>

      {editing ? (
        <div className="mt-5 flex flex-col gap-4">
          {steps.map((s, i) => (
            <fieldset key={i} className="rounded-2xl bg-white/10 p-3">
              <legend className="sr-only">Step {i + 1}</legend>
              <div className="flex gap-2">
                <label className="w-20 shrink-0">
                  <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.1em] text-white/80">Minutes</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={Number.isFinite(s.minutes) ? s.minutes : ''}
                    onChange={(e) => setSteps((all) => all.map((x, j) => (j === i ? { ...x, minutes: e.target.valueAsNumber } : x)))}
                    className={`${inputClass} px-3`}
                  />
                </label>
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.1em] text-white/80">Step {i + 1}</span>
                  <input value={s.title} onChange={(e) => setSteps((all) => all.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className={inputClass} />
                </label>
              </div>
              <label className="mt-2 block">
                <span className="sr-only">What happens in step {i + 1}</span>
                <textarea
                  id={`${base}-t${i}`}
                  rows={2}
                  value={s.text}
                  onChange={(e) => setSteps((all) => all.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  className={`${inputClass} resize-y py-2.5 leading-6`}
                />
              </label>
            </fieldset>
          ))}
          {error && (
            <p role="alert" className="font-inter text-[14px] font-semibold text-accent-soft">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="orange" icon="check" onClick={saveEdit}>
              Save and approve
            </Button>
            <Button
              variant="soft"
              onClick={() => {
                setSteps(plan.steps)
                setEditing(false)
                setError('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ol className="mt-5 flex flex-col gap-4">
            {plan.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 w-12 shrink-0 font-mono text-[13px] font-semibold text-accent-soft">{s.minutes} min</span>
                <span className="font-inter text-[15px] leading-6 text-white/85">
                  <span className="block font-semibold text-white">{s.title}</span>
                  {s.text}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-white/15 pt-5">
            {plan.approved ? (
              <Button variant="soft" icon="undo" onClick={() => approve(plan.id, false)}>
                Undo approval
              </Button>
            ) : (
              <Button
                variant="orange"
                icon="check"
                onClick={() => {
                  approve(plan.id)
                  notify('Review plan approved.')
                }}
              >
                Approve
              </Button>
            )}
            <Button variant="soft" icon="edit" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </>
      )}
    </Frame>
  )
}
