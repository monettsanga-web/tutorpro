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
  const existing = details.transactionId && payments.find((payment) => payment.transactionId === details.transactionId)
  if (existing) return existing
  const payment = {
    id: crypto.randomUUID(),
    accountId: details.accountId,
    learnerId: details.learnerId,
    provider: details.provider || 'paypal',
    transactionId: details.transactionId || '',
    amount: Number(details.amount),
    currency: details.currency || 'USD',
    plan: details.plan,
    status: details.status || 'completed',
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
