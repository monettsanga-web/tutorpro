const VISITOR_COUNTRY_KEY = 'tutorpro_visitor_country'
const VISITOR_LANGUAGE_KEY = 'tutorpro_visitor_language'

export function readVisitorCountry() {
  try { return sessionStorage.getItem(VISITOR_COUNTRY_KEY) || '' } catch { return '' }
}

export function saveVisitorCountry(country) {
  if (!country) return
  try { sessionStorage.setItem(VISITOR_COUNTRY_KEY, country.toUpperCase()) } catch { /* Session-only hint. */ }
}

/**
 * The language this visitor most likely reads, worked out from their IP
 * country by src/VisitorCountry.jsx.
 *
 * This used to be read from `document.documentElement.lang`, because the old
 * auto-translate widget rewrote that attribute as it machine-translated the
 * page. The page is no longer translated — it is English, and says so — so
 * the hint is kept here instead. It still drives the support chat, the
 * announcement banner and the language a notification email is written in;
 * it never changes a word on the page.
 */
export function readVisitorLanguage() {
  try { return sessionStorage.getItem(VISITOR_LANGUAGE_KEY) || '' } catch { return '' }
}

export function saveVisitorLanguage(language) {
  if (!language) return
  try { sessionStorage.setItem(VISITOR_LANGUAGE_KEY, language) } catch { /* Session-only hint. */ }
}

export function currentVisitorLocale() {
  return { language: readVisitorLanguage() || 'en', country: readVisitorCountry() }
}

export function isChineseVisitor(locale = currentVisitorLocale()) {
  return /^zh(?:-|$)/i.test(locale.language || '') || ['CN', 'HK', 'MO', 'TW'].includes((locale.country || '').toUpperCase())
}

/**
 * Korean visitors get won-denominated pricing set for the Korean market.
 * Matched on language (ko) or country (KR), same pattern as isChineseVisitor.
 */
export function isKoreanVisitor(locale = currentVisitorLocale()) {
  return /^ko(?:-|$)/i.test(locale.language || '') || (locale.country || '').toUpperCase() === 'KR'
}

export function subscribeToVisitorLocale(listener) {
  if (typeof window === 'undefined') return () => {}
  const update = (event) => listener({
    language: event.detail?.language || readVisitorLanguage() || 'en',
    country: event.detail?.country || readVisitorCountry(),
  })
  window.addEventListener('tutorpro:language-change', update)
  return () => window.removeEventListener('tutorpro:language-change', update)
}
