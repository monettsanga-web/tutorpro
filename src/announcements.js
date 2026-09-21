import { translateSupportText } from './supportTranslation.js'
import { readVisitorCountry } from './visitorLocale.js'
import { isSupabaseConfigured, supabase } from './supabaseClient.js'

const ANNOUNCEMENTS_KEY = 'tutorpro_announcements_v1'
const DISMISSED_KEY = 'tutorpro_announcements_dismissed_v1'

/** Country -> language, matching the map used by AutoTranslate.jsx. */
export const COUNTRY_LANGUAGES = {
  PH: 'tl', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
  PL: 'pl',
}

export const LANGUAGE_LABELS = {
  en: 'English', tl: 'Filipino', ko: '한국어', 'zh-CN': '简体中文', 'zh-TW': '繁體中文',
  ja: '日本語', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português',
  ar: 'العربية', vi: 'Tiếng Việt', th: 'ไทย', pl: 'Polski',
}

/** "Announcement" heading in each supported language. */
const ANNOUNCEMENT_LABELS = {
  en: 'Announcement', tl: 'Anunsyo', ko: '공지사항', 'zh-CN': '公告', 'zh-TW': '公告',
  ja: 'お知らせ', es: 'Anuncio', fr: 'Annonce', de: 'Ankündigung', pt: 'Aviso',
  ar: 'إعلان', vi: 'Thông báo', th: 'ประกาศ', pl: 'Ogłoszenie',
}

const ORIGINAL_LABELS = {
  en: 'Original (English)', tl: 'Orihinal (Ingles)', ko: '원문 (영어)', 'zh-CN': '原文（英文）',
  'zh-TW': '原文（英文）', ja: '原文（英語）', es: 'Original (inglés)', fr: 'Original (anglais)',
  de: 'Original (Englisch)', pt: 'Original (inglês)', ar: '‏النص الأصلي (الإنجليزية)',
  vi: 'Bản gốc (tiếng Anh)', th: 'ต้นฉบับ (ภาษาอังกฤษ)', pl: 'Oryginał (angielski)',
}

export function announcementLabel(language) {
  return ANNOUNCEMENT_LABELS[language] || ANNOUNCEMENT_LABELS.en
}

export function originalLabel(language) {
  return ORIGINAL_LABELS[language] || ORIGINAL_LABELS.en
}

/** Language for a country code (from an IP lookup or a saved registration country). */
export function languageForCountry(country) {
  if (!country) return 'en'
  return COUNTRY_LANGUAGES[String(country).toUpperCase()] || 'en'
}

/**
 * Language to translate an announcement into for the current viewer.
 * Priority: explicit site language choice -> live IP country -> account signup country.
 */
export function viewerLanguage(account = null) {
  if (typeof document !== 'undefined') {
    const chosen = document.documentElement.lang
    if (chosen && chosen !== 'en') return chosen
  }
  const liveCountry = readVisitorCountry()
  if (liveCountry) {
    const fromIp = languageForCountry(liveCountry)
    if (fromIp !== 'en') return fromIp
  }
  if (account?.registrationCountry) return languageForCountry(account.registrationCountry)
  return 'en'
}

/* ------------------------------------------------------------------ */
/* Translation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Translate an announcement into one language.
 * Subject and body are translated separately so a long body cannot
 * blow the translation API's length limit for the subject.
 * Body paragraphs are translated line by line to preserve formatting.
 */
export async function translateAnnouncement(subject, body, language) {
  if (!language || language === 'en') return null
  const lines = String(body || '').split('\n')
  const [translatedSubject, ...translatedLines] = await Promise.all([
    translateSupportText(subject || '', language),
    ...lines.map((line) => (line.trim() ? translateSupportText(line, language) : Promise.resolve(''))),
  ])
  const translatedBody = translatedLines
    .map((line, index) => (lines[index].trim() ? line || lines[index] : ''))
    .join('\n')
  const changed = (translatedSubject && translatedSubject !== subject)
    || (translatedBody.trim() && translatedBody.trim() !== String(body || '').trim())
  if (!changed) return null
  return {
    language,
    label: LANGUAGE_LABELS[language] || language,
    subject: translatedSubject || subject,
    body: translatedBody || body,
  }
}

