/**
 * Lesson times are stored in Manila time (UTC+8) everywhere in the app.
 * This module converts them for display only, so a parent in Poland, Seoul
 * or Kuala Lumpur always sees their OWN local time and never has to do the
 * maths.
 *
 * The viewer's timezone comes from their IP address first (detected once per
 * browser session) and falls back to the device clock setting. There is no
 * manual switch: a family should never be asked to think in Manila time.
 *
 * Storage, bookings and availability are never changed by these helpers —
 * every value written back to the database stays in Manila time.
 */

const SCHOOL_TIMEZONE = 'Asia/Manila'
const IP_ZONE_KEY = 'tutorpro_ip_timezone'
const LEGACY_MODE_KEY = 'tutorpro_timezone_mode'
const TIMEZONE_EVENT = 'tutorpro:timezone-change'

/** IANA zones the browser accepts, e.g. "Europe/Warsaw". */
export function isValidTimeZone(zone) {
  if (!zone || typeof zone !== 'string' || !zone.includes('/')) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date())
    return true
  } catch {
    return false
  }
}

/** Whatever the device clock is set to. Used only when the IP lookup fails. */
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SCHOOL_TIMEZONE
  } catch {
    return SCHOOL_TIMEZONE
  }
}

/** The timezone detected from this visitor's IP address, if we have it. */
export function readIpTimeZone() {
  try {
    const stored = sessionStorage.getItem(IP_ZONE_KEY) || ''
    return isValidTimeZone(stored) ? stored : ''
  } catch {
    return ''
  }
}

export function saveIpTimeZone(zone) {
  if (!isValidTimeZone(zone)) return ''
  try { sessionStorage.setItem(IP_ZONE_KEY, zone) } catch { /* Session-only hint. */ }
  // Older builds let the viewer pin times to Manila. That choice no longer
  // exists, so clear any leftover preference rather than leave it stranded.
  try { localStorage.removeItem(LEGACY_MODE_KEY) } catch { /* Non-critical. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TIMEZONE_EVENT))
  return zone
}

/**
 * The viewer's IANA timezone: IP first, device clock second.
 * Never returns an empty string.
 */
export function visitorTimeZone() {
  return readIpTimeZone() || deviceTimeZone()
}

/* Endpoints are tried in order; the first one that answers with a usable
   IANA zone wins. All are free, keyless and CORS-enabled. */
const IP_TIMEZONE_LOOKUPS = [
  ['https://ipwho.is/?fields=timezone', (payload) => payload?.timezone?.id || payload?.timezone],
  ['https://ipapi.co/json/', (payload) => payload?.timezone],
  ['https://worldtimeapi.org/api/ip', (payload) => payload?.timezone],
]

async function lookupZone(url, read, milliseconds) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = setTimeout(() => controller?.abort(), milliseconds)
  try {
    const response = await fetch(url, { signal: controller?.signal })
    if (!response.ok) return ''
    const payload = await response.json()
    const zone = read(payload)
    return typeof zone === 'string' ? zone : ''
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolve the timezone from the visitor's IP address once per session.
 * Safe to call on every page load: a cached answer short-circuits instantly
 * and a failed lookup silently leaves the device clock in charge.
 */
export async function detectVisitorTimeZone({ timeout = 4000 } = {}) {
  const cached = readIpTimeZone()
  if (cached) return cached
  if (typeof fetch !== 'function') return deviceTimeZone()
  for (const [url, read] of IP_TIMEZONE_LOOKUPS) {
    const zone = await lookupZone(url, read, timeout)
    // A slow answer must never overwrite a zone that arrived while we waited.
    const settled = readIpTimeZone()
    if (settled) return settled
    if (isValidTimeZone(zone)) return saveIpTimeZone(zone) || zone
  }
  return deviceTimeZone()
}

/* Building an Intl.DateTimeFormat is expensive and the weekly calendar asks
   for the same offset hundreds of times per render, so answers are cached. */
const offsetCache = new Map()

/** UTC offset in minutes for a timezone at a given instant (DST aware). */
function offsetMinutes(timeZone, date = new Date()) {
  const dayKey = `${timeZone}|${date.toISOString().slice(0, 10)}`
  if (offsetCache.has(dayKey)) return offsetCache.get(dayKey)
  let result
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
    const asUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour === '24' ? '00' : parts.hour), Number(parts.minute), Number(parts.second),
    )
    result = Math.round((asUTC - date.getTime()) / 60000)
  } catch {
    result = 0
  }
  if (offsetCache.size > 400) offsetCache.clear()
  offsetCache.set(dayKey, result)
  return result
}

/**
 * Minutes to add to a Manila time to get the viewer's local time.
 * Uses the given lesson date so daylight saving is handled correctly.
 */
