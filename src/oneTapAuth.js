import { supabase } from './supabaseClient.js'
import { profileRowToAccount } from './cloudProfiles.js'
import { adoptCloudAccount } from './auth.js'

/*
 * ONE-TAP SIGN-UP / SIGN-IN (redirect to the provider's own website)
 * ------------------------------------------------------------------
 * The owner asked that clicking a preferred provider takes the family to
 * that provider's site to log in or register, like usual. Only Google and
 * Apple can genuinely do this here: Supabase hosts their OAuth flows
 * natively (`signInWithOAuth`), sends the browser to accounts.google.com /
 * appleid.apple.com, and receives it back with a real session.
 *
 * Yahoo and QQ offer no such redirect through this backend — Supabase does
 * not provide them, and QQ Connect additionally requires a Chinese business
 * licence — so those tiles keep registering with the address itself. Every
 * method still ends in a reachable inbox; nothing pretends to redirect.
 *
 * Until the owner completes the one-time console setup (ONE_TAP_SETUP.md),
 * a redirect attempt comes back with a provider-not-enabled error. That is
 * caught and the tile falls back to email entry with an honest one-liner,
 * so no button is ever dead.
 */
export const ONE_TAP_PROVIDERS = ['google', 'apple', 'yahoo']
const TILE_BY_PROVIDER = { google: 'gmail', apple: 'apple' }

export function oneTapProviderFor(tileId) {
  if (tileId === 'gmail') return 'google'
  if (tileId === 'apple') return 'apple'
  if (tileId === 'yahoo') return 'yahoo'
  return null
}

const INTENT_KEY = 'tutorpro-one-tap-intent'
const INTENT_TTL_MS = 60 * 60 * 1000

/* The redirect leaves the page, so what the family had typed so far travels
   in sessionStorage and is picked up when the provider sends them back. */
function saveIntent(intent) {
  try { window.sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...intent, ts: Date.now() })) } catch { /* Storage off: the redirect still works, only the resume degrades. */ }
}

export function readOAuthIntent() {
  try {
    const raw = window.sessionStorage.getItem(INTENT_KEY)
    if (!raw) return null
    const intent = JSON.parse(raw)
    if (!intent?.kind || Date.now() - (intent.ts || 0) > INTENT_TTL_MS) {
      window.sessionStorage.removeItem(INTENT_KEY)
      return null
    }
    return intent
  } catch { return null }
}

export function clearOAuthIntent() {
  try { window.sessionStorage.removeItem(INTENT_KEY) } catch { /* Nothing stored. */ }
}

function friendlyProviderError(error) {
  const message = String(error?.message || '')
  if (/provider|oauth|not enabled|unsupported|invalid/i.test(message)) {
    return 'One-tap sign-in with this provider has not been switched on for the site yet — enter your email address below instead.'
  }
  return message || 'One-tap sign-in could not start. Please use your email address below.'
}

export async function startOneTapSignIn(provider, intent) {
  if (!ONE_TAP_PROVIDERS.includes(provider)) return { error: 'That provider signs up with its email address.' }
  if (!supabase) return { error: 'One-tap sign-in is not configured on this site yet. Please enter your email address instead.' }
  saveIntent({ ...intent, providerHint: provider })
  /* Google and Yahoo ride our own /api/auth/social route: it bounces the
     browser to the provider's own consent screen and back through a
     Supabase magic link. The ?check preflight keeps an unconfigured
     provider on the page with the email-entry fallback. Apple stays on
     Supabase's native OAuth below. */
  if (provider === 'google' || provider === 'yahoo') {
    const preflight = await fetch(`/api/auth/social?check=${provider}`).then((response) => response.json()).catch(() => null)
    if (!preflight?.ok) {
      clearOAuthIntent()
      return { error: 'One-tap sign-in with this provider has not been switched on for the site yet — enter your email address below instead.' }
    }
    window.location.href = `/api/auth/social?p=${provider}`
    return { redirected: true }
  }
  const options = { redirectTo: `${window.location.origin}/` }
  // Let the family choose which Google account to use, every time.
  if (provider === 'google') options.queryParams = { access_type: 'consent', prompt: 'select_account' }
  const { error } = await supabase.auth.signInWithOAuth({ provider, options })
  if (error) {
    clearOAuthIntent()
    return { error: friendlyProviderError(error) }
  }
  return { redirected: true }
}

/* Called by registerTeacher when a one-tap applicant finishes the interview:
   the auth user already exists (Google/Apple made it), so only the pending
   application row has to be written. */
export async function ensureCloudTeacherProfile(account) {
  if (!supabase) throw new Error('One-tap applications need the cloud connection. Please try again.')
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Your Google/Apple session expired. Tap your provider on the first step to continue.')
  const response = await fetch('/api/auth/ensure-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ role: 'teacher', profile: { fullName: account.fullName, email: account.email, teacher: account.teacher } }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'The application could not be saved. Please try again.')
  return { userId: payload.userId }
}

/*
 * Runs once when the app boots. If the browser arrived back from Google or
 * Apple with an intent stored, this finishes the job:
 *   - student register/login -> make sure the profiles row exists (server
 *     route, token verified), adopt the account, and the App reopens the
 *     registration at step 2 so the child's details are still collected;
 *   - teacher application -> hand the identity to the portal so steps 2-3
 *     continue; the row is written when the interview is submitted;
 *   - teacher login -> adopt the account when an application exists.
 */
export async function completeOneTapReturn() {
  const intent = readOAuthIntent()
  if (!intent) return null
  if (!supabase) { clearOAuthIntent(); return { cancelled: true, intent } }

  const { data } = await supabase.auth.getSession()
  const session = data?.session
  if (!session?.user?.id || !session?.access_token) {
    clearOAuthIntent()
    return { cancelled: true, intent }
  }
  const user = session.user
  const identity = {
    fullName: String(user.user_metadata?.full_name || intent.fullName || ''),
    email: String(user.email || '').toLowerCase(),
    provider: TILE_BY_PROVIDER[user.app_metadata?.provider] || (intent.providerHint === 'google' ? 'gmail' : intent.providerHint) || 'gmail',
  }

  const { data: row } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  // A teacher application in progress: steps 2-3 still have to run.
  if (intent.kind === 'teacher-register' || (intent.surface === 'teacher' && !row)) {
    clearOAuthIntent()
    return { needsApplication: true, intent, identity }
  }

  if (row) {
    clearOAuthIntent()
    return { account: adoptCloudAccount(profileRowToAccount(row)), intent }
  }

  // Student with a verified Google/Apple identity but no row yet: create it.
  const response = await fetch('/api/auth/ensure-profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      role: 'student',
      parentName: intent.parentName || identity.fullName,
      selectedPlan: intent.selectedPlan || '',
      preferredTeacherId: intent.preferredTeacherId || '',
      referredByCode: intent.referralCode || '',
      authProvider: intent.providerHint === 'yahoo' ? 'yahoo' : intent.providerHint === 'google' ? 'gmail' : undefined,
      registrationCountry: intent.registrationCountry || '',
      attribution: intent.attribution || null,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.ok) {
    clearOAuthIntent()
    throw new Error(payload?.error || 'Your account could not be finished on our side. Please try again or register with your email address.')
  }
  const created = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  clearOAuthIntent()
  if (!created.data) throw new Error('Your account could not be verified. Please try again.')
  // A one-tap LOGIN with no account behind it becomes a registration: the
  // family is verified, they just have not filled in their child yet.
  return { account: adoptCloudAccount(profileRowToAccount(created.data)), intent: { ...intent, kind: 'register' } }
}