/** Translate one announcement into several languages at once (for email sending). */
export async function translateAnnouncementBatch(subject, body, languages = []) {
  const unique = [...new Set(languages.filter((code) => code && code !== 'en'))]
  const results = await Promise.all(unique.map((code) => translateAnnouncement(subject, body, code).catch(() => null)))
  const map = {}
  results.forEach((result) => { if (result) map[result.language] = result })
  return map
}

/** Build the bilingual email body: their language first, English underneath. */
export function buildBilingualEmail(subject, body, translation) {
  if (!translation) return { subject, body }
  const divider = '\n\n────────────────────────\n\n'
  return {
    subject: `${translation.subject} · ${subject}`,
    body: `${translation.body}${divider}${originalLabel(translation.language)}\n\n${body}`,
  }
}

/* ------------------------------------------------------------------ */
/* Dashboard announcement storage                                      */
/* ------------------------------------------------------------------ */

function readStore(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

/**
 * How long a dashboard announcement stays visible.
 *
 * Announcements are news, not permanent notices. Left forever they become
 * wallpaper: parents stop reading the banner, so the one message that really
 * matters gets ignored too. Two days is long enough that somebody who logs in
 * once over a weekend still sees it.
 */
export const ANNOUNCEMENT_LIFETIME_DAYS = 2
export const ANNOUNCEMENT_LIFETIME_MS = ANNOUNCEMENT_LIFETIME_DAYS * 24 * 60 * 60 * 1000

/**
 * When an announcement stops being shown.
 *
 * Falls back to `createdAt + lifetime` when `expiresAt` is absent, so
 * announcements saved BEFORE this feature existed also expire — that is what
 * makes old banners disappear on their own without anyone clearing them.
 * An unparseable or missing date is treated as already expired rather than
 * immortal: a record with no timestamp is broken, and a broken record should
 * not outlive every valid one.
 */
export function announcementExpiry(item) {
  if (!item) return 0
  const explicit = Date.parse(item.expiresAt || '')
  if (Number.isFinite(explicit)) return explicit
  const created = Date.parse(item.createdAt || '')
  if (!Number.isFinite(created)) return 0
  return created + ANNOUNCEMENT_LIFETIME_MS
}

/** Has this announcement passed its visible lifetime? */
export function isAnnouncementExpired(item, now = Date.now()) {
  return announcementExpiry(item) <= now
}

/**
 * "disappears in 2 days" / "disappears in 5 hours", for the admin list.
 *
 * The clock is read here rather than in the component because calling
 * `Date.now()` during render is an impure call and an error under this
 * repo's `react-hooks/purity` rule.
 */
export function announcementCountdownLabel(item, now = Date.now()) {
  const hours = Math.max(0, Math.ceil((announcementExpiry(item) - now) / (60 * 60 * 1000)))
  if (hours === 0) return 'disappearing now'
  if (hours > 24) return `disappears in ${Math.ceil(hours / 24)} days`
  return `disappears in ${hours} hour${hours === 1 ? '' : 's'}`
}

/**
 * Delete expired announcements from storage.
 *
 * Filtering on read is what users see; this is the housekeeping that stops
 * the list growing forever in a device's localStorage. Returns how many were
 * removed so callers can avoid pointless writes.
 */
export function pruneExpiredAnnouncements(now = Date.now()) {
  const stored = readStore(ANNOUNCEMENTS_KEY)
  const kept = stored.filter((item) => item && item.id && !isAnnouncementExpired(item, now))
  if (kept.length === stored.length) return 0
  try { localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(kept)) } catch { /* Non-critical. */ }
  return stored.length - kept.length
}

