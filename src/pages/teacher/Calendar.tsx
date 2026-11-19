import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookAttribution } from '../../components/course/CourseBits'
import { courseGate, sessionTitle, useTeacherClass } from '../../components/course/courseGate'
import { SessionMonths, SessionSummary } from '../../components/course/SessionViews'
import { Icon } from '../../components/Icon'
import { BackLink } from '../../components/student/QuizRunner'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { EmptyState } from '../../components/ui/EmptyState'
import { Field, TextInput } from '../../components/ui/Field'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { longDay } from '../../lib/attendance'
import type { Book } from '../../lib/books'
import { activeOn, addSession, cancelSession, changeClassDays, dayNames, EditError, moveSession, removeReview, weekdayOf, type CalRow, type EditResult } from '../../lib/calendarEdit'
import { saveCalendar, type ClassSession, type SavedSchedule } from '../../lib/courseDb'
import { errorMessage } from '../../lib/db'
import { addDaysIso, fromIso, isIsoDate, toIso, type ScheduleSettings, type SessionKind } from '../../lib/schedulePlan'
import { sessionReading } from '../../lib/sessionLinks'
import { usePdfLinks } from '../../lib/useCalendars'
import { useCourse } from '../../lib/useCourse'
import { useToday } from '../../lib/useToday'

const WEEKDAYS = [
  { n: 1, short: 'Mon', long: 'Monday' },
  { n: 2, short: 'Tue', long: 'Tuesday' },
  { n: 3, short: 'Wed', long: 'Wednesday' },
  { n: 4, short: 'Thu', long: 'Thursday' },
  { n: 5, short: 'Fri', long: 'Friday' },
  { n: 6, short: 'Sat', long: 'Saturday' },
  { n: 0, short: 'Sun', long: 'Sunday' },
]

const CHIP: Record<SessionKind, string> = {
  lesson: 'border-[#B9D6F5] bg-[#E6F1FD]',
  chapter_quiz: 'border-[#F3B9A6] bg-[#FBE1D8]',
  review: 'border-[#E8CFA6] bg-note',
  cancelled: 'border-dashed border-card-line bg-white text-navy-soft',
}

export default function TeacherCalendar() {
  const t = useTeacherClass()
  const course = useCourse(t.cls?.id)
  if (!t.ok) return t.screen
  const cls = t.cls
  const gate = courseGate(course)

  return (
    <>
      <BackLink to="/teacher/class">Class</BackLink>
      <SectionHeader as="h1" size="sm" align="left" script="the term" title="Calendar" className="mt-6" />
      {gate ??
        (!course.book ? (
          <EmptyState label="calendar.frame" icon="menu_book" title="Pick the textbook first" className="mt-10 max-w-xl" action={{ label: 'Choose course materials', to: `/teacher/class/${cls.id}/materials` }}>
            The calendar is built from the book’s chapters and sections.
          </EmptyState>
        ) : !course.schedule || course.sessions.length === 0 ? (
          <EmptyState label="calendar.frame" icon="calendar_month" title="No calendar yet" className="mt-10 max-w-xl" action={{ label: 'Set up the schedule', to: `/teacher/class/${cls.id}/schedule` }}>
            Pick your dates, class days and chapters, and Compass lays out the term.
          </EmptyState>
        ) : (
          <CalendarEditor classId={cls.id} className={cls.name} book={course.book} schedule={course.schedule} sessions={course.sessions} reload={course.reload} />
        ))}
    </>
  )
}

type Open = { type: 'session'; day: string } | { type: 'add'; day: string | null } | { type: 'days' } | null
type Undo = { message: string; rows: CalRow[]; settings: ScheduleSettings }

