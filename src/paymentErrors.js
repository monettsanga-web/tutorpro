/**
 * Turn a raw PayPal / checkout API error into something a parent can act on.
 *
 * WHY THIS EXISTS
 * ---------------
 * The checkout previously showed whatever string came back from the server.
 * When the PayPal merchant account itself is restricted, that string is:
 *
 *     "PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted."
 *
 * A parent reading that has no idea what it means, no idea whether they have
 * been charged, and no way forward. Worse, the problem is entirely on OUR
 * side — nothing they do (another card, another browser, trying tomorrow)
 * can fix it. Telling them to "please try again" would be a lie that burns
 * the most valuable moment on the site: someone with their card out.
 *
 * So every failure is sorted into one of two audiences:
 *
 *   audience: 'merchant'  → we broke it. Do NOT ask the parent to retry.
 *                           Show the human contact routes so the booking can
 *                           be completed by hand and the sale is not lost.
 *   audience: 'payer'     → something about this particular payment attempt
 *                           (declined card, cancelled window). Retrying or
 *                           changing card genuinely can work.
 *
 * `adminHint` is never shown to parents. It is the sentence the site owner
 * needs in the admin panel to actually fix the cause.
 *
 * Pure string logic: no network, no React, no side effects, so it is cheap to
 * unit test and safe to import anywhere.
 */

/** Never leak these raw fragments to a parent. */
const MERCHANT_PATTERNS = [
  {
    code: 'merchant_restricted',
    match: ['payee_account_restricted', 'merchant account is restricted'],
    title: 'Card payment is temporarily unavailable',
    message: 'Our payment provider has put a hold on our account, so online card payment cannot be completed right now. This is a problem on our side — nothing is wrong with your card and you have not been charged.',
    adminHint: 'PayPal has RESTRICTED the merchant account, so it cannot receive money. No code change can fix this. Sign in at paypal.com, open the Resolution Center, and complete every open item (identity, address or bank confirmation is the usual cause). Checkout starts working again the moment the restriction is lifted.',
  },
  {
    code: 'merchant_not_configured',
    match: ['credentials are not configured', 'paypal_client_id', 'paypal_client_secret'],
    title: 'Card payment is not set up yet',
    message: 'Online card payment is not switched on at the moment. This is a setting on our side, not a problem with your card.',
    adminHint: 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are missing from the Vercel environment variables. Add both (Production scope) and redeploy.',
  },
  {
    code: 'merchant_auth_failed',
    match: ['invalid_client', 'paypal authentication failed', 'client authentication failed'],
    title: 'Card payment is temporarily unavailable',
    message: 'We cannot reach our payment provider at the moment. This is a problem on our side and your card has not been charged.',
    adminHint: 'PayPal rejected the API credentials (invalid_client). The client ID and secret in Vercel are wrong, mismatched, or one is a sandbox key while the other is live. Regenerate both from the same PayPal app and redeploy.',
  },
  {
    code: 'merchant_payee_unverified',
    match: ['payee_account_not_verified', 'payee_account_locked_or_closed', 'payee_account_invalid'],
    title: 'Card payment is temporarily unavailable',
    message: 'Our payment account is being reviewed by the provider, so card payment is paused. Nothing has been charged to you.',
    adminHint: 'PayPal reports the receiving account as unverified, locked or invalid. Confirm the email address and bank on the PayPal business account.',
  },
  {
    code: 'merchant_card_processing_off',
    match: ['payee_not_enabled_for_card_processing'],
    title: 'Card payment is temporarily unavailable',
    message: 'Card payment is not enabled on our account yet. You can still pay using the other options below.',
    adminHint: 'The PayPal business account is not enabled for Advanced Card Processing. Apply for it in the PayPal dashboard, or keep PayPal-balance checkout only.',
  },
  {
    code: 'merchant_credit_failed',
    match: ['could not update booking credits', 'student profile could not be loaded'],
    title: 'Your payment went through, but credits are delayed',
    message: 'Your payment was successful. Adding the lesson credits to your account did not finish, so please send us a message and we will add them straight away. Do not pay again.',
    adminHint: 'Payment captured but the Supabase profile update failed. Check SUPABASE_SERVICE_ROLE_KEY in Vercel and the profiles row for this account, then add the credits manually in Admin → Payments.',
  },
]

