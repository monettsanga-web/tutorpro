// TutorPro Online English — follow-up email sender
//
// Sends one nurture email (trial reminder, post-trial, win-back...) to a
// single family. Only an administrator may call it, and the recipient address
// is always read from the database rather than the request body, so this
// endpoint can never be used to send mail to an arbitrary address.
//
// Deploy:  supabase functions deploy follow-up-email
// Secrets: RESEND_API_KEY  (already set for booking-notification)
//          FOLLOWUP_FROM_EMAIL (optional, defaults below)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_TYPES = [
  'trial-reminder',
  'post-trial',
  'trial-no-show',
  'never-booked',
  'win-back',
]

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character
  ))
}

/** Plain text -> simple, readable HTML that survives every email client. */
function toHtml(body: string) {
  const paragraphs = String(body)
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((line) => escapeHtml(line.trim())).filter(Boolean)
      if (!lines.length) return ''
      // Bullet blocks keep their shape.
      if (lines.every((line) => line.startsWith('•'))) {
        return `<ul style="margin:0 0 16px;padding-left:20px;color:#3f3550">${
          lines.map((line) => `<li style="margin:4px 0">${line.replace(/^•\s*/, '')}</li>`).join('')
        }</ul>`
      }
      return `<p style="margin:0 0 16px;line-height:1.6;color:#3f3550">${lines.join('<br/>')}</p>`
    })
    .filter(Boolean)
    .join('')

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;background:#ffffff">
    <div style="padding:22px 24px;border-radius:18px 18px 0 0;background:linear-gradient(120deg,#321568,#7048df);color:#ffffff">
      <h1 style="margin:0;font-size:22px">TutorPro Online English</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#dff7a6">One-to-one English classes for children</p>
    </div>
    <div style="padding:24px;border:1px solid #e5deef;border-top:0;border-radius:0 0 18px 18px;font-size:15px">
      ${paragraphs}
      <p style="margin:24px 0 8px">
        <a href="https://www.tutorpro.site" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#ff4f87;color:#ffffff;text-decoration:none;font-weight:bold">Open my dashboard</a>
      </p>
      <p style="margin:18px 0 0;font-size:12px;color:#8a819a;line-height:1.5">
        TutorPro Online English · Registered with the Philippine DTI, Reg. No. 5274092<br/>
        You are receiving this because you registered a family account at tutorpro.site.
        Reply to this email if you would prefer not to hear from us again.
      </p>
    </div>
  </div>`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (payload: unknown, status = 200) => new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FOLLOWUP_FROM_EMAIL')
      || Deno.env.get('BOOKING_FROM_EMAIL')
      || 'TutorPro Online English <hello@tutorpro.site>'
    if (!resendKey) throw new Error('RESEND_API_KEY is not configured')

    // --- authenticate ---
    const authorization = request.headers.get('Authorization') || ''
    if (!authorization) return json({ error: 'Authentication required' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Invalid session' }, 401)

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // --- administrators only ---
    const { data: adminMember } = await adminClient
      .from('admin_members').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminMember) return json({ error: 'Administrator access required' }, 403)

    const { accountId, type, subject, body } = await request.json()
    if (!accountId || !subject || !body) throw new Error('accountId, subject and body are required')
    if (!ALLOWED_TYPES.includes(String(type))) throw new Error('Unknown follow-up type')
    if (String(subject).length > 200) throw new Error('Subject is too long')
    if (String(body).length > 8000) throw new Error('Message is too long')

    // --- recipient always comes from the database, never the request ---
    const { data: profile, error: profileError } = await adminClient
      .from('profiles').select('id,email,login_id,role,parent_name,full_name')
      .eq('id', accountId).single()
    if (profileError || !profile) throw new Error('Family account could not be found')
    if (!['student', 'parent'].includes(String(profile.role || 'student'))) {
      throw new Error('Follow-ups may only be sent to family accounts')
    }

    const recipient = [profile.email, profile.login_id]
      .find((value) => typeof value === 'string' && value.includes('@'))
    if (!recipient) return json({ delivered: false, reason: 'This family has no email address on file' })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient],
        subject: String(subject),
        html: toHtml(String(body)),
        text: String(body),
      }),
    })
    if (!response.ok) throw new Error(`Email delivery failed: ${await response.text()}`)

    return json({ delivered: true, recipient, type })
  } catch (error) {
    return json({ error: (error as Error).message }, 400)
  }
})
