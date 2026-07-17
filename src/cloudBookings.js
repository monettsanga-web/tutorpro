import { supabase } from './supabaseClient.js'

function rowToBooking(row) {
  const data = row.booking_data && typeof row.booking_data === 'object' ? row.booking_data : {}
  return {
    ...data,
    id: row.id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    status: row.status || data.status || 'pending',
    createdAt: row.created_at || data.createdAt,
    updatedAt: row.updated_at || data.updatedAt,
    cloudBooking: true,
  }
}

export async function syncCloudBooking(booking) {
  if (!supabase || !booking?.id) return null
  const payload = {
    id: booking.id,
    student_id: booking.studentId,
    teacher_id: booking.teacherId,
    status: booking.status,
    booking_data: booking,
    updated_at: new Date().toISOString(),
  }
  const { data: existing, error: lookupError } = await supabase.from('bookings').select('id').eq('id', booking.id).maybeSingle()
  if (lookupError) throw new Error(`Shared booking lookup failed: ${lookupError.message}`)
  const query = existing
    ? supabase.from('bookings').update(payload).eq('id', booking.id)
    : supabase.from('bookings').insert(payload)
  const { data, error } = await query.select('*').single()
  if (error) throw new Error(`Shared booking update failed: ${error.message}`)
  return rowToBooking(data)
}

export async function fetchCloudBookings() {
  if (!supabase) return []
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: true })
  if (error) throw new Error(`Shared bookings could not be loaded: ${error.message}`)
  return (data || []).map(rowToBooking)
}

export async function deleteCloudBooking(bookingId) {
  if (!supabase || !bookingId) return false
  const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
  if (error) throw new Error(`Shared booking deletion failed: ${error.message}`)
  return true
}

export function subscribeToCloudBookings(onChange) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('tutorpro-bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
