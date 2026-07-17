import { cloudSyncEnabled, deleteCloudProfile, registerCloudProfile, signInCloudProfile, updateCloudProfile } from './cloudProfiles.js'
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

function validLoginId(provider, value) {
  const login = value.trim()
  if (provider === 'gmail') return /^[^\s@]+@gmail\.com$/i.test(login)
  if (provider === 'yahoo') return /^[^\s@]+@yahoo\.[a-z.]{2,}$/i.test(login)
  if (provider === 'wechat') return /^[a-z][-_a-z0-9]{5,19}$/i.test(login)
  if (provider === 'whatsapp') return /^\+?[0-9\s()-]{8,20}$/.test(login)
  return /^\S+@\S+\.\S+$/.test(login)
}

function validateNewCredentials(provider, login, password) {
  if (!validLoginId(provider, login)) throw new Error('Enter a valid login for the selected provider.')
  if (typeof password !== 'string' || password.length < 8 || !/[0-9]/.test(password)) {
    throw new Error('Passwords must contain at least eight characters and one number.')
  }
}

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function readAccounts() {
  const current = readStoredArray(ACCOUNTS_KEY)
  const legacy = readStoredArray(LEGACY_ACCOUNTS_KEY)
  if (!legacy.length) return current

  const merged = [...current]
  let changed = false
  legacy.forEach((legacyAccount) => {
    const login = accountLoginId(legacyAccount)
    const duplicate = merged.some((account) => account.id === legacyAccount.id || (login && accountLoginId(account) === login))
    if (!duplicate) {
      merged.push({
        ...legacyAccount,
        role: legacyAccount.role === 'teacher' ? 'teacher' : 'student',
        status: legacyAccount.status || 'active',
      })
      changed = true
    }
  })
  if (changed) writeAccounts(merged)
  return merged
}

function writeAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  if (typeof window !== 'undefined') {
    window.queueMicrotask(() => window.dispatchEvent(new Event('tutorpro:data-change')))
  }
}

function readSessionId() {
  try {
    return (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null) || localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSessionId(accountId) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, accountId)
      localStorage.removeItem(SESSION_KEY)
    } else localStorage.setItem(SESSION_KEY, accountId)
  } catch {
    localStorage.setItem(SESSION_KEY, accountId)
  }
}

function clearSessionId(accountId) {
  try {
    if (typeof sessionStorage !== 'undefined' && (!accountId || sessionStorage.getItem(SESSION_KEY) === accountId)) sessionStorage.removeItem(SESSION_KEY)
    if (!accountId || localStorage.getItem(SESSION_KEY) === accountId) localStorage.removeItem(SESSION_KEY)
  } catch {
    // Session cleanup is best-effort when browser storage is restricted.
  }
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
    accessStatus: learner.accessStatus || 'active',
  }))
}

function queueCloudProfileUpdate(account) {
  updateCloudProfile(publicAccount(account)).catch(() => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tutorpro:cloud-error'))
  })
}

function publicAccount(account) {
  if (!account) return null
  const { passwordHash: _passwordHash, salt: _salt, ...safeAccount } = account
  const rawRole = account.role || 'student'
  const role = rawRole === 'parent' ? 'student' : rawRole
  if (role === 'student') {
    const children = normalizeLearners(account)
    return { ...safeAccount, role, status: account.status || 'active', children, child: children[0] || null }
  }
  if (role === 'teacher') {
    const teacher = {
      specialization: 'Both Curricula',
      bio: 'Teacher profile setup is not complete yet.',
      education: 'To be updated',
      experience: 0,
      languages: 'English',
      credentials: [],
      availabilitySlots: [],
      availability: [],
      rating: 0,
      ratingCount: 0,
      lessonsCompleted: 0,
      classroom: { platform: 'zoom', zoomLink: '', voovLink: '' },
      ...(account.teacher || {}),
    }
    teacher.availabilitySlots = Array.isArray(teacher.availabilitySlots) ? teacher.availabilitySlots : []
    teacher.credentials = Array.isArray(teacher.credentials) ? teacher.credentials : []
    teacher.classroom = { platform: 'zoom', zoomLink: '', voovLink: '', ...(teacher.classroom || {}) }
    return { ...safeAccount, role, status: account.status || 'pending', teacher, fullName: account.fullName || account.displayName || 'New Teacher' }
  }
  return { ...safeAccount, role, status: account.status || 'active' }
}

