import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Role } from './roles'

export type { Role }

export type Session = {
  name: string
  email: string
  role: Role
}

type SessionContextValue = {
  session: Session | null
  signIn: (s: Session) => void
  signOut: () => void
}

const STORAGE_KEY = 'compass.session'

/** The demo teacher from the sample class (see sample.ts). */
// oxlint-disable-next-line react/only-export-components
export const DEMO_SESSION: Session = {
  name: 'Ms. Park',
  email: 'ms.park@school.example',
  role: 'teacher',
}

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(load)

  const signIn = useCallback((s: Session) => {
    setSession(s)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch {
      /* storage unavailable: session lives in memory only */
    }
  }, [])

  const signOut = useCallback(() => {
    setSession(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  // The app is a demo: fall back to the sample educator so every screen is browsable.
  return { ...ctx, user: ctx.session ?? DEMO_SESSION }
}
