import { supabase } from './supabaseClient.js'

const validEvents = new Set(['requested', 'confirmed', 'cancelled', 'restored', 'updated'])

export async function notifyBookingParticipants(booking, event = 'updated') {
  if (!supabase || !booking?.id || !validEvents.has(event)) return { delivered: false, skipped: true }
  try {
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
  if (!supabase) {
    return { upToDate: false, reason: 'This browser is not connected to the shared database, so the email service cannot be checked.' }
  }
  try {
    const { data, error } = await supabase.functions.invoke('booking-notification', { body: { ping: true } })
    if (error) {
      return {
        upToDate: false,
        reason: 'The email service is running an older version that does not recognise this check.',
        detail: error.message,
      }
    }
    const version = data?.version || ''
    return {
      upToDate: version === EXPECTED_EMAIL_TEMPLATE_VERSION,
      version,
      languages: Array.isArray(data?.languages) ? data.languages : [],
      reason: version === EXPECTED_EMAIL_TEMPLATE_VERSION
        ? ''
        : `The email service is running version "${version || 'unknown'}", not "${EXPECTED_EMAIL_TEMPLATE_VERSION}".`,
    }
  } catch (error) {
    return { upToDate: false, reason: 'The email service could not be reached.', detail: error.message }
  }
}
