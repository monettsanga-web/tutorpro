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
