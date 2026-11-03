import { useEffect, useState } from 'react'
import { isoDate, type Mark } from './attendance'
import { useClassData } from './classData'
import { errorMessage, fetchAttendance } from './db'
import { useSession } from './session'

export type MonthMarks = Record<string, Mark>

/** First and last day of a month as YYYY-MM-DD. `month` is 0-based. */
export function monthRange(year: number, month: number) {
  return { from: isoDate(new Date(year, month, 1)), to: isoDate(new Date(year, month + 1, 0)) }
}

type Loaded = { key: string; marks: MonthMarks; error: string | null }

/**
 * A student's own attendance for one month: one mark per day the teacher took attendance.
 * Row level security only returns the student's own rows; the filter below is a second check.
 */
export function useMyAttendance(year: number, month: number) {
  const { user } = useSession()
  const { cls } = useClassData()
  const classId = cls?.id
  const key = `${classId}:${year}-${month}`
  const [result, setResult] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!classId) return
    let live = true
    const { from, to } = monthRange(year, month)
    fetchAttendance(classId, from, to)
      .then((rows) => {
        const marks = Object.fromEntries(rows.filter((r) => r.studentId === user.id).map((r) => [r.day, r.mark]))
        if (live) setResult({ key, marks, error: null })
      })
      .catch((err) => {
        console.error('Could not load attendance', err)
        if (live) setResult({ key, marks: {}, error: errorMessage(err, 'We couldn’t load your attendance.') })
      })
    return () => {
      live = false
    }
  }, [classId, year, month, key, user.id])

  const current = result && result.key === key ? result : null
  const marks = current?.marks ?? {}
  const values = Object.values(marks)
  return {
    loading: Boolean(classId) && !current,
    error: current?.error ?? null,
    marks,
    counts: {
      present: values.filter((m) => m === 'present').length,
      late: values.filter((m) => m === 'late').length,
      absent: values.filter((m) => m === 'absent').length,
      days: values.length,
    },
  }
}
