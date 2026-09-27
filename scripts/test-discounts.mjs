/**
 * Per-student discounts — pure unit checks.
 *
 * The rule that matters most: the price a parent is SHOWN and the price their
 * card is CHARGED must be produced by the same code. src/discounts.js is
 * imported by both the browser and the PayPal serverless function precisely
 * so that cannot drift, and these checks pin the behaviour down.
 *
 * The second rule: a discount must never be readable from anything a parent
 * controls. That is enforced in api/_paypal.js and asserted at the bottom.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const {
  MAX_DISCOUNT_PERCENT, activeDiscount, activeDiscountPercent, applyDiscount,
  describeDiscount, discountSaving, isDiscountExpired, normalizeDiscountPercent,
  validateDiscountInput,
} = await import('../src/discounts.js')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

/* --- the maths -------------------------------------------------------- */
console.log('--- the arithmetic ---')
ok(applyDiscount(100, 20) === 80, '20% off $100 is $80')
ok(applyDiscount(112, 20) === 89.6, '20% off a $112 monthly package is $89.60')
ok(applyDiscount(16, 25) === 12, '25% off $16 is $12')
ok(applyDiscount(100, 0) === 100, 'no discount leaves the price alone')
ok(discountSaving(112, 20) === 22.4, 'the saving on $112 at 20% is $22.40')
ok(discountSaving(100, 0) === 0, 'no discount saves nothing')

// Rounding must land on whole cents, or the capture check rejects the payment.
ok(applyDiscount(9.99, 33) === 6.69, 'an awkward amount rounds to whole cents (9.99 @ 33% = 6.69)')
ok(applyDiscount(7, 15) === 5.95, '15% off $7 is $5.95')
// Verified by string, not by multiplying back: 4.69 * 100 is
// 469.00000000000006 in IEEE-754, so a naive equality check fails on a value
// that is in fact exact to the cent. That caught my own test, not the code.
for (const amount of [7, 8, 14, 16, 28, 96, 112, 140, 9.99, 33.33]) {
  for (const percent of [1, 7, 13, 25, 33, 50, 90]) {
    const value = applyDiscount(amount, percent)
    const decimals = (String(value).split('.')[1] || '').length
    assert.ok(decimals <= 2, `${amount} @ ${percent}% produced ${value}, which is finer than a cent`)
    // The figure sent to PayPal is the toFixed(2) form; it must not round again.
    assert.equal(Number(value.toFixed(2)), value, `${amount} @ ${percent}% changes when formatted for PayPal`)
  }
}
ok(true, 'no combination produces fractions of a cent, or shifts when formatted for PayPal')

/* --- the cap ---------------------------------------------------------- */
console.log('\n--- the 90% cap ---')
ok(MAX_DISCOUNT_PERCENT === 90, 'the maximum discount is 90%')
ok(normalizeDiscountPercent(150) === 90, 'an over-large percentage is clamped, never applied as typed')
ok(normalizeDiscountPercent(100) === 90, '100% is clamped to 90, because PayPal rejects a $0.00 order')
ok(applyDiscount(100, 100) === 10, 'even a 100% attempt still leaves a chargeable amount')
ok(applyDiscount(100, 99999) > 0, 'an absurd percentage can never produce a free order')

/* --- hostile and broken input ----------------------------------------- */
console.log('\n--- bad input fails closed ---')
ok(normalizeDiscountPercent(-50) === 0, 'a negative percentage becomes no discount, never a surcharge')
ok(applyDiscount(100, -50) === 100, 'a negative discount cannot increase the price')
ok(normalizeDiscountPercent('abc') === 0, 'nonsense text becomes no discount')
ok(normalizeDiscountPercent(null) === 0, 'null becomes no discount')
ok(normalizeDiscountPercent(undefined) === 0, 'undefined becomes no discount')
ok(normalizeDiscountPercent(12.6) === 13, 'a fractional percentage is rounded to a whole number')
ok(applyDiscount('not a number', 20) === 0, 'a non-numeric amount yields 0 rather than NaN')
ok(applyDiscount(-10, 20) === 0, 'a negative amount cannot be discounted into a refund')

