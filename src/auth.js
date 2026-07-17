import { buildWeeklySlots, slotsFromAvailabilityRanges } from './schedule.js'

const ACCOUNTS_KEY = 'tutorpro_accounts_v2'
const LEGACY_ACCOUNTS_KEY = 'tutorpro_accounts_v1'
const SESSION_KEY = 'tutorpro_session_v2'
const ADMIN_EMAIL_HASH = 'bf6e66f2c7c1acfaa4a3899a3e054f5bf185f18456c35cde73c36c9176102a33'

const normalizeEmail = (email) => email.trim().toLowerCase()

function normalizeLoginId(provider = 'email', value = '') {
  const trimmed = value.trim()
  if (provider === 'whatsapp') return trimmed.replace(/[\s()-]/g, '')
  return trimmed.toLowerCase()
}

function accountLoginId(account) {
  return normalizeLoginId(account.authProvider || 'email', account.loginId || account.email || '')
}

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

function normalizeLearners(account) {
  const source = account.children?.length ? account.children : account.child ? [account.child] : []
  return source.slice(0, 3).map((learner, index) => ({
    ...learner,
    id: learner.id || `learner-${account.id}-${index + 1}`,
    paymentStatus: learner.paymentStatus || 'paid',
  }))
}

function publicAccount(account) {
  if (!account) return null
  const { passwordHash: _passwordHash, salt: _salt, ...safeAccount } = account
  const role = account.role || 'student'
  if (role === 'student') {
    const children = normalizeLearners(account)
    return { ...safeAccount, role, status: account.status || 'active', children, child: children[0] || null }
  }
  return { ...safeAccount, role, status: account.status || 'active' }
}

export function initializePlatform() {
  const accounts = readAccounts()
  let changed = false

  accounts.forEach((account) => {
    if ((account.role || 'student') === 'student' && !account.children?.length && account.child) {
      account.children = normalizeLearners(account)
      account.child = account.children[0]
      changed = true
    }
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
        classroom: { platform: 'zoom', zoomLink: '', voovLink: '' },
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
  const authProvider = details.authProvider || 'email'
  const loginId = normalizeLoginId(authProvider, details.email)
  const email = ['email', 'gmail', 'yahoo'].includes(authProvider) ? normalizeEmail(details.email) : ''

  if (accounts.some((account) => accountLoginId(account) === loginId)) {
    throw new Error('An account with this login already exists. Try logging in instead.')
  }

  const salt = createSalt()
  const learner = {
    id: crypto.randomUUID(),
    name: details.childName.trim(),
    year: details.year,
    curriculum: details.curriculum,
    goal: details.goal,
    frequency: details.frequency,
    paymentStatus: 'unpaid',
    level: 'Building foundations',
    progress: 18,
    streak: 0,
    lessonsCompleted: 0,
    achievements: ['First step'],
  }
  const account = {
    id: crypto.randomUUID(),
    role: 'student',
    status: 'active',
    parentName: details.parentName.trim(),
    email,
    loginId,
    authProvider,
    passwordHash: await hashPassword(details.password, salt),
    salt,
    child: learner,
    children: [learner],
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
  const authProvider = details.authProvider || 'email'
  const loginId = normalizeLoginId(authProvider, details.email)
  const email = ['email', 'gmail', 'yahoo'].includes(authProvider) ? normalizeEmail(details.email) : ''

  if (accounts.some((account) => accountLoginId(account) === loginId)) {
    throw new Error('An account with this login already exists.')
  }

  const salt = createSalt()
  const account = {
    id: crypto.randomUUID(),
    role: 'teacher',
    status: 'pending',
    fullName: details.fullName.trim(),
    email,
    loginId,
    authProvider,
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
      classroom: { platform: 'zoom', zoomLink: '', voovLink: '' },
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
    loginId: email,
    authProvider: 'email',
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
      classroom: { platform: 'zoom', zoomLink: '', voovLink: '' },
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
    fullName: 'TutorPro English Administrator',
    email,
    loginId: email,
    authProvider: 'email',
    passwordHash: await hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  }
  accounts.push(account)
  writeAccounts(accounts)
  localStorage.setItem(SESSION_KEY, account.id)
  return publicAccount(account)
}

export async function loginAccount(loginValue, password) {
  const account = readAccounts().find((item) => accountLoginId(item) === normalizeLoginId(item.authProvider || 'email', loginValue))

  if (!account || !account.passwordHash) {
    throw new Error('We could not find a login-enabled account with that email.')
  }
  if (account.status === 'suspended' || account.status === 'rejected') {
    throw new Error(`This account is ${account.status}. Please contact the TutorPro English administrator.`)
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

export function updateStudentProfile(accountId, childChanges, learnerId) {
  const account = readAccounts().find((item) => item.id === accountId)
  if (!account || (account.role || 'student') !== 'student') throw new Error('Student account not found.')
  const children = normalizeLearners(account)
  const targetId = learnerId || children[0]?.id
  const updatedChildren = children.map((learner) => learner.id === targetId ? { ...learner, ...childChanges } : learner)
  if (!updatedChildren.some((learner) => learner.id === targetId)) throw new Error('Student profile not found.')
  return updateAccount(accountId, { children: updatedChildren, child: updatedChildren[0] })
}

export function addStudentLearner(accountId, details) {
  const account = readAccounts().find((item) => item.id === accountId)
  if (!account || (account.role || 'student') !== 'student') throw new Error('Family account not found.')
  const children = normalizeLearners(account)
  if (children.length >= 3) throw new Error('A family account can include up to three students.')
  const learner = {
    id: crypto.randomUUID(),
    name: details.name.trim(),
    year: details.year,
    curriculum: details.curriculum,
    goal: details.goal,
    frequency: details.frequency || '1–2 weekly',
    paymentStatus: 'unpaid',
    level: 'Building foundations',
    progress: 0,
    streak: 0,
    lessonsCompleted: 0,
    achievements: ['Profile created'],
  }
  const updatedChildren = [...children, learner]
  return updateAccount(accountId, { children: updatedChildren, child: updatedChildren[0] })
}

export function updateLearnerPayment(accountId, learnerId, paymentStatus) {
  if (!['paid', 'unpaid'].includes(paymentStatus)) throw new Error('Invalid payment status.')
  return updateStudentProfile(accountId, { paymentStatus }, learnerId)
}

export function logoutAccount() {
  localStorage.removeItem(SESSION_KEY)
}
