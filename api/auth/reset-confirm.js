import { createHash } from 'node:crypto'
import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

/**
 * Step two of a password reset: check the code, set the new password.
 *
 * The code was stored hashed on the profile row by reset-request.js, with
 * an expiry and an attempt counter. Five wrong guesses burn it - six
 * digits is a million combinations, which is plenty against a person and
 * nothing against a script, so the counter is what actually protects the
 * account.
 *
 * The password itself is changed with the service-role key through the
 * Supabase admin API, which is the only way to set a password for
 * somebody who cannot log in to prove who they are.
 */

const MAX_ATTEMPTS = 5
const hashCode = (code, salt) => createHash('sha256').update(`${salt}:${code}`).digest('hex')

function candidateLogins(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return []
  const out = new Set([value])
  const digits = value.replace(/\D/g, '')
  if (digits.length >= 8) out.add(`whatsapp.${digits}@accounts.tutorpro.site`)
  if (!value.includes('@')) out.add(`wechat.${value}@accounts.tutorpro.site`)
  return [...out]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.')

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const login = String(body.login || '').trim()
    const code = String(body.code || '').replace(/\D/g, '')
    const password = String(body.password || '')

    if (!login || code.length !== 6) return sendError(res, 400, 'Enter the six-digit code we sent you.')
    if (password.length < 8) return sendError(res, 400, 'Choose a new password of at least 8 characters.')

    const supabase = getSupabaseAdmin()
    const logins = candidateLogins(login)
    const { data: rows } = await supabase
      .from('profiles')
      .select('id, email, login_id, profile_data')
      .or(logins.map((value) => `login_id.eq.${value},email.eq.${value}`).join(','))
      .limit(1)

    const profile = rows?.[0]
    const reset = profile?.profile_data?.passwordReset

    /* One message for every failure mode below, so a wrong code and a
       wrong login cannot be told apart. */
    const REFUSE = 'That code is wrong or has expired. Ask for a new one.'
    if (!profile?.id || !reset?.hash) return sendError(res, 400, REFUSE)
    if (new Date(reset.expiresAt).getTime() < Date.now()) return sendError(res, 400, REFUSE)
    if (Number(reset.attempts || 0) >= MAX_ATTEMPTS) return sendError(res, 429, 'Too many wrong codes. Ask for a new one.')

    const data = profile.profile_data && typeof profile.profile_data === 'object' ? profile.profile_data : {}

    if (hashCode(code, profile.id) !== reset.hash) {
      await supabase.from('profiles').update({
        profile_data: { ...data, passwordReset: { ...reset, attempts: Number(reset.attempts || 0) + 1 } },
      }).eq('id', profile.id)
      return sendError(res, 400, REFUSE)
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
      password,
      /* If the address was never confirmed, a reset proves they hold the
         channel we sent the code to. Leaving it unconfirmed would let
         them set a password and still be refused at the door. */
      email_confirm: true,
    })
    if (updateError) return sendError(res, 500, `The password could not be changed: ${updateError.message}`)

    /* Burn the code. */
    const { passwordReset: _used, ...rest } = data
    await supabase.from('profiles').update({ profile_data: rest, updated_at: new Date().toISOString() }).eq('id', profile.id)

    return sendJson(res, 200, { ok: true, login: profile.login_id || profile.email || login })
  } catch (caught) {
    return sendError(res, 500, caught.message)
  }
}
