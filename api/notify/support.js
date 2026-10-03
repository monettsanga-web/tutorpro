/**
 * Support-chat emails, sent from this repository.
 *
 * WHY THIS ONE WAS MISSED
 * -----------------------
 * Two earlier fixes moved the BOOKING email and the direct-MESSAGE email
 * out of Supabase. The email a teacher actually screenshotted was neither.
 * It came from `support-notification`, a third Edge Function that exists
 * only in the Supabase dashboard and was never committed to this
 * repository, so searching the code for its wording found nothing:
 *
 *     TutorPro English Support
 *     New Message Notification · 消息通知
 *     ...
 *     尊敬的 Teacher M,
 *     TutorPro 客服已回复您的在线咨询，请登录网站查看完整消息并进行回复。
 *
 * The giveaway was in our own code, not theirs — src/Dashboards.jsx still
 * carried the comment "Trigger the bilingual secure email notification via
 * Supabase Edge Function".
 *
 * WHAT THIS SENDS
 * ---------------
 * Two directions, one language each:
 *
 *   to-user   an administrator replied; tell the parent or teacher, in the
 *             language recorded on their conversation
 *   to-admin  a parent or teacher wrote in; tell the administrator, in
 *             English
 *
 * The wording is shared with the direct-message email (api/_messageEmail.js)
 * rather than translated a second time, so the two can never drift into
 * saying different things in different languages.
 */
import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'
import { COPY, escapeHtml, languageForProfile, preview } from '../_messageEmail.js'

export const SUPPORT_TEMPLATE_VERSION = 'single-language-2026-09'

const FROM = process.env.NOTIFICATION_FROM_EMAIL || 'TutorPro English <notifications@tutorpro.site>'
const ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL || 'sejongenglish@yahoo.com'

function shell({ copy, heading, greeting, intro, quote, cta, footer }) {
  const direction = copy.rtl ? 'rtl' : 'ltr'
  const align = copy.rtl ? 'right' : 'left'
  return `
      <div dir="${direction}" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#321568;text-align:${align}">
        <div style="padding:24px;border-radius:20px 20px 0 0;background:linear-gradient(120deg,#321568,#7048df);color:white">
          <h1 style="margin:0;font-size:26px">TutorPro English Support</h1>
          <p style="margin:7px 0 0;color:#dff7a6">${escapeHtml(heading)}</p>
        </div>
        <div style="padding:24px;border:1px solid #e5deef;border-top:0;border-radius:0 0 20px 20px">
          <p style="margin-top:0">${escapeHtml(greeting)}</p>
          <p>${intro}</p>
          <blockquote style="margin:18px 0;padding:14px 18px;border-left:4px solid #ff4f87;background:#faf7ff;border-radius:0 10px 10px 0;white-space:pre-wrap">${escapeHtml(quote)}</blockquote>
          <p style="margin:22px 0">
            <a href="https://www.tutorpro.site" style="padding:12px 18px;border-radius:10px;background:#ff4f87;color:white;text-decoration:none;font-weight:bold">${escapeHtml(cta)}</a>
          </p>
          <p style="font-size:13px;color:#756985">${escapeHtml(footer)}</p>
        </div>
      </div>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')

  const resendKey = process.env.RESEND_API_KEY
  const body = req.body || {}

  if (body.ping) {
    return sendJson(res, 200, {
      version: SUPPORT_TEMPLATE_VERSION,
      sender: 'vercel',
      configured: Boolean(resendKey),
      languages: Object.keys(COPY),
    })
  }

  if (!resendKey) return sendError(res, 501, 'RESEND_API_KEY is not set in Vercel, so this route cannot send email yet.')

  const { conversationId, messageBody, direction = 'to-user' } = body
  if (!conversationId) return sendError(res, 400, 'conversationId is required.')
  if (!['to-user', 'to-admin'].includes(direction)) return sendError(res, 400, 'Unknown direction.')

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (configError) {
    return sendError(res, 500, configError.message)
  }

  try {
    const { data: conversation, error: conversationError } = await supabase
      .from('support_conversations')
      .select('id, parent_name, email, language, account_id, status')
      .eq('id', conversationId)
      .single()
    if (conversationError || !conversation) throw new Error('Conversation could not be found.')

    /*
     * Who may trigger which direction.
     *
     * to-user emails the parent, so it must be an administrator — otherwise
     * anyone who learned a conversation id could mail that family. to-admin
     * only ever reaches the one fixed support address, and the parent
     * writing in is often a visitor with no Supabase account at all, so it
     * stays open. Neither direction can be pointed at an arbitrary address:
     * both read the recipient from the conversation row or from the server's
     * own configuration.
     */
    if (direction === 'to-user') {
      const header = req.headers?.authorization || ''
      const token = header.startsWith('Bearer ') ? header.slice(7) : ''
      if (!token) return sendError(res, 401, 'Please log in again.')
      const { data: auth, error: authError } = await supabase.auth.getUser(token)
      if (authError || !auth?.user?.id) return sendError(res, 401, 'Your session could not be verified.')
      const { data: member } = await supabase.from('admin_members').select('user_id').eq('user_id', auth.user.id).maybeSingle()
      if (!member) return sendError(res, 403, 'Only an administrator can send this.')
    }

    const quote = preview(messageBody || 'Sent an attachment.')

    let to
    let copy
    let subject
    let html

    if (direction === 'to-user') {
      to = conversation.email
      /* The language recorded when they opened the conversation; their
         account profile wins if they have one. */
      let language = conversation.language || 'en'
      if (conversation.account_id) {
        const { data: profile } = await supabase
          .from('profiles').select('profile_data').eq('id', conversation.account_id).maybeSingle()
        if (profile) language = languageForProfile(profile)
      }
      copy = COPY[language] || COPY.en
      const name = conversation.parent_name || 'there'
      subject = `${copy.subject('TutorPro English Support')} — TutorPro English`
      html = shell({
        copy,
        heading: copy.newMessage,
        greeting: copy.greeting(name),
        intro: copy.sentYouAMessage('<b>TutorPro English Support</b>'),
        quote,
        cta: copy.readAndReply,
        footer: copy.replyInside,
      })
    } else {
      to = ADMIN_EMAIL
      copy = COPY.en
      const name = conversation.parent_name || 'A visitor'
      subject = `${copy.subject(name)} — TutorPro English Support`
      html = shell({
        copy,
        heading: copy.newMessage,
        greeting: copy.greeting('there'),
        intro: copy.sentYouAMessage(`<b>${escapeHtml(name)}</b>`),
        quote,
        cta: copy.readAndReply,
        footer: copy.replyInside,
      })
    }

    if (!to || !String(to).includes('@')) return sendJson(res, 200, { delivered: false, reason: 'No recipient address' })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        // tutorpro.site has no MX record, so a reply to notifications@ is lost.
        reply_to: direction === 'to-admin' ? (conversation.email || ADMIN_EMAIL) : ADMIN_EMAIL,
        subject,
        html,
      }),
    })
    if (!response.ok) throw new Error(`Email provider rejected the message: ${(await response.text()).slice(0, 200)}`)

    return sendJson(res, 200, { delivered: true, sender: 'vercel', direction, language: copy.locale || 'en' })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
