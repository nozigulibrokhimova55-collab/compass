// Edits to a saved class calendar. Pure functions: no React, no database.
//
// Each edit takes every session (past ones included) plus the schedule settings and returns the new full list
// and settings. Saving replaces only sessions from today on (save_class_calendar), so past classes never change.
// The page only offers edits on days from today on; these functions check that too.

import { addDaysIso, classDates, fromIso, type ScheduleSettings, type SessionKind } from './schedulePlan'

export type CalRow = {
  day: string
  kind: SessionKind
  chapter: number | null
  sectionId: string | null
  part: number
  parts: number
}

type Content = Omit<CalRow, 'day'>

export type EditResult = {
  rows: CalRow[]
  settings: ScheduleSettings
  /** How many other classes changed day. */
  moved: number
  /** The new last day, when the calendar had to grow. */
  newEnd: string | null
  /** A "Review / flexible" day that was used up to make room. */
  usedReview: string | null
}

export class EditError extends Error {}

const content = (r: CalRow): Content => ({ kind: r.kind, chapter: r.chapter, sectionId: r.sectionId, part: r.part, parts: r.parts })
const at = (day: string, c: Content): CalRow => ({ day, ...c })
const REVIEW: Content = { kind: 'review', chapter: null, sectionId: null, part: 1, parts: 1 }
const CANCELLED: Content = { kind: 'cancelled', chapter: null, sectionId: null, part: 1, parts: 1 }
const byDay = (a: CalRow, b: CalRow) => a.day.localeCompare(b.day) || (a.kind === 'cancelled' ? -1 : 1)
const isActive = (r: CalRow) => r.kind !== 'cancelled'

function future(day: string, today: string, what: string) {
  if (day < today) throw new EditError(`${what} has already happened. Past classes don’t change.`)
}

/** The first class day after `after` that has no class yet (up to two years ahead). */
function nextFreeClassDay(after: string, s: ScheduleSettings, taken: Set<string>) {
  const found = classDates(addDaysIso(after, 1), addDaysIso(after, 730), s.classDays, s.noClassDates).find((d) => !taken.has(d))
  if (!found) throw new EditError('There’s no free class day in the next two years.')
  return found
}

function withDay(s: ScheduleSettings, day: string): ScheduleSettings {
  return {
    ...s,
    startDate: day < s.startDate ? day : s.startDate,
    endDate: day > s.endDate ? day : s.endDate,
    noClassDates: s.noClassDates.filter((d) => d !== day),
  }
}

export function activeOn(rows: CalRow[], day: string) {
  return rows.find((r) => r.day === day && isActive(r)) ?? null
}

/**
 * Cancel the class on `day`. Its lesson and every later one move back one class day, until a
 * "Review / flexible" day takes up the slack. With no review day left, the calendar grows by one class day.
 */
export function cancelSession(rows: CalRow[], day: string, s: ScheduleSettings, today: string): EditResult {
  future(day, today, 'This class')
  const target = activeOn(rows, day)
  if (!target) throw new EditError('There’s no class on that day.')
  const settings: ScheduleSettings = { ...s, noClassDates: [...new Set([...s.noClassDates, day])].sort() }
  const earlier = rows.filter((r) => r.day < day)
  const otherCancelled = rows.filter((r) => r.day > day && !isActive(r))
  const later = rows.filter((r) => r.day > day && isActive(r)).sort(byDay)
  const out: CalRow[] = [...earlier, at(day, CANCELLED), ...otherCancelled]

  if (target.kind === 'review') return { rows: [...out, ...later].sort(byDay), settings, moved: 0, newEnd: null, usedReview: null }

  let carry: Content | null = content(target)
  let moved = 0
  let usedReview: string | null = null
  for (const r of later) {
    if (!carry) {
      out.push(r)
    } else if (r.kind === 'review') {
      out.push(at(r.day, carry))
      usedReview = r.day
      carry = null
    } else {
      out.push(at(r.day, carry))
      carry = content(r)
      moved++
    }
  }
  let newEnd: string | null = null
  if (carry) {
    const last = out.reduce((m, r) => (r.day > m ? r.day : m), day)
    const free = nextFreeClassDay(last, settings, new Set(out.filter(isActive).map((r) => r.day)))
    out.push(at(free, carry))
    if (free > settings.endDate) {
      newEnd = free
      settings.endDate = free
    }
  }
  return { rows: out.sort(byDay), settings, moved, newEnd, usedReview }
}

/**
 * Add a class on a day that has none. `review` adds a "Review / flexible" class and changes nothing else.
 * `pull` teaches the next lesson that day: every later class moves up one, and the last one becomes review.
 */
