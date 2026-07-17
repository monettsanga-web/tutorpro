import { createClient } from '@supabase/supabase-js'

const environment = import.meta.env || {}
const defaultSupabaseUrl = 'https://losmkvvwzijipqrlelyt.supabase.co'
const defaultSupabaseKey = 'sb_publishable_icTkeremuFxwHOy52_gXfQ_x3IibhLL'
const browserRuntime = typeof window !== 'undefined'
const supabaseUrl = environment.VITE_SUPABASE_URL || (browserRuntime ? defaultSupabaseUrl : '')
const supabaseKey = environment.VITE_SUPABASE_ANON_KEY || (browserRuntime ? defaultSupabaseKey : '')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'tutorpro-supabase-auth',
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      },
    })
  : null
