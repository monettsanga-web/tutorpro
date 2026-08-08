/**
 * One-tap social sign-up for TutorPro Online English.
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * Parents asked to create an account with the service they already use:
 * Facebook, KakaoTalk, Naver or QQ. This module owns the whole round trip:
 * working out which of those buttons can genuinely sign somebody in right
 * now, starting the redirect, and turning whatever comes back into a normal
 * TutorPro family account.
 *
 * THE HARD CONSTRAINT, AND WHY THE CODE LOOKS LIKE THIS
 * -----------------------------------------------------
 * A "Sign up with X" button is a promise. If the button is there and the
 * provider is not actually configured, the parent is redirected to a raw
 * Supabase JSON error page:
 *
 *     {"code":400,"error_code":"validation_failed",
 *      "msg":"Unsupported provider: provider is not enabled"}
 *
 * That is worse than not offering the button at all, and it happens on the
 * one screen where trust matters most. Verified against the live project on
 * 9 August 2026, every provider is currently switched off:
 *
 *     GET /auth/v1/settings
 *     -> facebook:false, kakao:false, google:false, apple:false ...
 *     GET /auth/v1/authorize?provider=naver -> "Provider naver could not be found"
 *     GET /auth/v1/authorize?provider=qq    -> "Provider qq could not be found"
 *
 * So the buttons are NOT hard-coded on. This module asks the Supabase project
 * what is really enabled and only renders a live button for those. Each
 * provider that is not ready yet still appears, clearly marked, with the exact
 * steps to switch it on. Nothing here fabricates a working login.
 *
 * FACEBOOK AND KAKAO vs NAVER AND QQ
 * ----------------------------------
 * Supabase ships Facebook and Kakao as built-in providers: enable them in the
 * dashboard, paste a client ID and secret, done.
 *
 * Naver and QQ are not built in. Supabase added custom OAuth2/OIDC providers
 * in March 2026, so they are reachable as `custom:naver` and `custom:qq`
 * using Naver's and Tencent's published OAuth endpoints. That is why those two
 * carry the `custom:` prefix below and why they list endpoint URLs.
 *
 * The `/auth/v1/settings` response only reports built-in providers, so a
 * configured custom provider will not appear there. Custom providers are
 * therefore probed directly, and the probe result is what decides.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const SUPABASE_URL = 'https://losmkvvwzijipqrlelyt.supabase.co'

/**
 * The four services parents asked for.
 *
 * `probe` decides how we find out whether the provider really works:
 *   'settings' — a built-in provider; /auth/v1/settings reports a boolean.
 *   'authorize' — a custom provider; ask the authorize endpoint directly.
 */
export const socialProviders = [
  {
    id: 'facebook',
    provider: 'facebook',
    label: 'Facebook',
    blurb: 'Most parents already have this',
    probe: 'settings',
    builtIn: true,
    brand: '#1877f2',
    setup: {
      console: 'https://developers.facebook.com/apps',
      steps: [
        'Create an app at developers.facebook.com → Apps → Create App → choose "Consumer".',
        'Add the "Facebook Login" product, then open Settings → Basic to copy the App ID and App Secret.',
        'In Facebook Login → Settings, add this exact Valid OAuth Redirect URI: ' + SUPABASE_URL + '/auth/v1/callback',
        'In Supabase → Authentication → Providers → Facebook, switch it on and paste the App ID and App Secret.',
        'Switch the Facebook app from Development to Live, or only you will be able to sign in.',
      ],
    },
  },
  {
    id: 'kakao',
    provider: 'kakao',
    label: 'KakaoTalk',
    blurb: 'The everyday login in Korea',
    probe: 'settings',
    builtIn: true,
    brand: '#fee500',
    setup: {
      console: 'https://developers.kakao.com/console/app',
      steps: [
        'Create an application at developers.kakao.com → My Application.',
        'Open App Keys and copy the REST API key — that is the Client ID Supabase wants.',
        'Open Product Settings → Kakao Login, turn Activation on, and under Security generate a Client Secret and set it to "use".',
        'Add this Redirect URI: ' + SUPABASE_URL + '/auth/v1/callback',
        'Under Consent Items, allow at least nickname and account_email, or Kakao returns no email.',
        'In Supabase → Authentication → Providers → Kakao, switch it on and paste the REST API key and Client Secret.',
      ],
    },
  },
  {
    id: 'naver',
    // Not built into Supabase. Reachable through the custom OAuth2 provider
    // feature that shipped in March 2026.
    provider: 'custom:naver',
    label: 'Naver',
    blurb: 'Korea’s largest portal account',
    probe: 'authorize',
    builtIn: false,
    brand: '#03c75a',
    setup: {
      console: 'https://developers.naver.com/apps/#/register',
      steps: [
        'Register an application at developers.naver.com and choose "네이버 아이디로 로그인" (Login with Naver).',
        'Copy the Client ID and Client Secret.',
        'Set the Callback URL to: ' + SUPABASE_URL + '/auth/v1/callback',
        'In Supabase → Authentication → Providers → New Provider → Manual configuration (OAuth2).',
        'Use the identifier custom:naver, then these endpoints:',
        '   Authorization URL — https://nid.naver.com/oauth2.0/authorize',
        '   Token URL — https://nid.naver.com/oauth2.0/token',
        '   UserInfo URL — https://openapi.naver.com/v1/nid/me',
        'Naver only returns an email if you request the email consent item, so tick it in the console.',
      ],
    },
  },
  {
    id: 'qq',
    provider: 'custom:qq',
    label: 'QQ',
    blurb: 'For families in mainland China',
    probe: 'authorize',
    builtIn: false,
    brand: '#12b7f5',
    setup: {
      console: 'https://connect.qq.com/',
      steps: [
        'Apply for a developer account at connect.qq.com. Tencent reviews every website application by hand.',
        'Important: QQ Connect normally requires a mainland-China-registered company and an ICP filing. A Philippine sole proprietorship is usually rejected, so treat this one as uncertain until Tencent approves it.',
        'Once approved, copy the APP ID and APP Key.',
        'Set the callback domain to: ' + SUPABASE_URL + '/auth/v1/callback',
        'In Supabase → Authentication → Providers → New Provider → Manual configuration (OAuth2).',
        'Use the identifier custom:qq, then these endpoints:',
        '   Authorization URL — https://graph.qq.com/oauth2.0/authorize',
        '   Token URL — https://graph.qq.com/oauth2.0/token',
        '   UserInfo URL — https://graph.qq.com/user/get_user_info',
        'QQ does not return an email address, so set "email optional" on the provider.',
      ],
    },
  },
]

