import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui/Button'
import { Frame } from '../../components/ui/Frame'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatCard } from '../../components/ui/StatCard'
import { Avatar } from '../../components/ui/ThreadCard'
import { ATTENDANCE, attendanceStats, CLASS, markFor, STUDENTS, TODAY, type Mark } from '../../lib/sample'
import { BlockTitle } from './Overview'

const MARKS: { id: Mark; label: string; letter: string; on: string }[] = [
  { id: 'present', label: 'Present', letter: 'P', on: 'border-[#1F6B3A] bg-[#E3F5EA] text-[#1F5C35]' },
  { id: 'late', label: 'Late', letter: 'L', on: 'border-[#9A5B12] bg-note text-[#6B3F0E]' },
  { id: 'absent', label: 'Absent', letter: 'A', on: 'border-accent-strong bg-[#FBE1D8] text-[#9C3412]' },
]
const MARK_BY_ID = Object.fromEntries(MARKS.map((m) => [m.id, m])) as Record<Mark, (typeof MARKS)[number]>

/** A plain-words summary of one student's week, e.g. "Absent twice (Tue, Wed)". */
function pattern(studentId: string) {
  const days = (mark: Mark) => ATTENDANCE.filter((d) => markFor(d, studentId) === mark).map((d) => d.day)
  const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)
  const absent = days('absent')
  const late = days('late')
  const parts = []
  if (absent.length) parts.push(`Absent ${times(absent.length)} (${absent.join(', ')})`)
  if (late.length) parts.push(`Late ${times(late.length)} (${late.join(', ')})`)
  return { text: parts.length ? parts.join(' · ') : 'Here every day', flag: absent.length >= 2 || late.length >= 2 }
}

export default function TeacherAttendance() {
  const notify = useToast()
  const week = attendanceStats()
  const [marks, setMarks] = useState<Partial<Record<string, Mark>>>({})
  const [saved, setSaved] = useState(false)
  const marked = STUDENTS.filter((s) => marks[s.id]).length
  const allMarked = marked === STUDENTS.length

  const setMark = (id: string, mark: Mark) => {
    setMarks((m) => ({ ...m, [id]: mark }))
    setSaved(false)
  }
  const markAllPresent = () => {
    // Keeps any late or absent marks already set; fills the rest with present.
    setMarks((m) => Object.fromEntries(STUDENTS.map((s) => [s.id, m[s.id] ?? 'present'])))
    setSaved(false)
  }
  const save = () => {
    setSaved(true)
    notify(`Attendance saved for ${TODAY.label}.`)
  }

  return (
    <>
      <SectionHeader as="h1" size="sm" align="left" script="who’s here today?" title="Attendance" />

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Frame label="attendance.frame" tabEnd={<span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-[12px] text-navy">{TODAY.label}</span>} bodyClassName="p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-grotesk text-[22px] font-extrabold tracking-[-0.01em]">{CLASS.name}</h2>
              <p className="font-inter text-[15px] text-navy-soft" aria-live="polite">
                {marked} of {STUDENTS.length} marked
              </p>
            </div>
            <Button variant="outline" icon="done_all" onClick={markAllPresent}>
              Mark all present
            </Button>
          </div>

          <ul className="mt-5 divide-y divide-card-line">
            {STUDENTS.map((s) => (
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

          <div className="mt-5 flex flex-col items-stretch gap-3 border-t border-dashed border-card-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-inter text-[15px] text-navy-soft">
              {saved ? 'Saved. Parents see this in their next update.' : allMarked ? 'Everyone is marked. Ready to save.' : 'Tap Present, Late, or Absent for each student.'}
            </p>
            <Button variant="navy" icon={saved ? 'check' : 'save'} onClick={save} disabled={!allMarked || saved}>
              {saved ? 'Saved' : 'Save attendance'}
            </Button>
          </div>
        </Frame>

        <StatCard
          title="Last week · whole class"
          stats={[
            { value: String(week.rate), symbol: '%', label: 'Here' },
            { value: String(week.absent), label: 'Absences' },
            { value: String(week.late), label: 'Late' },
          ]}
          note={`Mon, Oct 5 to Fri, Oct 9. Late still counts as here.`}
        />
      </div>

      <section aria-labelledby="history" className="mt-16">
        <BlockTitle id="history">Last week, day by day</BlockTitle>
        <Frame label="history.frame" className="mt-6" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">Attendance for each student from Monday to Friday last week, with a short pattern note</caption>
              <thead>
                <tr className="border-b border-card-line font-mono text-[12px] uppercase tracking-[0.12em] text-navy-soft">
                  <th scope="col" className="px-5 py-3 font-medium md:px-7">Student</th>
                  {ATTENDANCE.map((d) => (
                    <th key={d.date} scope="col" className="px-2 py-3 text-center font-medium">
                      {d.day}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3 font-medium md:px-7">Pattern</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-line">
                {STUDENTS.map((s) => {
                  const p = pattern(s.id)
                  return (
                    <tr key={s.id}>
                      <th scope="row" className="px-5 py-3 font-inter text-[15px] font-semibold md:px-7">
                        {s.name}
                      </th>
                      {ATTENDANCE.map((d) => {
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
