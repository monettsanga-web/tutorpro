/**
 * Bills raised by an administrator: "pay for N class sessions, $X".
 *
 * The danger here is the same one that governs every other pricing feature
 * in this codebase: the figure a parent SEES and the figure their card is
 * CHARGED are produced in two different places. These checks prove they come
 * from the same arithmetic, that the amount can only ever be read from the
 * student's own profile, and that a capture for the wrong amount is refused.
 */
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

const bills = await import('../src/paymentRequests.js')
const server = await import('../api/_paypal.js')

const RATES = { standard: 8, package: 7, packageMin: 4 }

/* ================================================================== */
/* 1. What an administrator may type                                    */
/* ================================================================== */
ok(bills.normalizeRequestSessions('12') === 12, 'a typed session count is read as a number')
ok(bills.normalizeRequestSessions(4.4) === 4, 'a fractional session count is rounded')
ok(bills.normalizeRequestSessions(0) === 0, 'zero sessions is not a bill')
ok(bills.normalizeRequestSessions(-3) === 0, 'a negative session count is rejected')
ok(bills.normalizeRequestSessions('abc') === 0, 'nonsense is rejected')
ok(bills.normalizeRequestSessions(9999) === bills.MAX_REQUEST_SESSIONS, `a runaway figure is capped at ${bills.MAX_REQUEST_SESSIONS}`)

ok(bills.normalizeRequestAmount('84.00') === 84, 'a typed amount is read as money')
ok(bills.normalizeRequestAmount(84.567) === 84.57, 'money is rounded to whole cents')
ok(bills.normalizeRequestAmount(0) === 0, '$0.00 is not payable — PayPal rejects it')
ok(bills.normalizeRequestAmount(0.5) === 0, 'below the $1 floor is rejected')
ok(bills.normalizeRequestAmount(99999) === bills.MAX_REQUEST_AMOUNT, 'an absurd total is capped')

const tooMany = bills.validatePaymentRequestInput({ sessions: 500, amount: 50 })
ok(tooMany.valid && tooMany.sessions === bills.MAX_REQUEST_SESSIONS, 'a huge session count is clamped rather than silently dropped')
ok(bills.validatePaymentRequestInput({ sessions: 0, amount: 50 }).error.includes('class sessions'), 'no session count is explained')
ok(bills.validatePaymentRequestInput({ sessions: 4, amount: 0 }).error.includes('total amount'), 'no amount is explained')
ok(bills.validatePaymentRequestInput({ sessions: 4, amount: 0.25 }).error.includes('PayPal'), 'a sub-$1 total explains why PayPal cannot take it')
ok(bills.validatePaymentRequestInput({ sessions: 4, amount: 999999 }).error.includes('largest'), 'an oversized total is explained')
const good = bills.validatePaymentRequestInput({ sessions: 12, amount: 84 })
ok(good.valid && good.sessions === 12 && good.amount === 84, 'a sensible bill validates')

/* ================================================================== */
/* 2. The total is worked out at THIS family's own price                */
/* ================================================================== */
const standardFamily = {}
const discounted = { pricing: { mode: 'percent', percent: 25 } }
const negotiated = { pricing: { mode: 'fixed', standardRate: 6, packageRate: 5 } }
const expired = { pricing: { mode: 'percent', percent: 50, expiresAt: '2020-01-01T00:00:00.000Z' } }

ok(bills.suggestedRequestAmount(1, standardFamily, RATES).amount === 8, '1 session at the standard rate is $8')
ok(bills.suggestedRequestAmount(3, standardFamily, RATES).amount === 24, '3 sessions is $24')
ok(bills.suggestedRequestAmount(4, standardFamily, RATES).amount === 28, '4 sessions crosses to the package rate: $28')
ok(bills.suggestedRequestAmount(12, standardFamily, RATES).amount === 84, '12 sessions is $84')
ok(bills.suggestedRequestAmount(12, standardFamily, RATES).rate === 7, 'and the per-session figure shown is $7')
ok(bills.suggestedRequestAmount(12, discounted, RATES).amount === 63, 'a family on 25% off is billed $63 for the same 12 sessions')
ok(bills.suggestedRequestAmount(12, negotiated, RATES).amount === 60, 'a family on an agreed $5 package rate is billed $60')
ok(bills.suggestedRequestAmount(2, negotiated, RATES).amount === 12, 'under the package threshold they pay their agreed $6')
ok(bills.suggestedRequestAmount(12, expired, RATES).amount === 84, 'an expired arrangement falls back to full price, never a free lesson')
ok(bills.suggestedRequestAmount(0, standardFamily, RATES).amount === 0, 'no sessions means no amount')
ok(bills.suggestedRequestAmount(12, discounted, RATES).mode === 'percent', 'the reason for the price is reported to the admin')

