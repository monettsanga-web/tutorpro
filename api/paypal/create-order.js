import { PACKAGE_MIN_SESSIONS, SESSION_RATE_PACKAGE, SESSION_RATE_STANDARD, getPayPalAccessToken, openPaymentRequestFor, parseBillingPlan, parseSessions, planCreditCount, planTotal, requireStudent, sendError, sendJson, paypalFetch, studentPriceFor } from '../_paypal.js'

/* ---------------------------------------------------------------------
 * The PayPal configuration check used to live at /api/paypal/diagnose.
 *
 * It moved here because Vercel's Hobby plan allows twelve Serverless
 * Functions per deployment and this project hit the ceiling: the two new
 * password-reset routes deployed as 404s while every older route kept
 * working, with nothing in the push output to say why. A read-only
 * diagnostic does not deserve a slot of its own, so it is a GET on this
 * route now. The browser calls /api/paypal/create-order with GET.
 * ------------------------------------------------------------------- */
/**
 * Read-only PayPal configuration check.
 *
 * WHY THIS EXISTS
 * ---------------
 * The site keeps returning PAYEE_ACCOUNT_RESTRICTED while the owner's PayPal
 * dashboard looks completely healthy. Those two facts can only both be true
 * if the keys in Vercel belong to a DIFFERENT PayPal account than the one
 * being looked at — or point at the wrong environment.
 *
 * Guessing is expensive here, so this endpoint asks PayPal directly which
 * account the server credentials authenticate as, and reports it next to the
 * live order attempt.
 *
 * SAFETY
 * ------
 * - Requires a signed-in Supabase user, so it is not public.
 * - NEVER returns the client secret. The client ID is masked to its last 6
 *   characters, which is enough to compare against the PayPal dashboard
 *   without publishing a credential.
 * - Performs no writes and moves no money. The order it creates is never
 *   captured, so nothing is charged.
 */

const PAYPAL_API_BASE = process.env.PAYPAL_ENV === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

/** Show only enough of a credential to identify it, never enough to use it. */
function mask(value = '') {
  const text = String(value)
  if (!text) return ''
  if (text.length <= 6) return '******'
  return `…${text.slice(-6)} (${text.length} chars)`
}

async function runDiagnostics(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return sendError(res, 405, 'Method not allowed.')

  const report = {
    environment: process.env.PAYPAL_ENV === 'sandbox' ? 'sandbox' : 'live',
    apiBase: PAYPAL_API_BASE,
    serverClientId: mask(process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || ''),
    serverClientIdPresent: Boolean(process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID),
    serverSecretPresent: Boolean(process.env.PAYPAL_CLIENT_SECRET),
    browserClientId: mask(process.env.VITE_PAYPAL_CLIENT_ID || ''),
    steps: [],
  }

  try {
    // Signed in, so this cannot be probed anonymously.
    await requireStudent(req).catch(() => { throw new Error('Please sign in before running the PayPal check.') })

    if (!report.serverClientIdPresent || !report.serverSecretPresent) {
      report.verdict = 'PayPal server credentials are missing in Vercel.'
      report.steps.push('Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Vercel, then redeploy.')
      return sendJson(res, 200, report)
    }

    /* 1 — do the credentials authenticate at all? -------------------- */
    let accessToken
    try {
      accessToken = await getPayPalAccessToken()
      report.credentialsAccepted = true
    } catch (error) {
      report.credentialsAccepted = false
      report.authError = error.message
      report.verdict = 'PayPal rejected the client ID / secret.'
      report.steps.push('The key pair is wrong, mismatched, or one is sandbox while the other is live. Regenerate BOTH from the same app in the PayPal Developer dashboard.')
      return sendJson(res, 200, report)
    }

    /* 2 — WHICH PayPal account do these keys belong to? -------------- */
    // This is the decisive question when the dashboard looks healthy.
    try {
      const who = await fetch(`${PAYPAL_API_BASE}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const info = await who.json().catch(() => ({}))
      report.merchantAccount = {
        payerId: info.payer_id || '',
        email: info.email || '',
        verifiedAccount: info.verified_account,
        accountType: info.account_type || '',
      }
    } catch (error) {
      report.merchantAccount = { error: error.message }
    }

    /* 3 — attempt a real order and keep PayPal's own debug id -------- */
    // The debug id is what PayPal support asks for first.
    const attempt = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'USD', value: '10.00' } }],
      }),
    })
    const attemptBody = await attempt.json().catch(() => ({}))
    report.orderAttempt = {
      status: attempt.status,
      ok: attempt.ok,
      issue: attemptBody.details?.[0]?.issue || attemptBody.name || '',
      description: attemptBody.details?.[0]?.description || attemptBody.message || '',
      debugId: attempt.headers.get('paypal-debug-id') || attemptBody.debug_id || '',
      // Identifies the account PayPal thinks is calling.
      callerAccount: attempt.headers.get('caller_acct_num') || '',
    }

    /* 4 — turn all of that into one plain sentence ------------------- */
    if (attempt.ok) {
      report.verdict = 'PayPal accepted a test order. Checkout is working.'
      report.steps.push('Nothing to do. If parents still cannot pay, tell the developer the order attempt succeeded.')
    } else if (report.orderAttempt.issue === 'PAYEE_ACCOUNT_RESTRICTED') {
      report.verdict = `PayPal is blocking the account these keys belong to${report.merchantAccount?.email ? ` (${report.merchantAccount.email})` : ''}.`
      report.steps.push('Check that the email above is the SAME PayPal account you are looking at in your browser. If it is different, the keys in Vercel came from another account.')
      report.steps.push('If it is the same account, sign in there, open the Resolution Center, and clear every open item.')
      report.steps.push(`Quote this debug ID to PayPal support: ${report.orderAttempt.debugId || 'unavailable'}`)
    } else {
      report.verdict = `PayPal refused the order: ${report.orderAttempt.issue || attempt.status}`
      report.steps.push(report.orderAttempt.description || 'Send this report to the developer.')
    }

    return sendJson(res, 200, report)
  } catch (error) {
    report.verdict = `The check could not complete: ${error.message}`
    return sendJson(res, 200, report)
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return runDiagnostics(req, res)
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
