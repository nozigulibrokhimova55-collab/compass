// Builds a class calendar from a book's syllabus. Pure functions: no React, no database.
//
// Every class day between the start and end date (skipping days with no class) becomes one session.
// Sessions are filled in order: each section of each chosen chapter takes its suggested_classes, then the
// chapter gets one "chapter quiz and review" session. Spare sessions at the end become "Review / flexible".

import type { Book } from './books'

export type SessionKind = 'lesson' | 'chapter_quiz' | 'review' | 'cancelled'

export type ScheduleSettings = {
  startDate: string
  endDate: string
  /** Weekdays with class: 0 is Sunday, 1 Monday … 6 Saturday. */
  classDays: number[]
  /** "10:00", or "" for no set time. */
  classTime: string
  /** Holidays, exams and other days with no class (YYYY-MM-DD). */
  noClassDates: string[]
  /** Chapter numbers, in teaching order. */
  chapters: number[]
  /** Give every section a single class instead of its suggested number. */
  squeeze: boolean
}

/** One thing a session is for, before it has a date. */
export type PlanItem =
  | { kind: 'lesson'; chapter: number; sectionId: string; part: number; parts: number }
  | { kind: 'chapter_quiz'; chapter: number }

export type PlannedSession = {
  day: string
  kind: Exclude<SessionKind, 'cancelled'>
  chapter: number | null
  sectionId: string | null
  /** For sections that take more than one class: this is class `part` of `parts`. */
  part: number
  parts: number
}

export type Plan = {
  sessions: PlannedSession[]
  /** Class days available between the dates. */
  available: number
  /** Sessions the chosen chapters need. */
  needed: number
  /** How many sessions short the dates are (0 when everything fits). */
  short: number
  /** Leftover sessions, shown as "Review / flexible". */
  spare: number
  /** When short: the end date that would fit everything, keeping the same class days. */
  extendTo: string | null
  /** When short: how many sessions the chapters need if every section gets one class. */
  neededIfSqueezed: number
}

// ---------------------------------------------------------------------------
// Dates (local calendar days as YYYY-MM-DD, so time zones can't shift a day)
// ---------------------------------------------------------------------------

export function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysIso(iso: string, days: number) {
  const d = fromIso(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}

export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toIso(fromIso(s)) === s

/** Every class day from `from` to `to` (both included), skipping days with no class. */
export function classDates(from: string, to: string, classDays: number[], noClass: string[], limit = 2000) {
  const skip = new Set(noClass)
  const days = new Set(classDays)
  const out: string[] = []
  for (let day = from; day <= to && out.length < limit; day = addDaysIso(day, 1)) {
    if (days.has(fromIso(day).getDay()) && !skip.has(day)) out.push(day)
  }
  return out
}

// ---------------------------------------------------------------------------
// What has to be taught
// ---------------------------------------------------------------------------

export function planItems(book: Book, chapters: number[], squeeze: boolean): PlanItem[] {
  const items: PlanItem[] = []
  for (const number of chapters) {
    const chapter = book.syllabus.chapters.find((c) => c.number === number)
    if (!chapter) continue
    for (const section of chapter.sections) {
      const parts = squeeze ? 1 : Math.max(1, section.suggested_classes)
      for (let part = 1; part <= parts; part++) items.push({ kind: 'lesson', chapter: number, sectionId: section.id, part, parts })
    }
    items.push({ kind: 'chapter_quiz', chapter: number })
  }
  return items
}

/** Sessions one chapter needs: every section's classes plus the chapter quiz. */
export function chapterNeeds(book: Book, number: number, squeeze: boolean) {
  return planItems(book, [number], squeeze).length
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

/**
 * Lays the chosen chapters onto the class days. `fromDay` starts the calendar later than the start date
 * (used when a calendar is rebuilt after it has begun, so past sessions stay as they were).
 */
export function planCalendar(book: Book, s: ScheduleSettings, fromDay?: string): Plan {
  const start = fromDay && fromDay > s.startDate ? fromDay : s.startDate
  const dates = s.endDate >= start && s.classDays.length > 0 ? classDates(start, s.endDate, s.classDays, s.noClassDates) : []
  const items = planItems(book, s.chapters, s.squeeze)
  const needed = items.length
  const available = dates.length

  const sessions: PlannedSession[] = dates.map((day, i) => {
    const item = items[i]
    if (!item) return { day, kind: 'review', chapter: null, sectionId: null, part: 1, parts: 1 }
    return item.kind === 'lesson'
      ? { day, kind: 'lesson', chapter: item.chapter, sectionId: item.sectionId, part: item.part, parts: item.parts }
      : { day, kind: 'chapter_quiz', chapter: item.chapter, sectionId: null, part: 1, parts: 1 }
  })

  const short = Math.max(0, needed - available)
  let extendTo: string | null = null
  if (short > 0 && s.classDays.length > 0) {
    // Keep counting class days past the end date until there are enough (up to two years ahead).
    const more = classDates(addDaysIso(s.endDate >= start ? s.endDate : addDaysIso(start, -1), 1), addDaysIso(start, 730), s.classDays, s.noClassDates, short)
    extendTo = more.length === short ? more[more.length - 1] : null
  }

  return {
    sessions,
    available,
    needed,
    short,
    spare: Math.max(0, available - needed),
    extendTo,
    neededIfSqueezed: short > 0 ? planItems(book, s.chapters, true).length : needed,
  }
}
