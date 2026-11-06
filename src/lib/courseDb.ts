// Queries for course materials, class schedules and class sessions (the syllabus calendar).
// Kept apart from db.ts so Mauricio's file stays as it is. Tables come from
// supabase/migrations/20261106000001_syllabus_calendar.sql. Pages never import the Supabase client directly.

import { chapterPath, filePage, STORAGE_BUCKET, type Book, type BookChapter } from './books'
import type { PlannedSession, ScheduleSettings, SessionKind } from './schedulePlan'
import { supabase } from './supabase'

export const MIGRATION_FILE = 'supabase/migrations/20261106000001_syllabus_calendar.sql'

/** Thrown when the calendar tables don't exist yet, so pages can say what to run. */
export class MissingMigrationError extends Error {
  constructor() {
    super(`The calendar tables aren’t set up yet. Run ${MIGRATION_FILE} in the Supabase SQL Editor.`)
  }
}

function client() {
  if (!supabase) throw new Error('Supabase is not set up. Add the two keys from .env.example.')
  return supabase
}

/** Supabase reports a missing table or function with these codes. */
function check(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === 'PGRST205' || error.code === 'PGRST202' || error.code === '42P01' || error.code === '42883') throw new MissingMigrationError()
  throw error
}

export type SavedSchedule = ScheduleSettings & { bookId: string; updatedAt: string }

export type ClassSession = {
  id: string
  day: string
  startsAt: string | null
  kind: SessionKind
  chapter: number | null
  sectionId: string | null
  part: number
  parts: number
  note: string | null
}

// ---------------------------------------------------------------------------
// Course materials
// ---------------------------------------------------------------------------

/** Book ids linked to a class, oldest first. */
export async function fetchCourseBooks(classId: string): Promise<string[]> {
  const { data, error } = await client().from('course_materials').select('book_id').eq('class_id', classId).order('created_at')
  check(error)
  return (data ?? []).map((r) => r.book_id as string)
}

/** A teacher picks a book for their class. */
export async function addCourseBook(classId: string, bookId: string) {
  const { error } = await client().from('course_materials').upsert({ class_id: classId, book_id: bookId }, { onConflict: 'class_id,book_id', ignoreDuplicates: true })
  check(error)
}

/** Links that open each chapter's PDF (valid for an hour), keyed by chapter number. */
export async function chapterPdfLinks(book: Book): Promise<Record<number, string>> {
  const chapters = book.syllabus.chapters
  const { data, error } = await client().storage.from(STORAGE_BUCKET).createSignedUrls(chapters.map((c) => chapterPath(book, c)), 3600)
  if (error) throw error
  const out: Record<number, string> = {}
  chapters.forEach((c, i) => {
    const url = data?.[i]?.signedUrl
    if (url) out[c.number] = url
  })
  return out
}

/** A chapter link that opens at a printed book page. */
export function atPage(link: string, book: Book, chapter: BookChapter, bookPage: number) {
  return `${link}#page=${filePage(book, chapter, bookPage)}`
}

// ---------------------------------------------------------------------------
// Schedule and sessions
// ---------------------------------------------------------------------------

export async function fetchSchedule(classId: string): Promise<SavedSchedule | null> {
  const { data, error } = await client()
    .from('class_schedules')
    .select('book_id, start_date, end_date, class_days, class_time, no_class_dates, chapters, squeezed, updated_at')
    .eq('class_id', classId)
    .maybeSingle()
  check(error)
  if (!data) return null
  return {
    bookId: data.book_id,
    startDate: data.start_date,
    endDate: data.end_date,
    classDays: data.class_days,
    classTime: data.class_time ? String(data.class_time).slice(0, 5) : '',
    noClassDates: data.no_class_dates ?? [],
    chapters: data.chapters,
    squeeze: data.squeezed,
    updatedAt: data.updated_at,
  }
}

export async function fetchSessions(classId: string): Promise<ClassSession[]> {
  const { data, error } = await client()
    .from('class_sessions')
    .select('id, day, starts_at, kind, chapter, section_id, part, parts, note')
    .eq('class_id', classId)
    .order('day')
  check(error)
  return (data ?? []).map((r) => ({
    id: r.id,
    day: r.day,
    startsAt: r.starts_at ? String(r.starts_at).slice(0, 5) : null,
    kind: r.kind,
    chapter: r.chapter,
    sectionId: r.section_id,
    part: r.part,
    parts: r.parts,
    note: r.note,
  }))
}

/** Saves the setup and replaces upcoming sessions in one step (save_class_calendar in the migration). */
export async function saveCalendar(classId: string, bookId: string, s: ScheduleSettings, sessions: PlannedSession[]): Promise<number> {
  const { data, error } = await client().rpc('save_class_calendar', {
    p_class: classId,
    p_schedule: {
      book_id: bookId,
      start_date: s.startDate,
      end_date: s.endDate,
      class_days: s.classDays,
      class_time: s.classTime,
      no_class_dates: s.noClassDates,
      chapters: s.chapters,
      squeezed: s.squeeze,
    },
    p_sessions: sessions.map((x) => ({ day: x.day, kind: x.kind, chapter: x.chapter, section_id: x.sectionId, part: x.part, parts: x.parts })),
  })
  check(error)
  return Number(data ?? 0)
}
