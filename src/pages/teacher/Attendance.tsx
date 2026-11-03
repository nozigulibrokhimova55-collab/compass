import { useState } from 'react'
import { BlockTitle, SampleTag } from '../../components/area/AreaBits'
import { plural, useClassGate } from '../../components/area/classGate'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Field, TextInput } from '../../components/ui/Field'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { Avatar } from '../../components/ui/ThreadCard'
import { attendanceStats, longDay, markFor, type AttendanceDay, type Mark } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import { errorMessage } from '../../lib/db'
import { useDayTopic } from '../../lib/sampleData'
import { useAttendance, type MarkMap } from '../../lib/useAttendance'
import { DatePill } from './Home'

const MARKS: { id: Mark; label: string; letter: string; icon: string; on: string }[] = [
  { id: 'present', label: 'Present', letter: 'P', icon: 'check', on: 'border-[#1F6B3A] bg-[#E3F5EA] text-[#1F5C35]' },
  { id: 'late', label: 'Late', letter: 'L', icon: 'schedule', on: 'border-[#9A5B12] bg-note text-[#6B3F0E]' },
  { id: 'absent', label: 'Absent', letter: 'A', icon: 'close', on: 'border-accent-strong bg-[#FBE1D8] text-[#9C3412]' },
]
const MARK_BY_ID = Object.fromEntries(MARKS.map((m) => [m.id, m])) as Record<Mark, (typeof MARKS)[number]>

/** A plain-words summary of one student's recent days, e.g. "Absent twice (Tue, Wed)". Days nobody marked don't count. */
function pattern(history: AttendanceDay[], studentId: string) {
  const taken = history.filter((d) => d.taken !== false)
  if (taken.length === 0) return { text: 'Nothing marked yet', flag: false }
  const days = (mark: Mark) => taken.filter((d) => markFor(d, studentId) === mark).map((d) => d.day)
  const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)
  const absent = days('absent')
  const late = days('late')
  const parts = []
  if (absent.length) parts.push(`Absent ${times(absent.length)} (${absent.join(', ')})`)
  if (late.length) parts.push(`Late ${times(late.length)} (${late.join(', ')})`)
  return { text: parts.length ? parts.join(' · ') : 'Here every day', flag: absent.length >= 2 || late.length >= 2 }
}

export default function TeacherAttendance() {
  const att = useAttendance()
  const gate = useClassGate({ loading: att.loading, error: att.error })
  return gate ?? <AttendanceBody att={att} />
}

