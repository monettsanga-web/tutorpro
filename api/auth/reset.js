import { createHash, randomInt } from 'node:crypto'
import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'
import { emailAdmin, escapeHtml } from '../_notifyAdmin.js'
import { normalizeWhatsappNumber, sendWhatsappCode, whatsappConfigured } from '../_whatsapp.js'

/**
 * Password reset: ask for a code, then use it. Both steps, one function.
 *
 * WHY ONE FILE AND NOT TWO
 * ------------------------
 * These shipped as /api/auth/reset-request and /api/auth/reset-confirm
 * and never ran: Vercel's Hobby plan allows twelve Serverless Functions
 * per deployment and this project was already at twelve, so the
 * deployment kept the previous build and both new routes answered 404
 * while every older route carried on working. Nothing in the push output
 * says so; the only clue was that the new URLs were missing in
 * production while /api/auth/register still answered.
 *
 * So the two steps share one function and are told apart by `action`.
 * It costs a line of routing and buys back a function slot.
 *
 * WHERE THE CODE GOES
 * -------------------
 * WhatsApp if we have a number for the family and WhatsApp is
 * configured; email otherwise. A parent who registered with their
 * WhatsApp number has no mailbox on file at all - their login is
 * whatsapp.<digits>@accounts.tutorpro.site, a handle this site invents -
 * so for them WhatsApp is not a nicety, it is the only way back in.
 *
 * WHAT IS DELIBERATE
 * ------------------
 * The reply is identical whether or not the account exists. Saying "no
 * account with that number" turns this into a way to discover which of
 * your customers are registered.
 *
 * The code is stored HASHED with an expiry and an attempt counter, in the
 * profile row - no new table, so nothing has to be run by hand in the
 * Supabase dashboard before this works.
 */

const CODE_TTL_MINUTES = 15
const RESEND_COOLDOWN_SECONDS = 60
const MAX_ATTEMPTS = 5
const GENERIC = 'If that account exists, a six-digit code is on its way. It expires in 15 minutes.'
const REFUSE = 'That code is wrong or has expired. Ask for a new one.'

const hashCode = (code, salt) => createHash('sha256').update(`${salt}:${code}`).digest('hex')

/** The login a parent types could be an email, a phone number or a WeChat id. */
function candidateLogins(raw) {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return []
  const out = new Set([value])
  const digits = value.replace(/\D/g, '')
  if (digits.length >= 8) out.add(`whatsapp.${digits}@accounts.tutorpro.site`)
  if (!value.includes('@')) out.add(`wechat.${value}@accounts.tutorpro.site`)
  return [...out]
}

async function findProfile(supabase, login) {
  const logins = candidateLogins(login)
  if (!logins.length) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, email, login_id, parent_name, profile_data')
    /* recoveryEmail too: a parent who signed up with a WhatsApp number
       and later added an email will type that email here, because it is
       the only address they associate with us. */
    .or(logins.map((value) => `login_id.eq.${value},email.eq.${value},profile_data->>recoveryEmail.eq.${value}`).join(','))
    .limit(1)
  return data?.[0] || null
}

async function emailCode(profile, code) {
  const key = process.env.RESEND_API_KEY
  /* `whatsapp.639...@accounts.tutorpro.site` is a handle this site
     invents, not a mailbox. The recovery address a parent added on their
     profile is the real one. */
  const primary = profile.email && !String(profile.email).endsWith('@accounts.tutorpro.site') ? profile.email : ''
  const to = primary || String(profile.profile_data?.recoveryEmail || '').trim()
  if (!key || !to) return { sent: false, reason: key ? 'No email address on this account.' : 'RESEND_API_KEY is not set.' }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || 'TutorPro Online English <notifications@tutorpro.site>',
      to,
      subject: `${code} is your TutorPro password reset code`,
      html: `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f4fb;padding:24px">
        <div style="max-width:460px;margin:0 auto;background:#fff;border-radius:16px;padding:26px;text-align:center">
          <strong style="font-size:17px;color:#321568">TutorPro Online English</strong>
          <p style="color:#5a4b6e;font-size:15px">Hello ${escapeHtml(profile.parent_name || 'there')}, here is your password reset code.</p>
          <div style="font-size:34px;font-weight:900;letter-spacing:6px;color:#1d1033;margin:18px 0">${code}</div>
          <p style="color:#5a4b6e;font-size:14px">It expires in ${CODE_TTL_MINUTES} minutes. If you did not ask to reset your password, ignore this email and nothing will change.</p>
        </div></body></html>`,
      reply_to: process.env.SUPPORT_ADMIN_EMAIL || 'sejongenglish@yahoo.com',
    }),
  })
  return response.ok ? { sent: true, to } : { sent: false, reason: `Resend returned ${response.status}` }
}

