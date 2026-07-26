import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://losmkvvwzijipqrlelyt.supabase.co'
const PAYPAL_API_BASE = process.env.PAYPAL_ENV === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

export const WEEKLY_SESSION_OPTIONS = [1, 2, 3, 4, 5, 6]
export const weeklySessionRate = (sessions) => Number(sessions) <= 3 ? 10 : 8
export const weeklyPlanTotal = (sessions) => Number(sessions) * weeklySessionRate(sessions)

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export function sendError(res, status, message, details = {}) {
  return json(res, status, { error: message, ...details })
}

export function sendJson(res, status, payload) {
  return json(res, status, payload)
}

export function parseSessions(value) {
  const sessions = Number(value)
  if (!WEEKLY_SESSION_OPTIONS.includes(sessions)) throw new Error('Choose between 1 and 6 weekly sessions.')
  return sessions
}

export function getPayPalClientId() {
  return process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || ''
}

function getPayPalClientSecret() {
  return process.env.PAYPAL_CLIENT_SECRET || ''
}

export async function getPayPalAccessToken() {
  const clientId = getPayPalClientId()
  const clientSecret = getPayPalClientSecret()
  if (!clientId || !clientSecret) throw new Error('PayPal server credentials are not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Vercel.')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'PayPal authentication failed.')
  return payload.access_token
}

export async function paypalFetch(path, options = {}) {
  const accessToken = await getPayPalAccessToken()
  const response = await fetch(`${PAYPAL_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const issue = payload.details?.[0]?.issue || payload.name || payload.error || 'PayPal request failed.'
    const description = payload.details?.[0]?.description || payload.message || ''
    throw new Error(description ? `${issue}: ${description}` : issue)
  }
  return payload
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service role is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel.')
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
}

export async function requireStudent(req, accountId) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) throw new Error('Please log in again before starting payment.')
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) throw new Error('Your login session could not be verified.')
  if (accountId && data.user.id !== accountId) throw new Error('Payment account mismatch. Please log in again.')
  return { supabase, user: data.user }
}

export function parseCustomId(customId = '') {
  const [accountId, sessionsText] = String(customId).split(':')
  const sessions = parseSessions(sessionsText)
  if (!accountId) throw new Error('PayPal order is missing the student account reference.')
  return { accountId, sessions }
}

export function extractOrderDetails(order) {
  const unit = order?.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  const { accountId, sessions } = parseCustomId(unit?.custom_id)
  const expectedAmount = weeklyPlanTotal(sessions).toFixed(2)
  const capturedAmount = capture?.amount?.value || unit?.amount?.value || '0.00'
  const currency = capture?.amount?.currency_code || unit?.amount?.currency_code || 'USD'
  if (currency !== 'USD') throw new Error('Unexpected payment currency.')
  if (Number(capturedAmount) + 0.0001 < Number(expectedAmount)) throw new Error('Captured amount is lower than the selected plan price.')
  return {
    accountId,
    sessions,
    amount: Number(capturedAmount),
    currency,
    orderId: order.id,
    captureId: capture?.id || '',
    status: capture?.status || order.status,
    payerEmail: order?.payer?.email_address || '',
    payerName: [order?.payer?.name?.given_name, order?.payer?.name?.surname].filter(Boolean).join(' '),
  }
}

export async function awardPaymentCredits(supabase, details) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, status, profile_data')
    .eq('id', details.accountId)
    .single()
  if (error || !profile?.id) throw new Error('Student profile could not be loaded for payment crediting.')
  if (profile.role !== 'student') throw new Error('PayPal payment can only credit student accounts.')

  const profileData = profile.profile_data && typeof profile.profile_data === 'object' && !Array.isArray(profile.profile_data)
    ? profile.profile_data
    : {}
  const transactions = Array.isArray(profileData.paymentTransactions) ? profileData.paymentTransactions : []
  const alreadyCredited = transactions.some((transaction) => transaction.orderId === details.orderId || (details.captureId && transaction.captureId === details.captureId))
  const currentBalance = typeof profileData.paidLessonsBalance === 'number' ? profileData.paidLessonsBalance : 0
  const paymentRecord = {
    provider: 'paypal-live',
    orderId: details.orderId,
    captureId: details.captureId,
    payerEmail: details.payerEmail,
    payerName: details.payerName,
    weeklySessions: details.sessions,
    sessionRate: weeklySessionRate(details.sessions),
    amount: details.amount,
    currency: details.currency,
    status: details.status,
    paidAt: new Date().toISOString(),
    serverVerified: true,
  }
  const nextData = alreadyCredited
    ? { ...profileData, latestPayment: paymentRecord }
    : {
        ...profileData,
        paidLessonsBalance: currentBalance + details.sessions,
        preferredWeeklySessions: details.sessions,
        latestPayment: paymentRecord,
        paymentTransactions: [...transactions, paymentRecord].slice(-50),
      }
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ profile_data: nextData, updated_at: new Date().toISOString() })
    .eq('id', details.accountId)
    .select('id, profile_data')
    .single()
  if (updateError || !updated?.id) throw new Error('Verified payment could not update booking credits.')
  return {
    alreadyCredited,
    paidLessonsBalance: nextData.paidLessonsBalance ?? currentBalance,
    preferredWeeklySessions: nextData.preferredWeeklySessions,
    latestPayment: paymentRecord,
  }
}
