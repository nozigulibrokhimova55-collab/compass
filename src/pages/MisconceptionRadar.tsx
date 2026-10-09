import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { MISCONCEPTIONS, type Misconception } from '../lib/data'

const TREND: Record<Misconception['trend'], { icon: string; label: string; className: string }> = {
  rising: { icon: 'trending_up', label: 'Rising', className: 'text-[#A4502C]' },
  steady: { icon: 'trending_flat', label: 'Steady', className: 'text-secondary' },
  resolving: { icon: 'trending_down', label: 'Resolving', className: 'text-[#4F6D54]' },
}

const COHORT_FILTERS = ['All cohorts', 'AP Physics 1 · P3', 'Honors Chemistry · P5', 'Introductory Physics · P1']

function MisconceptionCard({ m }: { m: Misconception }) {
  const notify = useToast()
  const [open, setOpen] = useState(m.trend === 'rising')
  const [assigned, setAssigned] = useState(false)
  const trend = TREND[m.trend]

  return (
    <article className="bg-surface-container-lowest rounded-2xl border border-[#EED4D7] shadow-[0_4px_20px_-2px_rgba(102,18,20,0.04),0_2px_6px_-1px_rgba(102,18,20,0.02)] hover:shadow-[0_12px_32px_-4px_rgba(102,18,20,0.08),0_4px_12px_-2px_rgba(102,18,20,0.04)] transition-shadow overflow-hidden">
      <div className="p-space-lg flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
            {m.cohort} · <em className="not-italic text-primary">{m.topic}</em>
          </span>
          <span className={`inline-flex items-center gap-1 font-label-md text-label-md ${trend.className}`}>
            <Icon name={trend.icon} className="text-[16px]" />
            {trend.label}
          </span>
        </div>
        <div className="flex items-start justify-between gap-space-md">
          <h2 className="font-headline-md text-headline-md text-on-surface">{m.title}</h2>
          <div className="text-right shrink-0">
            <span className="block font-headline-md text-headline-md text-primary">{m.share}%</span>
            <span className="font-label-sm text-label-sm text-secondary">of cohort</span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary-container overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-primary" style={{ width: `${m.share}%` }} />
        </div>
        <div className="flex flex-wrap gap-space-xs">
          {m.students.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              {s}
            </span>
          ))}
          {m.share > 30 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm">
              + more
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-space-lg py-space-sm bg-surface-container-low hover:bg-surface-container font-label-md text-label-md text-primary"
      >
        <span className="flex items-center gap-space-xs">
          <Icon name="psychology" className="text-[16px]" />
          Details
        </span>
        <Icon name="expand_more" className={`text-[18px] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="animate-fade-up bg-[#FFF7F8] px-space-lg py-space-md flex flex-col gap-space-md">
          <div className="grid sm:grid-cols-2 gap-space-md">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">What students did</span>
              <p className="font-body-sm text-body-sm text-on-surface mt-1">{m.observed}</p>
            </div>
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#A4502C]">Why it happens</span>
              <p className="font-body-sm text-body-sm text-on-surface mt-1">{m.flaw}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm p-space-sm pl-space-md rounded-xl bg-surface-container-lowest">
            <span className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface">
              <Icon name="science" className="text-[18px] text-primary" />
              {m.pathway}
            </span>
            <button
              type="button"
              disabled={assigned}
              onClick={() => {
                setAssigned(true)
                notify(`Assigned to ${m.students.length} student${m.students.length > 1 ? 's' : ''}`)
              }}
              className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md inline-flex items-center justify-center gap-1 transition-colors ${
                assigned ? 'bg-secondary-fixed text-primary' : 'bg-primary text-on-primary hover:bg-primary-container'
              }`}
            >
              <Icon name={assigned ? 'check' : 'assignment_add'} className="text-[16px]" />
              {assigned ? 'Assigned' : 'Assign'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

export default function MisconceptionRadar() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [cohort, setCohort] = useState(COHORT_FILTERS[0])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MISCONCEPTIONS.filter((m) => cohort === COHORT_FILTERS[0] || m.cohort === cohort).filter(
      (m) =>
        !q ||
        [m.title, m.topic, m.cohort, m.flaw, ...m.students].some((f) => f.toLowerCase().includes(q)),
    )
  }, [query, cohort])

  return (
    <div className="flex flex-col w-full pb-space-xl max-w-[1360px] mx-auto">
      <PageHeader
        eyebrow="Misconception Radar"
        title="Misconceptions by class"
        description="Common wrong ideas in your classes, who has them, and a suggested fix."
      />

      <div className="flex flex-col md:flex-row md:items-center gap-space-md mb-space-lg">
        <div role="radiogroup" aria-label="Filter by cohort" className="flex flex-wrap gap-space-xs">
          {COHORT_FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cohort === c}
              onClick={() => setCohort(c)}
              className={`px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors ${
                cohort === c ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline" />
          <input
            type="search"
            aria-label="Search misconceptions or students"
            value={query}
            onChange={(e) => {
              const v = e.target.value
              setParams(v ? { q: v } : {}, { replace: true })
            }}
            placeholder="Search concepts or students…"
            className="w-full bg-surface-container-lowest pl-10 pr-4 py-2 rounded-lg font-body-sm text-body-sm border border-outline-variant focus:outline-none focus:border-tertiary-container focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {results.length === 0 ? (
        <div className="py-space-xl text-center flex flex-col items-center gap-space-sm bg-surface-container-low rounded-3xl">
          <Icon name="travel_explore" className="text-[32px] text-outline" />
          <p className="font-title-sm text-title-sm text-on-surface">No misconceptions match “{query}”</p>
          <button
            type="button"
            onClick={() => {
              setParams({})
              setCohort(COHORT_FILTERS[0])
            }}
            className="font-label-md text-label-md text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">
          {results.map((m) => (
            <MisconceptionCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  )
}
