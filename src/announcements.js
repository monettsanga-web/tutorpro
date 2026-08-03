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

export function getAnnouncements() {
  return readStore(ANNOUNCEMENTS_KEY)
    .filter((item) => item && item.id)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

export function saveAnnouncement(entry) {
  const announcements = readStore(ANNOUNCEMENTS_KEY)
  const record = {
    id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    subject: entry.subject,
    body: entry.body,
    target: entry.target || 'ALL',
    createdAt: new Date().toISOString(),
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
