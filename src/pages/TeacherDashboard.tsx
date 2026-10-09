import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { APPROVALS, COHORTS, FREE_RESPONSES, type Activity, type Cohort } from '../lib/data'
import { useSession } from '../lib/session'

const card = 'bg-surface-container-lowest rounded-2xl shadow-sm'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function ActivityRow({
  index,
  activity,
  approved,
  onApprove,
  onSave,
}: {
  index: number
  activity: Activity
  approved: boolean
  onApprove: () => void
  onSave: (a: Activity) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(activity)

  return (
    <div className="p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-space-md">
      <div className="flex items-start gap-space-md flex-1 min-w-0">
        <span
          className={`w-8 h-8 rounded-full font-title-sm text-title-sm font-bold flex items-center justify-center shrink-0 transition-colors ${
            approved ? 'bg-primary text-on-primary' : 'bg-secondary-container text-primary'
          }`}
        >
          {approved ? <Icon name="check" className="text-[18px]" /> : index + 1}
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-space-sm mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wide text-primary font-bold">
              {activity.duration}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-highest text-secondary">
              {activity.tag}
            </span>
          </div>
          {editing ? (
            <form
              className="flex flex-col gap-space-sm mt-space-xs"
              onSubmit={(e) => {
                e.preventDefault()
                onSave(draft)
                setEditing(false)
              }}
            >
              <label className="sr-only" htmlFor={`${activity.id}-title`}>
                Activity title
              </label>
              <input
                id={`${activity.id}-title`}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full px-space-sm py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant font-title-sm text-title-sm focus:outline-none focus:border-tertiary-container focus:ring-2 focus:ring-primary/20"
              />
              <label className="sr-only" htmlFor={`${activity.id}-desc`}>
                Activity description
              </label>
              <textarea
                id={`${activity.id}-desc`}
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full px-space-sm py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant font-body-sm text-body-sm focus:outline-none focus:border-tertiary-container focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-space-sm">
                <button
                  type="submit"
                  className="bg-primary text-on-primary hover:bg-primary-container px-space-md py-space-xs rounded-lg font-label-md text-label-md"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(activity)
                    setEditing(false)
                  }}
                  className="px-space-md py-space-xs rounded-lg font-label-md text-label-md text-secondary hover:text-primary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h3 className="font-title-sm text-title-sm text-on-surface">{activity.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 max-w-xl">{activity.description}</p>
            </>
          )}
        </div>
      </div>
      {!editing && (
        <div className="flex items-center gap-space-sm self-end 2xl:self-center shrink-0">
          {!approved && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-space-md py-space-xs rounded-lg font-label-md text-label-md text-secondary hover:text-primary transition-colors"
            >
              Edit activity
            </button>
          )}
          <button
            type="button"
            onClick={onApprove}
            aria-pressed={approved}
            className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md shadow-sm transition-all active:scale-95 inline-flex items-center gap-1 ${
              approved
                ? 'bg-secondary-fixed text-primary hover:bg-secondary-fixed-dim'
                : 'bg-primary text-on-primary hover:bg-primary-container'
            }`}
          >
            {approved && <Icon name="check" className="text-[14px]" />}
            {approved ? 'Approved' : 'Approve'}
          </button>
        </div>
      )}
    </div>
  )
}

function DiagnosticHero({ cohort, onReviewPlan }: { cohort: Cohort; onReviewPlan: () => void }) {
  const d = cohort.diagnostic
  if (!d) {
    return (
      <article className={`${card} p-space-xl flex flex-col items-start gap-space-md`}>
        <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-[#EAF3EB] text-[#4F6D54] font-label-sm text-label-sm font-bold uppercase tracking-wider">
          <Icon name="check_circle" className="text-[14px]" filled />
          No open misconceptions
        </span>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary max-w-2xl">
          {cohort.shortName} is on solid ground.
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
          The last diagnostic on <em>{cohort.unit}</em> was reviewed and synced. Create a new quiz when you are ready for
          the next checkpoint.
        </p>
      </article>
    )
  }
  const pct = Math.round((d.affected / d.completed) * 100)
  return (
    <article className={`${card} p-space-lg md:p-space-xl relative overflow-hidden`}>
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-secondary-container/40 blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-space-lg">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
              Needs your attention
            </span>
            <span className="text-secondary font-label-md text-label-md">•</span>
            <span className="font-label-md text-label-md text-secondary">{d.quiz}</span>
          </div>
          <span className="font-label-sm text-label-sm text-secondary bg-surface-container px-space-sm py-1 rounded-md">
            {d.subject} • {d.completed} students completed
          </span>
        </div>
        <div className="flex flex-col gap-space-xs">
          <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-widest">
            Root Misconception Identified
          </span>
          <blockquote className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary leading-tight max-w-2xl">
            “{d.misconception}”
          </blockquote>
        </div>
        <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-space-xs">
            <p className="font-title-sm text-title-sm text-on-surface">
              <span className="font-bold text-primary">
                {d.affected} of {d.completed} students ({pct}%)
              </span>{' '}
              had this misconception on {d.questions}.
            </p>
            <span className="font-label-sm text-label-sm text-secondary">{d.bias}</span>
          </div>
          <div
            className="w-full h-3 rounded-full bg-secondary-container overflow-hidden flex"
            role="img"
            aria-label={`${pct}% of students show this misconception`}
          >
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-space-sm items-center justify-between font-label-sm text-label-sm text-secondary">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              {pct}% {d.flawLabel}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim inline-block" />
              {100 - pct}% {d.otherLabel}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-xs">
          <div className="flex flex-wrap items-center gap-space-md">
            <button
              type="button"
              onClick={onReviewPlan}
              className="bg-primary hover:bg-primary-container text-on-primary px-space-lg py-space-sm rounded-full font-title-sm text-title-sm flex items-center gap-space-sm shadow transition-all hover:scale-[1.02]"
            >
              <Icon name="checklist" className="text-[18px]" />
              <span>Review plan</span>
            </button>
            <Link
              to="/app/radar"
              className="bg-secondary-container hover:bg-secondary-fixed-dim text-primary px-space-lg py-space-sm rounded-full font-title-sm text-title-sm transition-colors"
            >
              View detailed report
            </Link>
          </div>
          <span className="font-body-sm text-body-sm text-secondary flex items-center gap-1">
            <Icon name="psychology" className="text-[16px] text-primary" />
            Diagnostic Confidence: {d.confidence}
          </span>
        </div>
      </div>
    </article>
  )
}

function CreateQuizModal({ open, onClose, cohort }: { open: boolean; onClose: () => void; cohort: Cohort }) {
  const notify = useToast()
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState(8)
  const [format, setFormat] = useState('mixed')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    notify(`“${title || 'Untitled diagnostic'}” drafted for ${cohort.shortName}`, 'quiz')
    setTitle('')
    onClose()
  }

  const field =
    'w-full px-4 py-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md focus:outline-none focus:border-tertiary-container focus:ring-2 focus:ring-primary/20'

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={cohort.name}
      title="Create a diagnostic quiz"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-space-md py-space-sm rounded-lg font-title-sm text-title-sm text-primary hover:underline"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-quiz"
            className="bg-primary hover:bg-primary-container text-on-primary px-space-lg py-space-sm rounded-lg font-title-sm text-title-sm inline-flex items-center gap-space-xs"
          >
            <Icon name="auto_awesome" className="text-[18px]" />
            Draft quiz
          </button>
        </>
      }
    >
      <form id="create-quiz" onSubmit={submit} className="flex flex-col gap-space-md">
        <div>
          <label htmlFor="quiz-title" className="block font-label-md text-label-md text-on-surface mb-1.5">
            Quiz title
          </label>
          <input
            id="quiz-title"
            className={field}
            placeholder={`e.g. ${cohort.unit} checkpoint`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-space-md">
          <div>
            <label htmlFor="quiz-count" className="block font-label-md text-label-md text-on-surface mb-1.5">
              Questions
            </label>
            <input
              id="quiz-count"
              type="number"
              min={3}
              max={25}
              className={field}
              value={questions}
              onChange={(e) => setQuestions(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="quiz-format" className="block font-label-md text-label-md text-on-surface mb-1.5">
              Format
            </label>
            <select id="quiz-format" className={field} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="mixed">Mixed</option>
              <option value="mc">Multiple choice</option>
              <option value="frq">Free response</option>
            </select>
          </div>
        </div>
        <p className="font-body-sm text-body-sm text-secondary flex gap-space-xs">
          <Icon name="info" className="text-[16px] mt-0.5" />
          Every distractor is mapped to a known misconception, so wrong answers tell you <em>why</em>.
        </p>
      </form>
    </Modal>
  )
}

function FreeResponseModal({ open, onClose, onApprove }: { open: boolean; onClose: () => void; onApprove: () => void }) {
  const tone: Record<string, string> = {
    'Edge case': 'bg-[#F8E6DD] text-[#C3643B]',
    Mastery: 'bg-[#EAF3EB] text-[#4F6D54]',
    Review: 'bg-secondary-container text-primary-container',
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Free Response AI Diagnostic · Period 3"
      title="Newton’s 3rd Law responses"
      footer={
        <button
          type="button"
          onClick={onApprove}
          className="bg-primary hover:bg-primary-container text-on-primary px-space-lg py-space-sm rounded-lg font-title-sm text-title-sm inline-flex items-center gap-space-xs"
        >
          <Icon name="verified" className="text-[18px]" />
          Approve all diagnoses
        </button>
      }
    >
      <ul className="flex flex-col divide-y divide-[#EED4D7]">
        {FREE_RESPONSES.map((r) => (
          <li key={r.student} className="py-space-md flex flex-col gap-space-xs">
            <div className="flex items-center justify-between gap-space-sm">
              <span className="font-title-sm text-title-sm text-on-surface">{r.student}</span>
              <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm ${tone[r.flag]}`}>{r.flag}</span>
            </div>
            <p className="font-headline-sm text-[17px] leading-snug italic text-on-surface-variant">“{r.answer}”</p>
            <p className="font-body-sm text-body-sm text-secondary">{r.note}</p>
          </li>
        ))}
      </ul>
      <p className="font-body-sm text-body-sm text-secondary pt-space-sm">+ 3 more responses with consistent diagnoses.</p>
    </Modal>
  )
}