export function initializePlatform() {
  const accounts = readAccounts()
  let changed = false

  accounts.forEach((account) => {
    if (['student', 'parent'].includes(account.role || 'student') && (account.child || account.children?.length)) {
      const normalizedChildren = normalizeLearners(account)
      const needsLearnerMigration = !account.children?.length
        || account.children.some((learner) => !learner.id || !learner.accessStatus)
        || account.child?.id !== normalizedChildren[0]?.id
        || account.role === 'parent'
        || account.status === 'approved'
      if (needsLearnerMigration) {
        account.role = 'student'
        account.status = account.status === 'approved' ? 'active' : (account.status || 'active')
        account.children = normalizedChildren
        account.child = normalizedChildren[0]
        changed = true
      }
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
    const accountId = readSessionId()
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
  validateNewCredentials(authProvider, details.email, details.password)

  if (accounts.some((account) => accountLoginId(account) === loginId)) {
    throw new Error('An account with this login already exists. Try logging in instead.')
  }
  if (details.parentName?.trim().length < 2 || details.childName?.trim().length < 2 || !details.year || !details.curriculum) {
    throw new Error('Complete the parent and student profile before creating the account.')
  }

  const salt = createSalt()
  const learner = {
    id: crypto.randomUUID(),
    name: details.childName.trim(),
    year: details.year,
    curriculum: details.curriculum,
    goal: details.goal,
    frequency: details.frequency,
    accessStatus: 'active',
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

  const cloud = await registerCloudProfile({ login: details.email, password: details.password, provider: authProvider, account })
  if (cloud?.userId) account.id = cloud.userId
  accounts.push(account)
  writeAccounts(accounts)
  writeSessionId(account.id)
  return publicAccount(account)
}

export async function registerTeacher(details) {
  const accounts = readAccounts()
  const authProvider = details.authProvider || 'email'
  const loginId = normalizeLoginId(authProvider, details.email)
  const email = ['email', 'gmail', 'yahoo'].includes(authProvider) ? normalizeEmail(details.email) : ''
  validateNewCredentials(authProvider, details.email, details.password)

  if (accounts.some((account) => accountLoginId(account) === loginId)) {
    throw new Error('An account with this login already exists.')
  }
  if (details.fullName?.trim().length < 2 || !details.specialization || details.bio?.trim().length < 30) {
    throw new Error('Complete the required teacher profile information before registering.')
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

  const cloud = await registerCloudProfile({ login: details.email, password: details.password, provider: authProvider, account })
  if (cloud?.userId) account.id = cloud.userId
  accounts.push(account)
  writeAccounts(accounts)
  writeSessionId(account.id)
  return publicAccount(account)
}

export async function createTeacherByAdmin(details) {
  const accounts = readAccounts()
  const email = normalizeEmail(details.email)
  validateNewCredentials('email', details.email, details.password)
  if (details.fullName?.trim().length < 2) throw new Error('Enter the teacher’s full name.')
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
  validateNewCredentials('email', emailValue, password)
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
  const cloud = await registerCloudProfile({ login: email, password, provider: 'email', account })
  if (cloud?.userId) account.id = cloud.userId
  accounts.push(account)
  writeAccounts(accounts)
  writeSessionId(account.id)
  return publicAccount(account)
}

export function mergeCloudAccounts(cloudAccounts) {
  if (!Array.isArray(cloudAccounts) || !cloudAccounts.length) return []
  const accounts = readAccounts()
  cloudAccounts.forEach((cloudAccount) => {
    const index = accounts.findIndex((account) => account.id === cloudAccount.id || (accountLoginId(cloudAccount) && accountLoginId(account) === accountLoginId(cloudAccount)))
    if (index >= 0) {
      const local = accounts[index]
      accounts[index] = {
        ...local,
        ...cloudAccount,
        passwordHash: local.passwordHash,
        salt: local.salt,
      }
    } else accounts.push({ ...cloudAccount, cloudOnly: true })
  })
  writeAccounts(accounts)
  return cloudAccounts.map((account) => publicAccount(accounts.find((item) => item.id === account.id) || account))
}

export async function loginAccount(loginValue, password) {
  let account = readAccounts().find((item) => accountLoginId(item) === normalizeLoginId(item.authProvider || 'email', loginValue))
  let cloudLoginError = null
  if (cloudSyncEnabled()) {
    try {
      const cloudAccount = await signInCloudProfile(loginValue, password)
      if (cloudAccount) {
        account = mergeCloudAccounts([cloudAccount])[0]
        if (account.status === 'suspended' || account.status === 'rejected') throw new Error(`This account is ${account.status}. Please contact the TutorPro English administrator.`)
        writeSessionId(account.id)
        return account
      }
    } catch (error) {
      cloudLoginError = error
    }
  }

  if (!account || !account.passwordHash) {
    throw cloudLoginError || new Error('We could not find a login-enabled account with that email.')
  }
  if (account.status === 'suspended' || account.status === 'rejected') {
    throw new Error(`This account is ${account.status}. Please contact the TutorPro English administrator.`)
  }

  const passwordHash = await hashPassword(password, account.salt)
  if (passwordHash !== account.passwordHash) {
    throw new Error('That password is not correct. Please try again.')
  }

  writeSessionId(account.id)
  return publicAccount(account)
}

export function updateAccount(accountId, changes) {
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index < 0) throw new Error('Account not found.')
  accounts[index] = { ...accounts[index], ...changes, updatedAt: new Date().toISOString() }
  writeAccounts(accounts)
  queueCloudProfileUpdate(accounts[index])
  return publicAccount(accounts[index])
}

export function updateTeacherProfile(accountId, teacherChanges) {
  const account = readAccounts().find((item) => item.id === accountId)
  if (!account || account.role !== 'teacher') throw new Error('Teacher account not found.')
  return updateAccount(accountId, { teacher: { ...account.teacher, ...teacherChanges } })
}

export function repairStudentForBooking(accountId, learnerSnapshot) {
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index < 0) throw new Error('The family account could not be found. Please log in again.')
  const account = accounts[index]
  if (['teacher', 'admin'].includes(account.role)) throw new Error('Only family accounts can create student bookings.')

  const children = normalizeLearners(account)
  let learnerIndex = learnerSnapshot?.id ? children.findIndex((learner) => learner.id === learnerSnapshot.id) : -1
  if (learnerIndex < 0 && learnerSnapshot?.name) {
    learnerIndex = children.findIndex((learner) => learner.name?.trim().toLowerCase() === learnerSnapshot.name.trim().toLowerCase())
  }
  if (learnerIndex < 0 && learnerSnapshot && children.length < 3) {
    children.push({
      ...learnerSnapshot,
      id: learnerSnapshot.id || crypto.randomUUID(),
      accessStatus: learnerSnapshot.accessStatus || 'active',
    })
    learnerIndex = children.length - 1
  }
  if (learnerIndex < 0) throw new Error('The selected learner could not be restored. Select the student again from My Profile.')

  const storedLearner = children[learnerIndex]
  children[learnerIndex] = {
    ...learnerSnapshot,
    ...storedLearner,
    id: storedLearner.id || learnerSnapshot.id || crypto.randomUUID(),
    accessStatus: storedLearner.accessStatus || learnerSnapshot.accessStatus || 'active',
  }
  account.role = 'student'
  if (!account.status || account.status === 'approved') account.status = 'active'
  account.children = children
  account.child = children[0]
  account.updatedAt = new Date().toISOString()
  accounts[index] = account
  writeAccounts(accounts)
  queueCloudProfileUpdate(account)
  return { account: publicAccount(account), learner: publicAccount(account).children[learnerIndex] }
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
  if (details.name?.trim().length < 2 || !details.year || !details.curriculum || !details.goal) {
    throw new Error('Complete the student name, year, curriculum and learning goal.')
  }
  const children = normalizeLearners(account)
  if (children.length >= 3) throw new Error('A family account can include up to three students.')
  const learner = {
    id: crypto.randomUUID(),
    name: details.name.trim(),
    year: details.year,
    curriculum: details.curriculum,
    goal: details.goal,
    frequency: details.frequency || '1–2 weekly',
    accessStatus: 'active',
    level: 'Building foundations',
    progress: 0,
    streak: 0,
    lessonsCompleted: 0,
    achievements: ['Profile created'],
  }
  const updatedChildren = [...children, learner]
  return updateAccount(accountId, { children: updatedChildren, child: updatedChildren[0] })
}

export function updateLearnerAccess(accountId, learnerId, accessStatus) {
  if (!['active', 'suspended'].includes(accessStatus)) throw new Error('Invalid student access status.')
  return updateStudentProfile(accountId, { accessStatus }, learnerId)
}

export function removeStudentLearner(accountId, learnerId) {
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index < 0 || !['student', 'parent'].includes(accounts[index].role || 'student')) throw new Error('Family account not found.')
  const children = normalizeLearners(accounts[index])
  if (!children.some((learner) => learner.id === learnerId)) throw new Error('Student profile not found.')
  if (children.length <= 1) throw new Error('The final student profile must be removed with the family registration.')
  const updatedChildren = children.filter((learner) => learner.id !== learnerId)
  accounts[index] = { ...accounts[index], children: updatedChildren, child: updatedChildren[0], updatedAt: new Date().toISOString() }
  writeAccounts(accounts)
  queueCloudProfileUpdate(accounts[index])
  return publicAccount(accounts[index])
}

export function removeStudentAccount(accountId) {
  const accounts = readAccounts()
  const account = accounts.find((item) => item.id === accountId)
  if (!account || !['student', 'parent'].includes(account.role || 'student')) throw new Error('Family account not found.')
  writeAccounts(accounts.filter((item) => item.id !== accountId))
  const legacyAccounts = readStoredArray(LEGACY_ACCOUNTS_KEY)
  const removedLogin = accountLoginId(account)
  if (legacyAccounts.some((item) => item.id === accountId || (removedLogin && accountLoginId(item) === removedLogin))) {
    localStorage.setItem(LEGACY_ACCOUNTS_KEY, JSON.stringify(legacyAccounts.filter((item) => item.id !== accountId && (!removedLogin || accountLoginId(item) !== removedLogin))))
  }
  clearSessionId(accountId)
  deleteCloudProfile(accountId).catch(() => {})
  return true
}

export function logoutAccount() {
  clearSessionId()
}
