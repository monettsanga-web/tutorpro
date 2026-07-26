import { awardPaymentCredits, extractOrderDetails, paypalFetch, requireStudent, sendError, sendJson } from '../_paypal.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')
  try {
    const { orderId, accountId } = req.body || {}
    if (!orderId) throw new Error('Missing PayPal order ID.')
    const { supabase } = await requireStudent(req, accountId)
    let order
    try {
      order = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', body: '{}' })
    } catch (captureError) {
      order = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: 'GET' })
      if (order.status !== 'COMPLETED') throw captureError
    }
    const details = extractOrderDetails(order)
    if (details.accountId !== accountId) throw new Error('Captured PayPal order does not belong to this student.')
    const result = await awardPaymentCredits(supabase, details)
    return sendJson(res, 200, { verified: true, ...result })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
