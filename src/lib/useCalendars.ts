import { useEffect, useState } from 'react'
import type { Book } from './books'
import { chapterPdfLinks, fetchChildCalendars, fetchMyCalendars, MissingMigrationError, type ChildCalendars, type CourseCalendar } from './courseDb'
import { errorMessage } from './db'

type Loaded<T> = { data: T; error: string | null }

function useLoad<T>(load: () => Promise<T>, empty: T, what: string) {
  const [state, setState] = useState<Loaded<T> | null>(null)
  useEffect(() => {
    let live = true
    load()
      .then((data) => live && setState({ data, error: null }))
      .catch((err) => {
        // Before the migration there are no calendars to show; that isn't the viewer's problem.
        if (err instanceof MissingMigrationError) return live && setState({ data: empty, error: null })
        console.error(`Could not load ${what}`, err)
        if (live) setState({ data: empty, error: errorMessage(err, `We couldn’t load ${what}.`) })
      })
    return () => {
      live = false
    }
    // load, empty and what are fixed for each caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { loading: !state, error: state?.error ?? null, data: state?.data ?? empty }
}

const NONE: never[] = []

/** The signed-in student's classes that have a calendar. */
export function useMyCalendars() {
  const r = useLoad<CourseCalendar[]>(fetchMyCalendars, NONE, 'the class calendar')
  return { loading: r.loading, error: r.error, calendars: r.data }
}

/** The signed-in parent's children and their class calendars. */
export function useChildCalendars() {
  const r = useLoad<ChildCalendars[]>(fetchChildCalendars, NONE, 'the class calendar')
  return { loading: r.loading, error: r.error, children: r.data }
}

/** Links to each chapter PDF of a book (valid for an hour), or null while loading or when they aren't available. */
export function usePdfLinks(book: Book | null) {
  const [state, setState] = useState<{ bookId: string; links: Record<number, string> | null; error: boolean } | null>(null)
  useEffect(() => {
    if (!book) return
    let live = true
    chapterPdfLinks(book)
      .then((links) => live && setState({ bookId: book.id, links, error: false }))
      .catch((err) => {
        console.error('Could not get PDF links', err)
        if (live) setState({ bookId: book.id, links: null, error: true })
      })
    return () => {
      live = false
    }
  }, [book])
  const current = book && state?.bookId === book.id ? state : null
  return { links: current?.links ?? null, unavailable: current?.error ?? false }
}
