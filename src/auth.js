const ACCOUNTS_KEY = 'tutorpro_accounts_v1'
const SESSION_KEY = 'tutorpro_session_v1'

const normalizeEmail = (email) => email.trim().toLowerCase()

function readAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
    return Array.isArray(accounts) ? accounts : []
  } catch {
    return []
  }
}

function writeAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function createSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  const value = new TextEncoder().encode(`${salt}:${password}`)
  const buffer = await crypto.subtle.digest('SHA-256', value)
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function publicAccount(account) {
  if (!account) return null
  const { passwordHash: _passwordHash, salt: _salt, ...safeAccount } = account
  return safeAccount
}

export function getCurrentAccount() {
  try {
    const accountId = localStorage.getItem(SESSION_KEY)
    if (!accountId) return null
    return publicAccount(readAccounts().find((account) => account.id === accountId))
  } catch {
    return null
  }
}

export async function registerAccount(details) {
  const accounts = readAccounts()
  const email = normalizeEmail(details.email)

  if (accounts.some((account) => account.email === email)) {
    throw new Error('An account with this email already exists. Try logging in instead.')
  }

  const salt = createSalt()
  const account = {
    id: crypto.randomUUID(),
    parentName: details.parentName.trim(),
    email,
    passwordHash: await hashPassword(details.password, salt),
    salt,
    child: {
      name: details.childName.trim(),
      year: details.year,
      curriculum: details.curriculum,
      goal: details.goal,
      frequency: details.frequency,
    },
    selectedPlan: details.selectedPlan || '',
    createdAt: new Date().toISOString(),
  }

  accounts.push(account)
  writeAccounts(accounts)
  localStorage.setItem(SESSION_KEY, account.id)
  return publicAccount(account)
}

export async function loginAccount(emailValue, password) {
  const email = normalizeEmail(emailValue)
  const account = readAccounts().find((item) => item.email === email)

  if (!account) {
    throw new Error('We could not find an account with that email.')
  }

  const passwordHash = await hashPassword(password, account.salt)
  if (passwordHash !== account.passwordHash) {
    throw new Error('That password is not correct. Please try again.')
  }

  localStorage.setItem(SESSION_KEY, account.id)
  return publicAccount(account)
}

export function logoutAccount() {
  localStorage.removeItem(SESSION_KEY)
}
