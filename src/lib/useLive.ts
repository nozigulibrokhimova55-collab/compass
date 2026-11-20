import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './db'
import { fetchLiveHost, fetchLiveState, fetchMyLiveSession, listLiveSessions, watchPresence, watchTables, type LiveHost, type LiveSession, type LiveState, type LiveStatus } from './liveDb'

/** How often to check again even if the live connection says nothing, in case it dropped. */
const POLL_MS = 3000
/** For lists and banners, where a few seconds' delay doesn't matter. */
const SLOW_POLL_MS = 8000

type Loaded<T> = { loading: boolean; error: string | null; data: T | null }

/**
 * Keeps `fetcher`'s result fresh: loads once, reloads whenever `watch` hears a change, when the tab comes back into view,
 * and every few seconds as a safety net. A failed refresh keeps showing what we already have.
 */
function useFresh<T>(key: string, fetcher: () => Promise<T>, watch: (onChange: () => void) => () => void, pollMs = POLL_MS) {
  const [state, setState] = useState<Loaded<T>>({ loading: true, error: null, data: null })
  const latest = useRef(0)
  // The newest versions of the callbacks, so the effect below only restarts when `key` changes.
  const fetchRef = useRef(fetcher)
  const watchRef = useRef(watch)
  useEffect(() => {
    fetchRef.current = fetcher
    watchRef.current = watch
  })

  const load = useCallback(async () => {
    const run = ++latest.current
    try {
      const data = await fetchRef.current()
      if (run === latest.current) setState({ loading: false, error: null, data })
    } catch (err) {
      console.error('Could not load the live quiz', err)
      if (run === latest.current) setState((s) => ({ loading: false, error: s.data ? null : errorMessage(err, 'We couldn’t load this live quiz.'), data: s.data }))
    }
  }, [])

  useEffect(() => {
    // `load` only sets state after its network call finishes, never synchronously.
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
    let stop: () => void = () => {}
    try {
      stop = watchRef.current(() => void load())
    } catch (err) {
      console.error('Live updates are off, falling back to checking every few seconds', err)
    }
    const timer = window.setInterval(() => {
      if (!document.hidden) void load()
    }, pollMs)
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      // `latest` is a plain counter (not a DOM node): bumping it makes any answer still on its way get ignored.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      latest.current++
      stop()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [key, load, pollMs])

  return { ...state, reload: load }
}

/** Host screen: the session, its questions and every answer, live. */
export function useLiveHost(sessionId: string) {
  return useFresh<LiveHost>(
    `host-${sessionId}`,
    () => fetchLiveHost(sessionId),
    (onChange) => watchTables(`live-host-${sessionId}`, [{ table: 'live_sessions', filter: `id=eq.${sessionId}` }, { table: 'live_answers', filter: `session_id=eq.${sessionId}` }], onChange),
  )
}

/** Student screen: what to show right now, live. */
export function useLiveState(sessionId: string) {
  return useFresh<LiveState>(
    `state-${sessionId}`,
    () => fetchLiveState(sessionId),
    (onChange) => watchTables(`live-state-${sessionId}`, [{ table: 'live_sessions', filter: `id=eq.${sessionId}` }], onChange),
  )
}

/** The class's running session (or null), for the teacher's Live page and the student's banner. */
export function useRunningSession(classId: string | null, role: 'teacher' | 'student') {
  return useFresh<{ id: string; title: string; status: LiveStatus } | null>(
    `running-${role}-${classId ?? 'none'}`,
    async () => {
      if (role === 'student') return fetchMyLiveSession()
      if (!classId) return null
      const list = await listLiveSessions(classId)
      return list.find((s) => s.status !== 'ended') ?? null
    },
    (onChange) => watchTables(`live-running-${role}-${classId ?? 'none'}`, [{ table: 'live_sessions' }], onChange),
    SLOW_POLL_MS,
  )
}

/** Past and running sessions for a class (teacher). */
export function useLiveSessions(classId: string) {
  return useFresh<LiveSession[]>(`list-${classId}`, () => listLiveSessions(classId), (onChange) => watchTables(`live-list-${classId}`, [{ table: 'live_sessions' }], onChange), SLOW_POLL_MS)
}

/** Ids of the students who have the room open right now. */
export function usePresence(sessionId: string, me: string | null) {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    try {
      return watchPresence(sessionId, me, setIds)
    } catch (err) {
      console.error('Could not join the room', err)
    }
  }, [sessionId, me])
  return ids
}