export function timezoneShiftMinutes(dateKey = '', timeZone = visitorTimeZone()) {
  const reference = dateKey ? new Date(`${dateKey}T12:00:00Z`) : new Date()
  if (Number.isNaN(reference.getTime())) return 0
  return offsetMinutes(timeZone, reference) - offsetMinutes(SCHOOL_TIMEZONE, reference)
}

/** True when the viewer is not in Manila time, so conversion is worth showing. */
export function viewerNeedsConversion(timeZone = visitorTimeZone()) {
  return timezoneShiftMinutes('', timeZone) !== 0
}

/** "UTC+2", "UTC-5", "UTC+5:30" for the viewer's zone. */
export function timezoneLabel(timeZone = visitorTimeZone(), dateKey = '') {
  const reference = dateKey ? new Date(`${dateKey}T12:00:00Z`) : new Date()
  const total = offsetMinutes(timeZone, Number.isNaN(reference.getTime()) ? new Date() : reference)
  const sign = total < 0 ? '-' : '+'
  const abs = Math.abs(total)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}

/** Short city name from an IANA zone, e.g. "Europe/Warsaw" -> "Warsaw". */
export function timezoneCity(timeZone = visitorTimeZone()) {
  return String(timeZone).split('/').pop()?.replace(/_/g, ' ') || timeZone
}

/** "Warsaw (UTC+2)" — the one-line badge shown above the calendar. */
export function timezoneDescription(timeZone = visitorTimeZone(), dateKey = '') {
  return `${timezoneCity(timeZone)} (${timezoneLabel(timeZone, dateKey)})`
}

/** Move a YYYY-MM-DD key by whole days without touching the device timezone. */
export function shiftDateKey(dateKey, days = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) return dateKey
  const value = new Date(`${dateKey}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + Number(days || 0))
  return value.toISOString().slice(0, 10)
}

function splitMinutes(total) {
  const dayOffset = Math.floor(total / 1440)
  const normalized = ((total % 1440) + 1440) % 1440
  return {
    time: `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`,
    dayOffset,
  }
}

/**
 * Convert a Manila "HH:MM" to the viewer's local "HH:MM".
 * Returns the time plus a day offset (-1, 0 or +1) when it crosses midnight.
 */
export function toViewerTime(time, dateKey = '', timeZone = visitorTimeZone()) {
  const [hours, minutes] = String(time).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return { time, dayOffset: 0 }
  return splitMinutes((hours * 60) + minutes + timezoneShiftMinutes(dateKey, timeZone))
}

/**
 * The reverse: a cell the viewer sees at their own "HH:MM" on their own date
 * maps back to a Manila date and time, which is what the database stores.
 */
export function toSchoolTime(time, viewerDateKey = '', timeZone = visitorTimeZone()) {
  const [hours, minutes] = String(time).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return { time, dayOffset: 0 }
  return splitMinutes((hours * 60) + minutes - timezoneShiftMinutes(viewerDateKey, timeZone))
}

/** The Manila { date, time } behind a calendar cell the viewer is looking at. */
export function schoolSlotForViewerCell(viewerDateKey, viewerTime, timeZone = visitorTimeZone()) {
  const { time, dayOffset } = toSchoolTime(viewerTime, viewerDateKey, timeZone)
  return { date: shiftDateKey(viewerDateKey, dayOffset), time }
}

/** The viewer's own calendar date for a lesson stored in Manila time. */
export function viewerDateKey(dateKey, time = '00:00', timeZone = visitorTimeZone()) {
  const { dayOffset } = toViewerTime(time, dateKey, timeZone)
  return shiftDateKey(dateKey, dayOffset)
}

/** Human 12-hour label for a Manila time, in the viewer's zone. */
export function formatViewerTime(time, dateKey = '', timeZone = visitorTimeZone()) {
  if (!time) return ''
  const { time: local } = toViewerTime(time, dateKey, timeZone)
  const [hours, minutes] = local.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return String(time)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 === 0 ? 12 : hours % 12
  return `${display}:${String(minutes).padStart(2, '0')} ${suffix}`
}

/** The exact instant a Manila lesson starts, as a real Date. */
export function lessonInstant(dateKey, time = '00:00') {
  return new Date(`${dateKey}T${String(time).slice(0, 5)}:00+08:00`)
}

/** True when a Manila lesson slot has already passed, wherever the viewer is. */
export function lessonHasPassed(dateKey, time, now = new Date()) {
  const instant = lessonInstant(dateKey, time)
  if (Number.isNaN(instant.getTime())) return false
  return instant <= now
}

export { SCHOOL_TIMEZONE, TIMEZONE_EVENT, IP_ZONE_KEY }
