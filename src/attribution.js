/**
 * Marketing attribution — where did this family actually come from?
 *
 * Captures UTM tags and the referring site the FIRST time a visitor lands,
 * keeps them for 90 days, and attaches them to the account at registration.
 * That turns "we got 3 sign-ups this week" into "the Facebook mums-group post
 * produced 3 sign-ups and 1 paying family".
 *
 * Privacy: no cookies, no third party, no IP address, no cross-site tracking.
 * Everything stays in this browser's localStorage until the visitor chooses to
 * register, at which point it is saved on their own account record.
 */

const FIRST_TOUCH_KEY = 'tutorpro_attribution_first_v1'
const LAST_TOUCH_KEY = 'tutorpro_attribution_last_v1'
const RETENTION_DAYS = 90

const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

/** Short codes so a link can be `?src=fb` instead of a long UTM string. */
const SHORTHAND_SOURCES = {
  fb: { utm_source: 'facebook', utm_medium: 'social' },
  msg: { utm_source: 'messenger', utm_medium: 'chat' },
  wa: { utm_source: 'whatsapp', utm_medium: 'chat' },
  ig: { utm_source: 'instagram', utm_medium: 'social' },
  yt: { utm_source: 'youtube', utm_medium: 'video' },
  tt: { utm_source: 'tiktok', utm_medium: 'social' },
  naver: { utm_source: 'naver', utm_medium: 'social' },
  kakao: { utm_source: 'kakaotalk', utm_medium: 'chat' },
  flyer: { utm_source: 'flyer', utm_medium: 'offline' },
  qr: { utm_source: 'qr-code', utm_medium: 'offline' },
}

/** Search engines and social sites we can name from the referrer alone. */
const KNOWN_REFERRERS = [
  { match: /google\./i, source: 'google', medium: 'organic' },
  { match: /bing\./i, source: 'bing', medium: 'organic' },
  { match: /duckduckgo\./i, source: 'duckduckgo', medium: 'organic' },
  { match: /yahoo\./i, source: 'yahoo', medium: 'organic' },
  { match: /baidu\./i, source: 'baidu', medium: 'organic' },
  { match: /naver\./i, source: 'naver', medium: 'organic' },
  { match: /yandex\./i, source: 'yandex', medium: 'organic' },
  { match: /facebook\.|fb\.com|fb\.me/i, source: 'facebook', medium: 'social' },
  { match: /messenger\.com|m\.me/i, source: 'messenger', medium: 'chat' },
  { match: /instagram\./i, source: 'instagram', medium: 'social' },
  { match: /tiktok\./i, source: 'tiktok', medium: 'social' },
  { match: /youtube\.|youtu\.be/i, source: 'youtube', medium: 'video' },
  { match: /twitter\.|x\.com/i, source: 'twitter', medium: 'social' },
  { match: /linkedin\./i, source: 'linkedin', medium: 'social' },
  { match: /reddit\./i, source: 'reddit', medium: 'social' },
  { match: /whatsapp\./i, source: 'whatsapp', medium: 'chat' },
  { match: /t\.co\b/i, source: 'twitter', medium: 'social' },
  { match: /pinterest\./i, source: 'pinterest', medium: 'social' },
  { match: /trustpilot\./i, source: 'trustpilot', medium: 'referral' },
]

function readStore(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Private mode: this visit is simply unattributed. */ }
}

function expired(touch) {
  if (!touch?.capturedAt) return true
  const ageDays = (Date.now() - new Date(touch.capturedAt).getTime()) / 86400000
  return !Number.isFinite(ageDays) || ageDays > RETENTION_DAYS
}

/** Turn a referrer URL into a readable source, ignoring our own domain. */
function classifyReferrer(referrer) {
  if (!referrer) return null
  let host = ''
  try { host = new URL(referrer).hostname } catch { return null }
  if (!host || /(^|\.)tutorpro\.site$/i.test(host) || host === window.location.hostname) return null
  const known = KNOWN_REFERRERS.find((entry) => entry.match.test(host))
  if (known) return { utm_source: known.source, utm_medium: known.medium, referrer: host }
  return { utm_source: host.replace(/^www\./, ''), utm_medium: 'referral', referrer: host }
}

