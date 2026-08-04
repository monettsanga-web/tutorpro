const VISITOR_COUNTRY_KEY = 'tutorpro_visitor_country'

export function readVisitorCountry() {
  try { return sessionStorage.getItem(VISITOR_COUNTRY_KEY) || '' } catch { return '' }
}

export function saveVisitorCountry(country) {
  if (!country) return
  try { sessionStorage.setItem(VISITOR_COUNTRY_KEY, country.toUpperCase()) } catch { /* Session-only hint. */ }
}

export function currentVisitorLocale() {
  const language = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en'
  return { language, country: readVisitorCountry() }
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
    language: event.detail?.language || document.documentElement.lang || 'en',
    country: event.detail?.country || readVisitorCountry(),
  })
  window.addEventListener('tutorpro:language-change', update)
  return () => window.removeEventListener('tutorpro:language-change', update)
}
