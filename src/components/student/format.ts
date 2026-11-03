import { isoDate, longDay } from '../../lib/attendance'

/** "Due today", "Due tomorrow", "Due Fri, Nov 14", "Was due Mon, Nov 10". */
export function dueText(due: string | null) {
  if (!due) return 'No due date'
  const today = isoDate(new Date())
  const t = new Date()
  const tomorrow = isoDate(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1))
  if (due === today) return 'Due today'
  if (due === tomorrow) return 'Due tomorrow'
  return due < today ? `Was due ${longDay(due)}` : `Due ${longDay(due)}`
}
