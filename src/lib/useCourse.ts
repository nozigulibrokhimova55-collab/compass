import { useCallback, useEffect, useState } from 'react'
import { getBook, type Book } from './books'
import { fetchCourseBooks, fetchSchedule, fetchSessions, MissingMigrationError, type ClassSession, type SavedSchedule } from './courseDb'
import { errorMessage } from './db'

type Loaded = {
  classId: string
  book: Book | null
  /** A linked book id this app doesn't have a syllabus.json for. */
  unknownBook: string | null
  schedule: SavedSchedule | null
  sessions: ClassSession[]
  error: string | null
  missingMigration: boolean
}

/** A class's textbook, saved schedule and sessions. */
export function useCourse(classId: string | undefined) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  const load = useCallback(async (id: string) => {
    try {
      const [books, schedule, sessions] = await Promise.all([fetchCourseBooks(id), fetchSchedule(id), fetchSessions(id)])
      const bookId = schedule?.bookId ?? books[0] ?? null
      const book = getBook(bookId)
      return { classId: id, book, unknownBook: bookId && !book ? bookId : null, schedule, sessions, error: null, missingMigration: false }
    } catch (err) {
      console.error('Could not load the course', err)
      const missing = err instanceof MissingMigrationError
      return { classId: id, book: null, unknownBook: null, schedule: null, sessions: [], error: errorMessage(err, 'We couldn’t load the course.'), missingMigration: missing }
    }
  }, [])

  useEffect(() => {
    if (!classId) return
    let live = true
    load(classId).then((r) => live && setLoaded(r))
    return () => {
      live = false
    }
  }, [classId, load])

  const reload = useCallback(async () => {
    if (classId) setLoaded(await load(classId))
  }, [classId, load])

  const current = loaded && loaded.classId === classId ? loaded : null
  return {
    loading: Boolean(classId) && !current,
    error: current?.error ?? null,
    missingMigration: current?.missingMigration ?? false,
    book: current?.book ?? null,
    unknownBook: current?.unknownBook ?? null,
    schedule: current?.schedule ?? null,
    sessions: current?.sessions ?? [],
    reload,
  }
}