async function requestCode(supabase, login) {
  const profile = await findProfile(supabase, login)
  if (!profile?.id) return { ok: true, message: GENERIC, channel: 'none' }

  /* Do not let a button-masher send fifty WhatsApp messages. */
  const existing = profile.profile_data?.passwordReset
  if (existing?.sentAt && Date.now() - new Date(existing.sentAt).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    return { ok: true, message: 'A code was just sent. Please wait a minute before asking for another.', channel: existing.channel || 'none' }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const storedPhone = profile.profile_data?.whatsappNumber
    || profile.profile_data?.phone
    || (String(profile.login_id || '').startsWith('whatsapp.') ? String(profile.login_id).split('@')[0].replace('whatsapp.', '') : '')
  const phone = normalizeWhatsappNumber(storedPhone)

  let delivery = { sent: false, reason: 'No delivery channel available.' }
  let channel = 'none'
  if (phone && whatsappConfigured()) {
    delivery = await sendWhatsappCode(phone, code)
    if (delivery.sent) channel = 'whatsapp'
  }
  if (!delivery.sent) {
    delivery = await emailCode(profile, code)
    if (delivery.sent) channel = 'email'
  }

  if (!delivery.sent) {
    /* Nobody can reach this family automatically. Tell the owner rather
       than letting the request evaporate. */
    await emailAdmin({
      subject: 'Password reset could not be delivered',
      heading: 'A parent asked to reset their password',
      body: `${profile.parent_name || 'A parent'} asked for a reset code and it could not be delivered: ${delivery.reason}. They may need help by hand.`,
      rows: [['Login', profile.login_id || profile.email || ''], ['WhatsApp on file', phone || 'none'], ['Reason', delivery.reason || '']],
    })
    return { ok: true, message: GENERIC, channel: 'none' }
  }

  const data = profile.profile_data && typeof profile.profile_data === 'object' ? profile.profile_data : {}
  await supabase.from('profiles').update({
    profile_data: {
      ...data,
      passwordReset: {
        hash: hashCode(code, profile.id),
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
        sentAt: new Date().toISOString(),
        attempts: 0,
        channel,
      },
    },
    updated_at: new Date().toISOString(),
  }).eq('id', profile.id)

  return {
    ok: true,
    message: GENERIC,
    channel,
    /* Enough for the UI to say "check WhatsApp" without revealing the
       number itself. */
    hint: channel === 'whatsapp' ? `WhatsApp ending ${phone.slice(-3)}` : delivery.to ? delivery.to.replace(/^(.).*(@.*)$/, '$1\u2022\u2022\u2022$2') : '',
  }
}

async function confirmCode(supabase, { login, code, password }) {
  const profile = await findProfile(supabase, login)
  const reset = profile?.profile_data?.passwordReset
  if (!profile?.id || !reset?.hash) return { error: REFUSE, status: 400 }
  if (new Date(reset.expiresAt).getTime() < Date.now()) return { error: REFUSE, status: 400 }
  if (Number(reset.attempts || 0) >= MAX_ATTEMPTS) return { error: 'Too many wrong codes. Ask for a new one.', status: 429 }

  const data = profile.profile_data && typeof profile.profile_data === 'object' ? profile.profile_data : {}
  if (hashCode(code, profile.id) !== reset.hash) {
    await supabase.from('profiles').update({
      profile_data: { ...data, passwordReset: { ...reset, attempts: Number(reset.attempts || 0) + 1 } },
    }).eq('id', profile.id)
    return { error: REFUSE, status: 400 }
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
    password,
    /* A code proves they hold the channel we sent it to. Leaving the
       address unconfirmed would let them set a password and still be
       refused at the door. */
    email_confirm: true,
  })
  if (updateError) return { error: `The password could not be changed: ${updateError.message}`, status: 500 }

  const { passwordReset: _used, ...rest } = data
  await supabase.from('profiles').update({ profile_data: rest, updated_at: new Date().toISOString() }).eq('id', profile.id)
  return { ok: true, login: profile.login_id || profile.email || login }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.')
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const action = String(body.action || 'request')
    const login = String(body.login || '').trim()
    const supabase = getSupabaseAdmin()

    if (action === 'request') {
      if (!login) return sendError(res, 400, 'Enter the email or phone number you registered with.')
      return sendJson(res, 200, await requestCode(supabase, login))
    }

    /*
     * Add or change the recovery email on an account.
     *
     * It lives on this route rather than a route of its own because
     * Vercel's Hobby plan caps the project at twelve Serverless
     * Functions and we are at twelve - a thirteenth silently deploys as
     * a 404, which is how the reset endpoints failed the first time.
     *
     * Two callers, both authenticated: a parent setting their own, and
     * an administrator setting one for a family who cannot do it
     * themselves. Admin status is read from `admin_members`, never from
     * `profiles.role`, which any signed-up visitor could once PATCH.
     */
    if (action === 'set-recovery-email') {
      const header = req.headers?.authorization || ''
      const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
      if (!bearer) return sendError(res, 401, 'Please log in again before changing the recovery email.')

      const { data: auth, error: authError } = await supabase.auth.getUser(bearer)
      if (authError || !auth?.user?.id) return sendError(res, 401, 'Your login session could not be verified.')

      const targetId = String(body.accountId || auth.user.id)
      if (targetId !== auth.user.id) {
        const { data: member } = await supabase.from('admin_members').select('user_id').eq('user_id', auth.user.id).maybeSingle()
        if (!member?.user_id) return sendError(res, 403, 'Only an administrator can change somebody else\u2019s recovery email.')
      }

      const recovery = String(body.email || '').trim().toLowerCase()
      if (recovery && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recovery)) return sendError(res, 400, 'Enter a valid email address.')
      if (recovery.endsWith('@accounts.tutorpro.site')) return sendError(res, 400, 'That is a login handle, not a mailbox. Use a real email address.')

      const { data: row } = await supabase.from('profiles').select('id, profile_data').eq('id', targetId).maybeSingle()
      if (!row?.id) return sendError(res, 404, 'That account could not be found.')

      const data = row.profile_data && typeof row.profile_data === 'object' ? row.profile_data : {}
      const next = { ...data }
      if (recovery) next.recoveryEmail = recovery
      else delete next.recoveryEmail

      const { error: writeError } = await supabase
        .from('profiles')
        .update({ profile_data: next, updated_at: new Date().toISOString() })
        .eq('id', targetId)
      if (writeError) return sendError(res, 500, `The recovery email could not be saved: ${writeError.message}`)

      return sendJson(res, 200, { ok: true, recoveryEmail: recovery, accountId: targetId })
    }

    if (action === 'confirm') {
      const code = String(body.code || '').replace(/\D/g, '')
      const password = String(body.password || '')
      if (!login || code.length !== 6) return sendError(res, 400, 'Enter the six-digit code we sent you.')
      if (password.length < 8) return sendError(res, 400, 'Choose a new password of at least 8 characters.')
      const result = await confirmCode(supabase, { login, code, password })
      if (result.error) return sendError(res, result.status || 400, result.error)
      return sendJson(res, 200, result)
    }

    return sendError(res, 400, 'Unknown action.')
  } catch (caught) {
    return sendError(res, 500, caught.message)
  }
}
