/**
 * Rules for the new-parent welcome card.
 *
 * Kept separate from WelcomeMessage.jsx because a file that exports both a
 * component and plain helpers breaks React fast refresh — and because these
 * rules are worth unit testing on their own, without a browser.
 */

/** How long the welcome stays on a new parent's dashboard. */
export const WELCOME_VISIBLE_DAYS = 14

export const DISMISSED_KEY = 'tutorpro_welcome_dismissed_v1'

/** Days since the account was created, or null when the date is unusable. */
export function accountAgeInDays(createdAt, now = Date.now()) {
  const created = Date.parse(createdAt || '')
  if (!Number.isFinite(created)) return null
  return (now - created) / (24 * 60 * 60 * 1000)
}

/**
 * Should this account see the welcome?
 *
 * A missing or unparseable createdAt counts as NOT new. A broken date must
 * never resurrect the welcome for a family who joined a year ago: showing it
 * to an established parent is a worse failure than missing a new one, because
 * it reads as the site having forgotten them.
 *
 * A future-dated account is also excluded, which can happen when a device
 * clock is wrong.
 */
export function shouldShowWelcome(account, dismissedIds = [], now = Date.now()) {
  if (!account?.id) return false
  if (dismissedIds.includes(account.id)) return false
  const age = accountAgeInDays(account.createdAt, now)
  if (age === null) return false
  return age >= 0 && age < WELCOME_VISIBLE_DAYS
}

/**
 * A greeting the parent does not have to write themselves.
 *
 * Their name and their child's name travel with the message, so whoever
 * answers already knows who is asking and can look the account up.
 */
export function welcomeEnquiry({ parentName = '', childName = '' } = {}) {
  const lines = ['Hello TutorPro, I have just created an account on your website.']
  if (String(parentName).trim()) lines.push(`Parent: ${String(parentName).trim()}`)
  if (String(childName).trim()) lines.push(`Student: ${String(childName).trim()}`)
  lines.push('I have a question before booking our free first class.')
  return lines.join('\n')
}

export function readDismissed() {
  try {
    const value = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function rememberDismissed(id) {
  const next = [...new Set([...readDismissed(), id])].slice(-50)
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch { /* Private mode: in-memory only. */ }
  return next
}
