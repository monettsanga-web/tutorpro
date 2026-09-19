/**
 * Checkout error classification — pure unit checks.
 *
 * The rule that matters most: a failure the parent CANNOT fix must never be
 * presented as something they should retry, and the raw provider string must
 * never reach them.
 */
import assert from 'node:assert/strict'

const { describePaymentError, isMerchantSideFailure } = await import('../src/paymentErrors.js')

let pass = 0, fail = 0
const ok = (cond, msg) => { cond ? pass++ : fail++; console.log((cond ? '  ok  ' : 'FAIL  ') + msg) }

/* --- the live bug: merchant account restricted -------------------- */
const restricted = describePaymentError('PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted.')
ok(restricted.code === 'merchant_restricted', 'PAYEE_ACCOUNT_RESTRICTED is recognised')
ok(restricted.audience === 'merchant', 'restricted account is a merchant-side failure')
ok(restricted.canRetry === false, 'parent is NOT told to retry a payment that cannot succeed')
ok(restricted.showContact === true, 'restricted account offers a human contact route')
ok(/not been charged|nothing is wrong with your card/i.test(restricted.message), 'reassures the parent they were not charged')
ok(!/PAYEE_ACCOUNT_RESTRICTED/i.test(restricted.message), 'raw PayPal code never appears in the parent message')
ok(!/PAYEE_ACCOUNT_RESTRICTED/i.test(restricted.title), 'raw PayPal code never appears in the title')
ok(/Resolution Center/i.test(restricted.adminHint), 'admin hint names the actual fix')
ok(isMerchantSideFailure(restricted.raw), 'isMerchantSideFailure agrees')

/* the same error as an Error object and as an API payload -------- */
ok(describePaymentError(new Error('PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted.')).code === 'merchant_restricted',
  'works on an Error instance')
ok(describePaymentError({ error: 'PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted.' }).code === 'merchant_restricted',
  'works on an API {error} payload')
ok(describePaymentError({ message: 'the merchant account is restricted' }).code === 'merchant_restricted',
  'matches case-insensitively without the code prefix')

/* --- other merchant-side failures --------------------------------- */
const notConfigured = describePaymentError('PayPal server credentials are not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Vercel.')
ok(notConfigured.code === 'merchant_not_configured', 'missing credentials recognised')
ok(notConfigured.audience === 'merchant', 'missing credentials is merchant-side')
ok(!/PAYPAL_CLIENT_SECRET/i.test(notConfigured.message), 'env var names are never shown to a parent')
ok(/Vercel/i.test(notConfigured.adminHint), 'admin hint points at Vercel')

const authFailed = describePaymentError({ error: 'invalid_client', error_description: 'Client Authentication failed' })
ok(authFailed.audience === 'merchant', 'invalid_client is merchant-side')
ok(authFailed.canRetry === false, 'invalid_client offers no retry')

ok(describePaymentError('PAYEE_ACCOUNT_NOT_VERIFIED').code === 'merchant_payee_unverified', 'unverified payee recognised')
ok(describePaymentError('PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING').code === 'merchant_card_processing_off', 'card processing disabled recognised')

/* paid but not credited is the most dangerous case ---------------- */
const creditFail = describePaymentError('Verified payment could not update booking credits.')
ok(creditFail.code === 'merchant_credit_failed', 'paid-but-uncredited recognised')
ok(/Do not pay again/i.test(creditFail.message), 'explicitly tells the parent NOT to pay twice')
ok(creditFail.canRetry === false, 'never offers a retry that would double-charge')
ok(creditFail.showContact === true, 'routes them to a human to get the credits')

/* --- payer-side failures CAN retry -------------------------------- */
const declined = describePaymentError('INSTRUMENT_DECLINED')
ok(declined.code === 'payer_declined', 'declined card recognised')
ok(declined.audience === 'payer', 'declined card is payer-side')
ok(declined.canRetry === true, 'declined card may be retried with another card')

const cancelled = describePaymentError('Payment was cancelled before completion.')
ok(cancelled.code === 'cancelled', 'cancellation recognised')
ok(cancelled.canRetry === true, 'cancellation may be retried')
ok(/[Nn]othing has been charged/.test(cancelled.message), 'cancellation reassures about charges')

const expired = describePaymentError('Please log in again before starting payment.')
ok(expired.code === 'session_expired', 'expired session recognised')
ok(expired.canRetry === true, 'expired session may be retried after signing in')

const blocked = describePaymentError('PayPal SDK failed to load. Check your internet connection or PayPal client ID.')
ok(blocked.code === 'sdk_blocked', 'blocked SDK recognised')
ok(/ad-blocker|blocker/i.test(blocked.message), 'blocked SDK names the usual cause')
ok(!/client ID/i.test(blocked.message), 'blocked SDK does not show internal config wording to a parent')

const country = describePaymentError('PAYER_COUNTRY_NOT_SUPPORTED')
ok(country.canRetry === false, 'unsupported country is not a retry')
ok(country.showContact === true, 'unsupported country routes to other payment options')

/* --- precedence and fallbacks ------------------------------------- */
// If a string contains both, merchant must win: telling a parent to retry a
// payment that can never succeed is the more damaging mistake.
const both = describePaymentError('INSTRUMENT_DECLINED and the merchant account is restricted')
ok(both.audience === 'merchant', 'merchant classification takes precedence over payer')

const unknown = describePaymentError('some brand new error nobody has seen')
ok(unknown.code === 'unknown', 'unrecognised errors fall back safely')
ok(unknown.canRetry === true, 'unknown errors allow a retry')
ok(unknown.showContact === true, 'unknown errors still offer a human')
ok(unknown.adminHint.includes('some brand new error'), 'unknown errors keep the raw text for the admin')

ok(describePaymentError('').code === 'unknown', 'empty error does not throw')
ok(describePaymentError(null).code === 'unknown', 'null error does not throw')
ok(describePaymentError(undefined).code === 'unknown', 'undefined error does not throw')
ok(isMerchantSideFailure(null) === false, 'null is not a merchant failure')

/* every branch must return a complete, renderable shape ----------- */
const samples = ['PAYEE_ACCOUNT_RESTRICTED', 'INSTRUMENT_DECLINED', 'Payment was cancelled before completion.', '', 'weird']
for (const sample of samples) {
  const result = describePaymentError(sample)
  assert.ok(typeof result.title === 'string' && result.title.length > 0)
  assert.ok(typeof result.message === 'string' && result.message.length > 0)
  assert.ok(typeof result.canRetry === 'boolean')
  assert.ok(['merchant', 'payer'].includes(result.audience))
}
ok(true, 'every branch returns a complete, renderable result')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
