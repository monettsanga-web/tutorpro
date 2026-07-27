import { parseBillingPlan, parseSessions, planCreditCount, planSessionRate, planTotal, requireStudent, sendError, sendJson, paypalFetch } from '../_paypal.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')
  try {
    const { accountId, billingPlan: requestedBillingPlan = 'weekly', weeklySessions } = req.body || {}
    const billingPlan = parseBillingPlan(requestedBillingPlan)
    const sessions = parseSessions(weeklySessions, billingPlan)
    await requireStudent(req, accountId)
    const amount = planTotal(billingPlan, sessions).toFixed(2)
    const credits = planCreditCount(billingPlan, sessions)
    const sessionRate = planSessionRate(billingPlan, sessions)
    const planLabel = billingPlan === 'monthly' ? 'monthly package' : 'weekly plan'
    const order = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: `${accountId}:${billingPlan}:${sessions}`,
          description: `TutorPro English ${planLabel} - ${sessions} session${sessions > 1 ? 's' : ''}/week`,
          amount: {
            currency_code: 'USD',
            value: amount,
            breakdown: {
              item_total: { currency_code: 'USD', value: amount },
            },
          },
          items: [{
            name: `TutorPro English ${billingPlan === 'monthly' ? 'monthly package' : 'weekly credit'}`,
            description: `${credits} booking credit${credits > 1 ? 's' : ''} at $${sessionRate.toFixed(2)} each`,
            quantity: String(credits),
            unit_amount: { currency_code: 'USD', value: sessionRate.toFixed(2) },
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
