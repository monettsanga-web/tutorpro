import { useEffect } from 'react'
import {
  readVisitorCountry,
  saveVisitorCountry,
  saveVisitorLanguage,
} from './visitorLocale.js'

/**
 * Works out which country the visitor is in, and nothing more.
 *
 * WHAT THIS REPLACED, AND WHY
 * ---------------------------
 * This used to be `AutoTranslate.jsx`. It looked up the visitor's country
 * from their IP address and then machine-translated the entire website with
 * the Google Translate widget, at the same URL, on the fly. Three things
 * were wrong with that, all of them bad for search ranking:
 *
 *  1. ONE URL, MANY LANGUAGES. https://www.tutorpro.site/ returned English
 *     to a crawler in one country and machine Korean or Chinese to a crawler
 *     in another. Google calls these "locale-adaptive pages" and warns that
 *     it crawls from a small number of locations, so it may never see the
 *     version you intended — and may treat what it does see as unstable.
 *
 *  2. IT OVERWROTE THE <title>. `document.title = pageTitles[language]`
 *     replaced the title written for search ("Online English Classes for
 *     Kids & Students | TutorPro English PH") with a tagline. Google renders
 *     JavaScript, so whatever the script set is what could be indexed.
 *
 *  3. IT COMPETED WITH THE REAL TRANSLATIONS. The site already has
 *     hand-written /kr/, /cn/ and /tw/ pages, each with its own URL and
 *     hreflang tag. That is how multilingual SEO is supposed to work.
 *     Machine-translating the English page as well gave Google two versions
 *     of the same content in the same language and no clear winner.
 *
 * It also pulled a script from translate.google.com, which is blocked in
 * mainland China — the exact audience the /cn/ pages exist for.
 *
 * WHAT STILL WORKS, UNCHANGED
 *   - the support chat still translates messages both ways
 *   - notification emails still follow the IP country (src/profileLocale.js)
 *   - Korean pricing, the China sign-in options and the announcement banner
 *     all still read the detected country
 *   - /kr/, /cn/ and /tw/ are still linked in the footer and in hreflang
 *
 * This component renders nothing. It detects, records, announces, and stops.
 */

/* Country → the language that person most likely reads. Used for emails and
   for the chat, never to rewrite the page. */
const countryLanguages = {
  PH: 'en', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
  PL: 'pl',
}

const KNOWN = new Set(['en', 'tl', 'ko', 'zh-CN', 'zh-TW', 'ja', 'es', 'fr', 'de', 'pt', 'ar', 'vi', 'th', 'pl'])

function browserLanguage() {
  const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en'
  if (/^(fil|tl)/i.test(locale)) return 'tl'
  if (/^zh-(tw|hk)/i.test(locale)) return 'zh-TW'
  if (/^zh/i.test(locale)) return 'zh-CN'
  const short = locale.split('-')[0]
  return KNOWN.has(short) ? short : 'en'
}

async function lookupCountry(url, readCountry) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 2600)
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) return ''
    const payload = await response.json()
    return (readCountry(payload) || '').toUpperCase()
  } catch {
    return ''
  } finally {
    window.clearTimeout(timeout)
  }
}

async function detectCountry() {
  const lookups = [
    ['https://api.country.is/', (payload) => payload.country],
    ['https://ipwho.is/', (payload) => (payload.success === false ? '' : payload.country_code)],
  ]
  for (const [url, readCountry] of lookups) {
    const country = await lookupCountry(url, readCountry)
    if (country) return { country, language: countryLanguages[country] || browserLanguage() }
  }
  return { country: readVisitorCountry(), language: browserLanguage() }
}

/**
 * Anyone who visited while the old widget was live still carries a `googtrans`
 * cookie. Google Translate reads that cookie on sight, so without this they
 * would keep seeing a machine-translated page for a year after the fix.
 */
function clearOldTranslationState() {
  const expire = (domain) => {
    document.cookie = `googtrans=;path=/;max-age=0;SameSite=Lax${domain ? `;domain=${domain}` : ''}`
  }
  try {
    expire('')
    const parts = window.location.hostname.split('.')
    if (parts.length > 1) expire(`.${parts.slice(-2).join('.')}`)
  } catch { /* Cookies unavailable; nothing to clear. */ }
  try { localStorage.removeItem('tutorpro_language') } catch { /* Storage unavailable. */ }
  const widget = document.getElementById('google_translate_element')
  if (widget) widget.remove()
  const script = document.getElementById('google-translate-script')
  if (script) script.remove()
}

export default function VisitorCountry() {
  useEffect(() => {
    clearOldTranslationState()

    let cancelled = false
    detectCountry().then(({ country, language }) => {
      if (cancelled) return
      if (country) saveVisitorCountry(country)
      saveVisitorLanguage(language)
      /* The page itself stays in English. `document.documentElement.lang` is
         deliberately NOT touched: it describes what the page is written in,
         and lying about it is what told assistive technology and search
         engines that an English page was Korean. */
      window.dispatchEvent(
        new CustomEvent('tutorpro:language-change', { detail: { language, country } }),
      )
    })
    return () => { cancelled = true }
  }, [])

  return null
}
