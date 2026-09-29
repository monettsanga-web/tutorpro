import { requireAdmin } from '../_admin.js'
import { sendError, sendJson } from '../_paypal.js'
// Shared with the browser so the profile written here is exactly the shape
// the dashboard reads back. See src/teacherAccounts.js.
import { buildTeacherProfileData, normalizeTeacherEmail, teacherSignupMetadata, validateTeacherDetails } from '../../src/teacherAccounts.js'

/**
 * Create a teacher login that really exists in the database.
 *
 * Why a server function rather than signUp() in the browser:
 *
 *   1. `supabase.auth.signUp` replaces the CURRENT session, so the
 *      administrator would be signed out of their own dashboard and signed
 *      in as the teacher they just created.
 *   2. Sign-up sends a confirmation email, and the free plan allows only a
 *      couple of those per hour. `email_confirm: true` here means the
 *      teacher can log in on their phone immediately, with no email at all.
 *   3. Creating accounts is an administrator action and belongs behind an
 *      administrator check that the browser cannot skip.
 *
 * The profiles row itself is normally written by the existing
 * `handle_tutorpro_user` trigger. We verify it landed and write it with the
 * service-role key if the trigger is missing, so this works on a database
 * where nobody has run any SQL.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')

  let supabase
  try {
    ({ supabase } = await requireAdmin(req))
  } catch (authError) {
    return sendError(res, 403, authError.message)
  }

  try {
    const body = req.body || {}
    const check = validateTeacherDetails(body)
    if (!check.valid) return sendError(res, 400, check.error)

    const email = normalizeTeacherEmail(body.email)
    const profileData = buildTeacherProfileData(body, { id: '' })

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: String(body.password),
      // The administrator vouched for this address, so the teacher should not
      // have to wait for an email that the free plan may not even send.
      email_confirm: true,
      user_metadata: teacherSignupMetadata(body, profileData),
    })
    if (createError) return sendError(res, 400, createError.message)
    const userId = created?.user?.id
    if (!userId) return sendError(res, 502, 'The database did not return the new teacher account.')

    // The id is what every booking, availability slot and piece of feedback
    // is keyed on, so the profile must carry it.
    const withId = { ...profileData, id: userId }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    const row = {
      id: userId,
      role: 'teacher',
      status: withId.status,
      email,
      login_id: email,
      auth_provider: 'email',
      full_name: withId.fullName,
      display_name: withId.fullName,
      profile_data: withId,
      updated_at: new Date().toISOString(),
    }

    // Trigger present: top the row up so profile_data carries the real id.
    // Trigger absent: create the row outright. Either way the teacher ends
    // up with a profile, with no manual SQL anywhere.
    const { error: rowError } = existing?.id
      ? await supabase.from('profiles').update(row).eq('id', userId)
      : await supabase.from('profiles').insert(row)
    if (rowError) {
      return sendError(res, 500, `The login was created but its profile could not be saved: ${rowError.message}`)
    }

    return sendJson(res, 200, {
      id: userId,
      email,
      status: withId.status,
      profile: withId,
      createdProfileRow: !existing?.id,
    })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
