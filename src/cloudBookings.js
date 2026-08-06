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

/** A row-level-security refusal, as opposed to a network or data problem. */
export function isPermissionError(error) {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '').toLowerCase()
  return code === '42501'
    || message.includes('row-level security')
    || message.includes('row level security')
    || message.includes('violates row-level security policy')
}

const PERMISSION_HELP = 'The shared database refused the change because the account is not allowed to add bookings. '
  + 'An administrator must run supabase/fix_booking_permissions.sql in the Supabase SQL editor once — '
  + 'after that this uploads normally and nothing is lost.'

/**
 * Save one booking to the shared database.
 *
 * WHY THIS IS AN UPDATE FIRST AND NOT AN UPSERT
 * ---------------------------------------------
 * This used to be a single `.upsert()`, which PostgREST sends as
 * `INSERT ... ON CONFLICT DO UPDATE`. PostgreSQL checks the table's INSERT
 * policy WITH CHECK expression for every row proposed for insertion —
 * *regardless of whether the row is actually inserted or takes the update
 * path*. The bookings INSERT policy only ever allowed the student:
 *
 *     with check (student_id = auth.uid()::text or public.is_tutorpro_admin())
 *
 * A teacher saving feedback on an existing lesson therefore failed the INSERT
 * check every single time, even though the row already existed and the UPDATE
 * policy explicitly permits teachers. Every teacher write was rejected, 100%
 * of the time, while the session, the account id and the network were all
 * perfectly healthy — the reported "Uploaded 0, but 159 failed".
 *
 * Existing lessons now take a plain UPDATE, which is governed only by the
 * UPDATE policy (student OR teacher OR admin). Insert is attempted only when
 * no row was updated, so the INSERT policy is consulted just for genuinely new
 * bookings, which are created by students and admins anyway.
 */
async function writeCloudBooking(booking) {
  const payload = {
    id: booking.id,
    student_id: booking.studentId,
    teacher_id: booking.teacherId,
    status: booking.status,
    booking_data: booking,
    updated_at: new Date().toISOString(),
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', booking.id)
    .select('*')
    .maybeSingle()

  if (updateError && !isDuplicateKeyError(updateError)) {
    throw new Error(isPermissionError(updateError)
      ? `Shared booking update failed: ${PERMISSION_HELP} (${updateError.message})`
      : `Shared booking update failed: ${updateError.message}`)
  }
  // A row came back, so the lesson already existed and has been saved.
  if (updated) return rowToBooking(updated)

  // Nothing was updated: either this lesson is new, or row-level security hid
  // the existing row from this account. Try to create it.
  const { data: inserted, error: insertError } = await supabase
    .from('bookings')
    .insert(payload)
    .select('*')
    .maybeSingle()

  if (!insertError) return inserted ? rowToBooking(inserted) : { ...booking, cloudBooking: true }

  // The row exists but the update matched nothing, which means this account
  // cannot see it. Saying "duplicate key" would hide the real problem.
  if (isDuplicateKeyError(insertError)) {
    throw new Error('Shared booking update failed: this lesson already exists in the shared database '
      + 'but this account is not allowed to change it. Check that you are signed in as the teacher or '
      + 'the parent for this lesson.')
  }

  throw new Error(isPermissionError(insertError)
    ? `Shared booking update failed: ${PERMISSION_HELP} (${insertError.message})`
    : `Shared booking update failed: ${insertError.message}`)
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