const toRow = (s: ClassSession): CalRow => ({ day: s.day, kind: s.kind, chapter: s.chapter, sectionId: s.sectionId, part: s.part, parts: s.parts })
const mondayOf = (day: string) => addDaysIso(day, -((weekdayOf(day) + 6) % 7))
const monthOf = (day: string) => `${day.slice(0, 7)}-01`
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function CalendarEditor({ classId, className, book, schedule, sessions, reload }: { classId: string; className: string; book: Book; schedule: SavedSchedule; sessions: ClassSession[]; reload: () => Promise<void> }) {
  const notify = useToast()
  const today = toIso(useToday())
  const { links, unavailable } = usePdfLinks(book)
  const settings: ScheduleSettings = useMemo(
    () => ({ startDate: schedule.startDate, endDate: schedule.endDate, classDays: schedule.classDays, classTime: schedule.classTime, noClassDates: schedule.noClassDates, chapters: schedule.chapters, squeeze: schedule.squeeze }),
    [schedule],
  )
  const rows = useMemo(() => sessions.map(toRow), [sessions])
  const byDay = useMemo(() => {
    const m = new Map<string, ClassSession>()
    // A real class wins over a cancelled marker on the same day.
    for (const s of sessions) if (!m.has(s.day) || s.kind !== 'cancelled') m.set(s.day, s)
    return m
  }, [sessions])

  const first = sessions[0].day
  const [view, setView] = useState<'month' | 'week'>('month')
  const [anchor, setAnchor] = useState(() => (today < first ? first : today))
  const [open, setOpen] = useState<Open>(null)
  const [busy, setBusy] = useState(false)
  const [undo, setUndo] = useState<Undo | null>(null)
  const [dragDay, setDragDay] = useState<string | null>(null)
  const [overDay, setOverDay] = useState<string | null>(null)

  const apply = async (result: EditResult, message: string) => {
    setBusy(true)
    try {
      await saveCalendar(classId, book.id, result.settings, result.rows)
      setUndo({ message, rows, settings })
      setOpen(null)
      notify(message)
      await reload()
    } catch (err) {
      console.error('Could not change the calendar', err)
      notify(errorMessage(err, 'We couldn’t save that change. Try again.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const runUndo = async () => {
    if (!undo) return
    setBusy(true)
    try {
      await saveCalendar(classId, book.id, undo.settings, undo.rows)
      setUndo(null)
      notify('Change undone.')
      await reload()
    } catch (err) {
      notify(errorMessage(err, 'We couldn’t undo that. Try again.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const drop = (to: string) => {
    const from = dragDay
    setDragDay(null)
    setOverDay(null)
    if (!from || from === to || to < today) return
    try {
      const s = byDay.get(from)
      const other = activeOn(rows, to)
      const r = moveSession(rows, from, to, settings, today)
      const title = s ? sessionTitle(book, s).title : 'Class'
      void apply(r, other ? `Swapped ${title} with ${sessionTitle(book, other).title}.` : `Moved ${title} to ${longDay(to)}.`)
    } catch (err) {
      notify(err instanceof EditError ? err.message : 'We couldn’t move that class.', 'error')
    }
  }

  // Grid days for the month or week shown.
  const grid = useMemo(() => {
    if (view === 'week') {
      const start = mondayOf(anchor)
      return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i))
    }
    const start = mondayOf(monthOf(anchor))
    const last = addDaysIso(monthOf(addDaysIso(monthOf(anchor), 32)), -1)
    const days: string[] = []
    for (let d = start; d <= last || days.length % 7 !== 0; d = addDaysIso(d, 1)) days.push(d)
    return days
  }, [view, anchor])

  const shift = (by: number) => {
    if (view === 'week') return setAnchor(addDaysIso(mondayOf(anchor), 7 * by))
    const d = fromIso(monthOf(anchor))
    setAnchor(toIso(new Date(d.getFullYear(), d.getMonth() + by, 1)))
  }
  const heading =
    view === 'week'
      ? `${longDay(grid[0])} to ${longDay(grid[6])}`
      : fromIso(monthOf(anchor)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const live = sessions.filter((s) => s.kind !== 'cancelled')
  const upcoming = live.filter((s) => s.day >= today).length
  const selected = open?.type === 'session' ? byDay.get(open.day) ?? null : null

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 rounded-3xl bg-white/90 p-5 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:p-6">
        <p className="font-inter text-[16px] leading-7">
          <span className="font-semibold">{className}</span> meets on {dayNames(settings.classDays)}
          {settings.classTime ? ` at ${settings.classTime}` : ''}, {longDay(settings.startDate)} to {longDay(settings.endDate)}.{' '}
          <span className="text-navy-soft">{plural(upcoming, 'class', 'classes')} to go.</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon="add" onClick={() => setOpen({ type: 'add', day: null })}>
            Add a class
          </Button>
          <Button variant="outline" icon="event_repeat" onClick={() => setOpen({ type: 'days' })}>
            Change class days
          </Button>
          <Button variant="soft" icon="tune" to={`/teacher/class/${classId}/schedule`}>
            Rebuild
          </Button>
        </div>
      </div>

      {undo && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-navy px-5 py-3 font-inter text-[15px] text-white">
          <Icon name="check_circle" className="text-[20px] text-accent-soft" filled />
          <span className="flex-1">{undo.message}</span>
          <button type="button" onClick={runUndo} disabled={busy} className="min-h-10 cursor-pointer rounded-full border-[1.5px] border-white px-4 font-semibold hover:bg-white hover:text-navy disabled:opacity-50">
            Undo
          </button>
        </div>
      )}

      {unavailable && (
        <p role="status" className="mt-4 max-w-3xl rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6">
          The chapter PDFs aren’t available yet, so pages show without links. They’re uploaded with npm run seed:materials.
        </p>
      )}

      {/* Desktop and tablets: month or week grid */}
      <section aria-label="Calendar" className="mt-8 hidden md:block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full bg-white/90 p-1 backdrop-blur-sm">
            <button type="button" onClick={() => shift(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous month'} className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-[#EEF4FB]">
              <Icon name="chevron_left" className="text-[24px]" />
            </button>
            <h2 aria-live="polite" className="min-w-[13rem] text-center font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">
              {heading}
            </h2>
            <button type="button" onClick={() => shift(1)} aria-label={view === 'week' ? 'Next week' : 'Next month'} className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-[#EEF4FB]">
              <Icon name="chevron_right" className="text-[24px]" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip icon="today" onClick={() => setAnchor(today)}>
              Today
            </Chip>
            <Chip selected={view === 'month'} onClick={() => setView('month')}>
              Month
            </Chip>
            <Chip selected={view === 'week'} onClick={() => setView('week')}>
              Week
            </Chip>
          </div>
        </div>
        <p className="mt-3 w-fit rounded-xl bg-white/85 px-3 py-1.5 font-inter text-[14px] text-navy backdrop-blur-sm">
          Drag a class to another day, or click it to move or cancel it. Click + on an empty day to add one. Past classes stay as they were.
        </p>

        <div className="mt-4 rounded-3xl border border-card-line bg-white p-3 shadow-card lg:p-4">
          <div aria-hidden="true" className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <span key={d.n} className="pb-1 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-navy-soft">
                {d.short}
              </span>
            ))}
          </div>
          <ol className="grid grid-cols-7 gap-1.5">
            {grid.map((day) => {
              const s = byDay.get(day)
              const past = day < today
              const outside = view === 'month' && day.slice(0, 7) !== anchor.slice(0, 7)
              const canDrop = dragDay !== null && !past && day !== dragDay
              return (
                <li
                  key={day}
                  aria-label={longDay(day)}
                  onDragOver={(e) => {
                    if (!canDrop) return
                    e.preventDefault()
                    if (overDay !== day) setOverDay(day)
                  }}
                  onDragLeave={() => overDay === day && setOverDay(null)}
                  onDrop={(e) => {
                    e.preventDefault()
                    drop(day)
                  }}
                  className={`group flex flex-col gap-1 rounded-xl border p-1.5 ${view === 'week' ? 'min-h-[17rem]' : 'min-h-[7.5rem]'} ${
                    overDay === day ? 'border-select bg-[#EAF3FD] ring-2 ring-select' : day === today ? 'border-select bg-white ring-1 ring-select' : past ? 'border-transparent bg-[#F4F6F9]' : 'border-card-line bg-white'
                  } ${outside ? 'opacity-45' : ''}`}
                >
                  <span className="flex items-center justify-between">
                    <span className={`px-1 font-mono text-[12px] font-semibold ${day === today ? 'rounded bg-select px-1.5 text-navy' : 'text-navy-soft'}`}>
                      {view === 'week' ? longDay(day).split(', ')[1] : Number(day.slice(8))}
                    </span>
                    {!past && (!s || s.kind === 'cancelled') && (
                      <button
                        type="button"
                        onClick={() => setOpen({ type: 'add', day })}
                        aria-label={`Add a class on ${longDay(day)}`}
                        className="grid size-7 cursor-pointer place-items-center rounded-full text-navy-soft opacity-60 hover:bg-[#EEF4FB] hover:text-navy hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Icon name="add" className="text-[18px]" />
                      </button>
                    )}
                  </span>
                  {s && (
                    <GridSession
                      book={book}
                      session={s}
                      links={links}
                      past={past}
                      detailed={view === 'week'}
                      dragging={dragDay === day}
                      onOpen={() => setOpen({ type: 'session', day })}
                      onDragStart={() => setDragDay(day)}
                      onDragEnd={() => {
                        setDragDay(null)
                        setOverDay(null)
                      }}
                    />
                  )}
                </li>
              )
            })}
          </ol>
          <Legend />
        </div>
      </section>

      {/* Phones: a list */}
      <section aria-label="Calendar" className="mt-8 md:hidden">
        <SessionMonths book={book} sessions={sessions} links={links} today={today} onPick={(s) => setOpen({ type: 'session', day: s.day })} />
      </section>

      <BookAttribution book={book} className="mt-10 max-w-3xl rounded-2xl bg-white/90 px-4 py-3 backdrop-blur-sm" />

      <Dialog open={open !== null} onClose={() => setOpen(null)} title={open?.type === 'session' ? longDay(open.day) : open?.type === 'days' ? 'Change class days' : 'Add a class'}>
        {open?.type === 'session' && selected && (
          <SessionPanel
            key={open.day}
            book={book}
            links={links}
            session={selected}
            rows={rows}
            settings={settings}
            today={today}
            busy={busy}
            apply={apply}
            onAddBack={() => setOpen({ type: 'add', day: selected.day })}
          />
        )}
        {open?.type === 'add' && <AddPanel key={open.day ?? 'pick'} day={open.day} rows={rows} settings={settings} today={today} busy={busy} apply={apply} />}
        {open?.type === 'days' && <DaysPanel rows={rows} settings={settings} today={today} busy={busy} apply={apply} />}
      </Dialog>
    </>
  )
}

function GridSession({
  book,
  session,
  links,
  past,
  detailed,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  book: Book
  session: ClassSession
  links: Record<number, string> | null
  past: boolean
  detailed: boolean
  dragging: boolean
  onOpen: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const t = sessionTitle(book, session)
  const draggable = !past && session.kind !== 'cancelled'
  const short = session.kind === 'lesson' ? session.sectionId : session.kind === 'chapter_quiz' ? `Ch. ${session.chapter} quiz` : session.kind === 'review' ? 'Review' : 'No class'
  const name = session.kind === 'lesson' ? sectionName(t.title, session.sectionId) : session.kind === 'review' ? 'Flexible' : session.kind === 'chapter_quiz' ? 'and review' : 'Cancelled'
  const reading = detailed ? sessionReading(book, links, session) : null
  return (
    <div className={`flex flex-1 flex-col gap-1 ${dragging ? 'opacity-40' : ''}`}>
      <button
        type="button"
        draggable={draggable}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', session.day)
          onDragStart()
        }}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        aria-label={`${t.title}${t.detail ? `, ${t.detail}` : ''}. ${past ? 'Past class.' : 'Open to move or cancel.'}`}
        className={`flex flex-1 flex-col items-start rounded-lg border px-2 py-1.5 text-left ${CHIP[session.kind]} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:ring-2 hover:ring-select`}
      >
        <span className={`font-mono text-[12px] font-bold ${session.kind === 'cancelled' ? 'line-through' : ''}`}>
          {short}
          {session.kind === 'lesson' && session.parts > 1 ? <span className="font-medium text-navy-soft"> · {session.part}/{session.parts}</span> : null}
        </span>
        <span className={`mt-0.5 font-inter text-[13px] leading-[1.15rem] ${detailed ? '' : 'line-clamp-2'}`}>{name}</span>
        {detailed && t.detail && session.kind === 'lesson' && <span className="mt-1 font-inter text-[12px] text-navy-soft">{t.detail}</span>}
        {detailed && session.startsAt && session.kind !== 'cancelled' && <span className="mt-auto pt-1 font-mono text-[11px] text-navy-soft">{session.startsAt}</span>}
      </button>
      {reading?.href && (
        <a href={reading.href} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-md px-1 font-inter text-[12px] font-semibold text-accent-strong hover:underline">
          <Icon name="picture_as_pdf" className="text-[15px]" />
          {reading.label.replace(/^Read /, '')}
          <span className="sr-only"> (opens the PDF in a new tab)</span>
        </a>
      )}
    </div>
  )
}

const sectionName = (title: string, id: string | null) => (id && title.startsWith(id) ? title.slice(id.length).trim() : title)

function Legend() {
  const items: SessionKind[] = ['lesson', 'chapter_quiz', 'review', 'cancelled']
  return (
    <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-dashed border-card-line px-1 pt-3 font-inter text-[13px] text-navy-soft">
      {items.map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={`size-3 rounded border ${CHIP[k]}`} />
          <KindBadgeText kind={k} />
        </span>
      ))}
    </p>
  )
}

