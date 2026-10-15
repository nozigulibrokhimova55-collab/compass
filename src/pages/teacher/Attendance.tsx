import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { PageNotice } from '../../components/ui/PageNotice'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { Avatar } from '../../components/ui/ThreadCard'
import { attendanceStats, longDay, markFor, rangeLabel, type AttendanceDay, type Mark } from '../../lib/attendance'
import { useClassData } from '../../lib/classData'
import { errorMessage } from '../../lib/db'
import { useAttendance, type MarkMap } from '../../lib/useAttendance'
import { BlockTitle } from './Overview'

const MARKS: { id: Mark; label: string; letter: string; on: string }[] = [
  { id: 'present', label: 'Present', letter: 'P', on: 'border-[#1F6B3A] bg-[#E3F5EA] text-[#1F5C35]' },
  { id: 'late', label: 'Late', letter: 'L', on: 'border-[#9A5B12] bg-note text-[#6B3F0E]' },
  { id: 'absent', label: 'Absent', letter: 'A', on: 'border-accent-strong bg-[#FBE1D8] text-[#9C3412]' },
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

/** Waits for the class and attendance to load, then shows the page. */
export default function TeacherAttendance() {
  const { loading: classLoading, error: classError, cls } = useClassData()
  const att = useAttendance()

  if (classLoading || att.loading) return <p className="pt-24 text-center font-inter text-[15px] text-navy">Loading…</p>
  if (classError || att.error) {
    return (
      <PageNotice label="error.frame" title="We couldn’t load attendance" alert>
        {classError ?? att.error}
      </PageNotice>
    )
  }
  if (!cls) {
    return (
      <PageNotice label="class.frame" title="No class yet">
        We couldn’t find a class for your account.
      </PageNotice>
    )
  }
  return <AttendanceBody att={att} />
}

/** The page itself. It only mounts once everything has loaded, so today's saved marks can be the starting state. */
function AttendanceBody({ att }: { att: ReturnType<typeof useAttendance> }) {
  const notify = useToast()
  const { isDemo, cls, students } = useClassData()
  const [marks, setMarks] = useState<MarkMap>(att.todayMarks)
  const [saved, setSaved] = useState(() => students.length > 0 && students.every((s) => att.todayMarks[s.id]))
  const [saving, setSaving] = useState(false)

  if (!cls) return null

  const week = attendanceStats(att.history, students.map((s) => s.id))
  const noData = week.days === 0
  const marked = students.filter((s) => marks[s.id]).length
  const allMarked = students.length > 0 && marked === students.length

  const setMark = (id: string, mark: Mark) => {
    setMarks((m) => ({ ...m, [id]: mark }))
    setSaved(false)
  }
  const markAllPresent = () => {
    // Keeps any late or absent marks already set; fills the rest with present.
    setMarks((m) => Object.fromEntries(students.map((s) => [s.id, m[s.id] ?? 'present'])))
    setSaved(false)
  }
  const save = async () => {
    setSaving(true)
    try {
      await att.save(Object.fromEntries(students.map((s) => [s.id, marks[s.id] as Mark])))
      setSaved(true)
      notify(`Attendance saved for ${att.todayLabel}.`)
    } catch (err) {
      console.error('Could not save attendance', err)
      notify(errorMessage(err, 'We couldn’t save attendance. Try again.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const statNote = isDemo
    ? `${rangeLabel(att.history)}. Late still counts as here.`
    : noData
      ? 'Nothing saved for these days yet. Save today’s attendance to start.'
      : `${week.days} of the last ${att.history.length} school days have attendance saved. Late still counts as here.`

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="who’s here today?" title="Attendance" />

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Frame label="attendance.frame" tabEnd={<span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[12px] text-navy">{att.todayLabel}</span>} bodyClassName="p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">{cls.name}</h2>
              <p className="font-inter text-[15px] text-navy-soft" aria-live="polite">
                {marked} of {students.length} marked
              </p>
            </div>
            <Button variant="outline" icon="done_all" onClick={markAllPresent} disabled={students.length === 0}>
              Mark all present
            </Button>
          </div>

          {students.length === 0 ? (
            <p className="mt-5 rounded-xl bg-note px-4 py-3 font-inter text-[15px] leading-6 text-navy">
              No students yet. Share your class code <span className="font-mono font-semibold">{cls.code}</span> and they show up here after they sign up.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-card-line">
              {students.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <Avatar person={{ name: s.name, initials: s.initials }} size="sm" />
                  <span className="min-w-[8rem] flex-1 font-inter text-[16px] font-medium">{s.name}</span>
                  <fieldset className="flex gap-1.5">
                    <legend className="sr-only">{s.name}</legend>
                    {MARKS.map((m) => {
                      const on = marks[s.id] === m.id
                      return (
                        <label
                          key={m.id}
                          className={`flex min-h-11 cursor-pointer items-center gap-1 rounded-full border-[1.5px] px-3 font-inter text-[14px] font-semibold transition-colors duration-150 active:scale-[0.96] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-select ${
                            on ? m.on : 'border-card-line bg-white text-navy-soft hover:border-navy/40 hover:text-navy'
                          }`}
                        >
                          <input type="radio" name={`mark-${s.id}`} value={m.id} checked={on} onChange={() => setMark(s.id, m.id)} className="sr-only" />
                          {on && <Icon name="check" className="text-[16px]" />}
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
              {saved
                ? isDemo
                  ? 'Saved. Parents see this in their next update.'
                  : 'Saved. You can change a mark and save again.'
                : allMarked
                  ? 'Everyone is marked. Ready to save.'
                  : 'Tap Present, Late, or Absent for each student.'}
            </p>
            <Button variant="navy" icon={saved ? 'check' : 'save'} onClick={save} disabled={!allMarked || saved || saving}>
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save attendance'}
            </Button>
          </div>
        </Frame>

        <StatCard
          title={isDemo ? 'Last week · whole class' : 'Last 5 school days · whole class'}
          stats={
            noData
              ? [
                  { value: '–', label: 'Here' },
                  { value: '–', label: 'Absences' },
                  { value: '–', label: 'Late' },
                ]
              : [
                  { value: String(week.rate), symbol: '%', label: 'Here' },
                  { value: String(week.absent), label: 'Absences' },
                  { value: String(week.late), label: 'Late' },
                ]
          }
          note={statNote}
        />
      </div>

      <section aria-labelledby="history" className="mt-16">
        <BlockTitle id="history">{isDemo ? 'Last week, day by day' : 'The last 5 school days'}</BlockTitle>
        <Frame label="history.frame" className="mt-6" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">Attendance for each student over the last school days, with a short pattern note</caption>
              <thead>
                <tr className="border-b border-card-line font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">
                  <th scope="col" className="px-5 py-3 font-medium md:px-7">Student</th>
                  {att.history.map((d) => (
                    <th key={d.date} scope="col" title={longDay(d.date)} className="px-2 py-3 text-center font-medium">
                      {d.day}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3 font-medium md:px-7">Pattern</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-line">
                {students.map((s) => {
                  const p = pattern(att.history, s.id)
                  return (
                    <tr key={s.id}>
                      <th scope="row" className="px-5 py-3 font-inter text-[15px] font-semibold md:px-7">
                        {s.name}
                      </th>
                      {att.history.map((d) => {
                        if (d.taken === false) {
                          return (
                            <td key={d.date} className="px-2 py-3 text-center">
                              <span title="Not taken" className="inline-flex h-8 w-8 items-center justify-center font-mono text-[13px] text-navy-soft">
                                –<span className="sr-only">Not taken</span>
                              </span>
                            </td>
                          )
                        }
                        const m = MARK_BY_ID[markFor(d, s.id)]
                        return (
                          <td key={d.date} className="px-2 py-3 text-center">
                            <span title={m.label} className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] font-mono text-[13px] font-bold ${m.on}`}>
                              {m.letter}
                              <span className="sr-only">: {m.label}</span>
                            </span>
                          </td>
                        )
                      })}
                      <td className={`px-5 py-3 font-inter text-[14px] md:px-7 ${p.flag ? 'font-semibold text-accent-strong' : 'text-navy-soft'}`}>
                        {p.flag && <Icon name="flag" className="mr-1 align-[-4px] text-[18px]" />}
                        {p.text}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="flex flex-wrap gap-x-5 gap-y-1 border-t border-card-line px-5 py-3 font-inter text-[14px] text-navy-soft md:px-7">
            {MARKS.map((m) => (
              <span key={m.id}>
                <b className="font-mono text-navy">{m.letter}</b> {m.label}
              </span>
            ))}
            <span>
              <Icon name="flag" className="mr-0.5 align-[-4px] text-[18px] text-accent-strong" />
              Twice or more in a week
            </span>
          </p>
        </Frame>
      </section>
    </>
  )
}
