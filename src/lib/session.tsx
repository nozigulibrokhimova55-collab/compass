import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { classCodeExists, fetchProfile, inviteCodeExists, type Profile } from './db'
import type { Role } from './roles'
import { isSupabaseConfigured, setKeepSignedIn, supabase } from './supabase'

export type { Role }

export type Session = {
  name: string
  email: string
  role: Role
  /** The Supabase user id. Missing on demo sessions. */
  id?: string
  /** Students only: the code a parent types at sign-up to link to this student. */
  inviteCode?: string | null
  /** True for the sample "Ms. Park" session: everything on screen is sample data. */
  demo?: boolean
}

export type SignUpInput = {
  name: string
  email: string
  password: string
  role: Role
  language: string
  /** Teachers: the name of their first class. */
  className?: string
  /** Students: the code their teacher gave them. */
  classCode?: string
  /** Parents: the invite code from their child. */
  inviteCode?: string
}

export type AuthResult = { ok: true; session: Session } | { ok: false; error: string }
/** `session: null` means the account was made but the person must confirm their email first. */
export type SignUpResult = { ok: true; session: Session | null } | { ok: false; error: string; field?: 'email' | 'classCode' | 'inviteCode' }
export type SimpleResult = { ok: true } | { ok: false; error: string }

type SessionContextValue = {
  session: Session | null
  /** True while Supabase is still working out who is signed in. Always false in the sample-data demo. */
  loading: boolean
  /** Demo only: start a browser-only session. */
  signIn: (s: Session) => void
  signOut: () => Promise<void>
  logIn: (email: string, password: string, keep: boolean) => Promise<AuthResult>
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  sendReset: (email: string) => Promise<SimpleResult>
  updatePassword: (password: string) => Promise<SimpleResult>
}

const STORAGE_KEY = 'compass.session'

/** The demo teacher from the sample class (see sample.ts). */
// oxlint-disable-next-line react/only-export-components
export const DEMO_SESSION: Session = {
  name: 'Ms. Park',
  email: 'ms.park@school.example',
  role: 'teacher',
  demo: true,
}

function loadLocal(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? (JSON.parse(raw) as Session) : null
    // With Supabase on, the only browser-only session allowed is the demo one.
    if (stored && isSupabaseConfigured && !stored.demo) return null
    return stored
  } catch {
    return null
  }
}

function toSession(p: Profile): Session {
  return { id: p.id, name: p.name, email: p.email, role: p.role, inviteCode: p.inviteCode }
}

/** Looks up the profile for a signed-in user. Returns null if it is missing or can't be read. */
async function sessionFor(userId: string): Promise<Session | null> {
  try {
    const profile = await fetchProfile(userId)
    return profile ? toSession(profile) : null
  } catch (err) {
    console.error('Could not load the profile', err)
    return null
  }
}

const PROFILE_MISSING = 'We signed you in but could not find your profile. If this is a new Supabase project, run supabase/schema.sql in the SQL Editor first.'

