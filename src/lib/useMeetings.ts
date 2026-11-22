import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './db'
import { fetchMeetingTeachers, fetchMyMeetings, fetchTeacherMeetings, type MeetingTeacher, type ParentMeeting, type TeacherSlot } from './meetingsDb'

/** How often to check again while the page is open, so a booking made on another phone shows up. */
const POLL_MS = 20000

type Loaded<T> = { loading: boolean; error: string | null; data: T | null }

/**
 * Loads once, then again when the tab comes back into view and every few seconds.
 * A failed refresh keeps showing what we already have. Call `reload` after a change to show it straight away.
 */
function useLoaded<T>(fetcher: () => Promise<T>, failMessage: string) {
  const [state, setState] = useState<Loaded<T>>({ loading: true, error: null, data: null })
  const latest = useRef(0)
  const fetchRef = useRef(fetcher)
  useEffect(() => {
    fetchRef.current = fetcher
  })

  const load = useCallback(async () => {
    const run = ++latest.current
    try {
      const data = await fetchRef.current()
      if (run === latest.current) setState({ loading: false, error: null, data })
    } catch (err) {
      console.error('Could not load meetings', err)
      if (run === latest.current) setState((s) => ({ loading: false, error: s.data ? null : errorMessage(err, failMessage), data: s.data }))
    }
  }, [failMessage])

  useEffect(() => {
    // `load` only sets state after its network call finishes, never synchronously.
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
    const timer = window.setInterval(() => {
      if (!document.hidden) void load()
    }, POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      // `latest` is a plain counter (not a DOM node): bumping it makes any answer still on its way get ignored.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      latest.current++
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  return { ...state, reload: load }
}

/** Teacher: all of my slots (free and booked) from a week ago onward. */
export function useTeacherMeetings() {
  const { data, loading, error, reload } = useLoaded<TeacherSlot[]>(fetchTeacherMeetings, 'We couldn’t load your meeting times.')
  return { loading, error, slots: data ?? [], reload }
}

/** Parent: my children with their teachers, and the meetings I booked. */
export function useParentMeetings() {
  const teachers = useLoaded<MeetingTeacher[]>(fetchMeetingTeachers, 'We couldn’t load your children’s teachers.')
  const meetings = useLoaded<ParentMeeting[]>(fetchMyMeetings, 'We couldn’t load your meetings.')
  const reloadTeachers = teachers.reload
  const reloadMeetings = meetings.reload
  const reload = useCallback(async () => {
    await Promise.all([reloadTeachers(), reloadMeetings()])
  }, [reloadTeachers, reloadMeetings])
  return {
    loading: teachers.loading || meetings.loading,
    error: teachers.error ?? meetings.error,
    teachers: teachers.data ?? [],
    meetings: meetings.data ?? [],
    reload,
  }
}
