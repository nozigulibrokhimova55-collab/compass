import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import type { LiveStatus } from '../../lib/liveDb'
import { LETTERS } from './format'

/** The small pill that says where a live quiz is. */
export function StatusPill({ status, position, total }: { status: LiveStatus; position: number; total: number }) {
  const text =
    status === 'lobby' ? 'In the lobby' : status === 'open' ? `Question ${position} of ${total}` : status === 'revealed' ? `Question ${position} of ${total} · answer shown` : 'Ended'
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-navy backdrop-blur-sm">
      {status !== 'ended' && <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent-strong" />}
      {text}
    </span>
  )
}

type OptionBarsProps = {
  options: string[]
  counts: number[]
  /** Everyone who answered, for the percentages. */
  answered: number
  /** The right option, once it is shown. */
  correct?: number | null
  /** The option this student picked, if any. */
  mine?: number | null
  /** Hide the numbers and bars (e.g. while the teacher is projecting the screen). */
  hideCounts?: boolean
}

/** Every option with how many picked it. The right one turns green once `correct` is set. */
export function OptionBars({ options, counts, answered, correct = null, mine = null, hideCounts = false }: OptionBarsProps) {
  return (
    <ol className="grid gap-3">
      {options.map((option, i) => {
        const n = counts[i] ?? 0
        const pct = answered > 0 ? Math.round((n / answered) * 100) : 0
        const right = correct === i
        return (
          <li key={i} className={`relative overflow-hidden rounded-2xl border-2 ${right ? 'border-[#1F5C35] bg-[#E3F5EA]' : 'border-card-line bg-white'}`}>
            {!hideCounts && <span aria-hidden="true" className={`absolute inset-y-0 left-0 ${right ? 'bg-[#B9E4C8]' : 'bg-[#E3ECF7]'} transition-[width] duration-500`} style={{ width: `${pct}%` }} />}
            <div className="relative flex min-h-14 items-center gap-3 px-4 py-3 font-inter text-[17px] leading-6">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] border-navy/40 bg-white/70 font-mono text-[14px] font-semibold">{LETTERS[i]}</span>
              <span className="min-w-0 flex-1">
                {option}
                {mine === i && <span className="ml-2 rounded-full bg-navy px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white">You</span>}
              </span>
              {right && <Icon name="check_circle" filled className="shrink-0 text-[22px] text-[#1F5C35]" />}
              {!hideCounts && (
                <span className="shrink-0 font-mono text-[14px] font-semibold tabular-nums">
                  {n}
                  <span className="sr-only"> {n === 1 ? 'student' : 'students'}</span>
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** A short line in a tinted box: green for good news, orange for a miss, blue for neutral. */
export function Callout({ tone, icon, children }: { tone: 'good' | 'miss' | 'info'; icon: string; children: ReactNode }) {
  const style = tone === 'good' ? 'bg-[#E3F5EA] text-[#1F5C35]' : tone === 'miss' ? 'bg-[#FBE1D8] text-[#9C3412]' : 'bg-[#E3ECF7] text-navy'
  return (
    <p className={`flex items-start gap-2 rounded-2xl px-4 py-3 font-inter text-[16px] font-semibold leading-6 ${style}`}>
      <Icon name={icon} filled className="mt-0.5 shrink-0 text-[22px]" />
      <span>{children}</span>
    </p>
  )
}
