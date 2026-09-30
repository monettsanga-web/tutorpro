import { createClient } from '@supabase/supabase-js'

const environment = import.meta.env || {}
const defaultSupabaseUrl = 'https://losmkvvwzijipqrlelyt.supabase.co'
const defaultSupabaseKey = 'sb_publishable_icTkeremuFxwHOy52_gXfQ_x3IibhLL'
const browserRuntime = typeof window !== 'undefined'
const supabaseUrl = environment.VITE_SUPABASE_URL || (browserRuntime ? defaultSupabaseUrl : '')
const supabaseKey = environment.VITE_SUPABASE_ANON_KEY || (browserRuntime ? defaultSupabaseKey : '')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

/*
 * STAYING SIGNED IN
 * -----------------
 * This used to store the session in `sessionStorage`, which every browser
 * throws away the moment the tab is closed. So a parent, a teacher or the
 * administrator had to type their password again every single time they
 * came back — even five minutes later, even on their own phone. On a phone
 * that is worse than it sounds: switching apps can discard the tab, so the
 * session could vanish between booking a lesson and paying for it.
 *
 * `localStorage` survives closing the tab and the browser. Supabase refreshes
 * the access token by itself (autoRefreshToken below), so a session stays
 * alive indefinitely as long as the person keeps using the site, and signing
 * out still clears it immediately.
 *
 * Anyone already signed in has their session in the old place, so it is
 * moved across once rather than logging them out on the day of the change.
 */
const AUTH_STORAGE_KEY = 'tutorpro-supabase-auth'

function authStorage() {
  if (typeof window === 'undefined') return undefined
  try {
    const carriedOver = window.sessionStorage?.getItem(AUTH_STORAGE_KEY)
    if (carriedOver && !window.localStorage.getItem(AUTH_STORAGE_KEY)) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, carriedOver)
    }
    if (carriedOver) window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    // Prove it is usable. Safari in private mode throws on setItem.
    window.localStorage.setItem('tutorpro-storage-probe', '1')
    window.localStorage.removeItem('tutorpro-storage-probe')
    return window.localStorage
  } catch {
    // Private browsing, or storage disabled: fall back to the per-tab store
    // so signing in still works for as long as the tab is open.
    return window.sessionStorage
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY,
        storage: authStorage(),
      },
    })
  : null
