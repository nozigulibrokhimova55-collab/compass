import { useCallback, useEffect, useMemo, useState } from 'react'
import { isoDate, longDay, schoolDaysBefore, shortDay, type AttendanceDay, type Mark } from './attendance'
import { useClassData } from './classData'
import { errorMessage, fetchAttendance, saveAttendance, type AttendanceRow } from './db'
import { ATTENDANCE, TODAY } from './sample'

export type MarkMap = Partial<Record<string, Mark>>

const NO_MARKS: MarkMap = {}
const NO_ROWS: AttendanceRow[] = []
const HISTORY_DAYS = 5

/** Today, plus the five school days before it. */
function makeWindow() {
  const now = new Date()
  return { todayIso: isoDate(now), days: schoolDaysBefore(now, HISTORY_DAYS) }
}

type Loaded = { classId: string; rows: AttendanceRow[]; error: string | null }

/**
 * Attendance for the teacher's class: today's marks (to take or change) and the last five school days.
 * In the demo this is the sample week and nothing is saved. With Supabase it reads and writes the attendance table.
 */
export function useAttendance() {
  const { isDemo, cls } = useClassData()
  const classId = cls?.id
  const needsFetch = !isDemo && !!classId
  // The range is worked out once per visit.
  const [range] = useState(makeWindow)
  const [result, setResult] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!needsFetch || !classId) return
    let cancelled = false
    fetchAttendance(classId, range.days[0], range.todayIso)
      .then((rows) => {
        if (!cancelled) setResult({ classId, rows, error: null })
      })
      .catch((err) => {
        console.error('Could not load attendance', err)
        if (!cancelled) setResult({ classId, rows: NO_ROWS, error: errorMessage(err, 'We couldn’t load attendance.') })
      })
    return () => {
      cancelled = true
    }
  }, [needsFetch, classId, range])

  const current = result && result.classId === classId ? result : null
  const loading = needsFetch && !current
  const error = current?.error ?? null
  const rows = current?.rows ?? NO_ROWS

  const history: AttendanceDay[] = useMemo(() => {
    if (isDemo) return ATTENDANCE
    return range.days.map((date) => {
      const dayRows = rows.filter((r) => r.day === date)
      return {
        date,
        day: shortDay(date),
        taken: dayRows.length > 0,
        marks: Object.fromEntries(dayRows.map((r) => [r.studentId, r.mark])),
      }
    })
  }, [isDemo, rows, range])

  const todayMarks: MarkMap = useMemo(() => {
    if (isDemo) return NO_MARKS
    return Object.fromEntries(rows.filter((r) => r.day === range.todayIso).map((r) => [r.studentId, r.mark]))
  }, [isDemo, rows, range])

  /** Saves today's marks for the whole class. Throws if the save fails, so the page can say so. */
  const save = useCallback(
    async (marks: Record<string, Mark>) => {
      if (isDemo) return
      if (!classId) throw new Error('There is no class to save attendance for.')
      await saveAttendance(classId, range.todayIso, marks)
      setResult((r) => {
        const others = (r?.rows ?? NO_ROWS).filter((row) => row.day !== range.todayIso)
        const today = Object.entries(marks).map(([studentId, mark]) => ({ studentId, day: range.todayIso, mark }))
        return { classId, rows: [...others, ...today], error: null }
      })
    },
    [isDemo, classId, range],
  )

  return {
    isDemo,
    loading,
    error,
    todayIso: isDemo ? TODAY.date : range.todayIso,
    todayLabel: isDemo ? TODAY.label : longDay(range.todayIso),
    history,
    todayMarks,
    save,
  }
}
