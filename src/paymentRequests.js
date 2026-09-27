/**
 * Bills raised by an administrator: "pay for N class sessions, $X total".
 *
 * WHY THIS FILE HAS NO BROWSER CODE
 * ---------------------------------
 * Exactly like src/discounts.js, it is loaded by BOTH the browser (to show a
 * parent what they owe) and the Vercel payment function (to decide what the
 * card is actually charged). One copy of the arithmetic means the figure on
 * screen and the figure on the card can never disagree.
 *
 * WHERE A BILL LIVES
 * ------------------
 * On the student's own Supabase profile, at `profile_data.paymentRequest`.
 * The server reads it from there at checkout — never from the request body,
 * which a parent could edit. The browser copy is for display only.
 *
 *   paymentRequest: {
 *     id: 'pr-1764...',
 *     sessions: 12,               // class sessions being billed
 *     amount: 84,                 // USD total the parent pays
 *     rate: 7,                    // per-session figure used to reach it
 *     note: 'October block booking',
 *     status: 'open' | 'paid' | 'cancelled',
 *     createdAt, createdBy,       // audit trail
 *     paidAt, orderId, paidAmount
 *   }
 *
 * Only ONE bill is open at a time. Raising a new one replaces the old, so a
 * family can never be looking at two different amounts due.
 */
import { resolveStudentPrice } from './discounts.js'

/** A block booking can be large, but not accidentally-typed-a-zero large. */
export const MIN_REQUEST_SESSIONS = 1
export const MAX_REQUEST_SESSIONS = 200
/** PayPal rejects $0.00, and an unnoticed extra digit should not be payable. */
export const MIN_REQUEST_AMOUNT = 1
export const MAX_REQUEST_AMOUNT = 5000
export const MAX_REQUEST_NOTE = 160

export const PAYMENT_REQUEST_STATUSES = ['open', 'paid', 'cancelled']

/** Whole number of sessions, or 0 when unusable. */
export function normalizeRequestSessions(value) {
  const numeric = Math.round(Number(value))
  if (!Number.isFinite(numeric) || numeric < MIN_REQUEST_SESSIONS) return 0
  return Math.min(numeric, MAX_REQUEST_SESSIONS)
}

/** Money to whole cents, or 0 when unusable. */
export function normalizeRequestAmount(value) {
  const numeric = Math.round(Number(value) * 100) / 100
  if (!Number.isFinite(numeric) || numeric < MIN_REQUEST_AMOUNT) return 0
  return Math.min(numeric, MAX_REQUEST_AMOUNT)
}

/**
 * What N sessions cost this particular family.
 *
 * Runs through the same pricing resolver as normal checkout, so a family on
 * a negotiated rate or a percentage discount is billed at their own price
 * rather than the published one. `rates` carries the published figures so
 * this module stays free of pricing constants that could drift.
 */
export function suggestedRequestAmount(sessions, profileData, rates, now = Date.now()) {
  const count = normalizeRequestSessions(sessions)
  if (!count) return { sessions: 0, rate: 0, amount: 0, mode: 'standard' }
  const standard = Number(rates?.standard) || 0
  const pkg = Number(rates?.package) || standard
  const packageMin = Number(rates?.packageMin) || 4
  const publishedRate = count >= packageMin ? pkg : standard
  const price = resolveStudentPrice(profileData, {
    standard,
    package: pkg,
    packageMin,
    sessions: count,
    credits: count,
    fullTotal: Math.round(publishedRate * count * 100) / 100,
  }, now)
  return {
    sessions: count,
    rate: price.rate,
    amount: Math.round(price.total * 100) / 100,
    mode: price.mode,
    fullTotal: price.fullTotal,
    saving: price.saving,
  }
}

/**
 * Validate what an administrator typed before it is saved.
 * Returns { valid, sessions, amount, error } so the form can explain itself.
 */
export function validatePaymentRequestInput({ sessions, amount } = {}) {
  const count = normalizeRequestSessions(sessions)
  if (!count) {
    return { valid: false, sessions: 0, amount: 0, error: `Enter how many class sessions to bill, between ${MIN_REQUEST_SESSIONS} and ${MAX_REQUEST_SESSIONS}.` }
  }
  const rawAmount = Number(amount)
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return { valid: false, sessions: count, amount: 0, error: 'Enter the total amount the parent should pay.' }
  }
  if (rawAmount < MIN_REQUEST_AMOUNT) {
    return { valid: false, sessions: count, amount: 0, error: `The smallest payable total is $${MIN_REQUEST_AMOUNT.toFixed(2)}. PayPal rejects anything lower — to give lessons free, add credits manually instead.` }
  }
  if (rawAmount > MAX_REQUEST_AMOUNT) {
    return { valid: false, sessions: count, amount: 0, error: `The largest bill you can send is $${MAX_REQUEST_AMOUNT.toLocaleString()}. Check the figure.` }
  }
  return { valid: true, sessions: count, amount: normalizeRequestAmount(rawAmount), error: '' }
}

