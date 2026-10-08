import { createHash, randomInt } from 'node:crypto'
import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'
import { emailAdmin, escapeHtml } from '../_notifyAdmin.js'
import { normalizeWhatsappNumber, sendWhatsappCode, whatsappConfigured } from '../_whatsapp.js'

/**
 * Step one of a password reset: issue a six-digit code.
 *
 * WHERE THE CODE GOES
 * -------------------
 * WhatsApp if we have a number for the family and WhatsApp is
 * configured; otherwise email. A parent who registered with their
 * WhatsApp number has no email address on file at all - their login is
 * whatsapp.<digits>@accounts.tutorpro.site, a handle this site invents,
 * not a mailbox anyone reads - so for those families WhatsApp is not a
 * nicety, it is the only way back into the account.
 *
 * WHAT IS DELIBERATE HERE
 * -----------------------
 * The reply is the same whether or not the account exists. Telling a
 * stranger "no account with that number" turns this endpoint into a way
 * to discover which of your customers' phone numbers are registered.
 *
 * The code is stored HASHED, with an expiry and an attempt counter, in
 * the profile row - no new table, so nothing has to be run by hand in
 * the Supabase dashboard before this works.
 */

const CODE_TTL_MINUTES = 15
const RESEND_COOLDOWN_SECONDS = 60

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.')

  /* Same words whatever happens, so this cannot be used to find out who
     is registered. */
  const GENERIC = 'If that account exists, a six-digit code is on its way. It expires in 15 minutes.'

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const login = String(body.login || '').trim()
    if (!login) return sendError(res, 400, 'Enter the email or phone number you registered with.')

    const supabase = getSupabaseAdmin()
    const logins = candidateLogins(login)

    const { data: rows } = await supabase
      .from('profiles')
      .select('id, email, login_id, parent_name, profile_data')
      .or(logins.map((value) => `login_id.eq.${value},email.eq.${value}`).join(','))
      .limit(1)

    const profile = rows?.[0]
    if (!profile?.id) return sendJson(res, 200, { ok: true, message: GENERIC, channel: 'none' })

    /* Do not let a button-masher send fifty WhatsApp messages. */
    const existing = profile.profile_data?.passwordReset
    if (existing?.sentAt && Date.now() - new Date(existing.sentAt).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
      return sendJson(res, 200, { ok: true, message: 'A code was just sent. Please wait a minute before asking for another.', channel: existing.channel || 'none' })
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const salt = profile.id

    /* Where can we actually reach this person? */
    const storedPhone = profile.profile_data?.whatsappNumber
      || profile.profile_data?.phone
      || (String(profile.login_id || '').startsWith('whatsapp.') ? String(profile.login_id).split('@')[0].replace('whatsapp.', '') : '')
    const phone = normalizeWhatsappNumber(storedPhone)
    const realEmail = profile.email && !String(profile.email).endsWith('@accounts.tutorpro.site') ? profile.email : ''

    let delivery = { sent: false, reason: 'No delivery channel available.' }
    let channel = 'none'

    if (phone && whatsappConfigured()) {
      delivery = await sendWhatsappCode(phone, code)
      if (delivery.sent) channel = 'whatsapp'
    }

    if (!delivery.sent && realEmail) {
      const key = process.env.RESEND_API_KEY
      if (key) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.NOTIFY_FROM || 'TutorPro Online English <notifications@tutorpro.site>',
            to: realEmail,
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
        delivery = response.ok ? { sent: true } : { sent: false, reason: `Resend returned ${response.status}` }
        if (delivery.sent) channel = 'email'
      }
    }

    if (!delivery.sent) {
      /* The family cannot be reached automatically. Tell the owner, who
         can verify them by hand - better than a parent locked out with
         nobody noticing. */
      await emailAdmin({
        subject: 'Password reset could not be delivered',
        heading: 'A parent asked to reset their password',
        body: `${profile.parent_name || 'A parent'} (${profile.login_id || profile.email || 'unknown login'}) asked for a reset code and it could not be delivered: ${delivery.reason}. They may need help by hand.`,
        rows: [['Login', profile.login_id || profile.email || ''], ['WhatsApp on file', phone || 'none'], ['Reason', delivery.reason || '']],
      })
      return sendJson(res, 200, { ok: true, message: GENERIC, channel: 'none' })
    }

    const data = profile.profile_data && typeof profile.profile_data === 'object' ? profile.profile_data : {}
    await supabase.from('profiles').update({
      profile_data: {
        ...data,
        passwordReset: {
          hash: hashCode(code, salt),
          expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
          sentAt: new Date().toISOString(),
          attempts: 0,
          channel,
        },
      },
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)

    return sendJson(res, 200, {
      ok: true,
      message: GENERIC,
      channel,
      /* Enough for the UI to say "check WhatsApp" rather than "check your
         email", without revealing the number itself. */
      hint: channel === 'whatsapp' ? `WhatsApp ending ${phone.slice(-3)}` : channel === 'email' ? realEmail.replace(/^(.).*(@.*)$/, '$1•••$2') : '',
    })
  } catch (caught) {
    return sendError(res, 500, caught.message)
  }
}

export { hashCode, candidateLogins }
