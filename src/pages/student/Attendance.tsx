import { useState } from 'react'
import { BlockTitle, SampleTag } from '../../components/area/AreaBits'
import { plural, useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { isoDate, longDay, type Mark } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import { useCatchUpCheck, useDayTopic } from '../../lib/sampleData'
import { useSession } from '../../lib/session'
import { useMyAttendance } from '../../lib/useMyAttendance'
import { useToday } from '../../lib/useToday'

const MARK_STYLE: Record<Mark, { label: string; cell: string; dot: string }> = {
  present: { label: 'Here', cell: 'bg-[#E3F5EA] text-[#1F5C35]', dot: 'bg-[#1F6B3A]' },
  late: { label: 'Late', cell: 'bg-note text-[#6B3F0E]', dot: 'bg-[#9A5B12]' },
  absent: { label: 'Missed', cell: 'bg-[#FBE1D8] text-[#9C3412]', dot: 'bg-accent-strong' },
}
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function StudentAttendance() {
  const gate = useClassGate({ student: true })
  return gate ?? <AttendanceBody />
}

function AttendanceBody() {
  const now = useToday()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const month = useMyAttendance(view.year, view.month)
  const isThisMonth = view.year === now.getFullYear() && view.month === now.getMonth()
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const shift = (by: number) => setView((v) => {
    const d = new Date(v.year, v.month + by, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  // Monday-first grid: blanks before the 1st, then every day of the month.
  const first = new Date(view.year, view.month, 1)
  const blanks = (first.getDay() + 6) % 7
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const today = isoDate(now)
  const missed = Object.entries(month.marks)
    .filter(([, m]) => m === 'absent')
    .map(([day]) => day)
    .sort()
    .reverse()

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="your month" title="Attendance" />

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Frame label="calendar.frame" bodyClassName="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="grid size-11 cursor-pointer place-items-center rounded-xl text-navy hover:bg-[#EEF4FB]">
              <Icon name="chevron_left" className="text-[26px]" />
            </button>
            <h2 aria-live="polite" className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={() => shift(1)}
              disabled={isThisMonth}
              aria-label="Next month"
              className="grid size-11 cursor-pointer place-items-center rounded-xl text-navy hover:bg-[#EEF4FB] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Icon name="chevron_right" className="text-[26px]" />
            </button>
          </div>

          {month.error ? (
            <p role="alert" className="mt-4 font-inter text-[16px]">
              {month.error}
            </p>
          ) : (
            <div className="mt-4">
              <div aria-hidden="true" className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {WEEKDAYS.map((d) => (
                  <span key={d} className="pb-1 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-soft">
                    {d}
                  </span>
                ))}
              </div>
              <ol aria-label={`Attendance for ${monthLabel}`} className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: blanks }, (_, i) => (
                  <li key={`b${i}`} aria-hidden="true" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const date = new Date(view.year, view.month, i + 1)
                  const iso = isoDate(date)
                  const mark = month.marks[iso]
                  const weekend = date.getDay() === 0 || date.getDay() === 6
                  const style = mark ? MARK_STYLE[mark] : null
                  const label = `${longDay(iso)}: ${style ? style.label : weekend ? 'weekend' : iso > today ? 'coming up' : 'not marked'}`
                  return (
                    <li
                      key={iso}
                      aria-label={label}
                      title={label}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl font-inter text-[15px] font-semibold ${
                        style ? style.cell : weekend ? 'text-navy-soft/60' : 'bg-[#F6F9FD] text-navy'
                      } ${iso === today ? 'ring-2 ring-select ring-offset-1' : ''}`}
                    >
                      <span aria-hidden="true">{i + 1}</span>
                      {style && <span aria-hidden="true" className={`absolute bottom-1.5 size-1.5 rounded-full ${style.dot}`} />}
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-dashed border-card-line pt-4 font-inter text-[14px] text-navy-soft">
            {(Object.keys(MARK_STYLE) as Mark[]).map((m) => (
              <span key={m} className="flex items-center gap-1.5">
                <span className={`size-3 rounded ${MARK_STYLE[m].cell} ring-1 ring-inset ring-black/5`} />
                {MARK_STYLE[m].label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-[#F6F9FD] ring-1 ring-inset ring-black/5" />
              Not marked
            </span>
          </p>
        </Frame>

        <StatCard
          title={`${monthLabel.split(' ')[0]} so far`}
          stats={
            month.loading || month.counts.days === 0
              ? [
                  { value: '–', label: 'Here' },
                  { value: '–', label: 'Late' },
                  { value: '–', label: 'Missed' },
                ]
              : [
                  { value: String(month.counts.present), label: 'Here' },
                  { value: String(month.counts.late), label: 'Late' },
                  { value: String(month.counts.absent), label: 'Missed' },
                ]
          }
          note={month.loading ? 'Loading…' : month.counts.days === 0 ? 'Nothing marked yet this month.' : `${plural(month.counts.days, 'class')} marked. Late still counts as here.`}
        />
      </div>

      <section aria-labelledby="catch-up" className="mt-14">
        <BlockTitle id="catch-up" end={missed.length > 0 ? <SampleTag /> : undefined}>
          Catch-up
        </BlockTitle>
        {missed.length === 0 ? (
          <p className="mt-4 max-w-xl rounded-2xl bg-white/90 px-5 py-4 font-inter text-[16px] leading-7 text-navy backdrop-blur-sm">
            {month.loading ? 'Loading…' : `No missed classes in ${monthLabel.split(' ')[0]}. If you miss one, a short catch-up check shows up here.`}
          </p>
        ) : (
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {missed.map((day, i) => (
              <li key={day}>
                <CatchUpCard day={day} number={i + 1} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function CatchUpCard({ day, number }: { day: string; number: number }) {
  const { user } = useSession()
  const { cls } = useClassData()
  const { topic } = useDayTopic(cls?.id, day)
  const check = useCatchUpCheck(user.id, day, topic)
  const done = check.score !== undefined

  return (
    <Frame label={`catchup_${String(number).padStart(2, '0')}.frame`} className="h-full" bodyClassName="flex h-full flex-col gap-3 p-6">
      <p className="font-grotesk text-[22px] font-extrabold leading-snug tracking-[-0.01em]">
        {topic ? (
          <>
            You missed <span className="text-accent-strong">{topic}</span> on {longDay(day)}.
          </>
        ) : (
          <>You missed class on {longDay(day)}.</>
        )}
      </p>
      <p className="font-inter text-[16px] leading-7 text-navy-soft">
        {done
          ? `You did the check: ${check.score} of ${check.questions.length} right.`
          : `Here’s a ${check.questions.length}-question check on ${check.topicName} so you don’t fall behind.`}
      </p>
      <Button to={`/student/check/${day}`} variant={done ? 'outline' : 'orange'} icon={done ? 'replay' : 'play_arrow'} className="mt-auto w-full sm:w-fit">
        {done ? 'Try it again' : 'Start the check'}
      </Button>
    </Frame>
  )
}
