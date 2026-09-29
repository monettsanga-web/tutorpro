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
 * The website already knows the answer: AutoTranslate picks the language
 * from the visitor's IP address, and src/timezone.js resolves their zone
 * the same way. This records both on the account so the server can write
 * one email, in one language, on the reader's own clock.
 *
 * It is a HINT, never a lock: the person can still change the language
 * picker, and that choice is what gets saved.
 */

/** What the site is showing this visitor right now. */
export function currentLocaleSnapshot({ language = '', timeZone = '' } = {}) {
  return {
    preferredLanguage: String(language || '').trim(),
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
  const zone = snapshot?.timeZone
  if (usableTimeZone(zone) && account.timeZone !== zone) {
    changes.timeZone = zone
  }
  return Object.keys(changes).length ? changes : null
}