/** Turns Supabase's error text into something a teacher or student can act on. */
function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Check them and try again.'
  if (/email not confirmed/i.test(message)) return 'Confirm your email first. Check your inbox for our message.'
  if (/already (been )?registered/i.test(message)) return 'That email already has an account. Try logging in.'
  if (/rate limit|too many/i.test(message)) return 'Too many tries. Wait a minute, then try again.'
  if (/failed to fetch|network/i.test(message)) return 'Can’t reach the server. Check your connection and try again.'
  return `Something went wrong: ${message}`
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<Session | null>(loadLocal)
  const [real, setReal] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  // Keep `real` in step with Supabase auth: the first event reports any saved login,
  // later ones report logging in, logging out, and password recovery links.
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    const { data } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === 'TOKEN_REFRESHED') return
      // Don't call Supabase from inside this callback: it can lock up the auth client. Hop out first.
      window.setTimeout(async () => {
        const next = authSession ? await sessionFor(authSession.user.id) : null
        if (cancelled) return
        setReal(next)
        setLoading(false)
      }, 0)
    })
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback((s: Session) => {
    setLocal(s)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch {
      /* storage unavailable: session lives in memory only */
    }
  }, [])

  const signOut = useCallback(async () => {
    setLocal(null)
    setReal(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    if (supabase) {
      try {
        // "local" ends this browser's login only, not the person's logins on other devices.
        await supabase.auth.signOut({ scope: 'local' })
      } catch (err) {
        console.error('Sign out failed', err)
      }
    }
  }, [])

  const logIn = useCallback(async (email: string, password: string, keep: boolean): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Supabase is not set up yet.' }
    setKeepSignedIn(keep)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: friendlyAuthError(error.message) }
    const session = await sessionFor(data.user.id)
    if (!session) {
      await supabase.auth.signOut({ scope: 'local' })
      return { ok: false, error: PROFILE_MISSING }
    }
    setReal(session)
    return { ok: true, session }
  }, [])

  const signUp = useCallback(async (input: SignUpInput): Promise<SignUpResult> => {
    if (!supabase) return { ok: false, error: 'Supabase is not set up yet.' }

    // Check codes first so the form can say "we couldn't find that code" instead of making a stray account.
    try {
      if (input.role === 'student' && !(await classCodeExists(input.classCode ?? ''))) {
        return { ok: false, field: 'classCode', error: 'We couldn’t find that class code. Check it with your teacher.' }
      }
      if (input.role === 'parent' && !(await inviteCodeExists(input.inviteCode ?? ''))) {
        return { ok: false, field: 'inviteCode', error: 'We couldn’t find that invite code. Check it with your child.' }
      }
    } catch (err) {
      console.error('Code check failed', err)
      return { ok: false, error: 'We couldn’t check that code. Try again in a moment.' }
    }

    setKeepSignedIn(true)
    // The database trigger reads these to build the profile, and the class or link for the role.
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          name: input.name,
          role: input.role,
          language: input.language,
          ...(input.role === 'teacher' && input.className?.trim() ? { class_name: input.className.trim() } : {}),
          ...(input.role === 'student' ? { class_code: input.classCode?.trim() } : {}),
          ...(input.role === 'parent' ? { invite_code: input.inviteCode?.trim() } : {}),
        },
      },
    })
    if (error) {
      const message = friendlyAuthError(error.message)
      return { ok: false, error: message, field: /already has an account/.test(message) ? 'email' : undefined }
    }
    // When an email is already taken, Supabase answers with a user that has no identities.
    if (data.user && data.user.identities?.length === 0) {
      return { ok: false, field: 'email', error: 'That email already has an account. Try logging in.' }
    }
    if (!data.session || !data.user) return { ok: true, session: null }

    const session = await sessionFor(data.user.id)
    if (!session) return { ok: false, error: PROFILE_MISSING }
    setReal(session)
    return { ok: true, session }
  }, [])

  const sendReset = useCallback(async (email: string): Promise<SimpleResult> => {
    if (!supabase) return { ok: false, error: 'Supabase is not set up yet.' }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true }
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<SimpleResult> => {
    if (!supabase) return { ok: false, error: 'Supabase is not set up yet.' }
    const { error } = await supabase.auth.updateUser({ password })
    return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true }
  }, [])

  const session = real ?? local
  const value = useMemo(
    () => ({ session, loading, signIn, signOut, logIn, signUp, sendReset, updatePassword }),
    [session, loading, signIn, signOut, logIn, signUp, sendReset, updatePassword],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  // Without Supabase, or on the demo session, every screen shows the sample class and is browsable by anyone.
  const isDemo = !isSupabaseConfigured || !ctx.session || ctx.session.demo === true
  return { ...ctx, isDemo, user: ctx.session ?? DEMO_SESSION }
}
