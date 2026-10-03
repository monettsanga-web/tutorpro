import { supabase } from './supabaseClient.js'

const validEvents = new Set(['requested', 'confirmed', 'cancelled', 'restored', 'updated'])

/**
 * Send the booking email.
 *
 * WHY THERE ARE TWO PATHS
 * -----------------------
 * The wording used to live only in a Supabase Edge Function, which has to
 * be redeployed by hand. It never was, so parents kept getting the old
 * bilingual template with Chinese beside every English line.
 *
 * /api/notify/booking is the same email generated from this repository, so
 * it ships with every push. It is tried FIRST. If it answers 501 the key is
 * not in Vercel yet, and we fall back to the Supabase function so nothing
 * stops working in the meantime. Only one of the two ever sends: the
 * fallback runs only when the first route sent nothing.
 */
async function sessionToken() {
  if (!supabase) return ''
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || ''
}

async function sendViaVercel(booking, event) {
  const token = await sessionToken()
  if (!token) return { handled: false }
  const response = await fetch('/api/notify/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ bookingId: booking.id, event }),
  })
  // 501 means RESEND_API_KEY is not set in Vercel yet.
  if (response.status === 501) return { handled: false }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return { handled: false, error: payload.error }
  return { handled: true, result: payload }
}

export async function notifyBookingParticipants(booking, event = 'updated') {
  if (!supabase || !booking?.id || !validEvents.has(event)) return { delivered: false, skipped: true }
  try {
    const direct = await sendViaVercel(booking, event).catch(() => ({ handled: false }))
    if (direct.handled) return direct.result || { delivered: true }

    const { data, error } = await supabase.functions.invoke('booking-notification', {
      body: { bookingId: booking.id, event },
    })
    if (error) throw error
    return data || { delivered: true }
  } catch (error) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tutorpro:notification-error', { detail: { message: error.message } }))
    }
    return { delivered: false, error: error.message }
  }
}

/** The template version this website expects the Supabase function to have. */
export const EXPECTED_EMAIL_TEMPLATE_VERSION = 'single-language-2026-09'

/**
 * Ask the deployed notification function which version it is.
 *
 * The wording of every booking email lives inside a Supabase Edge Function.
 * Pushing a fix to this website does NOT change it — the function has to be
 * redeployed by hand. Before this check, the only way to discover that the
 * old English-plus-Chinese template was still live was to book a lesson and
 * read the email that arrived.
 *
 * Sends nothing and writes nothing. An old deployment does not understand
 * `ping` and answers with an error, which is itself the answer.
 */
export async function pingBookingEmailTemplate() {
  /* Ask the Vercel route first, because that is the one that will send if
     it is configured. */
  try {
    const response = await fetch('/api/notify/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ping: true }),
    })
    const payload = await response.json().catch(() => ({}))
    if (response.ok && payload.configured && payload.version === EXPECTED_EMAIL_TEMPLATE_VERSION) {
      return { upToDate: true, version: payload.version, sender: 'vercel', languages: [] }
    }
    if (response.ok && !payload.configured) {
      return {
        upToDate: false,
        sender: 'none',
        reason: 'Emails are still being sent by the old Supabase function. Add RESEND_API_KEY in Vercel and this website will send them instead — no Supabase deploy needed.',
      }
    }
  } catch {
    // Fall through to the Supabase check below.
  }

  if (!supabase) {
    return { upToDate: false, reason: 'This browser is not connected to the shared database, so the email service cannot be checked.' }
  }
  try {
    const { data, error } = await supabase.functions.invoke('booking-notification', { body: { ping: true } })
    if (error) {
      return {
        upToDate: false,
        sender: 'supabase-old',
        reason: 'The Supabase email function is running the older English-plus-Chinese version.',
        detail: error.message,
      }
    }
    const version = data?.version || ''
    return {
      upToDate: version === EXPECTED_EMAIL_TEMPLATE_VERSION,
      version,
      sender: 'supabase',
      languages: Array.isArray(data?.languages) ? data.languages : [],
      reason: version === EXPECTED_EMAIL_TEMPLATE_VERSION
        ? ''
        : `The email service is running version "${version || 'unknown'}", not "${EXPECTED_EMAIL_TEMPLATE_VERSION}".`,
    }
  } catch (error) {
    return { upToDate: false, reason: 'The email service could not be reached.', detail: error.message }
  }
}
