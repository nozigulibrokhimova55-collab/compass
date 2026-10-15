import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when both env vars are set. When false, Compass runs as the sample-data demo. */
export const isSupabaseConfigured = Boolean(url && key)

const KEEP_KEY = 'compass.keepSignedIn'

function keepSignedIn() {
  try {
    return localStorage.getItem(KEEP_KEY) !== 'false'
  } catch {
    return true
  }
}

/** The "Keep me signed in" box on the login page. Call this just before signing in. */
export function setKeepSignedIn(keep: boolean) {
  try {
    localStorage.setItem(KEEP_KEY, String(keep))
  } catch {
    /* storage unavailable: the choice just isn't remembered */
  }
}

/**
 * Where Supabase keeps the login. Kept signed in: localStorage, so it survives closing the browser.
 * Not kept: sessionStorage, so it ends with the tab.
 */
const authStorage = {
  getItem(storageKey: string) {
    try {
      return sessionStorage.getItem(storageKey) ?? localStorage.getItem(storageKey)
    } catch {
      return null
    }
  },
  setItem(storageKey: string, value: string) {
    try {
      const keep = keepSignedIn()
      ;(keep ? localStorage : sessionStorage).setItem(storageKey, value)
      ;(keep ? sessionStorage : localStorage).removeItem(storageKey)
    } catch {
      /* storage unavailable: the login lives in memory only */
    }
  },
  removeItem(storageKey: string) {
    try {
      sessionStorage.removeItem(storageKey)
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
  },
}

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null