export function addSession(rows: CalRow[], day: string, mode: 'review' | 'pull', s: ScheduleSettings, today: string): EditResult {
  future(day, today, 'That day')
  if (activeOn(rows, day)) throw new EditError('That day already has a class.')
  const settings = withDay(s, day)
  const kept = rows.filter((r) => r.day !== day)
  if (mode === 'review') return { rows: [...kept, at(day, REVIEW)].sort(byDay), settings, moved: 0, newEnd: null, usedReview: null }

  const later = kept.filter((r) => r.day > day && isActive(r)).sort(byDay)
  const rest = kept.filter((r) => !(r.day > day && isActive(r)))
  if (later.length === 0) return { rows: [...kept, at(day, REVIEW)].sort(byDay), settings, moved: 0, newEnd: null, usedReview: null }
  const slots = [day, ...later.map((r) => r.day)]
  const shifted = later.map((r, i) => at(slots[i], content(r)))
  shifted.push(at(slots[slots.length - 1], REVIEW))
  return { rows: [...rest, ...shifted].sort(byDay), settings, moved: later.filter((r) => r.kind !== 'review').length, newEnd: null, usedReview: null }
}

/** Move one class to another day. If that day has a class, the two swap. */
export function moveSession(rows: CalRow[], from: string, to: string, s: ScheduleSettings, today: string): EditResult {
  future(from, today, 'This class')
  future(to, today, 'That day')
  if (from === to) throw new EditError('Pick a different day.')
  const a = activeOn(rows, from)
  if (!a) throw new EditError('There’s no class on that day.')
  const b = activeOn(rows, to)
  const settings = withDay(s, to)
  if (b) {
    const out = rows.map((r) => (r === a ? at(from, content(b)) : r === b ? at(to, content(a)) : r))
    return { rows: out.sort(byDay), settings, moved: 1, newEnd: null, usedReview: null }
  }
  const out = rows.filter((r) => r !== a && r.day !== to).concat(at(to, content(a)))
  return { rows: out.sort(byDay), settings, moved: 0, newEnd: to > s.endDate ? to : null, usedReview: null }
}

/** Remove a "Review / flexible" class. Nothing else moves. */
export function removeReview(rows: CalRow[], day: string, s: ScheduleSettings, today: string): EditResult {
  future(day, today, 'This class')
  const target = activeOn(rows, day)
  if (!target || target.kind !== 'review') throw new EditError('Only review / flexible classes can be removed.')
  return { rows: rows.filter((r) => r !== target), settings: s, moved: 0, newEnd: null, usedReview: null }
}

/**
 * From `from` on, class meets on `classDays` instead. Lessons from that day on are laid out again in the same order
 * on the new days (cancelled days stay off). Spare days become review; if they don't fit, the end date moves.
 */
export function changeClassDays(rows: CalRow[], from: string, classDays: number[], s: ScheduleSettings, today: string): EditResult & { classes: number } {
  future(from, today, 'That day')
  if (classDays.length === 0) throw new EditError('Pick at least one class day.')
  const before = rows.filter((r) => r.day < from)
  const cancelled = rows.filter((r) => r.day >= from && !isActive(r))
  const later = rows.filter((r) => r.day >= from && isActive(r)).sort(byDay)
  const contents = later.map(content)
  while (contents.length && contents[contents.length - 1].kind === 'review') contents.pop()

  const off = new Set(cancelled.map((r) => r.day))
  const end = s.endDate >= from ? s.endDate : from
  let dates = classDates(from, end, classDays, s.noClassDates).filter((d) => !off.has(d))
  let newEnd: string | null = null
  if (dates.length < contents.length) {
    const more = classDates(addDaysIso(end, 1), addDaysIso(end, 730), classDays, s.noClassDates)
      .filter((d) => !off.has(d))
      .slice(0, contents.length - dates.length)
    dates = [...dates, ...more]
    newEnd = dates[dates.length - 1] ?? null
  }
  const placed = dates.map((d, i) => at(d, contents[i] ?? REVIEW))
  const oldDays = new Map(later.map((r) => [`${r.kind}|${r.sectionId}|${r.part}|${r.chapter}`, r.day]))
  const moved = placed.filter((r) => r.kind !== 'review' && oldDays.get(`${r.kind}|${r.sectionId}|${r.part}|${r.chapter}`) !== r.day).length
  return {
    rows: [...before, ...cancelled, ...placed].sort(byDay),
    settings: { ...s, classDays: [...classDays].sort(), endDate: newEnd && newEnd > s.endDate ? newEnd : s.endDate },
    moved,
    newEnd: newEnd && newEnd > s.endDate ? newEnd : null,
    usedReview: null,
    classes: placed.length,
  }
}

/** Weekday names for messages: "Tuesday and Thursday". */
export function dayNames(days: number[]) {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const list = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => names[d])
  return list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

export const weekdayOf = (day: string) => fromIso(day).getDay()
