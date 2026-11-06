import { useMemo, useRef, useState, type DragEvent } from 'react'
import { BlockTitle } from '../../components/area/AreaBits'
import { KindBadge } from '../../components/course/CourseBits'
import { courseGate, sessionTitle, useTeacherClass } from '../../components/course/courseGate'
import { Icon } from '../../components/Icon'
import { BackLink } from '../../components/student/QuizRunner'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { Field, TextInput } from '../../components/ui/Field'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { longDay } from '../../lib/attendance'
import type { Book } from '../../lib/books'
import type { ClassSession, SavedSchedule } from '../../lib/courseDb'
import { saveCalendar } from '../../lib/courseDb'
import { errorMessage } from '../../lib/db'
import { addDaysIso, chapterNeeds, isIsoDate, planCalendar, toIso, type PlannedSession, type ScheduleSettings, type SessionKind } from '../../lib/schedulePlan'
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

export default function TeacherSchedule() {
  const t = useTeacherClass()
  const course = useCourse(t.cls?.id)
  if (!t.ok) return t.screen
  const cls = t.cls
  const gate = courseGate(course)

  return (
    <>
      <BackLink to="/teacher/class">Class</BackLink>
      <SectionHeader as="h1" size="sm" align="left" script="plan the term" title="Schedule" className="mt-6" />
      {gate ??
        (!course.book ? (
          <EmptyState label="schedule.frame" icon="menu_book" title="Pick the textbook first" className="mt-10 max-w-xl" action={{ label: 'Choose course materials', to: `/teacher/class/${cls.id}/materials` }}>
            The calendar is built from the book’s chapters and sections.
          </EmptyState>
        ) : (
          <ScheduleSetup
            key={course.schedule?.updatedAt ?? 'new'}
            classId={cls.id}
            className={cls.name}
            book={course.book}
            saved={course.schedule}
            sessions={course.sessions}
            onSaved={course.reload}
          />
        ))}
    </>
  )
}

type Errors = Partial<Record<'startDate' | 'endDate' | 'classDays' | 'chapters' | 'noClass', string>>

