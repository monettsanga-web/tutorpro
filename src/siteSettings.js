/**
 * Site-wide settings the administrator controls from the Admin dashboard.
 *
 * Right now this holds the public teacher directory visibility. The settings
 * live in Supabase (`site_settings` table) so a change made by the admin on one
 * device shows for every visitor, and are mirrored into localStorage so the
 * page can render instantly without waiting for a network round-trip.
 *
 * Everything degrades safely: if Supabase is unreachable, or the SQL has not
 * been run yet, the cached value is used, and if there is no cached value the
 * defaults below apply (directory public, as it was before this feature).
 */
import { isSupabaseConfigured, supabase } from './supabaseClient.js'

const CACHE_KEY = 'tutorpro_site_settings_v1'
const SETTINGS_ROW_ID = 'public'

/** Who may open the public teacher directory. */
export const TEACHER_VISIBILITY = {
  PUBLIC: 'public',       // Anyone, including search engines and logged-out visitors
  PARENTS: 'parents',     // Only signed-in accounts (parents, teachers, admin)
  HIDDEN: 'hidden',       // Nobody on the public site; admin dashboard still shows everything
}

export const TEACHER_VISIBILITY_OPTIONS = [
  {
    value: TEACHER_VISIBILITY.PUBLIC,
    label: 'Public',
    hint: 'Everyone can browse teacher profiles, including visitors who are not logged in.',
  },
  {
    value: TEACHER_VISIBILITY.PARENTS,
    label: 'Parents only',
    hint: 'The Teachers link is hidden until a parent logs in. Great for keeping profiles exclusive.',
  },
  {
    value: TEACHER_VISIBILITY.HIDDEN,
    label: 'Hidden',
    hint: 'No teacher profiles appear anywhere on the website. You still manage them in this dashboard.',
  },
]

export const DEFAULT_SITE_SETTINGS = {
  teacherDirectoryVisibility: TEACHER_VISIBILITY.PUBLIC,
}

let cachedSettings = null
const listeners = new Set()

function normalize(raw) {
  const value = raw && typeof raw === 'object' ? raw : {}
  const visibility = String(value.teacherDirectoryVisibility || '').toLowerCase()
  return {
    teacherDirectoryVisibility: Object.values(TEACHER_VISIBILITY).includes(visibility)
      ? visibility
      : DEFAULT_SITE_SETTINGS.teacherDirectoryVisibility,
  }
}

function readCache() {
  try {
    return normalize(JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'))
  } catch {
    return { ...DEFAULT_SITE_SETTINGS }
  }
}

function writeCache(settings) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(settings)) } catch { /* Private mode: in-memory only. */ }
}

function emit(settings) {
  listeners.forEach((listener) => {
    try { listener(settings) } catch { /* One listener must not break the others. */ }
  })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tutorpro:site-settings', { detail: settings }))
  }
}

/** Current settings, read synchronously (cache first, no network). */
export function getSiteSettings() {
  if (!cachedSettings) cachedSettings = readCache()
  return cachedSettings
}

export function teacherDirectoryVisibility() {
  return getSiteSettings().teacherDirectoryVisibility
}

/**
 * Should this viewer be offered the teacher directory?
 * Admins and teachers always keep access so they can check how it looks.
 */
export function canViewTeacherDirectory(account) {
  const visibility = teacherDirectoryVisibility()
  const role = String(account?.role || '').toLowerCase()
  if (role === 'admin' || role === 'teacher') return true
  if (visibility === TEACHER_VISIBILITY.PUBLIC) return true
  if (visibility === TEACHER_VISIBILITY.PARENTS) return Boolean(account)
  return false
}

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribeToSiteSettings(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function applySettings(settings) {
  const next = normalize(settings)
  const changed = JSON.stringify(next) !== JSON.stringify(getSiteSettings())
  cachedSettings = next
  writeCache(next)
  if (changed) emit(next)
  return next
}

/** Load the shared settings from Supabase. Falls back to the cache on any failure. */
export async function loadSiteSettings() {
  if (!isSupabaseConfigured || !supabase) return getSiteSettings()
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', SETTINGS_ROW_ID)
      .maybeSingle()
    if (error) throw error
    if (!data) return getSiteSettings()
    return applySettings(data.settings)
  } catch {
    // Table missing or offline: the cached/default value keeps the site working.
    return getSiteSettings()
  }
}

/**
 * Save settings. Applies locally straight away so the admin sees the change
 * instantly, then writes to Supabase so every other device follows.
 */
export async function saveSiteSettings(changes) {
  const next = applySettings({ ...getSiteSettings(), ...changes })
  if (!isSupabaseConfigured || !supabase) {
    return { settings: next, synced: false, error: 'Shared database is not configured, so this change applies to this browser only.' }
  }
  try {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: SETTINGS_ROW_ID, settings: next, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
    return { settings: next, synced: true, error: '' }
  } catch (error) {
    return {
      settings: next,
      synced: false,
      error: `Saved on this device, but the shared database rejected it: ${error.message || error}. Run supabase/site_settings.sql in Supabase.`,
    }
  }
}

/** Live updates when another admin device changes a setting. */
export function subscribeToCloudSiteSettings() {
  if (!isSupabaseConfigured || !supabase) return () => {}
  const channel = supabase
    .channel('tutorpro-site-settings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload) => {
      if (payload?.new?.settings) applySettings(payload.new.settings)
    })
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch { /* Already closed. */ } }
}

/* ------------------------------------------------------------------ */
/* Per-teacher visibility                                              */
/* ------------------------------------------------------------------ */

/**
 * Is this individual teacher shown on the public directory?
 * Stored on the teacher profile as `teacher.hiddenFromWebsite`, so it travels
 * with the profile through the existing Supabase profile sync. Absent means
 * visible, which keeps every teacher that existed before this feature listed.
 */
export function isTeacherPubliclyListed(teacher) {
  return !teacher?.teacher?.hiddenFromWebsite
}

/** Filter a teacher list down to the ones parents are allowed to see. */
export function publiclyListedTeachers(teachers = []) {
  return teachers.filter(isTeacherPubliclyListed)
}
