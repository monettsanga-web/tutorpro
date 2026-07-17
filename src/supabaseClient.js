import { createClient } from '@supabase/supabase-js'

const environment = import.meta.env || {}
const supabaseUrl = environment.VITE_SUPABASE_URL || ''
const supabaseKey = environment.VITE_SUPABASE_ANON_KEY || ''

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
