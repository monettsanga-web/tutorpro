/**
 * Email the administrator. Shared by the payment alert and anything else
 * that needs to reach the owner rather than a parent.
 *
 * Deliberately small: the three existing notify routes each build their
 * own HTML, and duplicating a fourth copy of the Resend call is how the
 * bilingual-email bug survived in three places at once.
 */

const ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL || 'sejongenglish@yahoo.com'
const FROM = process.env.NOTIFY_FROM || 'TutorPro Online English <notifications@tutorpro.site>'

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * @returns {Promise<{sent: boolean, reason?: string, id?: string}>}
 * Never throws. A notification that fails must not fail the thing it is
 * reporting on - a parent's payment is captured whether or not the owner's
 * email provider is having a bad morning.
 */
export async function emailAdmin({ subject, heading, rows = [], body = '', replyTo }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, reason: 'RESEND_API_KEY is not set in Vercel.' }

  const table = rows.length
    ? `<table style="width:100%;border-collapse:collapse;margin:18px 0">${rows.map(([label, value]) => `
        <tr>
          <td style="padding:9px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px">${escapeHtml(label)}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #eee;color:#1d1033;font-size:15px;font-weight:700;text-align:right">${escapeHtml(value)}</td>
        </tr>`).join('')}</table>`
    : ''

  const html = `<!doctype html><html><body style="margin:0;background:#f6f4fb;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(32,17,64,.08)">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#321568,#7048df);color:#fff">
        <strong style="font-size:17px">TutorPro Online English</strong>
        <div style="opacity:.85;font-size:14px;margin-top:2px">${escapeHtml(heading)}</div>
      </div>
      <div style="padding:22px 24px;color:#30234a;font-size:15px;line-height:1.6">
        ${body ? `<p style="margin:0 0 6px">${escapeHtml(body)}</p>` : ''}
        ${table}
        <p style="margin:18px 0 0"><a href="https://www.tutorpro.site/#admin" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#7048df;color:#fff;text-decoration:none;font-weight:700">Open the admin dashboard</a></p>
      </div>
    </div>
  </body></html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: ADMIN_EMAIL,
        subject,
        html,
        /* tutorpro.site has no MX record, so a reply to the from-address
           would bounce. Point replies at a mailbox that exists. */
        reply_to: replyTo || ADMIN_EMAIL,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) return { sent: false, reason: payload?.message || `Resend returned ${response.status}` }
    return { sent: true, id: payload?.id }
  } catch (caught) {
    return { sent: false, reason: caught.message }
  }
}

export { ADMIN_EMAIL }
