import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

/**
 * Save a teacher's profile photo, server side.
 *
 * WHY THE BROWSER CANNOT BE TRUSTED WITH THIS
 * -------------------------------------------
 * The photo used to be written by the teacher's own browser with
 * `updateCloudProfile`, a PATCH on `profiles` guarded by row-level
 * security and by the column-lock trigger. If any of that refuses - a
 * teacher whose row was made by the admin tool, a session that has gone
 * stale, a policy that is stricter than expected - the write fails
 * quietly-ish and the teacher, who can still see their own photo from
 * their own browser storage, has no reason to think anything went wrong.
 * Measured on the live site: three approved teachers, one photo in the
 * database.
 *
 * This route writes with the service-role key, so the row is updated or
 * it returns an error that says why. Nothing is silent.
 *
 * WHO MAY CALL IT
 * ---------------
 * The teacher themselves, or the administrator. The administrator case is
 * the one that matters in practice: it lets the photo be set for a teacher
 * who is not sitting at a computer, from the admin dashboard, which is
 * where the gap was - there was no way for an administrator to set a
 * teacher's photo at all.
 *
 * Admin status is read from `admin_members`, the table with no INSERT or
 * UPDATE policy, never from `profiles.role` - a column any signed-up
 * visitor could once PATCH on themselves.
 */

const MAX_BYTES = 400 * 1024
const ALLOWED = /^data:image\/(jpeg|png|webp);base64,/

async function callerFor(req, supabase) {
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new Error('Please log in again before uploading a photo.')
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) throw new Error('Your login session could not be verified.')
  const { data: member } = await supabase
    .from('admin_members')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  return { id: data.user.id, isAdmin: Boolean(member?.user_id) }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.')

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const teacherId = String(body.teacherId || '').trim()
    const photo = String(body.photo || '')

    if (!teacherId) return sendError(res, 400, 'Which teacher is this photo for?')
    if (!ALLOWED.test(photo)) return sendError(res, 400, 'Send the photo as a JPG, PNG or WebP data URL.')
    /* Base64 is about a third bigger than the bytes it carries. */
    if (photo.length > MAX_BYTES * 1.4) return sendError(res, 413, 'That photo is too large. Resize it below 400 KB.')

    const supabase = getSupabaseAdmin()
    const caller = await callerFor(req, supabase)
    if (!caller.isAdmin && caller.id !== teacherId) {
      return sendError(res, 403, 'You can only change your own profile photo.')
    }

    const { data: row, error: readError } = await supabase
      .from('profiles')
      .select('id, role, profile_data')
      .eq('id', teacherId)
      .maybeSingle()
    if (readError) throw new Error(readError.message)
    if (!row?.id) return sendError(res, 404, 'That teacher does not have a profile in the shared database yet.')

    const data = row.profile_data && typeof row.profile_data === 'object' ? row.profile_data : {}
    const teacher = data.teacher && typeof data.teacher === 'object' ? data.teacher : {}

    const { error: writeError } = await supabase
      .from('profiles')
      .update({
        profile_data: { ...data, profilePhotoUrl: photo, teacher: { ...teacher, photo } },
        updated_at: new Date().toISOString(),
      })
      .eq('id', teacherId)
    if (writeError) throw new Error(writeError.message)

    return sendJson(res, 200, { ok: true, teacherId, bytes: photo.length, by: caller.isAdmin ? 'admin' : 'self' })
  } catch (caught) {
    return sendError(res, 500, caught.message)
  }
}
