import { parseBillingPlan, parseSessions, planCreditCount, planSessionRate, planTotal, requireStudent, sendError, sendJson, paypalFetch, studentDiscountPercent } from '../_paypal.js'
import { applyDiscount, discountSaving } from '../../src/discounts.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')
  try {
    const { accountId, billingPlan: requestedBillingPlan = 'weekly', weeklySessions } = req.body || {}
    const billingPlan = parseBillingPlan(requestedBillingPlan)
    const sessions = parseSessions(weeklySessions, billingPlan)
    const { supabase } = await requireStudent(req, accountId)
    const fullTotal = planTotal(billingPlan, sessions)
    // Read from the student's own profile, never from the request: a parent
    // editing the page must not be able to award themselves a discount.
    const discountPercent = await studentDiscountPercent(supabase, accountId)
    const amount = applyDiscount(fullTotal, discountPercent).toFixed(2)
    const credits = planCreditCount(billingPlan, sessions)
    const sessionRate = planSessionRate(billingPlan, sessions)
    const saved = discountSaving(fullTotal, discountPercent)
    const planLabel = billingPlan === 'monthly' ? 'monthly package' : 'weekly plan'
    const order = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: `${accountId}:${billingPlan}:${sessions}:${discountPercent}`,
          description: `TutorPro English ${planLabel} - ${sessions} session${sessions > 1 ? 's' : ''}/week${discountPercent ? ` (${discountPercent}% discount applied)` : ''}`,
          amount: {
            currency_code: 'USD',
            value: amount,
            breakdown: {
              item_total: { currency_code: 'USD', value: amount },
            },
          },
          items: [{
            name: `TutorPro English ${billingPlan === 'monthly' ? 'monthly package' : 'weekly credit'}`,
            description: discountPercent
              ? `${credits} booking credit${credits > 1 ? 's' : ''} — ${discountPercent}% discount applied, saving $${saved.toFixed(2)}`
              : `${credits} booking credit${credits > 1 ? 's' : ''} at $${sessionRate.toFixed(2)} each`,
            quantity: '1',
            // PayPal rejects an order whose items do not sum to item_total, so
            // the discounted price is sent as a single line rather than a
            // per-credit rate that would no longer multiply out exactly.
            unit_amount: { currency_code: 'USD', value: amount },
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
    return sendJson(res, 200, { orderId: order.id, amount, discountPercent, saved })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
