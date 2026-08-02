import { supabase } from './supabaseClient.js'

const bookingListeners = new Set()
let bookingChannel = null

function emitBookingChange(change) {
  bookingListeners.forEach((listener) => {
    try { listener(change) } catch { /* Keep the shared channel alive for other dashboards. */ }
  })
}

function ensureBookingChannel() {
  if (!supabase || bookingChannel) return bookingChannel
  bookingChannel = supabase
    .channel('tutorpro-bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, emitBookingChange)
    .subscribe()
  return bookingChannel
}

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

// Writes for the same booking id are chained so a create and an immediate
// status update can never race each other into two concurrent INSERTs.
const bookingWriteQueue = new Map()

function isDuplicateKeyError(error) {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '').toLowerCase()
  return code === '23505' || message.includes('duplicate key value') || message.includes('already exists')
}

async function writeCloudBooking(booking) {
  const payload = {
    id: booking.id,
    student_id: booking.studentId,
    teacher_id: booking.teacherId,
    status: booking.status,
    booking_data: booking,
    updated_at: new Date().toISOString(),
  }

  // A single atomic upsert removes the select-then-insert race entirely.
  const { data, error } = await supabase
    .from('bookings')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle()

  if (!error) return data ? rowToBooking(data) : { ...booking, cloudBooking: true }

  // The row was inserted by a parallel write between our upsert and its
  // conflict check, so fall back to a plain update of the existing row.
  if (isDuplicateKeyError(error)) {
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', booking.id)
      .select('*')
      .maybeSingle()
    if (!updateError) return updated ? rowToBooking(updated) : { ...booking, cloudBooking: true }
    if (isDuplicateKeyError(updateError)) return { ...booking, cloudBooking: true }
    throw new Error(`Shared booking update failed: ${updateError.message}`)
  }

  throw new Error(`Shared booking update failed: ${error.message}`)
}

export async function syncCloudBooking(booking) {
  if (!supabase || !booking?.id) return null
  const bookingId = booking.id
  const previous = bookingWriteQueue.get(bookingId) || Promise.resolve()
  const run = previous
    .catch(() => {})
    .then(() => writeCloudBooking(booking))
  bookingWriteQueue.set(bookingId, run)
  try {
    return await run
  } finally {
    if (bookingWriteQueue.get(bookingId) === run) bookingWriteQueue.delete(bookingId)
  }
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
  bookingListeners.add(onChange)
  ensureBookingChannel()
  return () => { bookingListeners.delete(onChange) }
}
