/**
 * Inviting a teacher by email, confirmed with a one-time code.
 *
 * THE PROBLEM THIS REPLACES
 * -------------------------
 * Adding a teacher used to mean the administrator inventing a temporary
 * password and then somehow getting it to the teacher — over chat, or a
 * phone call. That password then usually stayed unchanged for months, and
 * the administrator knew it. For an account that can see children's names,
 * lesson recordings and feedback, that is not good enough.
 *
 * Now: the administrator enters a name and an email. The teacher receives a
 * code, enters it, and chooses their own password. Nobody else ever knows it.
 *
 * WHY SUPABASE'S OWN OTP AND NOT A CUSTOM ONE
 * -------------------------------------------
 * Writing one-time codes by hand means getting cryptographic randomness,
 * hashing, expiry, attempt limits and timing-safe comparison all correct, and
 * getting any of them wrong is a security hole rather than a bug. Supabase
 * Auth already does this, is audited, and needs no new database table and no
 * edge function deployed — which also means this works the moment it ships
 * rather than waiting on a migration somebody has to remember to run.
 *
 * The teacher profile itself is created by the `handle_tutorpro_user` trigger
 * already in the database, which reads `role` and `status` from the signup
 * metadata. So an invited teacher arrives as role 'teacher', status
 * 'pending', and still has to be approved by an administrator before they can
 * be booked. The invite proves the email; it does not grant access.
 */

import { isSupabaseConfigured, supabase } from './supabaseClient.js'
import { describeTeacherCreateError, validateTeacherDetails } from './teacherAccounts.js'

/** How long Supabase gives a teacher to use the code, for the wording. */
export const INVITE_CODE_MINUTES = 60

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim())
}

/** A one-time code is always six digits. Spaces and dashes are forgiven. */
export function normalizeOtp(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6)
}

export function isValidOtp(value) {
  return normalizeOtp(value).length === 6
}

/**
 * Turn a Supabase error into something the administrator can act on.
 *
 * The rate limit is the one that will actually happen: a Supabase project on
 * the free plan sends only a couple of auth emails an hour, so inviting three
 * teachers in quick succession fails on the third. Saying "wait an hour" is
 * far more useful than relaying "email rate limit exceeded".
 */
export function describeInviteError(error) {
  const text = String(error?.message || error || '').toLowerCase()
  if (!text) return 'The invitation could not be sent. Please try again.'
  if (text.includes('rate limit') || text.includes('too many') || text.includes('429')) {
    return 'Supabase limits how many invitation emails can be sent per hour on the free plan. Wait an hour and invite the next teacher, or add them with a temporary password instead.'
  }
  if (text.includes('already registered') || text.includes('already exists')) {
    return 'There is already an account with that email address. Check the teacher list, or use a different address.'
  }
  if (text.includes('invalid') && text.includes('email')) return 'That email address does not look right.'
  if (text.includes('signups not allowed') || text.includes('disabled')) {
    return 'New sign-ups are switched off in your Supabase settings, so the invitation cannot create an account. Turn sign-ups back on under Authentication → Providers.'
  }
  if (text.includes('expired')) return 'That code has expired. Ask the administrator to send a new invitation.'
  if (text.includes('token') || text.includes('otp')) return 'That code was not accepted. Check the digits, or ask for a new invitation.'
  if (text.includes('fetch') || text.includes('network')) return 'We could not reach the server. Check your connection and try again.'
  return error?.message || 'The invitation could not be sent. Please try again.'
}

/**
 * Send an invitation.
 *
 * The metadata is what the database trigger reads, so the account arrives as
 * a pending teacher rather than a parent. Nothing is created until the
 * teacher actually enters their code.
 */
export async function inviteTeacherByEmail({ email, fullName, specialization = 'Both Curricula' }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('The shared database is not configured, so invitations cannot be sent from this browser.')
  }
  const address = String(email || '').trim().toLowerCase()
  if (!isValidEmail(address)) throw new Error('Enter a valid email address for the teacher.')
  const name = String(fullName || '').trim()
  if (name.length < 2) throw new Error('Enter the teacher\u2019s full name.')

  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: {
      // Creates the account on first successful verification.
      shouldCreateUser: true,
      // Read by handle_tutorpro_user() to build the profile.
      data: {
        role: 'teacher',
        status: 'pending',
        display_name: name,
        auth_provider: 'email',
        login_id: address,
        profile_data: {
          fullName: name,
          invitedByAdmin: true,
          invitedAt: new Date().toISOString(),
          teacher: {
            specialization,
            experience: 0,
            languages: 'English',
            credentials: [],
            availabilitySlots: [],
            classroom: { platform: 'zoom' },
          },
        },
      },
    },
  })
  if (error) throw new Error(describeInviteError(error))
  return { sent: true, email: address }
}

/**
 * Confirm a code and sign the teacher in.
 *
 * Supabase enforces expiry and attempt limits; this only shapes the result.
 */
export async function confirmTeacherInvite({ email, code }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('The shared database is not reachable, so the code cannot be checked right now.')
  }
  const address = String(email || '').trim().toLowerCase()
  const token = normalizeOtp(code)
  if (!isValidEmail(address)) throw new Error('Enter the email address the invitation was sent to.')
  if (!isValidOtp(token)) throw new Error('Enter the six-digit code from the invitation email.')

  const { data, error } = await supabase.auth.verifyOtp({ email: address, token, type: 'email' })
  if (error) throw new Error(describeInviteError(error))
  if (!data?.session) throw new Error('That code was not accepted. Ask the administrator to send a new invitation.')
  return { session: data.session, user: data.user }
}

/**
 * Let the teacher choose their own password.
 *
 * This is the point of the whole flow: after this, the password is known only
 * to them. Called immediately after the code is confirmed, while the session
 * from verifyOtp is active.
 */
export async function setTeacherPassword(password) {
  if (!isSupabaseConfigured || !supabase) throw new Error('The shared database is not reachable.')
  const value = String(password || '')
  if (value.length < 8 || !/[0-9]/.test(value)) {
    throw new Error('Choose a password of at least 8 characters including a number.')
  }
  const { error } = await supabase.auth.updateUser({ password: value })
  if (error) throw new Error(describeInviteError(error))
  return { updated: true }
}

/* ==================================================================
 * Adding a teacher with a temporary password
 * ==================================================================
 *
 * The fallback route, for a teacher with no working email. It used to write
 * the account into this browser only, which meant the teacher could never
 * log in from their own phone — the account simply did not exist anywhere
 * else. It now goes through our own server function, which holds the
 * service-role key and creates a real, already-confirmed login.
 *
 * The administrator's own session is untouched: `supabase.auth.signUp` in
 * the browser would have replaced it with the new teacher's.
 */
export async function createTeacherWithPassword(details) {
  const check = validateTeacherDetails(details)
  if (!check.valid) throw new Error(check.error)
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('The shared database is not configured in this browser, so a teacher login cannot be created.')
  }

  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) {
    throw new Error('Your administrator session could not be read. Log out, log back in, and try again.')
  }

  let payload
  try {
    const response = await fetch('/api/teachers/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fullName: details.fullName,
        email: details.email,
        password: details.password,
        specialization: details.specialization,
        experience: details.experience,
        education: details.education,
        languages: details.languages,
        bio: details.bio,
        status: details.status,
      }),
    })
    payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || `The server refused the request (${response.status}).`)
  } catch (error) {
    throw new Error(describeTeacherCreateError(error), { cause: error })
  }
  if (!payload?.id) throw new Error('The database did not return the new teacher account.')
  return payload
}
