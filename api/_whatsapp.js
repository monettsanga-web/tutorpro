/**
 * Sending a WhatsApp message, through Meta's WhatsApp Cloud API.
 *
 * WHAT THIS NEEDS BEFORE IT CAN SEND
 * ----------------------------------
 * Three environment variables in Vercel. Without them this module does
 * nothing and says so; it never pretends to have sent anything.
 *
 *   WHATSAPP_TOKEN            a permanent access token from a Meta
 *                             system user
 *   WHATSAPP_PHONE_NUMBER_ID  the id of the sending number, from the
 *                             WhatsApp Manager
 *   WHATSAPP_OTP_TEMPLATE     the name of an APPROVED template of
 *                             category AUTHENTICATION
 *
 * The template requirement is not ours - it is Meta's. A business may
 * only start a WhatsApp conversation with an approved template, and a
 * one-time passcode must use the authentication category, which renders
 * with a copy-code button and cannot be used for marketing. A plain text
 * message would be rejected unless the parent had messaged us in the
 * previous 24 hours, which is never true of somebody who has just been
 * locked out.
 *
 * docs/whatsapp-setup.md has the click-by-click.
 */

const API_VERSION = 'v21.0'

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_OTP_TEMPLATE)
}

/** Digits only, no plus, no spaces - what Meta expects. */
export function normalizeWhatsappNumber(value = '') {
  const digits = String(value).replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return ''
  return digits
}

/**
 * Send a one-time code.
 * @returns {Promise<{sent: boolean, reason?: string, id?: string}>} never throws.
 */
export async function sendWhatsappCode(number, code) {
  const to = normalizeWhatsappNumber(number)
  if (!to) return { sent: false, reason: 'That phone number does not look like a WhatsApp number.' }
  if (!whatsappConfigured()) return { sent: false, reason: 'WhatsApp is not configured on this site yet.' }

  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: process.env.WHATSAPP_OTP_TEMPLATE,
      language: { code: process.env.WHATSAPP_OTP_LANGUAGE || 'en' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        /* An authentication template's button carries the code so the
           parent can copy it with one tap. Meta requires it to be sent
           as a url-type button parameter even though it is a copy
           action. */
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
      ],
    },
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { sent: false, reason: body?.error?.message || `WhatsApp returned ${response.status}` }
    }
    return { sent: true, id: body?.messages?.[0]?.id }
  } catch (caught) {
    return { sent: false, reason: caught.message }
  }
}
