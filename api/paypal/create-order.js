import { PACKAGE_MIN_SESSIONS, SESSION_RATE_PACKAGE, SESSION_RATE_STANDARD, openPaymentRequestFor, parseBillingPlan, parseSessions, planCreditCount, planTotal, requireStudent, sendError, sendJson, paypalFetch, studentPriceFor } from '../_paypal.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')
  try {
    const { accountId, billingPlan: requestedBillingPlan = 'weekly', weeklySessions } = req.body || {}
    const billingPlan = parseBillingPlan(requestedBillingPlan)

    /* ------------------------------------------------------------------
     * A bill raised by an administrator.
     *
     * The session count and the amount come from the student's own profile,
     * never from the request body — otherwise a parent could edit the page
     * and name their own price. The exact agreed total is written into
     * custom_id so the capture check compares like with like.
     * ---------------------------------------------------------------- */
    if (billingPlan === 'invoice') {
      const { supabase: db } = await requireStudent(req, accountId)
      const bill = await openPaymentRequestFor(db, accountId)
      if (!bill) throw new Error('There is no payment request on your account right now. Please refresh the page.')
      const billed = parseSessions(bill.sessions, 'invoice')
      const billAmount = bill.amount.toFixed(2)
      const sessionWord = `${billed} class session${billed === 1 ? '' : 's'}`
      const billOrder = await paypalFetch('/v2/checkout/orders', {
        method: 'POST',
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            custom_id: `${accountId}:invoice:${billed}:0:${Math.round(bill.amount * 100)}`,
            description: `TutorPro English - ${sessionWord}${bill.note ? ` (${bill.note})` : ''}`.slice(0, 127),
            amount: {
              currency_code: 'USD',
              value: billAmount,
              breakdown: { item_total: { currency_code: 'USD', value: billAmount } },
            },
            items: [{
              name: 'TutorPro English lesson credits',
              description: `${sessionWord} at $${bill.rate.toFixed(2)} each`.slice(0, 127),
              quantity: '1',
              unit_amount: { currency_code: 'USD', value: billAmount },
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
      return sendJson(res, 200, {
        orderId: billOrder.id,
        amount: billAmount,
        discountPercent: 0,
        saved: 0,
        pricingMode: 'invoice',
        sessionRate: bill.rate,
        billedSessions: billed,
      })
    }

    const sessions = parseSessions(weeklySessions, billingPlan)
    const { supabase } = await requireStudent(req, accountId)
    const fullTotal = planTotal(billingPlan, sessions)
    const credits = planCreditCount(billingPlan, sessions)
    // Read from the student's own profile, never from the request: a parent
    // editing the page must not be able to set their own price.
    const price = await studentPriceFor(supabase, accountId, {
      standard: SESSION_RATE_STANDARD,
      package: SESSION_RATE_PACKAGE,
      packageMin: PACKAGE_MIN_SESSIONS,
      sessions,
      credits,
      fullTotal,
    })
    const amount = price.total.toFixed(2)
    const sessionRate = price.rate
    const saved = price.saving
    const discountPercent = price.percent || 0
    const planLabel = billingPlan === 'monthly' ? 'monthly package' : 'weekly plan'
    const order = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: `${accountId}:${billingPlan}:${sessions}:${discountPercent}:${Math.round(price.total * 100)}`,
          description: `TutorPro English ${planLabel} - ${sessions} session${sessions > 1 ? 's' : ''}/week${price.mode === 'percent' ? ` (${discountPercent}% discount applied)` : price.mode === 'fixed' ? ` (agreed rate $${sessionRate.toFixed(2)} per lesson)` : ''}`,
          amount: {
            currency_code: 'USD',
            value: amount,
            breakdown: {
              item_total: { currency_code: 'USD', value: amount },
            },
          },
          items: [{
            name: `TutorPro English ${billingPlan === 'monthly' ? 'monthly package' : 'weekly credit'}`,
            description: price.mode === 'standard'
              ? `${credits} booking credit${credits > 1 ? 's' : ''} at $${sessionRate.toFixed(2)} each`
              : `${credits} booking credit${credits > 1 ? 's' : ''} at $${sessionRate.toFixed(2)} each — saving $${saved.toFixed(2)}`,
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
    return sendJson(res, 200, { orderId: order.id, amount, discountPercent, saved, pricingMode: price.mode, sessionRate })
  } catch (error) {
    return sendError(res, 400, error.message)
  }
}
