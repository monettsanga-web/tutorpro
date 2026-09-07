/**
 * Recognise a Supabase service restriction (HTTP 402) and explain it plainly.
 *
 * WHY THIS EXISTS
 * ---------------
 * If the free-plan quota is exceeded and the Fair Use Policy is applied,
 * every Supabase request answers with a 402 and a code such as
 * `exceeded_egress_quota`. Without this, that would surface to a parent as an
 * unexplained "could not load" — indistinguishable from the site being broken.
 *
 * It is important that the message says clearly that NOTHING HAS BEEN LOST.
 * Supabase's own documentation is explicit: a restriction blocks access, it
 * does not delete rows, buckets or the project, and the dashboard still shows
 * all the data. Access returns automatically when the billing cycle resets.
 *
 * This is a read-only diagnostic helper. It changes no behaviour and sends no
 * requests of its own.
 */

/** Quota codes Supabase returns alongside a 402. */
const QUOTA_CODES = [
  'exceeded_egress_quota',
  'exceeded_cached_egress_quota',
  'exceeded_db_size_quota',
  'exceeded_storage_size_quota',
  'exceeded_realtime_message_quota',
  'exceeded_monthly_active_users_quota',
  'overdue_payment',
]

/** Plain-English names for the quota that ran out. */
const QUOTA_LABELS = {
  exceeded_egress_quota: 'monthly data transfer',
  exceeded_cached_egress_quota: 'monthly cached data transfer',
  exceeded_db_size_quota: 'database size',
  exceeded_storage_size_quota: 'file storage',
  exceeded_realtime_message_quota: 'live update',
  exceeded_monthly_active_users_quota: 'monthly active user',
  overdue_payment: 'billing',
}

function textOf(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  return [error.message, error.details, error.hint, error.error, error.code]
    .filter(Boolean)
    .map(String)
    .join(' ')
}

/**
 * Is this error a Supabase service restriction rather than an ordinary
 * failure? Checks the status code and the documented quota codes, so a
 * message that merely contains "402" cannot produce a false positive.
 */
export function isServiceRestriction(error) {
  if (!error) return false
  const status = Number(error.status ?? error.statusCode ?? error.code)
  const haystack = textOf(error).toLowerCase()
  const hasQuotaCode = QUOTA_CODES.some((code) => haystack.includes(code))
  if (hasQuotaCode) return true
  if (status !== 402) return false
  // A bare 402 from Supabase is a restriction; anything else is not ours.
  return haystack.includes('restrict') || haystack.includes('quota') || haystack.includes('fair use')
}

/** Which quota was exceeded, in words, or '' when it cannot be determined. */
export function restrictionQuota(error) {
  const haystack = textOf(error).toLowerCase()
  const code = QUOTA_CODES.find((entry) => haystack.includes(entry))
  return code ? QUOTA_LABELS[code] || '' : ''
}

/**
 * The message shown to a person. Deliberately reassuring and specific:
 * the single most important fact is that no data has been lost.
 */
export function serviceRestrictionMessage(error) {
  const quota = restrictionQuota(error)
  const which = quota ? `the free plan's ${quota} limit` : 'a free-plan limit'
  return `TutorPro's database is temporarily read-limited because ${which} was reached. `
    + 'Nothing has been lost — every account, booking and message is safe and still stored. '
    + 'Normal access returns automatically when the monthly allowance resets. '
    + 'If this persists, contact us at sejongenglish@yahoo.com.'
}

/**
 * Wrap an error for display: returns the friendly text for a restriction, or
 * the original message for anything else, so ordinary faults still report
 * themselves accurately.
 */
export function describeSupabaseError(error, fallback = 'Something went wrong. Please try again.') {
  if (isServiceRestriction(error)) return serviceRestrictionMessage(error)
  const message = error?.message || (typeof error === 'string' ? error : '')
  return message || fallback
}

/* ------------------------------------------------------------------ */
/* Is a failure OUR fault, or something the person can fix?            */
/* ------------------------------------------------------------------ */

/**
 * Phrases that mean the person can correct this themselves. These must never
 * trigger the "contact us" fallback: telling somebody to message us on
 * WhatsApp because they typed a weak password would be worse than useless.
 */
const USER_CORRECTABLE = [
  'already exists',
  'complete the parent',
  'complete the student',
  'complete the required',
  'enter a valid',
  'enter the',
  'enter your',
  'choose a',
  'passwords must contain',
  'passwords do not match',
  'not correct',
  'invalid login',
  'is not correct',
  'waiting for email activation',
  'use 8+ characters',
  'password should be at least',
  'unable to validate email address',
  'user already registered',
]

/**
 * Signals that the platform itself failed — the database is unreachable,
 * restricted, or refused the write. The person did nothing wrong and cannot
 * fix it by retyping, so they should be offered a human instead.
 */
const SYSTEM_FAILURE = [
  'shared registration failed',
  'shared profile',
  'shared bookings',
  'failed to fetch',
  'networkerror',
  'network error',
  'load failed',
  'fetch failed',
  'timeout',
  'timed out',
  'service unavailable',
  'internal server error',
  'database',
  'supabase',
  'upstream',
  'gateway',
]

/**
 * Should the sign-up form offer a human contact route for this error?
 *
 * True only when the platform failed. A restriction always qualifies. A
 * message the person can act on never does, and that check runs first so a
 * validation message containing an incidental word like "database" cannot
 * be misread as an outage.
 */
export function shouldOfferContactFallback(error) {
  if (!error) return false
  if (isServiceRestriction(error)) return true

  const haystack = textOf(error).toLowerCase()
  if (!haystack) return false
  if (USER_CORRECTABLE.some((phrase) => haystack.includes(phrase))) return false

  const status = Number(error.status ?? error.statusCode)
  if (Number.isFinite(status) && status >= 500) return true

  return SYSTEM_FAILURE.some((phrase) => haystack.includes(phrase))
}

/**
 * What to tell somebody whose sign-up failed for a reason that is our fault.
 * Leads with reassurance and an apology, because from their side they simply
 * tried to register their child and the site broke.
 */
export function signUpFailureMessage(error) {
  if (isServiceRestriction(error)) {
    return 'We are sorry — our sign-up system is temporarily unavailable, so your account could not be created. '
      + 'Nothing you entered was charged or lost. Please message us below and we will set your account up by hand, usually the same day.'
  }
  return 'We are sorry — we could not create your account just now. This is a problem on our side, not with anything you typed. '
    + 'Please message us below and we will set your account up by hand, usually the same day.'
}