export function getAnnouncements(now = Date.now()) {
  return readStore(ANNOUNCEMENTS_KEY)
    .filter((item) => item && item.id && !isAnnouncementExpired(item, now))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

/** Remove one announcement from this device immediately. */
export function removeAnnouncement(id) {
  const kept = readStore(ANNOUNCEMENTS_KEY).filter((item) => item?.id !== id)
  try { localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(kept)) } catch { /* Non-critical. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutorpro:data-change'))
}

/** Remove every announcement from this device immediately. */
export function clearAnnouncements() {
  try { localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify([])) } catch { /* Non-critical. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutorpro:data-change'))
}

/* ------------------------------------------------------------------ */
/* Shared storage (Supabase)                                           */
/* ------------------------------------------------------------------ */

/**
 * Announcements are shared through Supabase so they actually reach families.
 *
 * Previously they lived only in localStorage, which meant an announcement was
 * written into the ADMIN's browser and never travelled: parents saw nothing on
 * their dashboards, and the expiry and replacement rules were being applied to
 * a message with no audience.
 *
 * They ride inside the existing `site_settings` row rather than a table of
 * their own. That is a deliberate trade: a dedicated table would be tidier,
 * but it would need a migration run by hand before anything worked, and that
 * step is exactly where this kept stalling. This row already exists, is
 * already world-readable, and is already admin-only for writes.
 *
 * localStorage remains a cache so the banner paints instantly and still works
 * offline. Every cloud call fails soft.
 */

function writeCache(items) {
  const next = JSON.stringify(items.slice(0, 20))
  // Only announce a real change. Firing the event unconditionally made every
  // refresh re-enter this path and produced a storm of identical reads.
  let previous = null
  try { previous = localStorage.getItem(ANNOUNCEMENTS_KEY) } catch { /* Non-critical. */ }
  if (previous === next) return
  try { localStorage.setItem(ANNOUNCEMENTS_KEY, next) } catch { /* Non-critical. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutorpro:data-change'))
}

/**
 * Pull the shared announcements into the local cache.
 * Returns the fresh list, or the cached one when the cloud is unavailable.
 */
export async function loadCloudAnnouncements() {
  if (!isSupabaseConfigured || !supabase) return getAnnouncements()
  try {
    // Read the row directly rather than going through loadSiteSettings, which
    // falls back to the cache on failure. That fallback is right for a
    // settings toggle but wrong here: an empty result from a failed read
    // would overwrite the cache and erase announcements this device already
    // holds. Only a CONFIRMED remote read is allowed to replace the cache.
    const { data, error } = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 'public')
      .maybeSingle()
    if (error) throw error
    const raw = Array.isArray(data?.settings?.announcements) ? data.settings.announcements : []
    const live = raw.filter((item) => item && item.id && !isAnnouncementExpired(item))
    writeCache(live)
    return live
  } catch {
    // Offline or unreachable: keep whatever this device already had.
    return getAnnouncements()
  }
}

/** Write the announcement list back to the shared row. */
async function saveCloudList(items) {
  const { saveSiteSettings } = await import('./siteSettings.js')
  const { synced, error } = await saveSiteSettings({ announcements: items.slice(0, 20) })
  writeCache(items)
  return { synced, error }
}

/** Publish an announcement to every device. */
export async function publishCloudAnnouncement(record) {
  try {
    const { loadSiteSettings } = await import('./siteSettings.js')
    const settings = await loadSiteSettings().catch(() => ({ announcements: [] }))
    const kept = (settings.announcements || [])
      .filter((item) => !isAnnouncementExpired(item))
      // Replacement is applied to the SHARED list, so the previous
      // announcement disappears from every parent's dashboard, not just here.
      .filter((item) => !supersedesAnnouncement(record.target, item.target))
    return await saveCloudList([record, ...kept])
  } catch (error) {
    return {
      synced: false,
      error: `Posted on this device only: ${error.message || error}`,
    }
  }
}

/** Withdraw one announcement from every device. */
export async function removeCloudAnnouncement(id) {
  removeAnnouncement(id)
  try {
    const { loadSiteSettings } = await import('./siteSettings.js')
    const settings = await loadSiteSettings().catch(() => ({ announcements: [] }))
    const kept = (settings.announcements || []).filter((item) => item.id !== id)
    return await saveCloudList(kept)
  } catch {
    return { synced: false }
  }
}

/** Withdraw every announcement from every device. */
export async function clearCloudAnnouncements() {
  clearAnnouncements()
  try {
    return await saveCloudList([])
  } catch {
    return { synced: false }
  }
}

/**
 * Live updates for signed-in readers, so a parent with the dashboard already
 * open sees a new announcement appear and a withdrawn one vanish.
 * Rides the existing site-settings subscription, which is only opened for a
 * signed-in user and so never puts a logged-out visitor on a socket.
 */
export function subscribeToCloudAnnouncements() {
  if (!isSupabaseConfigured || !supabase) return () => {}
  let stopSettings = () => {}
  let cancelled = false

  import('./siteSettings.js').then(({ subscribeToCloudSiteSettings, subscribeToSiteSettings }) => {
    if (cancelled) return
    const stopSocket = subscribeToCloudSiteSettings()
    const stopLocal = subscribeToSiteSettings((settings) => {
      const live = (settings.announcements || []).filter((item) => !isAnnouncementExpired(item))
      writeCache(live)
    })
    stopSettings = () => { stopSocket(); stopLocal() }
  }).catch(() => {})

  return () => {
    cancelled = true
    stopSettings()
  }
}

/** Which roles actually see an announcement with this target. */
function audienceOf(target) {
  const value = String(target || 'ALL').toUpperCase()
  if (value === 'STUDENT' || value === 'STUDENTS') return new Set(['STUDENT'])
  if (value === 'TEACHER' || value === 'TEACHERS') return new Set(['TEACHER'])
  return new Set(['STUDENT', 'TEACHER'])
}

/**
 * Does a new announcement replace an older one?
 *
 * Only when everybody who could see the OLD one will also see the NEW one.
 * Otherwise sending a note to teachers would silently delete a notice the
 * parents still needed — removing a message from an audience that was never
 * given a replacement is the one genuinely destructive outcome here.
 *
 *   new ALL      replaces ALL, Students, Teachers
 *   new Students replaces Students only  (an ALL notice still stands for teachers)
 *   new Teachers replaces Teachers only
 */
export function supersedesAnnouncement(newTarget, oldTarget) {
  const incoming = audienceOf(newTarget)
  return [...audienceOf(oldTarget)].every((role) => incoming.has(role))
}

export function saveAnnouncement(entry) {
  const now = Date.now()
  // A new announcement replaces the previous one rather than stacking on top
  // of it: parents should open their dashboard and see the current message,
  // not a pile of history they have to read through to find what changed.
  const announcements = readStore(ANNOUNCEMENTS_KEY)
    .filter((item) => item && item.id && !isAnnouncementExpired(item, now))
    .filter((item) => !supersedesAnnouncement(entry.target || 'ALL', item.target))
  const record = {
    id: `ann_${now}_${Math.random().toString(36).slice(2, 8)}`,
    subject: entry.subject,
    body: entry.body,
    target: entry.target || 'ALL',
    createdAt: new Date(now).toISOString(),
    // Stored explicitly so the deadline is fixed when the announcement is
    // sent, rather than recomputed from a constant that might change later.
    expiresAt: new Date(now + ANNOUNCEMENT_LIFETIME_MS).toISOString(),
    // Pre-translated copies so viewers do not each hit the translation API.
    translations: entry.translations || {},
  }
  const next = [record, ...announcements].slice(0, 30)
  try { localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(next)) } catch { /* Non-critical. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutorpro:data-change'))
  return record
}

/** Announcements this account should see and has not dismissed. */
export function visibleAnnouncements(account) {
  if (!account) return []
  const dismissed = new Set(readStore(DISMISSED_KEY))
  const role = String(account.role || '').toUpperCase()
  return getAnnouncements().filter((item) => {
    if (dismissed.has(item.id)) return false
    const target = String(item.target || 'ALL').toUpperCase()
    if (target === 'ALL') return true
    if (target === 'STUDENTS' || target === 'STUDENT') return role === 'STUDENT'
    if (target === 'TEACHERS' || target === 'TEACHER') return role === 'TEACHER'
    return true
  })
}

export function dismissAnnouncement(id) {
  const dismissed = readStore(DISMISSED_KEY)
  if (!dismissed.includes(id)) {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, id].slice(-100))) } catch { /* Non-critical. */ }
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutorpro:data-change'))
}