const KindBadgeText = ({ kind }: { kind: SessionKind }) => <>{{ lesson: 'Lesson', chapter_quiz: 'Chapter quiz and review', review: 'Review / flexible', cancelled: 'No class' }[kind]}</>

// ---------------------------------------------------------------------------
// Dialog and its panels
// ---------------------------------------------------------------------------

function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      data-lenis-prevent
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-card-line bg-white p-0 text-navy shadow-card backdrop:bg-navy/45"
    >
      {open && (
        <div className="p-5 md:p-7">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="font-grotesk text-[24px] font-extrabold tracking-[-0.01em]">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[#EEF4FB]">
              <Icon name="close" className="text-[22px]" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

type Apply = (r: EditResult, message: string) => Promise<void>

/** Runs an edit for a preview. Returns the result, or the reason it can't be done. */
function attempt<T>(fn: () => T): { ok: true; r: T } | { ok: false; why: string } {
  try {
    return { ok: true, r: fn() }
  } catch (err) {
    return { ok: false, why: err instanceof EditError ? err.message : 'That change doesn’t work.' }
  }
}

function Preview({ children, warn = false }: { children: ReactNode; warn?: boolean }) {
  return <p className={`mt-2 rounded-xl px-3 py-2 font-inter text-[14px] leading-6 ${warn ? 'bg-[#FBE1D8] text-[#7A2A0E]' : 'bg-[#F3F7FC] text-navy'}`}>{children}</p>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-card-line pt-5">
      <h3 className="font-inter text-[16px] font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function SessionPanel({
  book,
  links,
  session,
  rows,
  settings,
  today,
  busy,
  apply,
  onAddBack,
}: {
  book: Book
  links: Record<number, string> | null
  session: ClassSession
  rows: CalRow[]
  settings: ScheduleSettings
  today: string
  busy: boolean
  apply: Apply
  onAddBack: () => void
}) {
  const [to, setTo] = useState('')
  const past = session.day < today
  const title = sessionTitle(book, session).title

  const move = isIsoDate(to) ? attempt(() => moveSession(rows, session.day, to, settings, today)) : null
  const swapWith = isIsoDate(to) ? activeOn(rows, to) : null
  const cancel = attempt(() => cancelSession(rows, session.day, settings, today))

  return (
    <div className="mt-4 flex flex-col gap-5">
      <div className="flex flex-col items-start">
        <SessionSummary book={book} links={links} session={session} />
      </div>

      {past ? (
        <p className="rounded-xl bg-[#F3F7FC] px-4 py-3 font-inter text-[15px] leading-6">
          <Icon name="history" className="mr-1.5 align-[-4px] text-[20px] text-select" />
          This class has happened. Past classes don’t change.
        </p>
      ) : session.kind === 'cancelled' ? (
        <Section title="Teach on this day after all?">
          <Button variant="navy" icon="add" className="mt-3" onClick={onAddBack}>
            Add a class back
          </Button>
        </Section>
      ) : (
        <>
          <Section title="Move to another day">
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Field id="move-to" label="New day" icon="event">
                <TextInput id="move-to" type="date" min={today} value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
              <Button
                variant="navy"
                icon="east"
                disabled={busy || !move?.ok}
                onClick={() => move?.ok && apply(move.r, swapWith ? `Swapped ${title} with ${sessionTitle(book, swapWith).title}.` : `Moved ${title} to ${longDay(to)}.`)}
              >
                Move
              </Button>
            </div>
            {move &&
              (move.ok ? (
                <Preview>
                  {swapWith ? `Swaps with ${sessionTitle(book, swapWith).title} on ${longDay(to)}.` : `Moves to ${longDay(to)}. Nothing else changes.`}
                  {!settings.classDays.includes(weekdayOf(to)) ? ' That isn’t one of your usual class days.' : ''}
                </Preview>
              ) : (
                <Preview warn>{move.why}</Preview>
              ))}
          </Section>

          <Section title={session.kind === 'review' ? 'Cancel or remove this class' : 'Cancel this class'}>
            {cancel.ok ? (
              <Preview>
                {session.kind === 'review'
                  ? 'The day shows as “No class”. Nothing else moves.'
                  : cancel.r.moved === 0 && !cancel.r.newEnd
                    ? 'This lesson moves to the next class day. Nothing else moves.'
                    : `This lesson and ${plural(cancel.r.moved, 'later class', 'later classes')} move back one class day.`}
                {cancel.r.usedReview ? ` The review / flexible day on ${longDay(cancel.r.usedReview)} is used up, so the end date stays the same.` : ''}
                {cancel.r.newEnd ? ` There’s no spare review day left, so the calendar now ends on ${longDay(cancel.r.newEnd)}.` : ''}
              </Preview>
            ) : (
              <Preview warn>{cancel.why}</Preview>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="orange" icon="event_busy" disabled={busy || !cancel.ok} onClick={() => cancel.ok && apply(cancel.r, `Cancelled class on ${longDay(session.day)}.${cancel.r.moved ? ` ${plural(cancel.r.moved, 'later class', 'later classes')} moved back.` : ''}`)}>
                Cancel this class
              </Button>
              {session.kind === 'review' && (
                <Button variant="outline" icon="delete" disabled={busy} onClick={() => apply(removeReview(rows, session.day, settings, today), `Removed the review day on ${longDay(session.day)}.`)}>
                  Remove it
                </Button>
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

function AddPanel({ day, rows, settings, today, busy, apply }: { day: string | null; rows: CalRow[]; settings: ScheduleSettings; today: string; busy: boolean; apply: Apply }) {
  const [pick, setPick] = useState(day ?? '')
  const [mode, setMode] = useState<'review' | 'pull'>('review')
  const result = isIsoDate(pick) ? attempt(() => addSession(rows, pick, mode, settings, today)) : null

  return (
    <div className="mt-4 flex flex-col gap-5">
      {day ? (
        <p className="font-inter text-[17px]">
          On <span className="font-semibold">{longDay(day)}</span>
          {settings.classTime ? ` at ${settings.classTime}` : ''}.
        </p>
      ) : (
        <Field id="add-day" label="Day" icon="event">
          <TextInput id="add-day" type="date" min={today} value={pick} onChange={(e) => setPick(e.target.value)} />
        </Field>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-inter text-[16px] font-semibold">What happens in it?</legend>
        <Choice checked={mode === 'review'} onChange={() => setMode('review')} title="Review / flexible" text="Catch up, practice, or go deeper. Nothing else moves." />
        <Choice checked={mode === 'pull'} onChange={() => setMode('pull')} title="Teach the next lesson" text="Every later class moves up one. The last class becomes review / flexible." />
      </fieldset>

      {result && !result.ok && <Preview warn>{result.why}</Preview>}
      {result?.ok && mode === 'pull' && result.r.moved > 0 && <Preview>{plural(result.r.moved, 'later class moves', 'later classes move')} up one class day.</Preview>}

      <Button
        variant="navy"
        size="lg"
        icon="add"
        className="w-full sm:w-fit"
        disabled={busy || !result?.ok}
        onClick={() => result?.ok && apply(result.r, mode === 'pull' ? `Added a class on ${longDay(pick)}. Later classes moved up.` : `Added a review / flexible class on ${longDay(pick)}.`)}
      >
        Add class
      </Button>
    </div>
  )
}

function Choice({ checked, onChange, title, text }: { checked: boolean; onChange: () => void; title: string; text: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] p-3 ${checked ? 'border-select bg-[#F2F8FE]' : 'border-card-line'}`}>
      <input type="radio" name="add-mode" checked={checked} onChange={onChange} className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#161B26]" />
      <span className="font-inter text-[15px] leading-6">
        <span className="font-semibold">{title}</span>
        <span className="block text-navy-soft">{text}</span>
      </span>
    </label>
  )
}

function DaysPanel({ rows, settings, today, busy, apply }: { rows: CalRow[]; settings: ScheduleSettings; today: string; busy: boolean; apply: Apply }) {
  const [from, setFrom] = useState(today)
  const [days, setDays] = useState<number[]>(settings.classDays)
  const same = days.length === settings.classDays.length && days.every((d) => settings.classDays.includes(d))
  const result = isIsoDate(from) && !same ? attempt(() => changeClassDays(rows, from, days, settings, today)) : null
  const toggle = (n: number) => setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]))

  return (
    <div className="mt-4 flex flex-col gap-5">
      <p className="font-inter text-[15px] leading-6 text-navy-soft">Lessons from that day on are laid out again, in the same order, on the new days. Classes before it stay as they are.</p>
      <Field id="days-from" label="Starting on" icon="event">
        <TextInput id="days-from" type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className="sm:max-w-[14rem]" />
      </Field>
      <fieldset>
        <legend className="mb-2 font-inter text-[15px] font-semibold">Class days</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <Chip key={d.n} selected={days.includes(d.n)} onClick={() => toggle(d.n)}>
              <span aria-hidden="true">{d.short}</span>
              <span className="sr-only">{d.long}</span>
            </Chip>
          ))}
        </div>
      </fieldset>
      {same ? (
        <Preview>Pick the new class days.</Preview>
      ) : result && !result.ok ? (
        <Preview warn>{result.why}</Preview>
      ) : result?.ok ? (
        <Preview>
          From {longDay(from)}, class meets on {dayNames(days)}: {plural(result.r.classes, 'class', 'classes')}, the last one on{' '}
          {longDay(result.r.rows.filter((r) => r.kind !== 'cancelled').at(-1)?.day ?? result.r.settings.endDate)}.{result.r.newEnd ? ` The end date moves from ${longDay(settings.endDate)} so everything fits.` : ''}
        </Preview>
      ) : null}
      <Button
        variant="navy"
        size="lg"
        icon="event_repeat"
        className="w-full sm:w-fit"
        disabled={busy || !result?.ok}
        onClick={() => result?.ok && apply(result.r, `Class now meets on ${dayNames(days)} from ${longDay(from)}.`)}
      >
        Change class days
      </Button>
    </div>
  )
}
