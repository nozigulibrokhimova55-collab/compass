import type { Mark } from './sample'

export type { Mark }

/**
 * One school day. Same shape as the sample data: a student with no entry was present.
 * `taken: false` means nobody marked attendance that day, so it is left out of the totals.
 */
export type AttendanceDay = { date: string; day: string; marks: Partial<Record<string, Mark>>; taken?: boolean }

/** Local date as YYYY-MM-DD. (toISOString would use UTC and can land on the wrong day.) */
export function isoDate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fromIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  next.setDate(next.getDate() + n)
  return next
}

/** The last `count` Monday-to-Friday dates before `from` (not including it), oldest first, as YYYY-MM-DD. */
export function schoolDaysBefore(from: Date, count: number) {
  const days: string[] = []
  let cursor = addDays(from, -1)
  while (days.length < count) {
    const weekday = cursor.getDay()
    if (weekday !== 0 && weekday !== 6) days.unshift(isoDate(cursor))
    cursor = addDays(cursor, -1)
  }
  return days
}

/** "2026-10-12" becomes "Mon". */
export function shortDay(iso: string) {
  return fromIso(iso).toLocaleDateString('en-US', { weekday: 'short' })
}

/** "2026-10-12" becomes "Mon, Oct 12". */
export function longDay(iso: string) {
  return fromIso(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Mon, Oct 5 to Fri, Oct 9" for a list of days. */
export function rangeLabel(days: AttendanceDay[]) {
  if (days.length === 0) return ''
  return `${longDay(days[0].date)} to ${longDay(days[days.length - 1].date)}`
}

export function markFor(day: AttendanceDay, studentId: string): Mark {
  return day.marks[studentId] ?? 'present'
}

/** Attendance totals over the given days. "Late" still counts as attending. Days nobody marked are skipped. */
export function attendanceStats(days: AttendanceDay[], studentIds: string[]) {
  let total = 0
  let absent = 0
  let late = 0
  let counted = 0
  for (const day of days) {
    if (day.taken === false) continue
    counted++
    for (const id of studentIds) {
      total++
      const mark = markFor(day, id)
      if (mark === 'absent') absent++
      if (mark === 'late') late++
    }
  }
  return { rate: total === 0 ? 0 : Math.round(((total - absent) / total) * 100), absent, late, days: counted }
}

/** Due-date choices for a new quiz: the next Friday, the Monday after it, then the Wednesday after that. */
export function dueOptions(from: Date = new Date()) {
  const nextOn = (weekday: number, after: Date) => {
    const x = new Date(after)
    do {
      x.setDate(x.getDate() + 1)
    } while (x.getDay() !== weekday)
    return x
  }
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const fri = nextOn(5, start)
  const mon = nextOn(1, fri)
  const wed = nextOn(3, mon)
  return [fri, mon, wed].map((d) => ({ value: isoDate(d), label: longDay(isoDate(d)) }))
}