/* The admin may override the calculated figure; the override must survive. */
const overridden = bills.buildPaymentRequest({ sessions: 12, amount: 50, note: 'Agreed by phone', createdBy: 'admin' })
ok(overridden.amount === 50, 'a manually typed total is kept exactly')
ok(overridden.rate === 4.17, 'the per-session figure is derived from the override')
ok(overridden.sessions === 12, 'the session count is kept')
ok(overridden.status === 'open', 'a new bill starts as unpaid')
ok(overridden.note === 'Agreed by phone', 'the note to the parent is kept')
ok(bills.buildPaymentRequest({ sessions: 0, amount: 10 }) === null, 'an invalid bill is never built')
ok(bills.buildPaymentRequest({ sessions: 5, amount: 0 }) === null, 'a $0 bill is never built')
ok(bills.buildPaymentRequest({ sessions: 5, amount: 40, note: 'x'.repeat(500) }).note.length === bills.MAX_REQUEST_NOTE, 'a huge note is trimmed')

/* ================================================================== */
/* 3. What the parent's dashboard is allowed to show                    */
/* ================================================================== */
const openProfile = { paymentRequest: bills.buildPaymentRequest({ sessions: 12, amount: 84, rate: 7 }) }
const openBill = bills.activePaymentRequest(openProfile)
ok(openBill?.amount === 84 && openBill.sessions === 12, 'an open bill is readable by the dashboard')
ok(bills.activePaymentRequest({}) === null, 'a family with no bill sees nothing')
ok(bills.activePaymentRequest({ paymentRequest: null }) === null, 'a cleared bill shows nothing')
ok(bills.activePaymentRequest({ paymentRequest: { sessions: 4, amount: 0 } }) === null, 'a corrupted $0 bill is ignored rather than shown')
ok(bills.activePaymentRequest({ paymentRequest: { sessions: 0, amount: 40 } }) === null, 'a bill with no sessions is ignored')
ok(bills.activePaymentRequest({ paymentRequest: 'oops' }) === null, 'junk in the field is ignored')

const paidProfile = { paymentRequest: bills.markPaymentRequestPaid(openProfile.paymentRequest, { orderId: 'ORD1', amount: 84 }) }
ok(bills.activePaymentRequest(paidProfile) === null, 'a paid bill stops asking for money')
ok(bills.settledPaymentRequest(paidProfile)?.orderId === 'ORD1', 'the paid bill keeps the PayPal order id')
ok(bills.settledPaymentRequest(paidProfile)?.amount === 84, 'the amount actually paid is recorded')
ok(bills.settledPaymentRequest(openProfile) === null, 'an unpaid bill is not reported as paid')

const cancelledProfile = { paymentRequest: bills.cancelPaymentRequest(openProfile.paymentRequest) }
ok(bills.activePaymentRequest(cancelledProfile) === null, 'a cancelled bill stops asking for money')
ok(bills.settledPaymentRequest(cancelledProfile) === null, 'and is not reported as paid either')

ok(bills.describePaymentRequest(openProfile.paymentRequest).includes('awaiting payment'), 'the admin list says a bill is outstanding')
ok(bills.describePaymentRequest(paidProfile.paymentRequest).includes('paid'), 'the admin list says when it is paid')
ok(bills.describePaymentRequest(cancelledProfile.paymentRequest) === 'Bill cancelled', 'and when it was withdrawn')
ok(bills.describePaymentRequest(null) === 'No bill sent', 'no bill reads plainly')
ok(bills.paymentRequestSummary(openProfile.paymentRequest) === '12 class sessions — $84.00 total ($7.00 per session)', 'the parent-facing summary reads in plain English')
ok(bills.paymentRequestSummary(bills.buildPaymentRequest({ sessions: 1, amount: 8, rate: 8 })).includes('1 class session —'), 'a single session is not pluralised')

/* ================================================================== */
/* 4. The server charges the agreed figure, and nothing else            */
/* ================================================================== */
ok(server.parseBillingPlan('invoice') === 'invoice', 'the server understands a billed payment')
ok(server.parseBillingPlan('weekly') === 'weekly' && server.parseBillingPlan('monthly') === 'monthly', 'the existing plans are untouched')
ok(server.parseBillingPlan('nonsense') === 'weekly', 'an unknown plan still falls back to weekly')
ok(server.planCreditCount('invoice', 12) === 12, 'a 12-session bill grants 12 credits, not 48')
ok(server.parseSessions(30, 'invoice') === 30, 'a bill may exceed the 12-a-week limit')
ok(server.MAX_INVOICE_SESSIONS === bills.MAX_REQUEST_SESSIONS, 'the browser and the server agree on the largest bill')