/**
 * Read attribution from the current URL, falling back to the referrer.
 * Returns null when there is nothing to record (a plain direct visit).
 */
export function readCurrentTouch() {
  if (typeof window === 'undefined') return null
  let params
  try { params = new URL(window.location.href).searchParams } catch { return null }

  const touch = {}
  UTM_FIELDS.forEach((field) => {
    const value = params.get(field)
    if (value) touch[field] = String(value).slice(0, 120)
  })

  // Shorthand: ?src=fb expands into proper UTM fields, but never overwrites
  // an explicit utm_source the user already set.
  const shorthand = params.get('src')
  if (shorthand) {
    const expansion = SHORTHAND_SOURCES[String(shorthand).toLowerCase()]
    if (expansion) Object.entries(expansion).forEach(([key, value]) => { if (!touch[key]) touch[key] = value })
    else if (!touch.utm_source) touch.utm_source = String(shorthand).slice(0, 120)
  }

  // A referral code is itself an acquisition channel.
  const ref = params.get('ref')
  if (ref && !touch.utm_source) {
    touch.utm_source = 'referral'
    touch.utm_medium = 'word-of-mouth'
    touch.utm_campaign = `ref-${String(ref).slice(0, 40).toUpperCase()}`
  }

  if (!touch.utm_source) {
    const fromReferrer = classifyReferrer(document.referrer)
    if (fromReferrer) Object.assign(touch, fromReferrer)
  }

  if (!touch.utm_source) return null
  touch.landingPage = `${window.location.pathname}${window.location.search ? '' : ''}`.slice(0, 160)
  touch.capturedAt = new Date().toISOString()
  return touch
}

/**
 * Record this visit. First touch is written once and never overwritten
 * (that is the channel that truly earned the family); last touch always
 * updates (that is what closed them).
 */
export function captureAttribution() {
  const touch = readCurrentTouch()
  if (!touch) return getAttribution()

  const existingFirst = readStore(FIRST_TOUCH_KEY)
  if (!existingFirst || expired(existingFirst)) writeStore(FIRST_TOUCH_KEY, touch)
  writeStore(LAST_TOUCH_KEY, touch)
  return getAttribution()
}

/** Everything we know about how this visitor arrived. */
export function getAttribution() {
  const first = readStore(FIRST_TOUCH_KEY)
  const last = readStore(LAST_TOUCH_KEY)
  const valid = (touch) => (touch && !expired(touch) ? touch : null)
  return { firstTouch: valid(first), lastTouch: valid(last) }
}

/**
 * Flat snapshot to store on a new account. Kept small and readable so it can
 * be shown directly in the admin dashboard.
 */
export function attributionSnapshot() {
  const { firstTouch, lastTouch } = getAttribution()
  if (!firstTouch && !lastTouch) return null
  const primary = firstTouch || lastTouch
  return {
    source: primary.utm_source || '',
    medium: primary.utm_medium || '',
    campaign: primary.utm_campaign || '',
    content: primary.utm_content || '',
    term: primary.utm_term || '',
    referrer: primary.referrer || '',
    landingPage: primary.landingPage || '',
    firstSeenAt: firstTouch?.capturedAt || lastTouch?.capturedAt || '',
    lastSource: lastTouch?.utm_source || '',
    lastCampaign: lastTouch?.utm_campaign || '',
  }
}

/** Human label for dashboards: "facebook · social" or "Direct / unknown". */
export function attributionLabel(attribution) {
  if (!attribution?.source) return 'Direct / unknown'
  return attribution.medium ? `${attribution.source} · ${attribution.medium}` : attribution.source
}

/** The channel an account is credited to, for grouping in reports. */
export function accountChannel(account) {
  const source = account?.attribution?.source
  if (source) return source
  if (account?.referredByCode) return 'referral'
  return 'direct'
}