function ScheduleSetup({ classId, className, book, saved, sessions, onSaved }: { classId: string; className: string; book: Book; saved: SavedSchedule | null; sessions: ClassSession[]; onSaved: () => Promise<void> }) {
  const notify = useToast()
  const today = toIso(useToday())
  const syl = book.syllabus
  const hasPast = sessions.some((s) => s.day < today)

  const [settings, setSettings] = useState<ScheduleSettings>(() =>
    saved
      ? { startDate: saved.startDate, endDate: saved.endDate, classDays: saved.classDays, classTime: saved.classTime, noClassDates: saved.noClassDates, chapters: saved.chapters, squeeze: saved.squeeze }
      : { startDate: today, endDate: addDaysIso(today, 7 * 12), classDays: [2, 4], classTime: '10:00', noClassDates: [], chapters: syl.core_chapters, squeeze: false },
  )
  // Every chapter, in the teacher's order: chosen ones first (in their order), then the rest.
  const [order, setOrder] = useState<number[]>(() => [...settings.chapters, ...syl.chapters.map((c) => c.number).filter((n) => !settings.chapters.includes(n))])
  const [newDay, setNewDay] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [built, setBuilt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const previewRef = useRef<HTMLHeadingElement>(null)

  const chosen = useMemo(() => order.filter((n) => settings.chapters.includes(n)), [order, settings.chapters])
  const plan = useMemo(() => planCalendar(book, { ...settings, chapters: chosen }, hasPast ? today : undefined), [book, settings, chosen, hasPast, today])
  const set = (patch: Partial<ScheduleSettings>) => setSettings((s) => ({ ...s, ...patch }))

  const toggleDay = (n: number) => set({ classDays: settings.classDays.includes(n) ? settings.classDays.filter((d) => d !== n) : [...settings.classDays, n].sort() })
  const toggleChapter = (n: number) => set({ chapters: settings.chapters.includes(n) ? settings.chapters.filter((c) => c !== n) : [...settings.chapters, n] })
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return
    setOrder((o) => {
      const next = [...o]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }
  const addNoClass = () => {
    if (!isIsoDate(newDay)) return setErrors((e) => ({ ...e, noClass: 'Pick a date first.' }))
    if (!settings.noClassDates.includes(newDay)) set({ noClassDates: [...settings.noClassDates, newDay].sort() })
    setNewDay('')
    setErrors((e) => ({ ...e, noClass: undefined }))
  }

  const validate = () => {
    const next: Errors = {}
    if (!isIsoDate(settings.startDate)) next.startDate = 'Pick the first day of class.'
    if (!isIsoDate(settings.endDate)) next.endDate = 'Pick the last day of class.'
    else if (isIsoDate(settings.startDate) && settings.endDate < settings.startDate) next.endDate = 'The end date has to come after the start date.'
    if (settings.classDays.length === 0) next.classDays = 'Pick at least one class day.'
    if (chosen.length === 0) next.chapters = 'Tick at least one chapter.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const build = () => {
    if (!validate()) return
    setBuilt(true)
    window.setTimeout(() => {
      previewRef.current?.scrollIntoView({ block: 'start' })
      previewRef.current?.focus()
    }, 50)
  }

  const save = async () => {
    if (!validate() || plan.short > 0) return
    setSaving(true)
    try {
      const count = await saveCalendar(classId, book.id, { ...settings, chapters: chosen }, plan.sessions)
      notify(`Calendar saved: ${count} sessions for ${className}.`)
      await onSaved()
    } catch (err) {
      console.error('Could not save the calendar', err)
      notify(errorMessage(err, 'We couldn’t save the calendar. Try again.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const dropChapter = (n: number) => set({ chapters: settings.chapters.filter((c) => c !== n) })

  return (
    <>
      {hasPast && (
        <p className="mt-8 max-w-3xl rounded-xl bg-white/90 px-4 py-3 font-inter text-[15px] leading-6 backdrop-blur-sm">
          <Icon name="history" className="mr-1.5 align-[-4px] text-[20px] text-select" />
          Your calendar has already started. Rebuilding it only changes classes from today on; past classes stay as they were. Untick chapters you’ve already finished.
        </p>
      )}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        {/* Dates and days */}
        <Frame label="setup.frame" bodyClassName="flex flex-col gap-5 p-5 md:p-7">
          <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">When {className} meets</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="start-date" label="Start date" icon="event" error={errors.startDate}>
              <TextInput id="start-date" type="date" value={settings.startDate} error={errors.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </Field>
            <Field id="end-date" label="End date" icon="event_available" error={errors.endDate}>
              <TextInput id="end-date" type="date" value={settings.endDate} min={settings.startDate} error={errors.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 font-inter text-[15px] font-semibold">Class days</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <Chip key={d.n} selected={settings.classDays.includes(d.n)} onClick={() => toggleDay(d.n)}>
                  <span aria-hidden="true">{d.short}</span>
                  <span className="sr-only">{d.long}</span>
                </Chip>
              ))}
            </div>
            {errors.classDays ? (
              <p className="mt-1.5 font-inter text-[14px] font-medium text-accent-strong">{errors.classDays}</p>
            ) : (
              <p className="mt-1.5 font-inter text-[14px] text-navy-soft">{settings.classDays.length === 2 ? 'Two days a week.' : `${settings.classDays.length} days a week.`}</p>
            )}
          </fieldset>

          <Field id="class-time" label="Class time" icon="schedule">
            <TextInput id="class-time" type="time" value={settings.classTime} onChange={(e) => set({ classTime: e.target.value })} className="sm:max-w-[12rem]" />
          </Field>

          <div>
            <Field id="no-class" label="Days with no class" icon="event_busy" error={errors.noClass} hint="Holidays, exams, field trips.">
              <div className="flex gap-2">
                <TextInput id="no-class" type="date" value={newDay} error={errors.noClass} hint onChange={(e) => setNewDay(e.target.value)} />
                <Button variant="outline" icon="add" onClick={addNoClass}>
                  Add
                </Button>
              </div>
            </Field>
            {settings.noClassDates.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Days with no class">
                {settings.noClassDates.map((d) => (
                  <li key={d} className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-navy/25 bg-white py-0.5 pl-3 pr-1 font-inter text-[14px]">
                    {longDay(d)}
                    <button type="button" onClick={() => set({ noClassDates: settings.noClassDates.filter((x) => x !== d) })} aria-label={`Remove ${longDay(d)}`} className="grid size-8 cursor-pointer place-items-center rounded-full hover:bg-[#EEF4FB]">
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Frame>

        {/* Chapters */}
        <Frame label="chapters.frame" bodyClassName="p-5 md:p-7">
          <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Chapters, in teaching order</h2>
          <p className="mt-1 font-inter text-[15px] leading-6 text-navy-soft">Core chapters are ticked to start. Drag to reorder, or use the arrows.</p>
          <ol className="mt-4 flex flex-col gap-2">
            {order.map((n, i) => {
              const ch = syl.chapters.find((c) => c.number === n)
              if (!ch) return null
              const on = settings.chapters.includes(n)
              const needs = chapterNeeds(book, n, settings.squeeze)
              return (
                <li
                  key={n}
                  draggable
                  onDragStart={(e: DragEvent) => {
                    setDragFrom(i)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragFrom !== null) move(dragFrom, i)
                    setDragFrom(null)
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  className={`flex items-center gap-2 rounded-2xl border-[1.5px] px-2 py-2 transition-colors ${on ? 'border-select bg-[#F2F8FE]' : 'border-card-line bg-white'} ${dragFrom === i ? 'opacity-50' : ''}`}
                >
                  <Icon name="drag_indicator" className="hidden cursor-grab text-[22px] text-navy-soft md:block" />
                  <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={on} onChange={() => toggleChapter(n)} className="h-5 w-5 shrink-0 cursor-pointer accent-[#161B26]" />
                    <span className="min-w-0 font-inter text-[15px] leading-5">
                      <span className="font-semibold">
                        {n}. {ch.title}
                      </span>
                      <span className="block text-[13px] text-navy-soft">
                        {needs} classes{syl.core_chapters.includes(n) ? ' · core' : ''}
                      </span>
                    </span>
                  </label>
                  <span className="flex shrink-0">
                    <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move chapter ${n} up`} className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-white disabled:cursor-not-allowed disabled:opacity-30">
                      <Icon name="arrow_upward" className="text-[20px]" />
                    </button>
                    <button type="button" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} aria-label={`Move chapter ${n} down`} className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-white disabled:cursor-not-allowed disabled:opacity-30">
                      <Icon name="arrow_downward" className="text-[20px]" />
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
          {errors.chapters && <p className="mt-2 font-inter text-[14px] font-medium text-accent-strong">{errors.chapters}</p>}
          <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 font-inter text-[15px] leading-6">
            <input type="checkbox" checked={settings.squeeze} onChange={(e) => set({ squeeze: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#161B26]" />
            Squeeze: one class per section, even long ones
          </label>
        </Frame>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-white/90 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between md:p-6">
        <p className="font-inter text-[16px]">
          <span className="font-semibold">{chosen.length} chapters</span> need <span className="font-semibold">{plan.needed} classes</span>. Your dates have{' '}
          <span className="font-semibold">{plan.available}</span>.
        </p>
        <Button variant="orange" size="lg" icon="calendar_month" onClick={build}>
          Build my calendar
        </Button>
      </div>

      {built ? (
        <section aria-labelledby="preview" className="mt-12">
          <h2 ref={previewRef} id="preview" tabIndex={-1} className="w-fit scroll-mt-24 rounded-full bg-white/85 px-3 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-navy outline-none backdrop-blur-sm">
            Your calendar
          </h2>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]">
            <StatCard
              title={`${longDay(plan.sessions[0]?.day ?? settings.startDate)} on`}
              stats={[
                { value: String(plan.available), label: 'Classes' },
                { value: String(plan.needed), label: 'Needed' },
                { value: String(plan.short > 0 ? plan.short : plan.spare), label: plan.short > 0 ? 'Short' : 'Spare' },
              ]}
              note={plan.short > 0 ? 'Not everything fits yet. Pick a fix.' : plan.spare > 0 ? `${plan.spare} spare classes at the end are marked Review / flexible.` : 'Everything fits exactly.'}
            />

            {plan.short > 0 ? (
              <Frame label="fix.frame" selected bodyClassName="p-5 md:p-7">
                <h3 role="alert" className="font-grotesk text-[24px] font-extrabold leading-tight tracking-[-0.01em]">
                  You have {plan.available} classes but these chapters need <span className="text-accent-strong">{plan.needed}</span>.
                </h3>
                <div className="mt-5 flex flex-col gap-5">
                  <div>
                    <p className="font-inter text-[15px] font-semibold">Drop a chapter</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {chosen.map((n) => (
                        <Chip key={n} icon="remove" onClick={() => dropChapter(n)}>
                          {`Chapter ${n} (${chapterNeeds(book, n, settings.squeeze)})`}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  {plan.extendTo && (
                    <div>
                      <p className="font-inter text-[15px] font-semibold">Extend the end date</p>
                      <Button variant="outline" icon="event_available" className="mt-2" onClick={() => set({ endDate: plan.extendTo as string })}>
                        {`End on ${longDay(plan.extendTo)}, ${plan.extendTo.slice(0, 4)}`}
                      </Button>
                    </div>
                  )}
                  {!settings.squeeze && (
                    <div>
                      <p className="font-inter text-[15px] font-semibold">Squeeze</p>
                      <Button variant="outline" icon="compress" className="mt-2" onClick={() => set({ squeeze: true })}>
                        One class per section
                      </Button>
                      <p className="mt-1.5 font-inter text-[14px] text-navy-soft">
                        Needs {plan.neededIfSqueezed}.{' '}
                        {plan.neededIfSqueezed <= plan.available ? `That fits, with ${plan.available - plan.neededIfSqueezed} to spare.` : `Still ${plan.neededIfSqueezed - plan.available} short.`}
                      </p>
                    </div>
                  )}
                </div>
              </Frame>
            ) : (
              <Frame label="save.frame" bodyClassName="flex flex-col gap-4 p-5 md:p-7">
                <h3 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">Looks good?</h3>
                <p className="font-inter text-[15px] leading-6 text-navy-soft">
                  Saving puts these {plan.sessions.length} classes on the calendar for {className}. {sessions.length > 0 ? 'Upcoming classes are replaced; past ones stay.' : 'You can change it anytime.'}
                </p>
                <Button variant="navy" size="lg" icon={saving ? undefined : 'save'} onClick={save} disabled={saving} className="w-full sm:w-fit">
                  {saving ? 'Saving…' : 'Save calendar'}
                </Button>
              </Frame>
            )}
          </div>

          <SessionList book={book} sessions={plan.sessions} more={plan.short} />
        </section>
      ) : sessions.length > 0 ? (
        <section aria-labelledby="saved" className="mt-12">
          <BlockTitle id="saved">{`Saved calendar · ${sessions.filter((s) => s.kind !== 'cancelled').length} classes`}</BlockTitle>
          <SessionList book={book} sessions={sessions} today={today} />
        </section>
      ) : null}
    </>
  )
}

type ListSession = Pick<PlannedSession, 'day' | 'chapter' | 'sectionId' | 'part' | 'parts'> & { kind: SessionKind; id?: string }

/** Sessions grouped by month, one row each. */
function SessionList({ book, sessions, more = 0, today }: { book: Book; sessions: ListSession[]; more?: number; today?: string }) {
  const months = new Map<string, ListSession[]>()
  for (const s of sessions) {
    const key = s.day.slice(0, 7)
    months.set(key, [...(months.get(key) ?? []), s])
  }
  return (
    <div className="mt-8 flex flex-col gap-8">
      {[...months.entries()].map(([month, list]) => {
        const [y, m] = month.split('-').map(Number)
        const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        return (
          <Frame key={month} label={`${month}.frame`} bodyClassName="px-4 py-2 md:px-6">
            <h3 className="pt-3 font-grotesk text-[20px] font-extrabold tracking-[-0.01em]">{label}</h3>
            <ol className="divide-y divide-card-line">
              {list.map((s) => {
                const t = sessionTitle(book, s)
                const past = today !== undefined && s.day < today
                return (
                  <li key={s.id ?? s.day} className={`flex items-start gap-3 py-3 ${past ? 'opacity-60' : ''}`}>
                    <span className="w-24 shrink-0 font-mono text-[13px] font-semibold leading-6">{longDay(s.day)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <KindBadge kind={s.kind} short />
                        <span className={`font-inter text-[15px] font-semibold ${s.kind === 'cancelled' ? 'line-through' : ''}`}>{t.title}</span>
                      </span>
                      {t.detail && <span className="mt-0.5 block font-inter text-[14px] text-navy-soft">{t.detail}</span>}
                    </span>
                    {past && <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-navy-soft">Done</span>}
                  </li>
                )
              })}
            </ol>
          </Frame>
        )
      })}
      {more > 0 && (
        <p className="w-fit rounded-xl bg-white/90 px-4 py-3 font-inter text-[15px] backdrop-blur-sm">
          <Icon name="more_horiz" className="mr-1.5 align-[-5px] text-[20px] text-accent-strong" />
          {more} more {more === 1 ? 'class doesn’t' : 'classes don’t'} fit yet.
        </p>
      )}
    </div>
  )
}