export default function TeacherDashboard() {
  const { user } = useSession()
  const notify = useToast()
  const navigate = useNavigate()
  const planRef = useRef<HTMLElement>(null)

  const [cohortId, setCohortId] = useState(COHORTS[0].id)
  const cohort = COHORTS.find((c) => c.id === cohortId) ?? COHORTS[0]

  const [plans, setPlans] = useState<Record<string, Activity[]>>(() =>
    Object.fromEntries(COHORTS.map((c) => [c.id, c.plan])),
  )
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState(APPROVALS)
  const [quizOpen, setQuizOpen] = useState(false)
  const [frqOpen, setFrqOpen] = useState(false)

  const plan = plans[cohort.id]
  const allApproved = plan.length > 0 && plan.every((a) => approved.has(a.id))

  const toggleApproved = (id: string) =>
    setApproved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const approveAll = () => {
    setApproved((prev) => new Set([...prev, ...plan.map((a) => a.id)]))
    notify(`Plan confirmed for ${cohort.next.replace('Tomorrow ', 'tomorrow, ')}`)
  }

  const resolve = (id: string) => {
    const item = pending.find((p) => p.id === id)
    setPending((p) => p.filter((x) => x.id !== id))
    if (item) notify(item.done)
  }

  const onApprovalAction = (id: string) => {
    if (id === 'frq') setFrqOpen(true)
    else if (id === 'family') navigate('/app/family')
    else resolve(id)
  }

  // "Dr. Eleanor Vance" → "Dr. Vance"; "Jane Doe" → "Jane"
  const parts = user.name.trim().split(/\s+/)
  const honorific = parts[0].endsWith('.') && parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0]

  return (
    <div className="flex flex-col w-full pb-space-xl max-w-[1360px] mx-auto">
      {/* Context header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-xl pt-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm text-secondary">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Diagnostic Workspace</span>
            <span aria-hidden="true">/</span>
            <span className="font-label-sm text-label-sm text-primary font-bold">Fall Term</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight">
            {greeting()}, {honorific}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
            {cohort.status.tone === 'alert'
              ? `Diagnostic review flagged an active hurdle in ${cohort.shortName} ahead of tomorrow’s class.`
              : `${cohort.shortName} is on track for ${cohort.next.toLowerCase()}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-md">
          <label className="relative bg-surface-container-low px-space-md py-space-sm rounded-xl shadow-sm flex items-center gap-space-md cursor-pointer">
            <Icon name="layers" className="text-primary text-[20px]" />
            <span className="flex flex-col pr-space-md">
              <span className="font-label-sm text-label-sm text-secondary uppercase">Active Cohort</span>
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                className="appearance-none bg-transparent font-title-sm text-title-sm text-on-surface font-semibold focus:outline-none cursor-pointer pr-space-lg"
              >
                {COHORTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </span>
            <Icon name="expand_more" className="text-secondary text-[18px] absolute right-space-md pointer-events-none" />
          </label>
          <button
            type="button"
            onClick={() => setQuizOpen(true)}
            className="bg-primary hover:bg-primary-container text-on-primary px-space-lg py-space-md rounded-xl font-title-sm text-title-sm flex items-center gap-space-sm shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Icon name="add" className="text-[20px]" />
            <span>Create quiz</span>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        {/* Main diagnostic thread */}
        <div className="lg:col-span-7 2xl:col-span-8 flex flex-col gap-space-xl">
          <DiagnosticHero
            key={cohort.id}
            cohort={cohort}
            onReviewPlan={() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />

          {plan.length > 0 && (
            <section ref={planRef} className={`${card} p-space-lg md:p-space-xl flex flex-col gap-space-lg scroll-mt-24`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-sm">
                <div>
                  <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wider mb-1">
                    <Icon name="auto_fix_high" className="text-[16px] text-primary" />
                    <span>Targeted Remediation Sequence</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">Suggested review for next lesson</h2>
                  <p className="font-body-sm text-body-sm text-secondary">
                    {plan.length === 3 ? '15' : '10'}-minute warmup sequence engineered for {cohort.next.toLowerCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={approveAll}
                  disabled={allApproved}
                  className={`px-space-md py-space-sm rounded-lg font-title-sm text-title-sm flex items-center gap-space-xs shadow-sm self-start sm:self-auto transition-all ${
                    allApproved
                      ? 'bg-secondary-fixed text-primary cursor-default'
                      : 'bg-primary hover:bg-primary-container text-on-primary hover:-translate-y-0.5'
                  }`}
                >
                  <Icon name={allApproved ? 'check_circle' : 'verified'} className="text-[18px]" />
                  <span>{allApproved ? `Plan confirmed for ${cohort.next.split(' ').slice(1).join(' ')}` : 'Approve full plan'}</span>
                </button>
              </div>
              <div className="flex flex-col gap-space-md">
                {plan.map((a, i) => (
                  <ActivityRow
                    key={a.id}
                    index={i}
                    activity={a}
                    approved={approved.has(a.id)}
                    onApprove={() => toggleApproved(a.id)}
                    onSave={(next) => {
                      setPlans((p) => ({ ...p, [cohort.id]: p[cohort.id].map((x) => (x.id === next.id ? next : x)) }))
                      notify('Activity updated')
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="bg-surface-container p-space-lg rounded-2xl flex flex-col md:flex-row items-center gap-space-lg">
            <img
              src="/images/students-air-table.jpg"
              alt="High school students gathered around an air puck table observing motion"
              className="w-full md:w-44 h-32 rounded-xl object-cover shrink-0 shadow-inner"
            />
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm uppercase text-secondary font-bold">Research Backing</span>
              <h3 className="font-headline-sm text-headline-sm text-primary">
                Inquiry-based labs resolve misconceptions 3x faster than rote drilling.
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Hands-on experiments help students replace the intuition that force always follows motion within a single
                class session.
              </p>
            </div>
          </div>
        </div>

        {/* Right column: approvals & classes */}
        <div className="lg:col-span-5 2xl:col-span-4 flex flex-col gap-space-xl">
          <section className={`${card} p-space-lg md:p-space-xl flex flex-col gap-space-lg`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <Icon name="pending_actions" className="text-primary text-[22px]" />
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Waiting for approval</h2>
              </div>
              <span className="min-w-6 h-6 px-1.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold flex items-center justify-center">
                {pending.length}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary -mt-space-sm">
              Teacher sign-off confirms diagnostic clarity before student and family delivery.
            </p>
            <div className="flex flex-col gap-space-md">
              {pending.length === 0 && (
                <div className="p-space-lg rounded-xl bg-surface-container-low text-center flex flex-col items-center gap-space-xs">
                  <Icon name="task_alt" className="text-[28px] text-[#4F6D54]" />
                  <p className="font-title-sm text-title-sm text-on-surface">You’re all caught up</p>
                  <p className="font-body-sm text-body-sm text-secondary">New diagnostics will appear here.</p>
                </div>
              )}
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="animate-fade-up p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-start justify-between gap-space-sm">
                    <span className="font-label-sm text-label-sm uppercase text-secondary font-bold">{item.kind}</span>
                    <span className="text-[11px] font-semibold text-secondary whitespace-nowrap">{item.meta}</span>
                  </div>
                  <p className="font-title-sm text-title-sm text-on-surface">{item.title}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{item.detail}</p>
                  <button
                    type="button"
                    onClick={() => onApprovalAction(item.id)}
                    className={`mt-space-xs w-full py-space-xs px-space-md rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all ${
                      item.primary
                        ? 'bg-primary hover:bg-primary-container text-on-primary shadow-sm'
                        : 'bg-secondary-container hover:bg-secondary-fixed-dim text-primary'
                    }`}
                  >
                    <span>{item.action}</span>
                    <Icon name={item.actionIcon} className="text-[16px]" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={`${card} p-space-lg md:p-space-xl flex flex-col gap-space-lg`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <Icon name="school" className="text-primary text-[22px]" />
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Your classes</h2>
              </div>
              <Link to="/app/reflections" className="font-label-sm text-label-sm text-primary hover:underline">
                All rosters
              </Link>
            </div>
            <div className="flex flex-col gap-space-md">
              {COHORTS.map((c) => {
                const active = c.id === cohortId
                const badge =
                  c.status.tone === 'alert'
                    ? 'bg-error-container text-on-error-container font-bold'
                    : c.status.tone === 'clear'
                      ? 'bg-secondary-fixed text-on-secondary-fixed font-semibold'
                      : 'bg-surface-container-highest text-secondary font-semibold'
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCohortId(c.id)}
                    aria-pressed={active}
                    className="text-left p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-xs relative overflow-hidden"
                  >
                    {active && <span className="w-1.5 h-full absolute left-0 top-0 bg-primary" />}
                    <span className="pl-space-sm flex items-start justify-between gap-space-sm w-full">
                      <span>
                        <span className="block font-title-sm text-title-sm text-on-surface">{c.shortName}</span>
                        <span className="font-body-sm text-body-sm text-secondary">
                          {c.students} students • {c.status.tone === 'alert' ? 'Next: ' : ''}
                          {c.next}
                        </span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${badge}`}>{c.status.label}</span>
                    </span>
                    <span className="pl-space-sm pt-space-xs flex items-center justify-between gap-space-sm w-full text-secondary font-label-sm text-label-sm">
                      <span>{c.unit}</span>
                      <span className={c.status.tone === 'alert' ? 'text-primary font-semibold' : 'font-medium'}>
                        {c.statusDetail}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <Link
              to="/app/curriculum"
              className="group relative rounded-xl overflow-hidden h-28 w-full bg-cover bg-center mt-space-xs block"
              style={{ backgroundImage: "url('/images/lab-lounge.jpg')" }}
            >
              <span className="absolute inset-0 bg-primary/40 backdrop-blur-[2px] flex items-center justify-between p-space-md text-on-primary">
                <span className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed">Faculty Lounge</span>
                  <span className="font-headline-sm text-headline-sm">Curriculum Map Ready</span>
                </span>
                <Icon name="chevron_right" className="text-[24px] transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </section>
        </div>
      </div>

      <CreateQuizModal open={quizOpen} onClose={() => setQuizOpen(false)} cohort={cohort} />
      <FreeResponseModal
        open={frqOpen}
        onClose={() => setFrqOpen(false)}
        onApprove={() => {
          setFrqOpen(false)
          resolve('frq')
        }}
      />
    </div>
  )
}
