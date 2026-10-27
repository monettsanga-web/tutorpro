import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

/**
 * Finish a one-tap (Google / Apple) sign-in on the server.
 *
 * WHY THIS ROUTE EXISTS
 * ---------------------
 * `supabase.auth.signInWithOAuth` sends the family to Google or Apple and
 * brings them back with a real Supabase session — but only the auth user is
 * created. On this project the `on auth.users insert` trigger that should
 * write the matching `profiles` row does not fire (measured, and the reason
 * /api/auth/register exists). Without the row the family is invisible to the
 * admin dashboard and cannot sign in on a second device.
 *
 * So after the redirect returns, the browser calls this route. It:
 *   1. verifies the session token server-side (admin.getUser) — the caller
 *      can never claim somebody else's user id;
 *   2. writes the `profiles` row for that exact user and reads it back;
 *   3. refuses everything except student rows and PENDING teacher
 *      applications — an administrator account can never be created here.
 *
 * For a teacher application the full profile (specialization, bio,
 * interview) is validated exactly like /api/auth/register does, and the row
 * is stored as role 'teacher', status 'pending' for the approval queue.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.')

  try {
    const authHeader = String(req.headers?.authorization || '')
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) return sendError(res, 401, 'Sign in with Google or Apple first.')

    const supabase = getSupabaseAdmin()
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    const user = userData?.user
    if (userError || !user?.id) return sendError(res, 401, 'Your one-tap session could not be verified. Please try again.')

    const email = String(user.email || '').trim().toLowerCase()
    if (!email) return sendError(res, 400, 'The provider returned no email address. Please register with an email instead.')

    /* Tiles speak 'gmail'/'apple'; Supabase speaks 'google'/'apple'. Store
       the tile ids so every existing login path recognises the account. */
    const provider = user.app_metadata?.provider === 'apple' ? 'apple' : body.authProvider === 'yahoo' ? 'yahoo' : 'gmail'

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const role = body.role === 'teacher' ? 'teacher' : 'student'

    /* Idempotent: a row that already exists wins. Retries after a flaky
       network must never duplicate or overwrite a family's data. */
    const { data: existing } = await supabase.from('profiles').select('id, role, status').eq('id', user.id).maybeSingle()
    if (existing?.id) return sendJson(res, 200, { ok: true, userId: user.id, role: existing.role, status: existing.status, existing: true })

    let profileData = null
    if (role === 'teacher') {
      const application = body.profile && typeof body.profile === 'object' ? body.profile : {}
      const teacher = application.teacher && typeof application.teacher === 'object' ? application.teacher : {}
      const fullName = String(application.fullName || '').trim()
      const bio = String(teacher.bio || '').trim()
      if (fullName.length < 2 || !String(teacher.specialization || '').trim() || bio.length < 30 || !teacher.interview?.completedAt) {
        return sendError(res, 400, 'Complete the teacher profile and interview before submitting the application.')
      }
      profileData = { ...application, id: user.id, role: 'teacher', status: 'pending', email, loginId: email, authProvider: provider }
    } else {
      const parentName = String(body.parentName || user.user_metadata?.full_name || '').trim() || 'TutorPro parent'
      profileData = {
        id: user.id,
        role: 'student',
        status: 'active',
        email,
        loginId: email,
        authProvider: provider,
        parentName,
        selectedPlan: String(body.selectedPlan || ''),
        preferredTeacherId: String(body.preferredTeacherId || ''),
        referredByCode: String(body.referredByCode || ''),
        registrationCountry: String(body.registrationCountry || '').toUpperCase(),
        attribution: body.attribution && typeof body.attribution === 'object' ? body.attribution : null,
        createdAt: new Date().toISOString(),
      }
    }

    const holderName = role === 'teacher'
      ? (String(body.profile?.fullName || '').trim() || 'TutorPro teacher applicant')
      : (profileData.parentName || 'TutorPro parent')

    const row = {
      id: user.id,
      role,
      status: role === 'teacher' ? 'pending' : 'active',
      email,
      login_id: email,
      auth_provider: provider,
      parent_name: role === 'teacher' ? null : profileData.parentName,
      full_name: role === 'teacher' ? holderName : profileData.parentName,
      display_name: holderName,
      profile_data: profileData,
      updated_at: new Date().toISOString(),
    }

    const { error: writeError } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })
    if (writeError) return sendError(res, 500, `The account could not be saved: ${writeError.message}`)

    /* Read it back — "no error" is not the same as "the row is there". */
    const { data: check } = await supabase.from('profiles').select('id, role, status').eq('id', user.id).maybeSingle()
    if (!check?.id) return sendError(res, 500, 'The account was created but could not be verified. Nothing was saved.')

    return sendJson(res, 200, { ok: true, userId: user.id, role: check.role, status: check.status })
  } catch (caught) {
    return sendError(res, 500, caught.message)
  }
}
