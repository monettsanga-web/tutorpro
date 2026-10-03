/**
 * Support-message emails, sent from this repository instead of Supabase.
 *
 * WHY
 * ---
 * The booking email was moved here because its Supabase Edge Function was
 * never redeployed and kept sending the old English-plus-Chinese template.
 * The message email had exactly the same problem, and a teacher in Manila
 * received this:
 *
 *     New Message Notification · 消息通知
 *     ...
 *     尊敬的 Teacher M,
 *     TutorPro 客服已回复您的在线咨询，请登录网站查看完整消息并进行回复。
 *
 * Half the email in a language they do not read. The Chinese is hardcoded
 * inside the deployed function, so nothing the website sends can remove it.
 *
 * This route deploys with every push. The copy comes from
 * api/_messageEmail.js: one language per recipient, chosen from their own
 * profile, never two in one message.
 */
import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'
import { COPY, escapeHtml, languageForProfile, preview } from '../_messageEmail.js'

export const MESSAGE_TEMPLATE_VERSION = 'single-language-2026-09'

const FROM = process.env.NOTIFICATION_FROM_EMAIL || 'TutorPro English <notifications@tutorpro.site>'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')

  const resendKey = process.env.RESEND_API_KEY
  const body = req.body || {}

  if (body.ping) {
    return sendJson(res, 200, {
      version: MESSAGE_TEMPLATE_VERSION,
      sender: 'vercel',
      configured: Boolean(resendKey),
      languages: Object.keys(COPY),
    })
  }

  // Not configured: the browser falls back to the Supabase function.
  if (!resendKey) return sendError(res, 501, 'RESEND_API_KEY is not set in Vercel, so this route cannot send email yet.')

  const { messageId } = body
  if (!messageId) return sendError(res, 400, 'messageId is required.')

  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return sendError(res, 401, 'Please log in again.')

  let supabase
  let user
  try {
    supabase = getSupabaseAdmin()
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user?.id) throw new Error('Your session could not be verified.')
    user = data.user
  } catch (authError) {
    return sendError(res, 401, authError.message)
  }

  try {
    const { data: message, error: messageError } = await supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, emailed_at, created_at')
      .eq('id', messageId)
      .single()
    if (messageError || !message) throw new Error('Message could not be loaded.')

    // Only the person who wrote it may trigger its notification.
    if (message.sender_id !== user.id) return sendError(res, 403, 'Not your message.')

    // Already emailed: succeed quietly rather than sending a duplicate. This
    // is also what stops the Supabase fallback sending a second copy.
    if (message.emailed_at) return sendJson(res, 200, { delivered: false, reason: 'Already notified' })

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, login_id, parent_name, full_name, role, profile_data')
      .in('id', [message.sender_id, message.recipient_id])

    const sender = profiles?.find((p) => p.id === message.sender_id)
    const recipient = profiles?.find((p) => p.id === message.recipient_id)

    const recipientEmail = [recipient?.email, recipient?.login_id]
      .find((value) => typeof value === 'string' && value.includes('@'))
    if (!recipientEmail) return sendJson(res, 200, { delivered: false, reason: 'Recipient has no email address' })

    const senderName = sender?.full_name || sender?.parent_name || 'TutorPro English'
    const recipientName = recipient?.parent_name || recipient?.full_name || 'there'
    const copy = COPY[languageForProfile(recipient)] || COPY.en
    const direction = copy.rtl ? 'rtl' : 'ltr'
    const align = copy.rtl ? 'right' : 'left'

    const html = `
      <div dir="${direction}" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#321568;text-align:${align}">
        <div style="padding:24px;border-radius:20px 20px 0 0;background:linear-gradient(120deg,#321568,#7048df);color:white">
          <h1 style="margin:0;font-size:26px">TutorPro English</h1>
          <p style="margin:7px 0 0;color:#dff7a6">${escapeHtml(copy.newMessage)}</p>
        </div>
        <div style="padding:24px;border:1px solid #e5deef;border-top:0;border-radius:0 0 20px 20px">
          <p style="margin-top:0">${escapeHtml(copy.greeting(recipientName))}</p>
          <p>${copy.sentYouAMessage(`<b>${escapeHtml(senderName)}</b>`)}</p>
          <blockquote style="margin:18px 0;padding:14px 18px;border-left:4px solid #ff4f87;background:#faf7ff;border-radius:0 10px 10px 0;white-space:pre-wrap">${escapeHtml(preview(message.body))}</blockquote>
          <p style="margin:22px 0">
            <a href="https://www.tutorpro.site" style="padding:12px 18px;border-radius:10px;background:#ff4f87;color:white;text-decoration:none;font-weight:bold">${escapeHtml(copy.readAndReply)}</a>
          </p>
          <p style="font-size:13px;color:#756985">${escapeHtml(copy.replyInside)}</p>
        </div>
      </div>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [recipientEmail],
        subject: `${copy.subject(senderName)} — TutorPro English`,
        // A reply should reach the person who wrote, not a mailbox that does
        // not exist: tutorpro.site has no MX record.
        reply_to: sender?.email || process.env.NOTIFICATION_REPLY_TO || 'sejongenglish@yahoo.com',
        html,
      }),
    })
    if (!response.ok) throw new Error(`Email provider rejected the message: ${(await response.text()).slice(0, 200)}`)

    // Stamp only after a confirmed send, so a failure can be retried and a
    // success can never be sent twice.
    await supabase.from('direct_messages').update({ emailed_at: new Date().toISOString() }).eq('id', message.id)

    return sendJson(res, 200, { delivered: true, sender: 'vercel', to: recipientEmail, language: copy.locale || 'en' })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