/* --- expiry ----------------------------------------------------------- */
console.log('\n--- expiry ---')
ok(!isDiscountExpired({ percent: 20 }), 'no end date means it never expires')
ok(!isDiscountExpired({ percent: 20, expiresAt: '' }), 'an empty end date means it never expires')
ok(isDiscountExpired({ expiresAt: new Date(now - DAY).toISOString() }, now), 'yesterday counts as expired')
ok(!isDiscountExpired({ expiresAt: new Date(now + DAY).toISOString() }, now), 'tomorrow is still valid')
// A corrupted date must charge full price, not grant money off forever.
ok(isDiscountExpired({ expiresAt: 'not-a-date' }), 'an unreadable end date fails closed and expires')

/* --- reading a profile ------------------------------------------------ */
console.log('\n--- reading the student profile ---')
ok(activeDiscountPercent({ discount: { percent: 20 } }) === 20, 'a plain 20% discount reads back')
ok(activeDiscountPercent({}) === 0, 'a profile with no discount reads 0')
ok(activeDiscountPercent(null) === 0, 'a null profile reads 0 rather than throwing')
ok(activeDiscountPercent({ discount: null }) === 0, 'an explicitly cleared discount reads 0')
ok(activeDiscountPercent({ discount: 'twenty percent' }) === 0, 'a malformed discount reads 0')
ok(activeDiscountPercent({ discount: { percent: 20, expiresAt: new Date(now - DAY).toISOString() } }, now) === 0,
  'an expired discount reads 0, so the parent pays full price')
ok(activeDiscount({ discount: { percent: 20, reason: 'Sibling' } })?.reason === 'Sibling', 'the reason is preserved')
ok(activeDiscount({ discount: { percent: 20, reason: 'x'.repeat(500) } }).reason.length === 120,
  'an over-long reason is truncated rather than stored unbounded')

/* --- what the admin form accepts -------------------------------------- */
console.log('\n--- admin input validation ---')
ok(validateDiscountInput({ percent: 20 }).valid, '20% is accepted')
ok(validateDiscountInput({ percent: 90 }).valid, '90% is accepted')
ok(!validateDiscountInput({ percent: 91 }).valid, '91% is refused')
ok(/free lesson/i.test(validateDiscountInput({ percent: 100 }).error), 'refusing 100% explains the alternative')
ok(!validateDiscountInput({ percent: 0 }).valid, '0% is refused with a pointer to Remove discount')
ok(!validateDiscountInput({ percent: -5 }).valid, 'a negative percentage is refused')
ok(!validateDiscountInput({ percent: 'abc' }).valid, 'text is refused')
ok(!validateDiscountInput({ percent: 20, expiresAt: '2020-01-01' }).valid, 'a past end date is refused')
ok(validateDiscountInput({ percent: 20, expiresAt: new Date(now + (30 * DAY)).toISOString() }).valid,
  'a future end date is accepted')

/* --- the admin-facing summary ----------------------------------------- */
console.log('\n--- the summary line ---')
ok(describeDiscount({ percent: 20, reason: 'Sibling' }).includes('20% off'), 'the summary names the percentage')
ok(describeDiscount(null) === 'No discount', 'no discount is described plainly')
ok(describeDiscount({ percent: 20, expiresAt: new Date(now - DAY).toISOString() }).includes('expired'),
  'an expired discount is labelled as expired rather than silently hidden')

/* --- the security boundary -------------------------------------------- */
console.log('\n--- the server must not trust the browser ---')
const server = readFileSync(new URL('../api/_paypal.js', import.meta.url), 'utf8')
const createOrder = readFileSync(new URL('../api/paypal/create-order.js', import.meta.url), 'utf8')

ok(/from '\.\.\/src\/discounts\.js'/.test(server), 'the server shares the browser discount logic, so both agree')
ok(/\.from\('profiles'\)/.test(server) && /studentDiscountPercent/.test(server),
  'the server reads the discount from the database')
ok(/studentDiscountPercent\(supabase, accountId\)/.test(createOrder),
  'create-order looks the discount up server-side')
// The decisive check: the discount must never come from the request body.
ok(!/req\.body[^\n]*discount/i.test(createOrder), 'the discount is NEVER taken from the request body')
ok(!/discountPercent\s*=\s*(req|body)/.test(createOrder), 'a parent cannot supply their own discount')
ok(/catch \{\s*return 0/.test(server), 'any lookup failure falls back to full price, never a free lesson')

// Capture must expect the same discounted figure, or the money is taken and
// the credits are refused.
ok(/applyDiscount\(planTotal\(billingPlan, sessions\), discountPercent\)/.test(server),
  'the capture check expects the discounted amount, so discounted payments complete')
ok(/sessions\}:\$\{discountPercent\}/.test(createOrder), 'the discount is recorded on the order itself')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
