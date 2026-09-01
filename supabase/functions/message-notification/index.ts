/**
 * Email alert for a direct message.
 *
 * WHAT IT DOES
 * ------------
 * When you message a parent or a teacher, they get an email telling them a
 * message is waiting, with a button back to the site. The message text is
 * included so they can read it without logging in, but replying happens in
 * the dashboard so the whole thread stays in one place.
 *
 * WHY THE MESSAGE ID, NOT THE MESSAGE TEXT
 * ----------------------------------------
 * The caller sends only a message id. The function then reads that row itself
 * using the service key. If the body were passed in from the browser, anyone
 * could call this endpoint and have TutorPro email arbitrary text to any
 * address — a spam relay wearing your domain. Reading the row server-side
 * means the email can only ever contain a message that was genuinely saved,
 * addressed to the person who genuinely receives it.
 *
 * IT ALSO CANNOT DOUBLE-SEND
 * --------------------------
 * `emailed_at` is stamped after a successful send and checked first, so a
 * retry, a double click or a duplicated Realtime event cannot email the same
 * message twice.
 *
 * DEPLOY
 * ------
 *   supabase functions deploy message-notification
 * Requires the same RESEND_API_KEY secret the booking emails already use.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] || character)
}

/** Keep the preview readable and stop a huge paste bloating the email. */
function preview(value = '', limit = 600) {
  const text = String(value).trim()
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL')
      || 'TutorPro English <notifications@tutorpro.site>'
    if (!resendKey) throw new Error('RESEND_API_KEY is not configured')

    // The caller must be a real signed-in user.
    const authorization = request.headers.get('Authorization') || ''
    if (!authorization) return json({ error: 'Authentication required' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Invalid session' }, 401)

    const { messageId } = await request.json()
    if (!messageId) throw new Error('messageId is required')

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data: message, error: messageError } = await adminClient
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, emailed_at, created_at')
      .eq('id', messageId)
      .single()
    if (messageError || !message) throw new Error('Message could not be loaded')

    // Only the person who wrote it may trigger its notification.
    if (message.sender_id !== user.id) return json({ error: 'Not your message' }, 403)

    // Already emailed: succeed quietly rather than sending a duplicate.
    if (message.emailed_at) return json({ delivered: false, reason: 'Already notified' })

    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, email, login_id, parent_name, full_name, role')
      .in('id', [message.sender_id, message.recipient_id])

    const sender = profiles?.find((profile) => profile.id === message.sender_id)
    const recipient = profiles?.find((profile) => profile.id === message.recipient_id)

    const recipientEmail = [recipient?.email, recipient?.login_id]
      .find((value) => typeof value === 'string' && value.includes('@'))
    if (!recipientEmail) return json({ delivered: false, reason: 'Recipient has no email address' })

    const senderName = sender?.full_name || sender?.parent_name || 'TutorPro English'
    const recipientName = recipient?.parent_name || recipient?.full_name || 'there'

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#321568">
        <div style="padding:24px;border-radius:20px 20px 0 0;background:linear-gradient(120deg,#321568,#7048df);color:white">
          <h1 style="margin:0;font-size:26px">TutorPro English</h1>
          <p style="margin:7px 0 0;color:#dff7a6">New message · 您有一条新消息</p>
        </div>
        <div style="padding:24px;border:1px solid #e5deef;border-top:0;border-radius:0 0 20px 20px">
          <p style="margin-top:0">Hello ${escapeHtml(recipientName)},</p>
          <p><b>${escapeHtml(senderName)}</b> sent you a message on TutorPro English:</p>
          <blockquote style="margin:18px 0;padding:14px 18px;border-left:4px solid #ff4f87;background:#faf7ff;border-radius:0 10px 10px 0;white-space:pre-wrap">${escapeHtml(preview(message.body))}</blockquote>
          <p style="margin:22px 0">
            <a href="https://www.tutorpro.site" style="padding:12px 18px;border-radius:10px;background:#ff4f87;color:white;text-decoration:none;font-weight:bold">Read and reply</a>
          </p>
          <p style="font-size:13px;color:#756985">
            Reply inside TutorPro English so the whole conversation stays in one place.<br/>
            请在 TutorPro English 网站内回复，以便完整保存对话记录。
          </p>
        </div>
      </div>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        // The sender's name in the subject is what makes this feel personal
        // rather than automated, and it survives a notification list.
        subject: `${senderName} sent you a message — TutorPro English`,
        reply_to: sender?.email || undefined,
        html,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Email provider rejected the message: ${detail}`)
    }

    // Stamp only after a confirmed send, so a failure can be retried.
    await adminClient
      .from('direct_messages')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', message.id)

    return json({ delivered: true, to: recipientEmail })
  } catch (error) {
    return json({ delivered: false, error: String((error as Error).message || error) }, 400)
  }
})
