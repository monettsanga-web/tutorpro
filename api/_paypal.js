import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://losmkvvwzijipqrlelyt.supabase.co'
const PAYPAL_API_BASE = process.env.PAYPAL_ENV === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

export const WEEKLY_SESSION_OPTIONS = [1, 2, 3]
export const MONTHLY_PACKAGE_OPTIONS = [3, 4, 5, 6, 7]
export const MONTHLY_BILLING_WEEKS = 4
export const MAX_CUSTOM_WEEKLY_SESSIONS = 12
export const weeklySessionRate = (sessions) => Number(sessions) <= 3 ? 10 : 8
export const parseBillingPlan = (value = 'weekly') => value === 'monthly' ? 'monthly' : 'weekly'
export const planSessionRate = (billingPlan, sessions) => parseBillingPlan(billingPlan) === 'monthly' ? (Number(sessions) <= 3 ? 10 : 8) : weeklySessionRate(sessions)
export const planCreditCount = (billingPlan, sessions) => Number(sessions) * (parseBillingPlan(billingPlan) === 'monthly' ? MONTHLY_BILLING_WEEKS : 1)
export const planTotal = (billingPlan, sessions) => planCreditCount(billingPlan, sessions) * planSessionRate(billingPlan, sessions)
export const weeklyPlanTotal = (sessions) => planTotal('weekly', sessions)

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

export function parseSessions(value, billingPlan = 'weekly') {
  const sessions = Number(value)
  if (!Number.isInteger(sessions) || sessions < 1 || sessions > MAX_CUSTOM_WEEKLY_SESSIONS) {
    throw new Error(`Choose between 1 and ${MAX_CUSTOM_WEEKLY_SESSIONS} weekly sessions.`)
  }
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
  const parts = String(customId).split(':')
  const accountId = parts[0]
  const billingPlan = parts.length >= 3 ? parseBillingPlan(parts[1]) : 'weekly'
  const sessionsText = parts.length >= 3 ? parts[2] : parts[1]
  const sessions = parseSessions(sessionsText, billingPlan)
  if (!accountId) throw new Error('PayPal order is missing the student account reference.')
  return { accountId, billingPlan, sessions }
}

export function extractOrderDetails(order) {
  const unit = order?.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  const { accountId, billingPlan, sessions } = parseCustomId(unit?.custom_id)
  const expectedAmount = planTotal(billingPlan, sessions).toFixed(2)
  const capturedAmount = capture?.amount?.value || unit?.amount?.value || '0.00'
  const currency = capture?.amount?.currency_code || unit?.amount?.currency_code || 'USD'
  if (currency !== 'USD') throw new Error('Unexpected payment currency.')
  if (Number(capturedAmount) + 0.0001 < Number(expectedAmount)) throw new Error('Captured amount is lower than the selected plan price.')
  return {
    accountId,
    billingPlan,
    sessions,
    credits: planCreditCount(billingPlan, sessions),
    sessionRate: planSessionRate(billingPlan, sessions),
    amount: Number(capturedAmount),
    currency,
    orderId: order.id,
    captureId: capture?.id || '',
    status: capture?.status || order.status,
    payerEmail: order?.payer?.email_address || '',
    payerName: [order?.payer?.name?.given_name, order?.payer?.name?.surname].filter(Boolean).join(' '),
  }
}

function normalizeReferralCode(code = '') {
  return String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
}

function addWalletReward(profileData, reward) {
  const wallet = profileData.referralWallet && typeof profileData.referralWallet === 'object' && !Array.isArray(profileData.referralWallet)
    ? profileData.referralWallet
    : {}
  const transactions = Array.isArray(wallet.transactions) ? wallet.transactions : []
  return {
    ...wallet,
    freeLessons: Number(wallet.freeLessons || 0) + (reward.freeLessons || 0),
    coins: Number(wallet.coins || 0) + (reward.coins || 0),
    xp: Number(wallet.xp || 0) + (reward.xp || 0),
    coupons: Array.isArray(wallet.coupons) ? wallet.coupons : [],
    transactions: [...transactions, { ...reward, createdAt: new Date().toISOString() }].slice(-100),
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
    billingPlan: details.billingPlan,
    weeklySessions: details.sessions,
    credits: details.credits,
    sessionRate: details.sessionRate,
    amount: details.amount,
    currency: details.currency,
    status: details.status,
    paidAt: new Date().toISOString(),
    serverVerified: true,
  }
  let referralReward = null
  let referralBonusCredits = 0
  const referredByCode = normalizeReferralCode(profileData.referredByCode)
  const canRewardReferral = !alreadyCredited && referredByCode && !profileData.referralRewardApplied

  if (canRewardReferral) {
    const { data: possibleReferrers } = await supabase
      .from('profiles')
      .select('id, profile_data')
      .neq('id', details.accountId)
    const referrer = (possibleReferrers || []).find((row) => normalizeReferralCode(row.profile_data?.referralCode) === referredByCode)
    if (referrer?.id) {
      const referrerData = referrer.profile_data && typeof referrer.profile_data === 'object' && !Array.isArray(referrer.profile_data) ? referrer.profile_data : {}
      const referrerBalance = typeof referrerData.paidLessonsBalance === 'number' ? referrerData.paidLessonsBalance : 0
      const referrerWallet = addWalletReward(referrerData, {
        type: 'free_lesson',
        source: 'referral_referrer',
        description: `Free lesson reward for referring ${profileData.parentName || profileData.fullName || 'a new family'}`,
        freeLessons: 1,
        coins: 100,
        xp: 250,
        referredAccountId: details.accountId,
      })
      await supabase
        .from('profiles')
        .update({
          profile_data: {
            ...referrerData,
            paidLessonsBalance: referrerBalance + 1,
            referralWallet: referrerWallet,
            referralStats: {
              ...(referrerData.referralStats || {}),
              successfulReferrals: Number(referrerData.referralStats?.successfulReferrals || 0) + 1,
              lastRewardAt: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', referrer.id)
      referralBonusCredits = 1
      referralReward = { referrerId: referrer.id, code: referredByCode, creditsAwarded: 1 }
    }
  }

  const nextData = alreadyCredited
    ? { ...profileData, latestPayment: paymentRecord }
    : {
        ...profileData,
        paidLessonsBalance: currentBalance + details.credits + referralBonusCredits,
        preferredWeeklySessions: details.sessions,
        preferredBillingPlan: details.billingPlan,
        latestPayment: paymentRecord,
        referralRewardApplied: Boolean(profileData.referralRewardApplied || referralReward),
        referralFirstPurchaseRewardedAt: referralReward ? new Date().toISOString() : profileData.referralFirstPurchaseRewardedAt,
        referralReward,
        referralWallet: referralReward
          ? addWalletReward(profileData, {
              type: 'free_lesson',
              source: 'referral_new_parent',
              description: 'Free lesson reward for joining through a referral and buying your first package',
              freeLessons: 1,
              coins: 50,
              xp: 125,
              referralCode: referredByCode,
            })
          : profileData.referralWallet,
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
    preferredBillingPlan: nextData.preferredBillingPlan,
    creditsAdded: alreadyCredited ? 0 : details.credits + referralBonusCredits,
    referralReward,
    latestPayment: paymentRecord,
  }
}
