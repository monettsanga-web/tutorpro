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
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error('Invalid payment amount.')
  if (!details.plan?.trim()) throw new Error('Choose a valid lesson plan.')
  if (!['pending', 'completed', 'refunded', 'failed'].includes(status)) throw new Error('Invalid payment status.')
  if ((details.provider || 'paypal') === 'paypal' && status === 'completed' && !details.transactionId) {
    throw new Error('A completed PayPal payment requires a transaction ID.')
  }
  const existing = details.transactionId && payments.find((payment) => payment.transactionId === details.transactionId)
  if (existing) return existing
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

export function getPayments(filters = {}) {
  return readPayments()
    .filter((payment) => !filters.accountId || payment.accountId === filters.accountId)
    .filter((payment) => !filters.learnerId || payment.learnerId === filters.learnerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
