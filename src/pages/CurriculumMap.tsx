import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { UNITS, type Unit } from '../lib/data'

const UNIT_STATUS: Record<Unit['status'], { label: string; icon: string; node: string }> = {
  complete: { label: 'Complete', icon: 'check', node: 'bg-[#4F6D54] text-on-primary' },
  active: { label: 'In progress', icon: 'radio_button_checked', node: 'bg-primary text-on-primary ring-4 ring-secondary-container' },
  upcoming: { label: 'Upcoming', icon: 'schedule', node: 'bg-surface-container-highest text-secondary' },
}

export default function CurriculumMap() {
  const [openId, setOpenId] = useState(UNITS.find((u) => u.status === 'active')?.id ?? UNITS[0].id)

  return (
    <div className="flex flex-col w-full pb-space-xl max-w-[1360px] mx-auto">
      <PageHeader
        eyebrow="Curriculum Map"
        title="AP Physics 1"
        description="Progress by unit. Open a unit to see which topics need work."
        actions={
          <div className="flex flex-wrap gap-space-sm">
            <StatusBadge status="mastery" />
            <StatusBadge status="review" />
            <StatusBadge status="misconception" />
          </div>
        }
      />

      <ol className="relative flex flex-col gap-space-md">
        <span aria-hidden="true" className="absolute left-[19px] top-4 bottom-4 w-px bg-[#EED4D7]" />
        {UNITS.map((u) => {
          const status = UNIT_STATUS[u.status]
          const open = openId === u.id
          const flagged = u.concepts.filter((c) => c.state === 'misconception').length
          return (
            <li key={u.id} className="relative pl-14">
              <span
                className={`absolute left-0 top-space-lg w-10 h-10 rounded-full flex items-center justify-center ${status.node}`}
                aria-hidden="true"
              >
                <Icon name={status.icon} className="text-[18px]" />
              </span>
              <div
                className={`rounded-2xl transition-all ${
                  open
                    ? 'bg-surface-container-lowest shadow-[0_12px_32px_-4px_rgba(102,18,20,0.08),0_4px_12px_-2px_rgba(102,18,20,0.04)]'
                    : 'bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? '' : u.id)}
                  className="w-full text-left p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
                      {u.weeks} · {status.label}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface">{u.title}</span>
                  </span>
                  <span className="flex items-center gap-space-md">
                    {flagged > 0 && (
                      <StatusBadge status="misconception" label={`${flagged} misconception${flagged > 1 ? 's' : ''}`} />
                    )}
                    {u.status !== 'upcoming' && (
                      <span className="flex items-center gap-space-sm">
                        <span className="w-24 h-2 rounded-full bg-secondary-container overflow-hidden" aria-hidden="true">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${u.mastery}%` }} />
                        </span>
                        <span className="font-label-md text-label-md text-primary w-20">{u.mastery}% mastery</span>
                      </span>
                    )}
                    <Icon name="expand_more" className={`text-[20px] text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {open && (
                  <div className="animate-fade-up px-space-lg pb-space-lg flex flex-col gap-space-md">
                    <ul className="grid sm:grid-cols-2 gap-space-sm">
                      {u.concepts.map((c) => (
                        <li key={c.name} className="flex items-center justify-between gap-space-sm p-space-md rounded-xl bg-[#FFF7F8]">
                          <span className="font-body-md text-body-md text-on-surface">{c.name}</span>
                          <StatusBadge status={c.state} label={c.state === 'review' ? 'Review' : undefined} />
                        </li>
                      ))}
                    </ul>
                    {flagged > 0 && (
                      <Link
                        to="/app/radar"
                        className="self-start inline-flex items-center gap-space-xs font-label-md text-label-md text-primary hover:underline"
                      >
                        See misconceptions
                        <Icon name="arrow_forward" className="text-[16px]" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
