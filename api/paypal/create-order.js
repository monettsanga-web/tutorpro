import { parseSessions, requireStudent, sendError, sendJson, weeklySessionRate, weeklyPlanTotal, paypalFetch } from '../_paypal.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')
  try {
    const { accountId, weeklySessions } = req.body || {}
    const sessions = parseSessions(weeklySessions)
    await requireStudent(req, accountId)
    const amount = weeklyPlanTotal(sessions).toFixed(2)
    const order = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: `${accountId}:${sessions}`,
          description: `TutorPro English weekly plan - ${sessions} x 25-minute sessions`,
          amount: {
            currency_code: 'USD',
            value: amount,
            breakdown: {
              item_total: { currency_code: 'USD', value: amount },
            },
          },
          items: [{
            name: `TutorPro English 25-minute session`,
            description: `${sessions} weekly session${sessions > 1 ? 's' : ''} at $${weeklySessionRate(sessions).toFixed(2)} each`,
            quantity: String(sessions),
            unit_amount: { currency_code: 'USD', value: weeklySessionRate(sessions).toFixed(2) },
            category: 'DIGITAL_GOODS',
          }],
        }],
        application_context: {
          brand_name: 'TutorPro English',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      }),
    })
    return sendJson(res, 200, { orderId: order.id })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
