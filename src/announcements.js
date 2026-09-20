import { translateSupportText } from './supportTranslation.js'
import { readVisitorCountry } from './visitorLocale.js'

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

export function saveAnnouncement(entry) {
  const now = Date.now()
  // Sending a new announcement is the natural moment to clear out old ones,
  // so a device that is used regularly never accumulates stale records.
  const announcements = readStore(ANNOUNCEMENTS_KEY)
    .filter((item) => item && item.id && !isAnnouncementExpired(item, now))
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