/** Only mounts once everything has loaded, so today's saved marks and topic can be the starting state. */
function AttendanceBody({ att }: { att: ReturnType<typeof useAttendance> }) {
  const notify = useToast()
  const { cls, students } = useClassData()
  const day = useDayTopic(cls?.id, att.todayIso)
  const [marks, setMarks] = useState<MarkMap>(att.todayMarks)
  const [marksSaved, setMarksSaved] = useState(() => students.length > 0 && students.every((s) => att.todayMarks[s.id]))
  const [topic, setTopic] = useState(day.topic)
  const [saving, setSaving] = useState(false)

  if (!cls) return null

  const week = attendanceStats(att.history, students.map((s) => s.id))
  const marked = students.filter((s) => marks[s.id]).length
  const allMarked = students.length > 0 && marked === students.length
  const topicChanged = topic.trim() !== day.topic
  const upToDate = students.length === 0 ? !topicChanged : marksSaved && !topicChanged
  const canSave = (students.length === 0 || allMarked) && !upToDate && !saving

  const setMark = (id: string, mark: Mark) => {
    setMarks((m) => ({ ...m, [id]: mark }))
    setMarksSaved(false)
  }
  const markAllPresent = () => {
    // Keeps any late or absent marks already set; fills the rest with present.
    setMarks((m) => Object.fromEntries(students.map((s) => [s.id, m[s.id] ?? 'present'])))
    setMarksSaved(false)
  }
  const save = async () => {
    setSaving(true)
    try {
      if (!marksSaved && students.length > 0) await att.save(Object.fromEntries(students.map((s) => [s.id, marks[s.id] as Mark])))
      day.save(topic)
      setMarksSaved(true)
      notify(`Attendance saved for ${att.todayLabel}.`)
    } catch (err) {
      console.error('Could not save attendance', err)
      notify(errorMessage(err, 'We couldn’t save attendance. Try again.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="who’s here today?" title="Attendance" />

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Frame label="attendance.frame" tabEnd={<DatePill>{att.todayLabel}</DatePill>} bodyClassName="p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">{cls.name}</h2>
              <p className="font-inter text-[15px] text-navy-soft" aria-live="polite">
                {marked} of {plural(students.length, 'student')} marked
              </p>
            </div>
            <Button variant="outline" icon="done_all" onClick={markAllPresent} disabled={students.length === 0}>
              Mark all present
            </Button>
          </div>

          <div className="mt-5 rounded-2xl bg-[#F3F7FC] p-4">
            <Field id="today-topic" label="Today’s topic" icon="menu_book" hint="Students who miss class get a short catch-up check on this topic.">
              <TextInput id="today-topic" placeholder="Newton’s second law" value={topic} hint maxLength={80} onChange={(e) => setTopic(e.target.value)} />
            </Field>
            <p className="mt-2 flex items-center gap-2 font-inter text-[13px] text-navy-soft">
              <SampleTag />
              Saved on this device only for now.
            </p>
          </div>

          {students.length === 0 ? (
            <p className="mt-5 rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6 text-navy">
              No students yet. Share your class code <span className="font-mono font-semibold">{cls.code}</span>. Students show up here after they sign up with it.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-card-line">
              {students.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <Avatar person={{ name: s.name, initials: s.initials }} size="sm" />
                  <span className="min-w-[8rem] flex-1 font-inter text-[16px] font-medium">{s.name}</span>
                  <fieldset className="flex w-full gap-1.5 sm:w-auto">
                    <legend className="sr-only">{s.name}</legend>
                    {MARKS.map((m) => {
                      const on = marks[s.id] === m.id
                      return (
                        <label
                          key={m.id}
                          className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full border-[1.5px] px-3 font-inter text-[14px] font-semibold transition-colors duration-150 active:scale-[0.96] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-select sm:flex-none ${
                            on ? m.on : 'border-card-line bg-white text-navy-soft hover:border-navy/40 hover:text-navy'
                          }`}
                        >
                          <input type="radio" name={`mark-${s.id}`} value={m.id} checked={on} onChange={() => setMark(s.id, m.id)} className="sr-only" />
                          {on && <Icon name={m.icon} className="text-[16px]" />}
                          {m.label}
                        </label>
                      )
                    })}
                  </fieldset>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-col items-stretch gap-3 border-t border-dashed border-card-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-inter text-[15px] text-navy-soft">
              {upToDate ? 'Saved. You can change a mark and save again.' : students.length === 0 ? 'You can save today’s topic now.' : allMarked ? 'Everyone is marked. Ready to save.' : 'Tap Present, Late, or Absent for each student.'}
            </p>
            <Button variant="navy" icon={upToDate ? 'check' : 'save'} onClick={save} disabled={!canSave}>
              {saving ? 'Saving…' : upToDate ? 'Saved' : 'Save attendance'}
            </Button>
          </div>
        </Frame>

        <StatCard
          title="Last 5 school days · whole class"
          stats={
            week.days === 0
              ? [
                  { value: '–', label: 'Here' },
                  { value: '–', label: 'Absent' },
                  { value: '–', label: 'Late' },
                ]
              : [
                  { value: String(week.rate), symbol: '%', label: 'Here' },
                  { value: String(week.absent), label: 'Absent' },
                  { value: String(week.late), label: 'Late' },
                ]
          }
          note={
            week.days === 0
              ? 'Nothing saved for these days yet. Save today’s attendance to start.'
              : `${week.days} of the last ${att.history.length} school days have attendance saved. Late still counts as here.`
          }
        />
      </div>

      {students.length > 0 && <History history={att.history} students={students} />}
    </>
  )
}

function DayDot({ day, studentId }: { day: AttendanceDay; studentId: string }) {
  if (day.taken === false) {
    return (
      <span title={`${longDay(day.date)}: not taken`} className="inline-flex h-8 w-8 items-center justify-center font-mono text-[13px] text-navy-soft">
        –<span className="sr-only">{longDay(day.date)}: not taken</span>
      </span>
    )
  }
  const m = MARK_BY_ID[markFor(day, studentId)]
  return (
    <span title={`${longDay(day.date)}: ${m.label}`} className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] font-mono text-[13px] font-bold ${m.on}`}>
      {m.letter}
      <span className="sr-only">
        {' '}
        {longDay(day.date)}: {m.label}
      </span>
    </span>
  )
}

/** The last five school days per student: a table on wide screens, a card per student on phones. */
function History({ history, students }: { history: AttendanceDay[]; students: { id: string; name: string }[] }) {
  const legend = (
    <p className="flex flex-wrap gap-x-5 gap-y-1 border-t border-card-line px-5 py-3 font-inter text-[14px] text-navy-soft md:px-7">
      {MARKS.map((m) => (
        <span key={m.id}>
          <b className="font-mono text-navy">{m.letter}</b> {m.label}
        </span>
      ))}
      <span>
        <b className="font-mono text-navy">–</b> Not taken
      </span>
      <span>
        <Icon name="flag" className="mr-0.5 align-[-4px] text-[18px] text-accent-strong" />
        Twice or more
      </span>
    </p>
  )

  return (
    <section aria-labelledby="history" className="mt-16">
      <BlockTitle id="history">The last 5 school days</BlockTitle>
      <Frame label="history.frame" className="mt-6" bodyClassName="p-0">
        {/* Phones */}
        <ul className="divide-y divide-card-line md:hidden">
          {students.map((s) => {
            const p = pattern(history, s.id)
            return (
              <li key={s.id} className="px-5 py-4">
                <p className="font-inter text-[16px] font-semibold">{s.name}</p>
                <div className="mt-2 flex gap-1.5">
                  {history.map((d) => (
                    <span key={d.date} className="flex flex-col items-center gap-1">
                      <DayDot day={d} studentId={s.id} />
                      <span aria-hidden="true" className="font-mono text-[11px] uppercase text-navy-soft">
                        {d.day}
                      </span>
                    </span>
                  ))}
                </div>
                <p className={`mt-2 font-inter text-[14px] ${p.flag ? 'font-semibold text-accent-strong' : 'text-navy-soft'}`}>
                  {p.flag && <Icon name="flag" className="mr-1 align-[-4px] text-[18px]" />}
                  {p.text}
                </p>
              </li>
            )
          })}
        </ul>

        {/* Tablets and laptops */}
        <table className="hidden w-full border-collapse text-left md:table">
          <caption className="sr-only">Attendance for each student over the last five school days, with a short pattern note</caption>
          <thead>
            <tr className="border-b border-card-line font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">
              <th scope="col" className="px-7 py-3 font-medium">
                Student
              </th>
              {history.map((d) => (
                <th key={d.date} scope="col" title={longDay(d.date)} className="px-2 py-3 text-center font-medium">
                  {d.day}
                </th>
              ))}
              <th scope="col" className="px-7 py-3 font-medium">
                Pattern
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-line">
            {students.map((s) => {
              const p = pattern(history, s.id)
              return (
                <tr key={s.id}>
                  <th scope="row" className="px-7 py-3 font-inter text-[15px] font-semibold">
                    {s.name}
                  </th>
                  {history.map((d) => (
                    <td key={d.date} className="px-2 py-3 text-center">
                      <DayDot day={d} studentId={s.id} />
                    </td>
                  ))}
                  <td className={`px-7 py-3 font-inter text-[14px] ${p.flag ? 'font-semibold text-accent-strong' : 'text-navy-soft'}`}>
                    {p.flag && <Icon name="flag" className="mr-1 align-[-4px] text-[18px]" />}
                    {p.text}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {legend}
      </Frame>
    </section>
  )
}
