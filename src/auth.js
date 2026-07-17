import { buildWeeklySlots, slotsFromAvailabilityRanges } from './schedule.js'

const ACCOUNTS_KEY = 'tutorpro_accounts_v2'
const LEGACY_ACCOUNTS_KEY = 'tutorpro_accounts_v1'
const SESSION_KEY = 'tutorpro_session_v2'
const ADMIN_EMAIL_HASH = 'bf6e66f2c7c1acfaa4a3899a3e054f5bf185f18456c35cde73c36c9176102a33'

const normalizeEmail = (email) => email.trim().toLowerCase()

function readAccounts() {
  try {
    const current = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
    if (Array.isArray(current) && current.length) return current

    const legacy = JSON.parse(localStorage.getItem(LEGACY_ACCOUNTS_KEY) || '[]')
    if (Array.isArray(legacy) && legacy.length) {
      const migrated = legacy.map((account) => ({ ...account, role: 'student', status: 'active' }))
      writeAccounts(migrated)
      return migrated
    }
    return []
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

async function hashText(text) {
  const value = new TextEncoder().encode(text)
  const buffer = await crypto.subtle.digest('SHA-256', value)
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  return hashText(`${salt}:${password}`)
}

function publicAccount(account) {
  if (!account) return null
  const { passwordHash: _passwordHash, salt: _salt, ...safeAccount } = account
  return {
    ...safeAccount,
    role: account.role || 'student',
    status: account.status || 'active',
  }
}

export function initializePlatform() {
  const accounts = readAccounts()
  let changed = false

  accounts.forEach((account) => {
    if (account.role === 'teacher' && !account.teacher?.availabilitySlots) {
      account.teacher = {
        ...account.teacher,
        availabilitySlots: slotsFromAvailabilityRanges(account.teacher?.availability || []),
      }
      changed = true
    }
  })

  if (!accounts.some((account) => account.id === 'teacher-monett')) {
    accounts.push({
      id: 'teacher-monett',
      role: 'teacher',
      status: 'approved',
      systemProfile: true,
      fullName: 'Monett Sanga',
      email: 'monett@tutorpro.example',
      createdAt: new Date().toISOString(),
      teacher: {
        specialization: 'Both Curricula',
        bio: 'Experienced English teacher for eight years with learners of different nationalities.',
        education: 'Bachelor of Elementary Education',
        experience: 8,
        languages: 'English, Filipino and Korean',
        credentials: ['Bachelor of Elementary Education'],
        availabilitySlots: buildWeeklySlots([0, 1, 2, 3, 4], '16:00', '20:00'),
        availability: [
          { day: 'Monday', enabled: true, from: '16:00', to: '20:00' },
          { day: 'Tuesday', enabled: true, from: '16:00', to: '20:00' },
          { day: 'Wednesday', enabled: true, from: '16:00', to: '20:00' },
          { day: 'Thursday', enabled: true, from: '16:00', to: '20:00' },
          { day: 'Friday', enabled: true, from: '16:00', to: '20:00' },
          { day: 'Saturday', enabled: false, from: '09:00', to: '15:00' },
          { day: 'Sunday', enabled: false, from: '09:00', to: '15:00' },
        ],
        rating: 5,
        lessonsCompleted: 284,
      },
    })
    changed = true
  }

  if (changed) writeAccounts(accounts)
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

export function getAccounts(role) {
  return readAccounts()
    .map(publicAccount)
    .filter((account) => !role || account.role === role)
}

export function getAccountById(accountId) {
  return publicAccount(readAccounts().find((account) => account.id === accountId))
}

export function getApprovedTeachers() {
  return getAccounts('teacher').filter((account) => account.status === 'approved')
}

export function hasAdminAccount() {
  return readAccounts().some((account) => account.role === 'admin')
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
    role: 'student',
    status: 'active',
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
      level: 'Building foundations',
      progress: 18,
      streak: 0,
      lessonsCompleted: 0,
      achievements: ['First step'],
    },
    selectedPlan: details.selectedPlan || '',
    preferredTeacherId: details.preferredTeacherId || '',
    createdAt: new Date().toISOString(),
  }

  accounts.push(account)
  writeAccounts(accounts)
  localStorage.setItem(SESSION_KEY, account.id)
  return publicAccount(account)
}

export async function registerTeacher(details) {
  const accounts = readAccounts()
  const email = normalizeEmail(details.email)

  if (accounts.some((account) => account.email === email)) {
    throw new Error('An account with this email already exists.')
  }

  const salt = createSalt()
  const account = {
    id: crypto.randomUUID(),
    role: 'teacher',
    status: 'pending',
    fullName: details.fullName.trim(),
    email,
    passwordHash: await hashPassword(details.password, salt),
    salt,
    createdAt: new Date().toISOString(),
    teacher: {
      specialization: details.specialization,
      bio: details.bio.trim(),
      education: details.education.trim(),
      experience: Number(details.experience) || 0,
      languages: details.languages.trim(),
      credentials: details.credentials || [],
      availabilitySlots: buildWeeklySlots([0, 1, 2, 3, 4], '16:00', '20:00'),
      availability: [
        { day: 'Monday', enabled: true, from: '16:00', to: '20:00' },
        { day: 'Tuesday', enabled: true, from: '16:00', to: '20:00' },
        { day: 'Wednesday', enabled: true, from: '16:00', to: '20:00' },
        { day: 'Thursday', enabled: true, from: '16:00', to: '20:00' },
        { day: 'Friday', enabled: true, from: '16:00', to: '20:00' },
        { day: 'Saturday', enabled: false, from: '09:00', to: '15:00' },
        { day: 'Sunday', enabled: false, from: '09:00', to: '15:00' },
      ],
      rating: 0,
      lessonsCompleted: 0,
    },
  }

  accounts.push(account)
  writeAccounts(accounts)
  localStorage.setItem(SESSION_KEY, account.id)
  return publicAccount(account)
}

export async function createTeacherByAdmin(details) {
  const accounts = readAccounts()
  const email = normalizeEmail(details.email)
  if (accounts.some((account) => account.email === email)) {
    throw new Error('An account with this email already exists.')
  }

  const salt = createSalt()
  const account = {
    id: crypto.randomUUID(),
    role: 'teacher',
    status: 'approved',
    createdByAdmin: true,
    fullName: details.fullName.trim(),
    email,
    passwordHash: await hashPassword(details.password, salt),
    salt,
    createdAt: new Date().toISOString(),
    teacher: {
      specialization: details.specialization || 'Both Curricula',
      bio: details.bio?.trim() || 'TutorPro English teacher.',
      education: details.education?.trim() || 'To be updated',
      experience: Number(details.experience) || 0,
      languages: details.languages?.trim() || 'English',
      credentials: [],
      availabilitySlots: [],
      availability: [],
      rating: 0,
      lessonsCompleted: 0,
    },
  }

  accounts.push(account)
  writeAccounts(accounts)
  return publicAccount(account)
}

export async function registerAdmin(emailValue, password) {
  const accounts = readAccounts()
  const email = normalizeEmail(emailValue)
  if (await hashText(email) !== ADMIN_EMAIL_HASH) {
    throw new Error('The administrator email could not be verified.')
  }
  if (accounts.some((account) => account.role === 'admin')) {
    throw new Error('The administrator account has already been created. Log in instead.')
  }
  if (accounts.some((account) => account.email === email)) {
    throw new Error('This email is already attached to another account.')
  }

  const salt = createSalt()
  const account = {
    id: crypto.randomUUID(),
    role: 'admin',
    status: 'active',
    fullName: 'TutorPro Administrator',
    email,
    passwordHash: await hashPassword(password, salt),
    salt,
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

  if (!account || !account.passwordHash) {
    throw new Error('We could not find a login-enabled account with that email.')
  }
  if (account.status === 'suspended' || account.status === 'rejected') {
    throw new Error(`This account is ${account.status}. Please contact the TutorPro administrator.`)
  }

  const passwordHash = await hashPassword(password, account.salt)
  if (passwordHash !== account.passwordHash) {
    throw new Error('That password is not correct. Please try again.')
  }

  localStorage.setItem(SESSION_KEY, account.id)
  return publicAccount(account)
}

export function updateAccount(accountId, changes) {
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index < 0) throw new Error('Account not found.')
  accounts[index] = { ...accounts[index], ...changes, updatedAt: new Date().toISOString() }
  writeAccounts(accounts)
  return publicAccount(accounts[index])
}

export function updateTeacherProfile(accountId, teacherChanges) {
  const account = readAccounts().find((item) => item.id === accountId)
  if (!account || account.role !== 'teacher') throw new Error('Teacher account not found.')
  return updateAccount(accountId, { teacher: { ...account.teacher, ...teacherChanges } })
}

export function updateStudentProfile(accountId, childChanges) {
  const account = readAccounts().find((item) => item.id === accountId)
  if (!account || (account.role || 'student') !== 'student') throw new Error('Student account not found.')
  return updateAccount(accountId, { child: { ...account.child, ...childChanges } })
}

export function logoutAccount() {
  localStorage.removeItem(SESSION_KEY)
}