/** Build the record that gets written to the student's profile. */
export function buildPaymentRequest({ sessions, amount, rate = 0, note = '', createdBy = '', now = Date.now() } = {}) {
  const check = validatePaymentRequestInput({ sessions, amount })
  if (!check.valid) return null
  return {
    id: `pr-${now}-${check.sessions}`,
    sessions: check.sessions,
    amount: check.amount,
    rate: Math.round((Number(rate) || (check.amount / check.sessions)) * 100) / 100,
    note: String(note || '').slice(0, MAX_REQUEST_NOTE),
    status: 'open',
    createdAt: new Date(now).toISOString(),
    createdBy: String(createdBy || '').slice(0, 120),
    paidAt: '',
    orderId: '',
    paidAmount: 0,
  }
}

/**
 * The bill a parent currently owes, or null.
 *
 * Fails closed: anything malformed, already paid, cancelled or not payable
 * returns null, so a corrupted record can never produce a mystery charge.
 */
export function activePaymentRequest(profileData) {
  const request = profileData?.paymentRequest
  if (!request || typeof request !== 'object' || Array.isArray(request)) return null
  if (request.status && request.status !== 'open') return null
  const sessions = normalizeRequestSessions(request.sessions)
  const amount = normalizeRequestAmount(request.amount)
  if (!sessions || !amount) return null
  return {
    id: String(request.id || ''),
    sessions,
    amount,
    rate: Math.round((Number(request.rate) || (amount / sessions)) * 100) / 100,
    note: String(request.note || '').slice(0, MAX_REQUEST_NOTE),
    status: 'open',
    createdAt: request.createdAt || '',
    createdBy: String(request.createdBy || '').slice(0, 120),
  }
}

/** The most recently settled bill, for the "already paid" confirmation. */
export function settledPaymentRequest(profileData) {
  const request = profileData?.paymentRequest
  if (!request || typeof request !== 'object' || request.status !== 'paid') return null
  return {
    sessions: normalizeRequestSessions(request.sessions),
    amount: normalizeRequestAmount(request.paidAmount || request.amount),
    paidAt: request.paidAt || '',
    orderId: String(request.orderId || ''),
    note: String(request.note || '').slice(0, MAX_REQUEST_NOTE),
  }
}

/** Close a bill once PayPal has actually captured the money. */
export function markPaymentRequestPaid(request, { orderId = '', amount = 0, at = new Date().toISOString() } = {}) {
  if (!request || typeof request !== 'object') return null
  return {
    ...request,
    status: 'paid',
    paidAt: at,
    orderId: String(orderId || ''),
    paidAmount: normalizeRequestAmount(amount) || normalizeRequestAmount(request.amount),
  }
}

/** Withdraw a bill without charging anything. */
export function cancelPaymentRequest(request, { at = new Date().toISOString() } = {}) {
  if (!request || typeof request !== 'object') return null
  return { ...request, status: 'cancelled', cancelledAt: at }
}

/** One line for the admin list, e.g. "12 sessions · $84.00 · awaiting payment". */
export function describePaymentRequest(request) {
  const open = activePaymentRequest({ paymentRequest: request })
  if (open) {
    const parts = [`${open.sessions} session${open.sessions === 1 ? '' : 's'}`, `$${open.amount.toFixed(2)}`, 'awaiting payment']
    if (open.note) parts.push(open.note)
    return parts.join(' · ')
  }
  const settled = settledPaymentRequest({ paymentRequest: request })
  if (settled) return `${settled.sessions} session${settled.sessions === 1 ? '' : 's'} · $${settled.amount.toFixed(2)} · paid`
  if (request?.status === 'cancelled') return 'Bill cancelled'
  return 'No bill sent'
}

/** Plain-language summary a parent reads on their dashboard. */
export function paymentRequestSummary(request) {
  const open = activePaymentRequest({ paymentRequest: request })
  if (!open) return ''
  return `${open.sessions} class session${open.sessions === 1 ? '' : 's'} — $${open.amount.toFixed(2)} total ($${open.rate.toFixed(2)} per session)`
}