/** These are about this one attempt — retrying is honest advice. */
const PAYER_PATTERNS = [
  {
    code: 'payer_declined',
    match: ['instrument_declined', 'transaction_refused', 'card was declined'],
    title: 'Your card was declined',
    message: 'Your bank did not approve this payment. Please try a different card or payment method, or contact your bank.',
  },
  {
    code: 'payer_restricted',
    match: ['payer_account_restricted', 'payer_cannot_pay', 'payer_account_locked_or_closed'],
    title: 'PayPal could not use this account',
    message: 'PayPal could not complete the payment from this account. Please try a different card or PayPal account.',
  },
  {
    code: 'payer_country',
    match: ['payer_country_not_supported', 'domestic_transaction_required'],
    title: 'This payment method is not available in your country',
    message: 'PayPal does not allow this payment between our countries. Please use one of the other payment options below.',
  },
  {
    code: 'cancelled',
    match: ['cancelled before completion', 'payment was cancelled'],
    title: 'Payment cancelled',
    message: 'The payment window was closed before it finished. Nothing has been charged — you can start again whenever you are ready.',
  },
  {
    code: 'session_expired',
    match: ['log in again', 'login session could not be verified', 'account mismatch'],
    title: 'Please sign in again',
    message: 'Your sign-in session expired before the payment started. Please refresh the page, sign in again, and retry.',
  },
  {
    code: 'sdk_blocked',
    match: ['sdk failed to load', 'buttons could not load', 'failed to fetch', 'networkerror', 'load failed'],
    title: 'The payment window could not load',
    message: 'The secure PayPal window could not open. This is usually an ad-blocker, a VPN, or an unstable connection. Please disable any blocker for this page and refresh.',
  },
]

function textOf(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  return [error.message, error.error, error.details, error.name, error.code]
    .filter(Boolean)
    .map(String)
    .join(' ')
}

/**
 * Classify a checkout failure.
 *
 * Merchant patterns are tested FIRST and deliberately so: if an error could
 * read as either, the safe assumption is that it is our fault, because
 * wrongly telling a parent to retry a payment that can never succeed is the
 * more damaging mistake.
 *
 * @returns {{code:string,title:string,message:string,audience:'merchant'|'payer',
 *            canRetry:boolean,showContact:boolean,adminHint:string,raw:string}}
 */
export function describePaymentError(error) {
  const raw = textOf(error).trim()
  const haystack = raw.toLowerCase()

  const merchant = MERCHANT_PATTERNS.find((entry) => entry.match.some((needle) => haystack.includes(needle)))
  if (merchant) {
    return {
      code: merchant.code,
      title: merchant.title,
      message: merchant.message,
      audience: 'merchant',
      canRetry: false,
      showContact: true,
      adminHint: merchant.adminHint,
      raw,
    }
  }

  const payer = PAYER_PATTERNS.find((entry) => entry.match.some((needle) => haystack.includes(needle)))
  if (payer) {
    return {
      code: payer.code,
      title: payer.title,
      message: payer.message,
      audience: 'payer',
      canRetry: payer.code !== 'payer_country',
      showContact: payer.code === 'payer_country',
      adminHint: '',
      raw,
    }
  }

  return {
    code: 'unknown',
    title: 'The payment could not be completed',
    message: 'Something went wrong before the payment finished, so nothing has been charged. Please try again, or message us and we will take your booking directly.',
    audience: 'payer',
    canRetry: true,
    showContact: true,
    adminHint: raw ? `Unrecognised checkout error: ${raw}` : '',
    raw,
  }
}

/** True when no amount of parent retrying can succeed. */
export function isMerchantSideFailure(error) {
  return describePaymentError(error).audience === 'merchant'
}
