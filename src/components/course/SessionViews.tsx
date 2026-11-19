import { useState } from 'react'
import { longDay } from '../../lib/attendance'
import type { Book } from '../../lib/books'
import type { ClassSession } from '../../lib/courseDb'
import { sessionReading, todayAndNext } from '../../lib/sessionLinks'
import { Icon } from '../Icon'
import { Frame } from '../ui/Frame'
import { KindBadge } from './CourseBits'
import { sessionTitle } from './courseGate'

/** "Read pp. 40–52" linking to the section in the chapter PDF. Plain text while the link isn't available. */
export function ReadingLink({ book, links, session, className = '' }: { book: Book; links: Record<number, string> | null; session: Pick<ClassSession, 'kind' | 'chapter' | 'sectionId'>; className?: string }) {
  const r = sessionReading(book, links, session)
  if (!r) return null
  if (!r.href) return <span className={`inline-flex items-center gap-1 font-mono text-[13px] text-navy-soft ${className}`}>{r.label.replace(/^Read /, '')}</span>
  return (
    <a href={r.href} target="_blank" rel="noreferrer" className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] border-navy px-3 font-inter text-[14px] font-semibold text-navy hover:bg-navy hover:text-white ${className}`}>
      <Icon name="picture_as_pdf" className="text-[18px]" />
      {r.label}
      <span className="sr-only"> (opens the PDF in a new tab)</span>
    </a>
  )
}

/** One session as a block: kind, title, pages and the PDF link. */
export function SessionSummary({ book, links, session }: { book: Book; links: Record<number, string> | null; session: ClassSession }) {
  const t = sessionTitle(book, session)
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <KindBadge kind={session.kind} short />
        {session.startsAt && <span className="font-mono text-[12px] font-semibold text-navy-soft">{session.startsAt}</span>}
      </span>
      <span className="mt-2 block font-grotesk text-[22px] font-extrabold leading-tight tracking-[-0.01em]">{t.title}</span>
      {t.detail && <span className="mt-1 block font-inter text-[15px] text-navy-soft">{t.detail}</span>}
      <ReadingLink book={book} links={links} session={session} className="mt-4" />
    </>
  )
}

/** "Today" and "Next class" cards for students and parents. */
export function NowCards({ book, sessions, links, today, className = '' }: { book: Book; sessions: ClassSession[]; links: Record<number, string> | null; today: string; className?: string }) {
  const now = todayAndNext(sessions, today)
  return (
    <div className={`grid gap-6 md:grid-cols-2 ${className}`}>
      <Frame label="today.frame" className="h-full" bodyClassName="flex h-full flex-col p-6">
        <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">Today · {longDay(today)}</p>
        {now.today ? (
          <div className="mt-2 flex flex-1 flex-col items-start">
            <SessionSummary book={book} links={links} session={now.today} />
          </div>
        ) : (
          <p className="mt-2 font-inter text-[17px] leading-7">{now.cancelledToday ? 'Class is cancelled today.' : 'No class today.'}</p>
        )}
      </Frame>
      <Frame label="next.frame" className="h-full" bodyClassName="flex h-full flex-col p-6">
        <p className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-navy-soft">Next class{now.next ? ` · ${longDay(now.next.day)}` : ''}</p>
        {now.next ? (
          <div className="mt-2 flex flex-1 flex-col items-start">
            <SessionSummary book={book} links={links} session={now.next} />
          </div>
        ) : (
          <p className="mt-2 font-inter text-[17px] leading-7">No more classes on the calendar.</p>
        )}
      </Frame>
    </div>
  )
}

/**
 * Sessions grouped by month, one row each, with pages and PDF links. Read-only unless `onPick` is given
 * (then each row is a button). Past months are folded away behind "Show earlier classes".
 */
export function SessionMonths({
  book,
  sessions,
  links,
  today,
  onPick,
  marks,
}: {
  book: Book
  sessions: ClassSession[]
  links: Record<number, string> | null
  today: string
  onPick?: (s: ClassSession) => void
  /** Optional attendance per day, e.g. { '2026-11-12': 'absent' }. */
  marks?: Record<string, string>
}) {
  const [showPast, setShowPast] = useState(false)
  const thisMonth = today.slice(0, 7)
  const hiddenPast = sessions.filter((s) => s.day.slice(0, 7) < thisMonth).length
  const visible = showPast ? sessions : sessions.filter((s) => s.day.slice(0, 7) >= thisMonth)
  const months = new Map<string, ClassSession[]>()
  for (const s of visible) months.set(s.day.slice(0, 7), [...(months.get(s.day.slice(0, 7)) ?? []), s])

  return (
    <div className="flex flex-col gap-8">
      {hiddenPast > 0 && (
        <button type="button" onClick={() => setShowPast((v) => !v)} className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-4 font-inter text-[15px] font-semibold backdrop-blur-sm hover:bg-white">
          <Icon name={showPast ? 'expand_less' : 'history'} className="text-[20px]" />
          {showPast ? 'Hide earlier classes' : `Show earlier classes (${hiddenPast})`}
        </button>
      )}
      {months.size === 0 && <p className="w-fit rounded-xl bg-white/90 px-4 py-3 font-inter text-[16px] backdrop-blur-sm">No classes from this month on.</p>}
      {[...months.entries()].map(([month, list]) => {
        const [y, m] = month.split('-').map(Number)
        const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        return (
          <Frame key={month} label={`${month}.frame`} bodyClassName="px-3 py-2 md:px-5">
            <h3 className="px-1 pt-3 font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">{label}</h3>
            <ol className="divide-y divide-card-line">
              {list.map((s) => {
                const t = sessionTitle(book, s)
                const past = s.day < today
                const isToday = s.day === today
                const mark = marks?.[s.day]
                const body = (
                  <>
                    <span className="w-[4.5rem] shrink-0 font-mono text-[13px] font-semibold leading-5">
                      <span className="block text-navy-soft">{longDay(s.day).split(', ')[0]}</span>
                      {longDay(s.day).split(', ')[1]}
                      {isToday && <span className="block text-[11px] uppercase tracking-[0.1em] text-accent-strong">Today</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <KindBadge kind={s.kind} short />
                        {mark === 'absent' && <span className="rounded-full bg-[#FBE1D8] px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9C3412]">Missed</span>}
                        {s.startsAt && s.kind !== 'cancelled' && <span className="font-mono text-[12px] text-navy-soft">{s.startsAt}</span>}
                      </span>
                      <span className={`mt-1 block font-inter text-[15px] font-semibold leading-5 ${s.kind === 'cancelled' ? 'line-through' : ''}`}>{t.title}</span>
                      {t.detail && <span className="mt-0.5 block font-inter text-[14px] text-navy-soft">{t.detail}</span>}
                    </span>
                  </>
                )
                return (
                  <li key={s.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center ${past ? 'opacity-70' : ''}`}>
                    {onPick ? (
                      <button type="button" onClick={() => onPick(s)} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-xl p-1 text-left hover:bg-[#F3F7FC]">
                        {body}
                      </button>
                    ) : (
                      <span className="flex min-w-0 flex-1 items-start gap-3 p-1">{body}</span>
                    )}
                    {s.kind !== 'cancelled' && <ReadingLink book={book} links={links} session={s} className="ml-[5.25rem] w-fit shrink-0 sm:ml-0" />}
                  </li>
                )
              })}
            </ol>
          </Frame>
        )
      })}
    </div>
  )
}
