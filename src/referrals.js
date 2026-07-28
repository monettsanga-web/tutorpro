export const AMBASSADOR_LEVELS = [
  { id: 'starter', label: 'Starter', min: 0, emoji: '🌱', benefits: ['Referral link', 'Reward wallet'] },
  { id: 'bronze', label: 'Bronze Ambassador', min: 1, emoji: '🥉', benefits: ['Bronze badge', 'Priority support'] },
  { id: 'silver', label: 'Silver Ambassador', min: 5, emoji: '🥈', benefits: ['Silver badge', 'Priority booking'] },
  { id: 'gold', label: 'Gold Ambassador', min: 10, emoji: '🥇', benefits: ['Gold frame', 'Exclusive coupons'] },
  { id: 'diamond', label: 'Diamond Ambassador', min: 25, emoji: '💎', benefits: ['VIP support', 'Special certificates'] },
  { id: 'platinum', label: 'Platinum Ambassador', min: 50, emoji: '👑', benefits: ['Platinum recognition', 'Exclusive events'] },
]

export function normalizeReferralCode(code = '') {
  return String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
}

export function referralSeed(name = '', id = '') {
  const prefix = String(name || 'TP').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
  let hash = 0
  const source = `${name}:${id}:${Date.now()}`
  for (let index = 0; index < source.length; index += 1) hash = ((hash << 5) - hash) + source.charCodeAt(index)
  const suffix = Math.abs(hash).toString(36).toUpperCase().slice(0, 5).padEnd(5, '0')
  return normalizeReferralCode(`${prefix}${suffix}`)
}

export function getReferralCode(account) {
  return normalizeReferralCode(account?.referralCode) || referralSeed(account?.parentName || account?.fullName, account?.id)
}

export function getReferralLink(account) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.tutorpro.site'
  return `${origin}/?ref=${encodeURIComponent(getReferralCode(account))}`
}

export function getAmbassadorLevel(successfulReferrals = 0) {
  return [...AMBASSADOR_LEVELS].reverse().find((level) => successfulReferrals >= level.min) || AMBASSADOR_LEVELS[0]
}

export function getNextAmbassadorLevel(successfulReferrals = 0) {
  return AMBASSADOR_LEVELS.find((level) => level.min > successfulReferrals) || null
}

export function getReferralWallet(account = {}) {
  const wallet = account.referralWallet || {}
  const transactions = Array.isArray(wallet.transactions) ? wallet.transactions : []
  return {
    freeLessons: Number(wallet.freeLessons || 0),
    coupons: Array.isArray(wallet.coupons) ? wallet.coupons : [],
    coins: Number(wallet.coins || 0),
    xp: Number(wallet.xp || 0),
    transactions,
  }
}

export function getReferralStats(account, allAccounts = []) {
  const code = getReferralCode(account)
  const referred = allAccounts.filter((candidate) => normalizeReferralCode(candidate.referredByCode) === code && candidate.id !== account?.id)
  const successful = referred.filter((candidate) => Boolean(candidate.referralRewardApplied || candidate.referralFirstPurchaseRewardedAt))
  const pending = referred.filter((candidate) => !candidate.referralRewardApplied && !candidate.referralFirstPurchaseRewardedAt)
  const level = getAmbassadorLevel(successful.length)
  const nextLevel = getNextAmbassadorLevel(successful.length)
  const wallet = getReferralWallet(account)
  return {
    code,
    link: getReferralLink(account),
    referred,
    pending,
    successful,
    lifetimeReferrals: referred.length,
    successfulReferrals: successful.length,
    pendingReferrals: pending.length,
    freeLessonsEarned: wallet.transactions.filter((item) => item.type === 'free_lesson').length,
    conversionRate: referred.length ? Math.round((successful.length / referred.length) * 100) : 0,
    level,
    nextLevel,
    progressToNext: nextLevel ? Math.min(100, Math.round((successful.length / nextLevel.min) * 100)) : 100,
    wallet,
  }
}

export function getShareTargets(link, text) {
  const encodedLink = encodeURIComponent(link)
  const encodedText = encodeURIComponent(text)
  return [
    { id: 'facebook', label: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}` },
    { id: 'messenger', label: 'Messenger', url: `https://m.me/?link=${encodedLink}` },
    { id: 'whatsapp', label: 'WhatsApp', url: `https://wa.me/?text=${encodedText}%20${encodedLink}` },
    { id: 'telegram', label: 'Telegram', url: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}` },
    { id: 'wechat', label: 'WeChat', url: link },
    { id: 'qq', label: 'QQ', url: link },
    { id: 'xiaohongshu', label: 'Xiaohongshu', url: link },
  ]
}

export function referralActivity(account, allAccounts = []) {
  const stats = getReferralStats(account, allAccounts)
  const signups = stats.referred.map((candidate) => ({
    id: `${candidate.id}-signup`,
    type: 'registration',
    title: `${candidate.parentName || candidate.fullName || 'A parent'} registered`,
    status: candidate.referralRewardApplied ? 'rewarded' : 'pending',
    date: candidate.createdAt || candidate.updatedAt || '',
  }))
  const rewards = stats.successful.map((candidate) => ({
    id: `${candidate.id}-reward`,
    type: 'reward',
    title: `Reward unlocked from ${candidate.parentName || 'new family'}`,
    status: 'completed',
    date: candidate.referralFirstPurchaseRewardedAt || candidate.updatedAt || '',
  }))
  return [...signups, ...rewards].sort((a, b) => String(b.date).localeCompare(String(a.date)))
}
