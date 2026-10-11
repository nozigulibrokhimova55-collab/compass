// Sample class used by the redesigned pages. Every number shown on screen is computed from this data.

export type Mark = 'present' | 'late' | 'absent'

export const TEACHER = { name: 'Ms. Park', initials: 'MP', subject: 'Physics' }

export const CLASS = { name: 'Physics 1, Period 3', code: 'PARK-P3', unit: 'Newton’s laws' }

export const STUDENTS = [
  { id: 'minji', name: 'Minji Kim', initials: 'MK' },
  { id: 'jisoo', name: 'Jisoo Lee', initials: 'JL' },
  { id: 'daniel', name: 'Daniel Cho', initials: 'DC' },
  { id: 'hana', name: 'Hana Choi', initials: 'HC' },
  { id: 'yuna', name: 'Yuna Jung', initials: 'YJ' },
  { id: 'leo', name: 'Leo Kang', initials: 'LK' },
  { id: 'sora', name: 'Sora Han', initials: 'SH' },
  { id: 'theo', name: 'Theo Lim', initials: 'TL' },
]

export const PARENT = { name: 'Mrs. Kim', initials: 'SK', child: 'minji' }

/** This week's attendance, one entry per school day. Missing students were present. */
export const ATTENDANCE: { date: string; day: string; marks: Partial<Record<string, Mark>> }[] = [
  { date: '2026-10-05', day: 'Mon', marks: { leo: 'late' } },
  { date: '2026-10-06', day: 'Tue', marks: { daniel: 'absent' } },
  { date: '2026-10-07', day: 'Wed', marks: { minji: 'late', daniel: 'absent' } },
  { date: '2026-10-08', day: 'Thu', marks: { sora: 'absent' } },
  { date: '2026-10-09', day: 'Fri', marks: { leo: 'late' } },
]

export function markFor(day: (typeof ATTENDANCE)[number], studentId: string): Mark {
  return day.marks[studentId] ?? 'present'
}

/** Attendance totals for the whole class, or for one student. "Late" still counts as attending. */
export function attendanceStats(studentId?: string) {
  const ids = studentId ? [studentId] : STUDENTS.map((s) => s.id)
  let total = 0
  let absent = 0
  let late = 0
  for (const day of ATTENDANCE) {
    for (const id of ids) {
      total++
      const mark = markFor(day, id)
      if (mark === 'absent') absent++
      if (mark === 'late') late++
    }
  }
  return { rate: Math.round(((total - absent) / total) * 100), absent, late, days: ATTENDANCE.length }
}

/** How well Minji knows each topic, from her quiz answers (0 to 1). */
export const TOPICS = [
  { id: 'first-law', name: 'Newton’s first law', mastery: 0.82 },
  { id: 'free-body', name: 'Free-body diagrams', mastery: 0.71 },
  { id: 'second-law', name: 'Newton’s second law', mastery: 0.64 },
  { id: 'third-law', name: 'Newton’s third law', mastery: 0.48 },
]

export const QUIZZES = [
  { id: 'q4', title: 'Quiz 4: Forces and motion', due: 'Fri, Oct 16', questions: 8, done: false },
  { id: 'q3', title: 'Quiz 3: Free-body diagrams', due: 'Fri, Oct 9', questions: 6, done: true, score: 5 },
  { id: 'q2', title: 'Quiz 2: Newton’s first law', due: 'Fri, Oct 2', questions: 6, done: true, score: 6 },
]

export function quizStats() {
  const done = QUIZZES.filter((q) => q.done)
  return { completed: done.length, assigned: QUIZZES.length }
}
