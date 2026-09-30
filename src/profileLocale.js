/**
 * Remembering what language and timezone a person actually reads in.
 *
 * WHY THIS EXISTS
 * ---------------
 * Emails are sent by a server function, which has no browser and no IP
 * address to look at. It can only use what is stored on the profile. Until
 * now the only clue there was `registrationCountry`, so every notification
 * was written in English AND Chinese and sent to everybody — a parent in
 * Manila received half a message they could not read.
 *
 * The website already knows the answer: VisitorCountry.jsx picks the language
 * from the visitor's IP address, and src/timezone.js resolves their zone
 * the same way. This records both on the account so the server can write
 * one email, in one language, on the reader's own clock.
 *
 * It is a HINT, never a lock: the person can still change the language
 * picker, and that choice is what gets saved.
 */

/**
 * Country → language, mirroring src/VisitorCountry.jsx. Kept here as well so
 * the IP language can be worked out without importing a React component.
 */
const COUNTRY_LANGUAGES = {
  PH: 'en', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
  PL: 'pl',
}

/** The language implied by the visitor's IP country, or ''. */
export function languageForCountry(country) {
  return COUNTRY_LANGUAGES[String(country || '').toUpperCase()] || ''
}

/**
 * What the site is showing this visitor right now.
 *
 * `ipLanguage` and `preferredLanguage` are kept APART on purpose. Emails
 * follow the IP one, because a parent who once clicked Chinese in the
 * picker to see what it looked like must not receive Chinese emails for
 * the rest of time — which is precisely the fault being fixed.
 */
export function currentLocaleSnapshot({ language = '', timeZone = '', country = '' } = {}) {
  return {
    preferredLanguage: String(language || '').trim(),
    ipLanguage: languageForCountry(country),
    timeZone: String(timeZone || '').trim(),
  }
}

/** A timezone we would be willing to write down. */
function usableTimeZone(value) {
  return typeof value === 'string' && value.includes('/') && value.length <= 64
}

/** A language tag the site actually supports, e.g. "en", "ko", "zh-TW". */
function usableLanguage(value) {
  return typeof value === 'string' && /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(value)
}

/**
 * What needs saving, or null when the profile is already correct.
 *
 * Returning null for "no change" is the whole point: this runs on every
 * page load and every language switch, and a needless write would cost a
 * database round trip each time on a free-tier budget.
 */
export function localeChangesFor(account, snapshot) {
  if (!account?.id) return null
  const changes = {}
  const language = snapshot?.preferredLanguage
  if (usableLanguage(language) && account.preferredLanguage !== language) {
    changes.preferredLanguage = language
  }
  const ipLanguage = snapshot?.ipLanguage
  if (usableLanguage(ipLanguage) && account.ipLanguage !== ipLanguage) {
    changes.ipLanguage = ipLanguage
  }
  const zone = snapshot?.timeZone
  if (usableTimeZone(zone) && account.timeZone !== zone) {
    changes.timeZone = zone
  }
  return Object.keys(changes).length ? changes : null
}
