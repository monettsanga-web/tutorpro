import { cloudSyncEnabled, deleteCloudProfile, deleteCloudTeacherAccount, registerCloudProfile, requestCloudPasswordReset, signInCloudProfile, updateCloudPassword, updateCloudProfile } from './cloudProfiles.js'
import { buildWeeklySlots, slotsFromAvailabilityRanges } from './schedule.js'
import { readVisitorCountry } from './visitorLocale.js'
import { attributionSnapshot } from './attribution.js'
import { isOfflineError } from './serviceStatus.js'

const ACCOUNTS_KEY = 'tutorpro_accounts_v2'
const LEGACY_ACCOUNTS_KEY = 'tutorpro_accounts_v1'
const SESSION_KEY = 'tutorpro_session_v2'
const ADMIN_EMAIL_HASH = 'bf6e66f2c7c1acfaa4a3899a3e054f5bf185f18456c35cde73c36c9176102a33'

const normalizeEmail = (email) => email.trim().toLowerCase()
const isEmailConfirmationError = (error) => /email not confirmed/i.test(error?.message || '')

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

function normalizeReferralCode(code = '') {
  return String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
}

function createReferralCode(name = '', id = '') {
  const prefix = String(name || 'TP').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
  let hash = 0
  const source = `${name}:${id}`
  for (let index = 0; index < source.length; index += 1) hash = ((hash << 5) - hash) + source.charCodeAt(index)
  return normalizeReferralCode(`${prefix}${Math.abs(hash).toString(36).toUpperCase().slice(0, 5).padEnd(5, '0')}`)
}

