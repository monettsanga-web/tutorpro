// Welcome email for a newly registered parent.
//
// WHY THIS EXISTS
// ---------------
// Registration used to end in silence. The dashboard now shows a welcome card,
// but that only appears when the parent logs in. This reaches them in their
// inbox, where they can find our contact details weeks later by searching
// their mail rather than trying to remember which website it was.
//
// STAYING OUT OF SPAM — every choice below is deliberate
// ------------------------------------------------------
// The domain already authenticates correctly (SPF, DKIM and DMARC all verified
// on tutorpro.site), which is the foundation. On top of that:
//
//  1. PLAIN TEXT ALONGSIDE HTML. An HTML-only email is one of the strongest
//     single spam signals there is. Every real newsletter sends both parts.
//  2. List-Unsubscribe + List-Unsubscribe-Post. Gmail and Yahoo's bulk sender
//     rules effectively require one-click unsubscribe, and mail without it is
//     filtered harder even at low volume.
//  3. REPLY-TO A REAL MAILBOX. tutorpro.site has no MX record, so replies to
//     notifications@tutorpro.site disappear. Sending mail nobody can reply to
//     looks like bulk mail; pointing Reply-To at the monitored address fixes
//     both the deliverability signal and the actual user problem.
//  4. NO SPAM TRIGGER LANGUAGE. No ALL CAPS, no exclamation stacking, no
//     "FREE!!!", no urgency countdown, no link shorteners, no tracking pixel.
//  5. A REAL SUBJECT that describes the contents rather than baiting a click.
//  6. Sensible text-to-link ratio. Five links in a page of genuine prose.
//
// SAFETY
// ------
// Requires a signed-in caller, so this cannot be used to send mail to
// arbitrary addresses. Sends at most one welcome per account: the profile is
// stamped after a successful send, and a second call is a no-op. Failure to
// send never blocks registration — the caller ignores the result.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] || c
  ))
}

const SITE = 'https://www.tutorpro.site'
const WHATSAPP = 'https://wa.me/639625284849'
const MESSENGER = 'https://m.me/526047974195321'
const SUPPORT_EMAIL = 'sejongenglish@yahoo.com'

/** The plain-text part. Sent alongside the HTML, never instead of it. */
function textBody(firstName: string, childName: string) {
  const child = childName || 'your child'
  return [
    `Hello ${firstName},`,
    '',
    'Thank you for creating your TutorPro English account. Everything is ready.',
    '',
    'Your first class is free',
    '-------------------------',
    `A full 25-minute one-to-one lesson with a real teacher. No card details are needed, and there is no obligation to continue afterwards. Book a time that suits you and we will match ${child} to a teacher.`,
    '',
    `Book here: ${SITE}/?book=1`,
    '',
    'Questions before you book?',
    '--------------------------',
    'A real person answers these, usually within one business day. You are welcome to ask anything before booking.',
    '',
    `  WhatsApp:  ${WHATSAPP}`,
    `  Messenger: ${MESSENGER}`,
    '  WeChat:    t_cora',
    '  KakaoTalk: +63 962 528 4849',
    `  Email:     ${SUPPORT_EMAIL}  (just reply to this message)`,
    '',
    'Useful pages',
    '------------',
    `  How lessons work: ${SITE}/how-it-works.html`,
    `  Common questions: ${SITE}/faq.html`,
    `  Pricing:          ${SITE}/pricing.html`,
    '',
    'We look forward to meeting your child.',
    '',
    'TutorPro English PH',
    'Registered with the Philippine DTI, Business Name Registration 5274092',
    '',
    'You are receiving this because an account was created at www.tutorpro.site.',
    `To stop receiving messages, reply to this email with the word UNSUBSCRIBE, or write to ${SUPPORT_EMAIL}.`,
  ].join('\n')
}

