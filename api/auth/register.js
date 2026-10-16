import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

/**
 * Create a family account that really exists in the database.
 *
 * WHAT WAS HAPPENING
 * ------------------
 * Registration looked like it worked and produced nothing. Measured on the
 * live site with a real browser, filling the form exactly as a parent
 * would:
 *
 *   POST /auth/v1/signup                          -> 200, user created
 *   GET  /rest/v1/profiles?id=eq.<new user id>    -> 406, 0 rows
 *
 * The auth user was made; the `profiles` row was not. Supabase projects
 * normally create it with an `on auth.users insert` trigger
 * (handle_tutorpro_user), and on this project that trigger is not firing.
 * Nothing in the browser noticed: the app fell back to a local account, the
 * parent saw "Hi, <name>" and a dashboard, and believed they had signed up.
 *
 * The consequences, all of which match what the owner reported:
 *   - the admin dashboard reads `profiles`, so no new family ever appeared;
 *   - on any other device the parent could not log in - signing in reads
 *     the same missing row and fails with "we could not sign you in just
 *     now. This is a problem on our side";
 *   - every booking, payment and message for that family had no shared
 *     record behind it.
 *
 * Signup also sent a confirmation email (`confirmation_sent_at` was set,
 * `email_verified` false), so even a working trigger would have left the
 * parent unable to log in until they found that email - and Supabase's
 * free tier rate-limits those, which is how earlier sign-ups hit
 * "429 email rate limit exceeded".
 *
 * WHAT THIS DOES INSTEAD
 * ----------------------
 * Creates the user with the service-role key, with the email already
 * confirmed, then writes the `profiles` row in the same request and reads
 * it back to prove it is there. No trigger required, no confirmation email
 * required, and a failure is reported instead of being papered over.
 *
 * It creates exactly two kinds of account: a family (student) account,
 * active at once, and a teacher APPLICATION, stored as role 'teacher' with
 * status 'pending' until an administrator approves it. Any other role -
 * admin above all - is refused before anything is written. The database's
 * own check constraint allows the same three roles and its trigger resolves
 * teachers to 'pending' too, so route, trigger and schema agree.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.')

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const profile = body.profile && typeof body.profile === 'object' ? body.profile : null

    if (!EMAIL_RE.test(email)) return sendError(res, 400, 'Enter a valid email address.')
    if (password.length < 8) return sendError(res, 400, 'Choose a password of at least 8 characters.')
    if (!profile) return sendError(res, 400, 'The account details were missing.')

    /* WHICH ROLE THIS ROUTE MAY CREATE
       --------------------------------
       It used to hard-code `role: 'student'`, while the teacher application
       in the browser posts here too (src/auth.js -> registerCloudProfile).
       A completed teacher application therefore landed in `profiles` as an
       ACTIVE STUDENT: it never appeared in the admin approval queue, and the
       applicant could sign straight into a family dashboard. The role the
       client declares is now honoured for exactly two roles:

         student - a family account, active at once (unchanged);
         teacher - an APPLICATION, stored as role 'teacher' with status
                   'pending' no matter what the client claimed, so only an
                   administrator can approve it.

       Anything else - admin above all - is refused here, before any
       database client is even built. Administrator accounts exist only
       through the database and the admin route's own check. */
    const requestedRole = String(profile.role || 'student').trim().toLowerCase()
    if (requestedRole !== 'student' && requestedRole !== 'teacher') {
      return sendError(res, 400, 'This route creates family accounts and teacher applications only.')
    }

    /* The browser validates the application before posting; this route is
       the last line of defence, so it repeats the same rules. A teacher row
       written without them would show up in the approval queue as blanks. */
    if (requestedRole === 'teacher') {
      const teacher = profile.teacher && typeof profile.teacher === 'object' ? profile.teacher : null
      const fullName = String(profile.fullName || '').trim()
      const bio = String(teacher?.bio || '').trim()
      if (fullName.length < 2 || !String(teacher?.specialization || '').trim() || bio.length < 30 || !teacher?.interview?.completedAt) {
        return sendError(res, 400, 'Complete the teacher profile and interview before submitting the application.')
      }
    }

    // An incomplete registration must never reach the database. The browser
    // validates this too, but this route is the last line of defence: a
    // half-filled form (or a client that bypassed the check) must not
    // create a ghost family in `profiles`. Family fields only exist on a
    // student registration, so the check is scoped to that role - a teacher
    // application carries none of them and has its own rules above.
    if (requestedRole === 'student') {
      const parentName = String(profile.parentName || '').trim()
      const child = profile.child && typeof profile.child === 'object'
        ? profile.child
        : (Array.isArray(profile.children) ? profile.children[0] : null)
      const childName = String(child?.name || '').trim()
      const childYear = String(child?.year || '').trim()
      const childCurriculum = String(child?.curriculum || '').trim()
      if (parentName.length < 2 || childName.length < 2 || !childYear || !childCurriculum) {
        return sendError(res, 400, 'Complete the parent and student profile before creating the account.')
      }
    }

    const supabase = getSupabaseAdmin()

    /* A teacher application always waits for an administrator: whatever the
       client claimed, the stored status is 'pending'. The database trigger
       (handle_tutorpro_user) resolves teachers the same way, so a row
       written here and a row written by the trigger agree. */
    const storedStatus = requestedRole === 'teacher' ? 'pending' : 'active'
    const holderName = requestedRole === 'teacher'
      ? (String(profile.fullName || '').trim() || 'TutorPro teacher applicant')
      : (profile.parentName || 'TutorPro parent')

    /* `email_confirm: true` is the difference between a parent who can log
       in on their phone tonight and one waiting for an email that the free
       plan may rate-limit away. They proved the address by typing it; the
       first lesson is free, so there is nothing to defraud here. */
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: requestedRole,
        status: storedStatus,
        display_name: holderName,
        login_id: profile.loginId || email,
        auth_provider: profile.authProvider || 'email',
      },
    })

    if (created.error) {
      const message = created.error.message || 'The account could not be created.'
      if (/already (been )?registered|already exists|duplicate/i.test(message)) {
        return sendError(res, 409, 'An account with this email already exists. Try logging in instead.')
      }
      return sendError(res, 400, message)
    }

    const userId = created.data?.user?.id
    if (!userId) return sendError(res, 500, 'Supabase created no user id.')

    /* The row the admin dashboard, the bookings and every later login read.
       Written here rather than hoped for. A teacher application is stored
       as role 'teacher', status 'pending': that is what puts it in the
       administrator's approval queue, and what keeps the applicant out of
       every dashboard until an administrator approves them. */
    const row = {
      id: userId,
      role: requestedRole,
      status: storedStatus,
      email,
      login_id: profile.loginId || email,
      auth_provider: profile.authProvider || 'email',
      parent_name: requestedRole === 'teacher' ? null : (profile.parentName || null),
      full_name: requestedRole === 'teacher' ? (String(profile.fullName || '').trim() || null) : (profile.parentName || null),
      display_name: holderName,
      profile_data: { ...profile, id: userId, role: requestedRole, status: storedStatus },
      updated_at: new Date().toISOString(),
    }

    const { error: writeError } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })
    if (writeError) {
      /* Leaving an auth user with no profile is the exact fault this route
         exists to prevent, so undo it rather than leave a ghost. */
      await supabase.auth.admin.deleteUser(userId).catch(() => {})
      return sendError(res, 500, `The account could not be saved: ${writeError.message}`)
    }

    /* Read it back. "It returned no error" is not the same as "the row is
       there" - that assumption is what hid this bug for weeks. */
    const { data: check, error: readError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', userId)
      .maybeSingle()
    if (readError || !check?.id) {
      await supabase.auth.admin.deleteUser(userId).catch(() => {})
      return sendError(res, 500, 'The account was created but could not be verified. Nothing was saved.')
    }

    return sendJson(res, 200, { ok: true, userId, role: check.role, status: check.status, emailConfirmed: true })
  } catch (caught) {
    return sendError(res, 500, caught.message)
  }
}
