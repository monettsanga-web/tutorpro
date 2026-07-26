import { awardPaymentCredits, extractOrderDetails, getPayPalAccessToken, getSupabaseAdmin, paypalFetch, sendError, sendJson } from '../_paypal.js'

async function verifyWebhook(req, event) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) return { verified: false, skipped: true }
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${process.env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: req.headers['paypal-auth-algo'],
      cert_url: req.headers['paypal-cert-url'],
      transmission_id: req.headers['paypal-transmission-id'],
      transmission_sig: req.headers['paypal-transmission-sig'],
      transmission_time: req.headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: event,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  return { verified: payload.verification_status === 'SUCCESS', payload }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')
  try {
    const event = req.body || {}
    const verification = await verifyWebhook(req, event)
    if (verification.skipped) return sendJson(res, 200, { received: true, verification: 'skipped_missing_webhook_id' })
    if (!verification.verified) return sendError(res, 400, 'PayPal webhook signature verification failed.')

    const relatedOrderId = event?.resource?.supplementary_data?.related_ids?.order_id || event?.resource?.id
    const supported = ['PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.APPROVED'].includes(event.event_type)
    if (!supported || !relatedOrderId) return sendJson(res, 200, { received: true, ignored: true })

    const order = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(relatedOrderId)}`, { method: 'GET' })
    if (order.status !== 'COMPLETED') return sendJson(res, 200, { received: true, pending: order.status })
    const details = extractOrderDetails(order)
    const result = await awardPaymentCredits(getSupabaseAdmin(), details)
    return sendJson(res, 200, { received: true, verified: true, ...result })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
