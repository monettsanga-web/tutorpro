import { getAccountById } from './auth.js'

const PAYMENTS_KEY = 'tutorpro_payments_v1'

function readPayments() {
  try {
    const payments = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]')
    return Array.isArray(payments) ? payments : []
  } catch {
    return []
  }
}

function writePayments(payments) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments))
}

export function recordPayment(details) {
  const payments = readPayments()
  const account = getAccountById(details.accountId)
  const learner = account?.children?.find((item) => item.id === details.learnerId)
  const amount = Number(details.amount)
  const status = details.status || 'completed'
  if (!account || account.role !== 'student' || !learner) throw new Error('Payment is not attached to a valid student profile.')
  if (account.status === 'suspended' || learner.accessStatus === 'suspended') throw new Error('Suspended student profiles cannot submit payments.')
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error('Invalid payment amount.')
  if (!details.plan?.trim()) throw new Error('Choose a valid lesson plan.')
  if (!['pending', 'completed', 'rejected', 'refunded', 'failed'].includes(status)) throw new Error('Invalid payment status.')
  if ((details.provider || 'paypal') === 'paypal' && status === 'completed' && !details.transactionId) {
    throw new Error('A completed PayPal payment requires a transaction ID.')
  }
  const existing = details.transactionId && payments.find((payment) => payment.transactionId === details.transactionId)
  if (existing) {
    if (existing.accountId === details.accountId && existing.learnerId === details.learnerId && ['pending', 'completed'].includes(existing.status)) return existing
    throw new Error('This payment reference has already been used. Enter a new WeChat Pay transaction reference.')
  }
  const payment = {
    id: crypto.randomUUID(),
    accountId: details.accountId,
    learnerId: details.learnerId,
    provider: details.provider || 'paypal',
    transactionId: details.transactionId || '',
    amount,
    currency: /^[A-Z]{3}$/.test(details.currency || 'USD') ? (details.currency || 'USD') : 'USD',
    plan: details.plan.trim(),
    status,
    payerName: details.payerName || '',
    createdAt: new Date().toISOString(),
  }
  payments.unshift(payment)
  writePayments(payments)
  return payment
}

export function updatePaymentStatus(paymentId, status, reviewer = '') {
  if (!['pending', 'completed', 'rejected', 'refunded', 'failed'].includes(status)) throw new Error('Invalid payment status.')
  const payments = readPayments()
  const index = payments.findIndex((payment) => payment.id === paymentId)
  if (index < 0) throw new Error('Payment record not found.')
  payments[index] = {
    ...payments[index],
    status,
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
  }
  writePayments(payments)
  return payments[index]
}

export function removeStudentPayments(accountId, learnerId) {
  const payments = readPayments()
  const remaining = payments.filter((payment) => {
    if (payment.accountId !== accountId) return true
    if (!learnerId) return false
    return payment.learnerId !== learnerId
  })
  const removed = payments.length - remaining.length
  if (removed) writePayments(remaining)
  return removed
}

export function getPayments(filters = {}) {
  return readPayments()
    .filter((payment) => !filters.accountId || payment.accountId === filters.accountId)
    .filter((payment) => !filters.learnerId || payment.learnerId === filters.learnerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
