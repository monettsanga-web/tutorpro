/**
 * Lesson times are stored in Manila time (UTC+8) everywhere in the app.
 * This module converts them for display only, so a parent in Poland sees
 * their own local time instead of having to do the maths.
 *
 * Storage, bookings and availability are never changed by these helpers.
 */

const SCHOOL_TIMEZONE = 'Asia/Manila'
const PREF_KEY = 'tutorpro_timezone_mode'

/** The viewer's IANA timezone, e.g. "Europe/Warsaw". */
export function visitorTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SCHOOL_TIMEZONE
  } catch {
    return SCHOOL_TIMEZONE
  }
}

/** UTC offset in minutes for a timezone at a given instant (DST aware). */
function offsetMinutes(timeZone, date = new Date()) {
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
    return Math.round((asUTC - date.getTime()) / 60000)
  } catch {
    return 0
  }
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
  if (readTimezoneMode() === 'school') return false
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

/**
 * Convert a Manila "HH:MM" to the viewer's local "HH:MM".
 * Returns the time plus a day offset (-1, 0 or +1) when it crosses midnight.
 */
export function toViewerTime(time, dateKey = '', timeZone = visitorTimeZone()) {
  const [hours, minutes] = String(time).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return { time, dayOffset: 0 }
  const shifted = (hours * 60) + minutes + timezoneShiftMinutes(dateKey, timeZone)
  const dayOffset = Math.floor(shifted / 1440)
  const normalized = ((shifted % 1440) + 1440) % 1440
  return {
    time: `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`,
    dayOffset,
  }
}

/** Human 12-hour label for a Manila time, in the viewer's zone. */
export function formatViewerTime(time, dateKey = '', timeZone = visitorTimeZone()) {
  const { time: local, dayOffset } = toViewerTime(time, dateKey, timeZone)
  const [hours, minutes] = local.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 === 0 ? 12 : hours % 12
  const dayNote = dayOffset > 0 ? ' (next day)' : dayOffset < 0 ? ' (prev day)' : ''
  return `${display}:${String(minutes).padStart(2, '0')} ${suffix}${dayNote}`
}

/* Viewer preference: 'local' (default) or 'school' (Manila time). */
export function readTimezoneMode() {
  try { return localStorage.getItem(PREF_KEY) === 'school' ? 'school' : 'local' } catch { return 'local' }
}

export function saveTimezoneMode(mode) {
  try { localStorage.setItem(PREF_KEY, mode === 'school' ? 'school' : 'local') } catch { /* Non-critical. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutorpro:timezone-change'))
}

export { SCHOOL_TIMEZONE }