export function socialProviderById(id) {
  return socialProviders.find((entry) => entry.id === id) || null
}

/**
 * Ask the project which built-in providers are switched on.
 * `/auth/v1/settings` is public and CORS-readable (verified: it returns
 * access-control-allow-origin for https://www.tutorpro.site).
 */
async function readBuiltInProviders(signal) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { signal })
  if (!response.ok) throw new Error(`settings ${response.status}`)
  const body = await response.json()
  return body?.external || {}
}

/**
 * Ask the authorize endpoint about one custom provider.
 *
 * A configured provider answers with a redirect to the provider's own login
 * page. An unconfigured one answers 400 with "could not be found" or
 * "provider is not enabled". `redirect: 'manual'` keeps us from actually
 * following the provider redirect during a probe.
 */
async function probeAuthorizeProvider(provider, signal) {
  const url = `${SUPABASE_URL}/auth/v1/authorize?provider=${encodeURIComponent(provider)}`
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'manual', signal })
    // An opaque redirect means the browser was told to go somewhere else,
    // which only happens when the provider is configured.
    if (response.type === 'opaqueredirect') return true
    if (response.status >= 300 && response.status < 400) return true
    if (response.status === 400) return false
    return response.ok
  } catch {
    // Network failure tells us nothing about configuration, so treat the
    // provider as unavailable rather than showing a button that may fail.
    return false
  }
}

/**
 * Work out, right now, which of the four buttons can really sign someone in.
 * Returns a map of provider id -> boolean. Never throws: if the check itself
 * fails we report everything as unavailable, which degrades to the email form.
 */
export async function detectAvailableSocialProviders({ signal } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return Object.fromEntries(socialProviders.map((entry) => [entry.id, false]))
  }

  let builtIn = {}
  try {
    builtIn = await readBuiltInProviders(signal)
  } catch {
    builtIn = {}
  }

  const entries = await Promise.all(socialProviders.map(async (entry) => {
    if (entry.probe === 'settings') return [entry.id, Boolean(builtIn[entry.id])]
    return [entry.id, await probeAuthorizeProvider(entry.provider, signal)]
  }))

  return Object.fromEntries(entries)
}

/**
 * Where the provider sends the parent back to.
 *
 * It must be an exact match for an entry in Supabase's redirect allow-list,
 * so we keep it to the site origin plus a marker the app can read on return.
 */
export function socialRedirectUrl() {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${window.location.pathname}?social=1`
}

/**
 * Begin sign-in. On success the browser leaves this page for the provider,
 * so anything after the call only runs when something went wrong.
 */
export async function startSocialSignIn(id, { plan = '', referralCode = '' } = {}) {
  const entry = socialProviderById(id)
  if (!entry) throw new Error('Unknown sign-up method.')
  if (!supabase) throw new Error('Account service is not available right now. Please use the email form below.')

  // Survive the round trip to the provider and back. sessionStorage is
  // deliberate: it is per-tab and cleared when the tab closes, so a shared
  // computer never leaks one family's pending plan into another's sign-up.
  try {
    window.sessionStorage.setItem('tutorpro_social_pending', JSON.stringify({
      id, plan, referralCode, startedAt: Date.now(),
    }))
  } catch { /* Private mode can refuse storage; the sign-in still works. */ }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: entry.provider,
    options: { redirectTo: socialRedirectUrl() },
  })

  if (error) {
    // Translate Supabase's internal wording into something a parent can act on.
    const raw = error.message || ''
    if (/not enabled|could not be found|Unsupported provider/i.test(raw)) {
      throw new Error(`${entry.label} sign-up is not switched on yet. Please use the email form below.`)
    }
    throw new Error(`${entry.label} sign-up could not start: ${raw}`)
  }

  return data
}

export function readPendingSocialSignIn() {
  try {
    const raw = window.sessionStorage.getItem('tutorpro_social_pending')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Anything older than 15 minutes is a stale tab, not a live sign-up.
    if (!parsed?.startedAt || Date.now() - parsed.startedAt > 15 * 60 * 1000) {
      window.sessionStorage.removeItem('tutorpro_social_pending')
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearPendingSocialSignIn() {
  try { window.sessionStorage.removeItem('tutorpro_social_pending') } catch { /* ignore */ }
}

/**
 * Pull a usable name out of whatever the provider sent.
 * Each one names this field differently, and QQ sends no email at all.
 */
export function nameFromSocialUser(user) {
  const meta = user?.user_metadata || {}
  const candidate = meta.full_name || meta.name || meta.nickname || meta.preferred_username
    || meta.user_name || (user?.email ? user.email.split('@')[0] : '')
  return String(candidate || '').trim()
}

/** Which service actually signed this person in, for display and for support. */
export function providerFromSocialUser(user) {
  const raw = user?.app_metadata?.provider || ''
  return raw.startsWith('custom:') ? raw.slice(7) : raw
}