function htmlBody(firstName: string, childName: string) {
  const child = escapeHtml(childName || 'your child')
  const name = escapeHtml(firstName)
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Welcome to TutorPro English</title></head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2f2450;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:16px;padding:28px 26px;border:1px solid #e4e0eb;">

      <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ff4f87;">TutorPro English PH</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#321568;">Thank you for joining us, ${name}</h1>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Your account is ready. Here is what happens next.</p>

      <h2 style="margin:24px 0 8px;font-size:17px;color:#321568;">Your first class is free</h2>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">A full 25-minute one-to-one lesson with a real teacher. No card details are needed and there is no obligation to continue. Choose a time that suits you and we will match ${child} to a teacher.</p>

      <p style="margin:0 0 26px;">
        <a href="${SITE}/?book=1" style="display:inline-block;background:#ff4f87;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:13px 26px;border-radius:999px;">Book the free class</a>
      </p>

      <h2 style="margin:0 0 8px;font-size:17px;color:#321568;">Questions before you book?</h2>
      <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">A real person answers these, usually within one business day. You can simply reply to this email, or use whichever app you prefer.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;line-height:1.9;">
        <tr><td style="padding:2px 0;">WhatsApp</td><td style="padding:2px 0;"><a href="${WHATSAPP}" style="color:#321568;font-weight:700;">+63 962 528 4849</a></td></tr>
        <tr><td style="padding:2px 0;">Messenger</td><td style="padding:2px 0;"><a href="${MESSENGER}" style="color:#321568;font-weight:700;">TutorPro English</a></td></tr>
        <tr><td style="padding:2px 0;">WeChat</td><td style="padding:2px 0;"><strong>t_cora</strong></td></tr>
        <tr><td style="padding:2px 0;">KakaoTalk</td><td style="padding:2px 0;"><strong>+63 962 528 4849</strong></td></tr>
      </table>

      <h2 style="margin:26px 0 8px;font-size:17px;color:#321568;">Useful pages</h2>
      <p style="margin:0 0 6px;font-size:16px;line-height:1.8;">
        <a href="${SITE}/how-it-works.html" style="color:#321568;font-weight:700;">How lessons work</a><br />
        <a href="${SITE}/faq.html" style="color:#321568;font-weight:700;">Common questions from parents</a><br />
        <a href="${SITE}/pricing.html" style="color:#321568;font-weight:700;">Pricing</a>
      </p>

      <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">We look forward to meeting your child.</p>
    </div>

    <p style="margin:18px 4px 0;font-size:12px;line-height:1.7;color:#716981;">
      TutorPro English PH · Registered with the Philippine DTI, Business Name Registration 5274092<br />
      You are receiving this because an account was created at <a href="${SITE}" style="color:#716981;">www.tutorpro.site</a>.<br />
      To stop receiving messages, reply with the word UNSUBSCRIBE or write to
      <a href="mailto:${SUPPORT_EMAIL}" style="color:#716981;">${SUPPORT_EMAIL}</a>.
    </p>
  </div>
</body>
</html>`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (status: number, payload: unknown) => new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')
    // Must be the verified sending subdomain; the root domain has no DKIM.
    const fromEmail = Deno.env.get('WELCOME_FROM_EMAIL')
      || 'TutorPro English <notifications@tutorpro.site>'
    if (!resendKey) throw new Error('RESEND_API_KEY is not configured')

    // Signed-in callers only: this must never become an open mail relay.
    const authorization = request.headers.get('Authorization') || ''
    if (!authorization) return json(401, { error: 'Authentication required' })

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: auth, error: authError } = await userClient.auth.getUser()
    if (authError || !auth?.user?.id) return json(401, { error: 'Your session could not be verified.' })

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { data: profile } = await admin
      .from('profiles')
      .select('id, role, email, parent_name, full_name, profile_data')
      .eq('id', auth.user.id)
      .single()

    if (!profile?.id) return json(404, { error: 'Profile not found.' })
    if (profile.role !== 'student') return json(200, { sent: false, reason: 'not_a_parent_account' })

    const data = (profile.profile_data && typeof profile.profile_data === 'object') ? profile.profile_data as Record<string, any> : {}
    // One welcome per account, ever. A duplicate welcome is worse than none:
    // it reads as a system that has lost track of you.
    if (data.welcomeEmailSentAt) return json(200, { sent: false, reason: 'already_sent' })

    const to = String(profile.email || auth.user.email || '').trim()
    // Families who registered with a phone number or WeChat ID have no email.
    // That is normal here and is not an error.
    if (!to || !to.includes('@')) return json(200, { sent: false, reason: 'no_email_address' })

    const parentName = String(profile.parent_name || data.parentName || profile.full_name || '').trim()
    const firstName = parentName.split(/\s+/)[0] || 'there'
    const childName = String(data.child?.name || data.children?.[0]?.name || '').trim()

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        // Replies must land somewhere a human reads. tutorpro.site has no MX
        // record, so without this a reply is silently lost — and a from
        // address that cannot receive mail is itself a spam signal.
        reply_to: SUPPORT_EMAIL,
        subject: 'Welcome to TutorPro English — your free first class',
        html: htmlBody(firstName, childName),
        // The plain-text part. Its absence is a major spam signal.
        text: textBody(firstName, childName),
        headers: {
          'List-Unsubscribe': `<mailto:${SUPPORT_EMAIL}?subject=Unsubscribe>, <${SITE}/contact.html>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return json(502, { sent: false, error: payload?.message || 'Resend rejected the message.' })

    // Stamp only after a confirmed send, so a transient failure can retry.
    await admin
      .from('profiles')
      .update({
        profile_data: { ...data, welcomeEmailSentAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    return json(200, { sent: true, id: payload?.id || '' })
  } catch (error) {
    return json(500, { sent: false, error: error instanceof Error ? error.message : String(error) })
  }
})
