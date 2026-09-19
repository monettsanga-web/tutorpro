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
import { getPayPalAccessToken, requireStudent, sendError, sendJson } from '../_paypal.js'

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

export default async function handler(req, res) {
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