function readIncomingReferralCode(details = {}) {
  const direct = normalizeReferralCode(details.referralCode || details.ref || '')
  if (direct) return direct
  try {
    const url = new URL(window.location.href)
    const fromUrl = normalizeReferralCode(url.searchParams.get('ref') || '')
    if (fromUrl) {
      localStorage.setItem('tutorpro_pending_referral_code', fromUrl)
      return fromUrl
    }
    return normalizeReferralCode(localStorage.getItem('tutorpro_pending_referral_code') || '')
  } catch {
    return ''
  }
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

/*
 * Which account is signed in on this device.
 *
 * This is the second half of staying signed in; the first is the Supabase
 * session in src/supabaseClient.js. Both used to live in `sessionStorage`,
 * which the browser empties when the tab closes, so everyone — parents,
 * teachers and the administrator — was asked for their password again on
 * every visit.
 *
 * `writeSessionId` was actively deleting the localStorage copy, so even the
 * fallback below could never fire. It now writes to localStorage, which
 * survives closing the browser. Reading still checks sessionStorage first so
 * anyone signed in under the old behaviour is not thrown out mid-session.
 */
function readSessionId() {
  try {
    const perTab = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null
    return perTab || localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSessionId(accountId) {
  try {
    localStorage.setItem(SESSION_KEY, accountId)
    // The old per-tab copy would otherwise shadow this one on the next read.
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Private browsing: remember it for this tab at least, so the person can
    // finish what they are doing.
    try { sessionStorage.setItem(SESSION_KEY, accountId) } catch { /* Nothing can be stored. */ }
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

function clearCloudSyncPending(accountId, expectedUpdatedAt) {
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index < 0 || (expectedUpdatedAt && accounts[index].updatedAt !== expectedUpdatedAt)) return
  if (!accounts[index].cloudSyncPending) return
  accounts[index] = { ...accounts[index], cloudSyncPending: false, lastCloudSyncedAt: expectedUpdatedAt || accounts[index].updatedAt || new Date().toISOString() }
  writeAccounts(accounts)
}

function queueCloudProfileUpdate(account) {
  updateCloudProfile(publicAccount(account))
    .then(() => clearCloudSyncPending(account.id, account.updatedAt))
    .catch(() => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tutorpro:cloud-error'))
    })
}

function publicAccount(account) {
  if (!account) return null
  const { passwordHash: _passwordHash, salt: _salt, ...safeAccount } = account
  const rawRole = (account.role || 'student').toLowerCase()
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
  const storedAccounts = readAccounts()
  const accounts = storedAccounts.filter((account) => account.id !== 'teacher-monett' && !account.systemProfile)
  let changed = accounts.length !== storedAccounts.length

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
      if (account.cloudProfile && normalizedChildren.length > 1 && !account.lastCloudSyncedAt && !account.cloudSyncPending) {
        account.cloudSyncPending = true
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

  if (changed) writeAccounts(accounts)
}

export function getCurrentAccount() {
  try {
    const accountId = readSessionId()
    if (!accountId) return null
    const account = publicAccount(readAccounts().find((item) => item.id === accountId))
    if (!account || account.status === 'removed') {
      clearSessionId(accountId)
      return null
    }
    return account
  } catch {
    return null
  }
}

export function getAccounts(role) {
  return readAccounts()
    .map(publicAccount)
    .filter((account) => account.id !== 'teacher-monett' && !account.systemProfile)
    .filter((account) => account.status !== 'removed')
    .filter((account) => !role || account.role === role)
}

export function getAccountById(accountId) {
  return publicAccount(readAccounts().find((account) => account.id === accountId))
}

export function getApprovedTeachers() {
  const registered = getAccounts('teacher').filter((account) => 
    account.status === 'approved' || account.status === 'pending' || account.status === 'active'
  )
  if (registered.length > 0) return registered

  // Return stunning high-contrast default mock teachers if database is completely empty!
  return [
    {
      id: 'mock-teacher-james',
      fullName: 'Teacher James',
      role: 'teacher',
      status: 'approved',
      teacher: {
        specialization: 'Speaking & Pronunciation',
        experience: 8,
        languages: 'English (UK Native)',
        education: 'BA in English Literature, Oxford',
        bio: 'Hello! I am James, a highly enthusiastic and energetic ESL teacher with over 8 years of online and classroom teaching experience. Let’s make English your child’s superpower! ⚡',
        rating: 5.0,
        ratingCount: 42,
        lessonsCompleted: 154,
        superpower: 'Brings amazing animal puppets and vocal accents to life! 🧸🗣️',
        sampleClassUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        introVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    },
    {
      id: 'mock-teacher-sarah',
      fullName: 'Teacher Sarah',
      role: 'teacher',
      status: 'approved',
      teacher: {
        specialization: 'Kids Phonetics & Reading',
        experience: 6,
        languages: 'English (US Native)',
        education: 'MA in Early Childhood Education',
        bio: 'Hi there! I’m Sarah. I specialize in teaching phonics, grammar, and early vocabulary building. I believe in active learning with lots of warm smiles and rewards! 😊',
        rating: 4.9,
        ratingCount: 31,
        lessonsCompleted: 98,
        superpower: 'Transforms vocabulary drills into immersive magical games! 🪄🎮',
        sampleClassUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        introVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    }
  ]
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
    referredByCode: readIncomingReferralCode(details),
    referralWallet: { freeLessons: 0, coupons: [], coins: 0, xp: 0, transactions: [] },
    // Store only the country code estimated from the registration IP — never the IP address itself.
    registrationCountry: readVisitorCountry().toUpperCase(),
    // Which channel earned this family (Facebook post, referral, search...).
    attribution: attributionSnapshot(),
    createdAt: new Date().toISOString(),
  }

  const cloud = await registerCloudProfile({ login: details.email, password: details.password, provider: authProvider, account })
  if (cloud?.userId) {
    account.id = cloud.userId
    account.cloudProfile = true
  }
  account.referralCode = createReferralCode(account.parentName, account.id)
  if (account.referredByCode === account.referralCode) account.referredByCode = ''
  accounts.push(account)
  writeAccounts(accounts)
  writeSessionId(account.id)
  // Fire-and-forget: a welcome email that fails must never stop a parent from
  // finishing registration. The edge function is idempotent and refuses to
  // send twice, so a retry on a later sign-in is harmless.
  sendWelcomeEmail()
  return publicAccount(account)
}


/**
 * Ask the edge function to send the welcome email.
 *
 * Deliberately swallows every error. This runs immediately after a successful
 * registration, and nothing here is worth showing a parent or, worse,
 * aborting their sign-up for. If the function is not deployed yet, or Resend
 * is briefly down, registration still completes normally.
 */
async function sendWelcomeEmail() {
  try {
    const { supabase } = await import('./supabaseClient.js')
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    if (!data?.session) return
    await supabase.functions.invoke('welcome-email', { body: {} })
  } catch {
    // Never surfaced: the dashboard welcome card covers this case anyway.
  }
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
  if (!details.interview?.completedAt || !Array.isArray(details.interview?.transcript) || details.interview.transcript.length < 14) {
    throw new Error('Complete the required AI teacher interview before submitting your application.')
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
    referralWallet: { freeLessons: 0, coupons: [], coins: 0, xp: 0, transactions: [] },
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
      interview: details.interview,
    },
  }

  const cloud = await registerCloudProfile({ login: details.email, password: details.password, provider: authProvider, account })
  if (cloud?.userId) {
    account.id = cloud.userId
    account.cloudProfile = true
  }
  account.referralCode = createReferralCode(account.fullName, account.id)
  accounts.push(account)
  writeAccounts(accounts)
  writeSessionId(account.id)
  return publicAccount(account)
}

/**
 * Mirror a teacher login that has just been created in the database.
 *
 * `cloudId` is mandatory in normal use and comes from /api/teachers/create.
 * It MUST be reused as the local id: bookings, availability slots and
 * feedback are all keyed on the teacher id, so a local copy with a fresh
 * random id would leave the teacher staring at an empty timetable on their
 * own phone while the admin's browser showed their lessons.
 *
 * When the account lives in Supabase we deliberately keep no local password
 * hash. The password belongs to the teacher; every device signs them in
 * through the database.
 */
export async function createTeacherByAdmin(details, { cloudId = '', cloudProfile = false } = {}) {
  const accounts = readAccounts()
  const email = normalizeEmail(details.email)
  validateNewCredentials('email', details.email, details.password)
  if (details.fullName?.trim().length < 2) throw new Error('Enter the teacher’s full name.')
  if (accounts.some((account) => account.email === email)) {
    throw new Error('An account with this email already exists.')
  }

  const salt = createSalt()
  const account = {
    id: cloudId || crypto.randomUUID(),
    role: 'teacher',
    status: 'approved',
    createdByAdmin: true,
    fullName: details.fullName.trim(),
    email,
    loginId: email,
    authProvider: 'email',
    ...(cloudProfile
      ? { cloudProfile: true }
      : { passwordHash: await hashPassword(details.password, salt), salt }),
    createdAt: new Date().toISOString(),
    referralWallet: { freeLessons: 0, coupons: [], coins: 0, xp: 0, transactions: [] },
    teacher: {
      specialization: details.specialization || 'Both Curricula',
      bio: details.bio?.trim() || 'TutorPro Online English teacher.',
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

  account.referralCode = createReferralCode(account.fullName, account.id)
  accounts.push(account)
  writeAccounts(accounts)
  return publicAccount(account)
}

/**
 * Move a browser-only teacher onto the database login just created for them.
 *
 * Teachers added before logins were created properly exist under a random
 * local id. Once they have a real Supabase account we point the local record
 * at the new id and hand the old id back, so the caller can repoint anything
 * that referenced it (bookings, above all) instead of orphaning it.
 */
export function relinkTeacherAccount(oldId, cloudId, extra = {}) {
  if (!oldId || !cloudId) throw new Error('Both the old and the new teacher id are needed.')
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.id === oldId)
  if (index < 0) throw new Error('That teacher could not be found on this device.')
  if (accounts[index].role !== 'teacher') throw new Error('Only a teacher account can be relinked.')
  if (oldId !== cloudId && accounts.some((account) => account.id === cloudId)) {
    throw new Error('A different account already uses that id.')
  }
  const { passwordHash: _hash, salt: _salt, ...rest } = accounts[index]
  accounts[index] = {
    ...rest,
    ...extra,
    id: cloudId,
    role: 'teacher',
    cloudProfile: true,
    relinkedFromLocalId: oldId,
    relinkedAt: new Date().toISOString(),
  }
  writeAccounts(accounts)
  return publicAccount(accounts[index])
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
    fullName: 'TutorPro Online English Administrator',
    email,
    loginId: email,
    authProvider: 'email',
    passwordHash: await hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  }
  const cloud = await registerCloudProfile({ login: email, password, provider: 'email', account })
  if (cloud?.userId) {
    account.id = cloud.userId
    account.cloudProfile = true
  }
  accounts.push(account)
  writeAccounts(accounts)
  writeSessionId(account.id)
  return publicAccount(account)
}

export function mergeCloudAccounts(cloudAccounts, options = {}) {
  if (!Array.isArray(cloudAccounts)) return []
  const cloudIds = new Set(cloudAccounts.map((account) => account.id))
  const accounts = options.reconcile
    ? readAccounts().filter((account) => !(account.cloudProfile || account.cloudOnly) || cloudIds.has(account.id))
    : readAccounts()
  cloudAccounts.forEach((cloudAccount) => {
    const index = accounts.findIndex((account) => account.id === cloudAccount.id || (accountLoginId(cloudAccount) && accountLoginId(account) === accountLoginId(cloudAccount)))
    if (index >= 0) {
      const local = accounts[index]
      if (local.cloudSyncPending && !cloudAccount.publicTeacher) {
        accounts[index] = {
          ...local,
          id: cloudAccount.id,
          role: cloudAccount.role,
          status: cloudAccount.status,
          cloudProfile: true,
          passwordHash: local.passwordHash,
          salt: local.salt,
        }
      } else {
        accounts[index] = {
          ...local,
          ...cloudAccount,
          /* A public-teacher answer is a SUBSET of the real record, so it
             is merged over the local copy rather than replacing it. The
             photo is pulled out separately: an older database answers
             without one, and an empty value from that answer must not
             erase a photo this device already knows about. */
          ...(cloudAccount.publicTeacher ? {
            teacher: {
              ...(local.teacher || {}),
              ...(cloudAccount.teacher || {}),
              photo: cloudAccount.teacher?.photo || local.teacher?.photo || '',
            },
          } : {}),
          passwordHash: local.passwordHash,
          salt: local.salt,
        }
      }
    } else accounts.push({ ...cloudAccount, cloudOnly: !cloudAccount.publicTeacher })
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
        if (['suspended', 'rejected', 'removed'].includes(account.status)) throw new Error(`This account is ${account.status}. Please contact the TutorPro Online English administrator.`)
        writeSessionId(account.id)
        return account
      }
    } catch (error) {
      cloudLoginError = error
    }
  }

  const confirmationPending = isEmailConfirmationError(cloudLoginError)
  if (!account || !account.passwordHash) {
    if (confirmationPending) throw new Error('This registration is waiting for email activation. Open the TutorPro Online English confirmation email once, then log in again on this device.')
    throw cloudLoginError || new Error('We could not find a login-enabled account with that email.')
  }
  // Supabase projects with Confirm email enabled do not issue a cloud session
  // immediately. The verified local password still lets a new registration use
  // its pending dashboard on the same device without exposing a Supabase error.
  //
  // OFFLINE SIGN-IN
  // ---------------
  // If Supabase was simply unreachable — paused, restricted with a 402, or the
  // network is down — a person who has signed in on THIS device before can
  // still get to their dashboard using the password hash stored here. Without
  // it the administrator is locked out of their own site during an outage,
  // exactly when they most need to look at it.
  //
  // The security boundary is `isOfflineError`. It is true only when the server
  // never answered. If Supabase answered and REJECTED the credentials, the
  // error is rethrown below and the local hash is never consulted, so a
  // changed or revoked password can never be bypassed. The account must also
  // already exist on this device with a stored hash, which the check above
  // guarantees, so this creates no new way in on an unfamiliar machine.
  const offlineSignInAllowed = cloudLoginError && isOfflineError(cloudLoginError)
  if (cloudLoginError && (account.cloudProfile || account.cloudOnly) && !confirmationPending && !offlineSignInAllowed) throw cloudLoginError
  if (['suspended', 'rejected', 'removed'].includes(account.status)) {
    throw new Error(`This account is ${account.status}. Please contact the TutorPro Online English administrator.`)
  }

  const passwordHash = await hashPassword(password, account.salt)
  if (passwordHash !== account.passwordHash) {
    throw new Error('That password is not correct. Please try again.')
  }

  writeSessionId(account.id)
  return publicAccount(account)
}


export async function requestPasswordReset(loginValue) {
  return requestCloudPasswordReset(loginValue)
}

export async function completePasswordReset(newPassword) {
  return updateCloudPassword(newPassword)
}

export function updateLocalAccount(accountId, changes) {
  const accounts = readAccounts()
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index < 0) throw new Error('Account not found.')
  accounts[index] = { ...accounts[index], ...changes, updatedAt: new Date().toISOString() }
  writeAccounts(accounts)
  return publicAccount(accounts[index])
}

export function updateAccount(accountId, changes) {
  const updated = updateLocalAccount(accountId, {
    ...changes,
    ...(cloudSyncEnabled() ? { cloudSyncPending: true } : {}),
  })
  queueCloudProfileUpdate(updated)
  return updated
}

/**
 * Wait for the background push that `updateAccount` already started.
 *
 * Every updateAccount() queues a cloud write. Calling updateCloudProfile()
 * again straight afterwards — as several panels do — sends the SAME row
 * twice, which is pure waste on a database with a free-tier egress budget.
 * This instead watches the pending flag the queued write clears on success,
 * so a caller can report a real outcome after exactly one write.
 *
 * Resolves true when the row reached the database, false when it did not.
 */
export function waitForCloudProfileSync(accountId, { timeout = 10000, interval = 200 } = {}) {
  if (!cloudSyncEnabled()) return Promise.resolve(true)
  return new Promise((resolve) => {
    const startedAt = Date.now()
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      window.clearInterval(timer)
      if (typeof window !== 'undefined') window.removeEventListener('tutorpro:cloud-error', onError)
      resolve(value)
    }
    const stillPending = () => Boolean(readAccounts().find((item) => item.id === accountId)?.cloudSyncPending)
    // The error event carries no account id, so it only counts as a failure
    // while THIS account is still waiting.
    const onError = () => { if (stillPending()) finish(false) }
    const timer = window.setInterval(() => {
      if (!stillPending()) finish(true)
      else if (Date.now() - startedAt > timeout) finish(false)
    }, interval)
    if (typeof window !== 'undefined') window.addEventListener('tutorpro:cloud-error', onError)
    if (!stillPending()) finish(true)
  })
}

export async function syncPendingCloudProfile(accountId) {
  const account = readAccounts().find((item) => item.id === accountId)
  if (!account) throw new Error('Account not found.')
  if (!cloudSyncEnabled() || !account.cloudSyncPending) return publicAccount(account)
  await updateCloudProfile(publicAccount(account))
  clearCloudSyncPending(account.id, account.updatedAt)
  return getAccountById(account.id)
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
  const normalizedChanges = { ...childChanges }
  if (typeof normalizedChanges.goal === 'string') {
    normalizedChanges.goal = normalizedChanges.goal.trim()
    if (normalizedChanges.goal.length < 3 || normalizedChanges.goal.length > 180) throw new Error('Learning goals must contain between 3 and 180 characters.')
  }
  const children = normalizeLearners(account)
  const targetId = learnerId || children[0]?.id
  const updatedChildren = children.map((learner) => learner.id === targetId ? { ...learner, ...normalizedChanges } : learner)
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

export async function removeTeacherAccount(accountId) {
  const accounts = readAccounts()
  const account = accounts.find((item) => item.id === accountId)
  if (!account || account.role !== 'teacher') throw new Error('Teacher account not found.')
  if (account.systemProfile) throw new Error('The TutorPro Online English default teacher profile cannot be deleted.')

  if (cloudSyncEnabled() && (account.cloudProfile || account.cloudOnly)) {
    await deleteCloudTeacherAccount(publicAccount(account))
  }
  writeAccounts(accounts.filter((item) => item.id !== accountId))
  clearSessionId(accountId)
  return true
}

export function logoutAccount() {
  clearSessionId()
  /*
   * Also end the Supabase session, not just the local record of who was
   * signed in.
   *
   * This did not matter while the session lived in `sessionStorage`: the
   * browser threw it away when the tab closed, so a stale token could never
   * outlive the visit. Now that sessions survive a restart — which is the
   * whole point — "Log out" has to actually revoke one, or a family sharing
   * a laptop would leave a working access token behind on the machine.
   *
   * `scope: 'local'` clears this device only, so signing out on the school
   * computer does not kick the same person off their phone.
   */
  import('./supabaseClient.js')
    .then(({ supabase }) => supabase?.auth?.signOut({ scope: 'local' }))
    .catch(() => {
      // Offline, or Supabase not configured. clearSessionId already ran, so
      // this device is signed out either way.
    })
}