let weeklyRejected = false
try { server.parseSessions(30, 'weekly') } catch { weeklyRejected = true }
ok(weeklyRejected, 'a weekly plan still refuses 30 sessions a week')
let invoiceRejected = false
try { server.parseSessions(500, 'invoice') } catch { invoiceRejected = true }
ok(invoiceRejected, 'even a bill has an upper limit')

const customId = 'acc-1:invoice:12:0:8400'
const parsed = server.parseCustomId(customId)
ok(parsed.billingPlan === 'invoice' && parsed.sessions === 12, 'the order reference records the bill')
ok(parsed.agreedTotal === 84, 'and the exact agreed total, in dollars')

const orderFor = (value, id = customId) => ({
  id: 'ORDER-1',
  purchase_units: [{ custom_id: id, amount: { value, currency_code: 'USD' }, payments: { captures: [{ id: 'CAP-1', status: 'COMPLETED', amount: { value, currency_code: 'USD' } }] } }],
})
const exact = server.extractOrderDetails(orderFor('84.00'))
ok(exact.amount === 84 && exact.credits === 12, 'paying the billed amount grants one credit per session')
ok(exact.billingPlan === 'invoice', 'the payment is recorded as a bill')

let short = false
try { server.extractOrderDetails(orderFor('60.00')) } catch { short = true }
ok(short, 'a capture for less than the bill is refused')
const over = server.extractOrderDetails(orderFor('90.00'))
ok(over.amount === 90, 'a capture for more is accepted and recorded at what was actually taken')

let missingTotal = false
try { server.extractOrderDetails(orderFor('84.00', 'acc-1:invoice:12')) } catch { missingTotal = true }
ok(missingTotal, 'a bill with no agreed total is refused rather than guessed at')

/* Old orders must keep working. */
const legacy = server.extractOrderDetails({
  id: 'ORDER-2',
  purchase_units: [{ custom_id: 'acc-1:weekly:2', amount: { value: '16.00', currency_code: 'USD' }, payments: { captures: [{ id: 'C', status: 'COMPLETED', amount: { value: '16.00', currency_code: 'USD' } }] } }],
})
ok(legacy.billingPlan === 'weekly' && legacy.credits === 2, 'weekly orders created before billing existed still capture')

/* ================================================================== */
/* 5. Mechanical checks the amount cannot come from the browser         */
/* ================================================================== */
const createOrder = read('api/paypal/create-order.js')
const paypal = read('api/_paypal.js')
const dashboards = read('src/Dashboards.jsx')
const requests = read('src/paymentRequests.js')

ok(createOrder.includes('openPaymentRequestFor'), 'the invoice branch reads the bill from the database')
const invoiceBranch = createOrder.slice(createOrder.indexOf("if (billingPlan === 'invoice')"), createOrder.indexOf('const sessions = parseSessions'))
ok(invoiceBranch.length > 200, 'the invoice branch was located for inspection')
ok(!/req\.body/.test(invoiceBranch), 'the invoice branch never reads the amount from the request body')
ok(!/weeklySessions/.test(invoiceBranch), 'and never trusts a session count sent by the browser')
ok(/bill\.amount \* 100/.test(invoiceBranch), 'the agreed total is written into the order reference in cents')
ok(/requireStudent/.test(invoiceBranch), 'the payer must be logged in as that student')
ok(paypal.includes('.eq(\'id\', accountId)'), 'the bill is looked up by the logged-in account id')
ok(paypal.includes("billingPlan === 'invoice' && !agreedTotal"), 'a bill with no agreed total is rejected at capture')
ok(paypal.includes('markPaymentRequestPaid'), 'a captured bill is closed so it cannot be paid twice')
ok(paypal.includes('const planPreferences = isInvoice ? {}'), 'a one-off bill does not overwrite the family\'s weekly plan preference')

ok(dashboards.includes("billingPlan: payingBill ? 'invoice' : billingPlan"), 'the parent\'s pay button asks for the billed amount')
ok(dashboards.includes('activePaymentRequest(account)'), 'the parent dashboard reads the open bill')
ok(dashboards.includes('const payingBill = Boolean(openBill)'), 'bill mode cannot survive the bill being paid')
ok(/suggestedRequestAmount\(billForm\.sessions/.test(dashboards), 'the admin form totals the sessions automatically')
ok(dashboards.includes('updateCloudProfile(updated)'), 'the bill is pushed to the cloud profile the server reads')
ok(!requests.includes('window.') && !requests.includes('document.'), 'the shared billing module stays free of browser-only code')
ok(requests.includes("import { resolveStudentPrice } from './discounts.js'"), 'it reuses the one pricing resolver rather than a second copy')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
