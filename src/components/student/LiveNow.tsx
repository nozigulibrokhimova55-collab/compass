import { Link } from 'react-router-dom'
import { Icon } from '../Icon'
import { useRunningSession } from '../../lib/useLive'

/** "Live now" card for the top of a student page. Shows nothing when the class has no live quiz running. */
export function LiveNow() {
  const { data } = useRunningSession(null, 'student')
  if (!data) return null
  return (
    <Link
      to={`/student/live/${data.id}`}
      className="mt-6 flex min-h-[72px] max-w-2xl items-center gap-4 rounded-3xl bg-navy px-5 py-4 text-white shadow-card transition-transform active:scale-[0.99]"
    >
      <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-accent-strong">
        <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-accent-strong/50 motion-reduce:hidden" />
        <Icon name="sensors" className="relative text-[24px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-accent-soft">{data.status === 'lobby' ? 'Starting soon' : 'Live now'}</span>
        <span className="block truncate font-grotesk text-[20px] font-extrabold leading-tight tracking-[-0.01em]">{data.title}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 font-inter text-[15px] font-semibold">
        Join
        <Icon name="arrow_forward" className="text-[20px]" />
      </span>
    </Link>
  )
}
