/**
 * Teacher logins that actually exist in the database.
 *
 * THE BUG THIS FIXES
 * ------------------
 * "Add teacher → set a temporary password" used to write the account into
 * the administrator's own browser storage and nowhere else. It looked
 * finished: the teacher appeared in the list, could be approved, could even
 * be assigned lessons. But the account did not exist in Supabase, so when
 * the teacher opened the site on their phone there was nothing to log in to.
 * The only error they ever saw was "we could not find a login-enabled
 * account with that email".
 *
 * Now the login is created in Supabase FIRST, by a server function holding
 * the service-role key, with the email already confirmed. The local copy is
 * a mirror of that account and — importantly — reuses the same id, because
 * every booking, availability slot and piece of feedback is keyed on the
 * teacher id. A mirror with a different id would show the teacher an empty
 * timetable on their own phone.
 *
 * WHY THIS FILE HAS NO BROWSER CODE
 * ---------------------------------
 * Same rule as src/discounts.js and src/paymentRequests.js: it is loaded by
 * the browser AND by the Vercel function, so the profile the server writes
 * and the profile the dashboard expects are built by one piece of code.
 */

export const TEACHER_SPECIALIZATIONS_FALLBACK = 'Both Curricula'
export const MIN_TEACHER_PASSWORD = 8

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeTeacherEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function isValidTeacherEmail(value) {
  return EMAIL_PATTERN.test(normalizeTeacherEmail(value))
}

/**
 * A temporary password must survive being read out over the phone and still
 * be strong enough to sit on a live account until the teacher changes it.
 */
export function validateTeacherPassword(value) {
  const password = String(value || '')
  if (password.length < MIN_TEACHER_PASSWORD) {
    return { valid: false, error: `The temporary password needs at least ${MIN_TEACHER_PASSWORD} characters.` }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'The temporary password needs at least one number.' }
  }
  return { valid: true, error: '' }
}

/** Validate everything before anything is created, on either side. */
export function validateTeacherDetails({ fullName, email, password } = {}) {
  if (String(fullName || '').trim().length < 2) {
    return { valid: false, error: 'Enter the teacher\u2019s full name.' }
  }
  if (!isValidTeacherEmail(email)) {
    return { valid: false, error: 'Enter a valid email address.' }
  }
  const check = validateTeacherPassword(password)
  if (!check.valid) return { valid: false, error: check.error }
  return { valid: true, error: '' }
}

/**
 * A readable temporary password: two words, four digits, no characters that
 * look like each other when read aloud or typed on a phone.
 */
const PASSWORD_WORDS = [
  'Panda', 'Maple', 'Sunny', 'River', 'Tiger', 'Coral', 'Amber', 'Lemon',
  'Falcon', 'Cedar', 'Violet', 'Harbor', 'Meadow', 'Cobalt', 'Willow', 'Ginger',
]

export function suggestTemporaryPassword(random = Math.random) {
  const word = () => PASSWORD_WORDS[Math.floor(random() * PASSWORD_WORDS.length)]
  const digits = String(Math.floor(random() * 9000) + 1000)
  return `${word()}-${word()}${digits}`
}

/**
 * The teacher record the dashboard expects, built once so the row the server
 * writes and the copy the browser keeps cannot drift apart.
 */
export function buildTeacherProfileData(details = {}, { id = '', createdAt = new Date().toISOString() } = {}) {
  const email = normalizeTeacherEmail(details.email)
  return {
    id,
    role: 'teacher',
    status: details.status === 'pending' ? 'pending' : 'approved',
    createdByAdmin: true,
    fullName: String(details.fullName || '').trim(),
    email,
    loginId: email,
    authProvider: 'email',
    createdAt,
    referralWallet: { freeLessons: 0, coupons: [], coins: 0, xp: 0, transactions: [] },
    teacher: {
      specialization: details.specialization || TEACHER_SPECIALIZATIONS_FALLBACK,
      bio: String(details.bio || '').trim() || 'TutorPro Online English teacher.',
      education: String(details.education || '').trim() || 'To be updated',
      experience: Number(details.experience) || 0,
      languages: String(details.languages || '').trim() || 'English',
      credentials: [],
      availabilitySlots: [],
      availability: [],
      rating: 0,
      lessonsCompleted: 0,
      classroom: { platform: 'zoom', zoomLink: '', voovLink: '' },
    },
  }
}

/**
 * The metadata the `handle_tutorpro_user` trigger reads when it creates the
 * profiles row. Keys are snake_case because that is what the trigger and the
 * profiles table use.
 */
export function teacherSignupMetadata(details, profileData) {
  return {
    role: 'teacher',
    status: profileData.status,
    full_name: profileData.fullName,
    display_name: profileData.fullName,
    login_id: profileData.loginId,
    auth_provider: 'email',
    profile_data: profileData,
  }
}

/**
 * Can this teacher log in from their own phone?
 *
 * An account that came from the database carries `cloudProfile` (merged) or
 * `cloudOnly` (not yet mirrored). Anything else exists solely in the browser
 * that created it. `systemProfile` is the built-in demo teacher, which is
 * not a real login and must not be flagged as broken.
 */
export function hasSharedLogin(account) {
  if (!account || account.role !== 'teacher') return true
  if (account.systemProfile) return true
  return Boolean(account.cloudProfile || account.cloudOnly)
}

/** Plain-language state for the admin list. */
export function describeTeacherLogin(account) {
  if (!account || account.role !== 'teacher') return ''
  if (account.systemProfile) return 'Built-in profile'
  if (hasSharedLogin(account)) return 'Can log in on any device'
  return 'Cannot log in yet — this account only exists in this browser'
}

/** Teachers the administrator needs to fix, newest first. */
export function teachersWithoutLogin(accounts = []) {
  return accounts.filter((account) => account?.role === 'teacher' && !hasSharedLogin(account))
}

/** Turn a server or Supabase failure into something the admin can act on. */
export function describeTeacherCreateError(error) {
  const text = String(error?.message || error || '').toLowerCase()
  if (!text) return 'The teacher login could not be created. Please try again.'
  if (text.includes('already registered') || text.includes('already exists') || text.includes('duplicate')) {
    return 'There is already a login with that email address. Use a different address, or ask the teacher to reset their password from the login page.'
  }
  if (text.includes('service role') || text.includes('service_role')) {
    return 'The server cannot reach the database with administrator rights. Add SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then redeploy.'
  }
  if (text.includes('only an administrator') || text.includes('administrator session')) {
    return 'Your administrator session could not be verified. Log out, log back in, and try again.'
  }
  if (text.includes('404') || text.includes('not found')) {
    return 'The teacher-creation service is not available on this deployment yet. Wait for the deployment to finish, then try again.'
  }
  if (text.includes('fetch') || text.includes('network') || text.includes('failed to fetch')) {
    return 'We could not reach the server. Check your connection and try again.'
  }
  return error?.message || 'The teacher login could not be created. Please try again.'
}
