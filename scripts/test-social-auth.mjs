/**
 * Social sign-up logic checks.
 *
 * The single most important behaviour here is that a provider button is never
 * shown as live unless the Supabase project really can sign somebody in with
 * it. A false positive sends a parent to a raw JSON error page on the most
 * trust-sensitive screen on the site, so most of these tests are about the
 * detection layer refusing to lie.
 */

import assert from 'node:assert/strict'

let passed = 0
const check = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok  ${name}`) }
  catch (error) { console.error(`FAIL  ${name}\n      ${error.message}`); process.exitCode = 1 }
}
const checkAsync = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  ok  ${name}`) }
  catch (error) { console.error(`FAIL  ${name}\n      ${error.message}`); process.exitCode = 1 }
}

// ---------------------------------------------------------------------------
// A browser-ish environment, because socialAuth.js reads window/sessionStorage.
// ---------------------------------------------------------------------------
// supabase-js builds a realtime client on import and demands a global
// WebSocket. Node 22 (the engine this project targets) has one; the sandbox
// runs Node 20, which does not. Nothing under test opens a socket, so a stub
// is enough to get the module loaded.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class { constructor() { throw new Error('sockets are not used in these tests') } }
}

const store = new Map()
globalThis.window = {
  location: { origin: 'https://www.tutorpro.site', pathname: '/', href: 'https://www.tutorpro.site/' },
  sessionStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
}
globalThis.sessionStorage = window.sessionStorage

const mod = await import('../src/socialAuth.js')
const {
  socialProviders, socialProviderById, detectAvailableSocialProviders,
  socialRedirectUrl, readPendingSocialSignIn, clearPendingSocialSignIn,
  nameFromSocialUser, providerFromSocialUser,
} = mod

console.log('\nProvider catalogue')
check('all four requested providers are present', () => {
  assert.deepEqual(socialProviders.map((p) => p.id).sort(), ['facebook', 'kakao', 'naver', 'qq'])
})
check('Facebook and Kakao use built-in Supabase providers', () => {
  assert.equal(socialProviderById('facebook').provider, 'facebook')
  assert.equal(socialProviderById('kakao').provider, 'kakao')
  assert.equal(socialProviderById('facebook').builtIn, true)
  assert.equal(socialProviderById('kakao').builtIn, true)
})
check('Naver and QQ use the custom: prefix Supabase requires', () => {
  assert.equal(socialProviderById('naver').provider, 'custom:naver')
  assert.equal(socialProviderById('qq').provider, 'custom:qq')
  assert.equal(socialProviderById('naver').builtIn, false)
  assert.equal(socialProviderById('qq').builtIn, false)
})
check('built-in providers are probed via settings, custom via authorize', () => {
  assert.equal(socialProviderById('facebook').probe, 'settings')
  assert.equal(socialProviderById('kakao').probe, 'settings')
  assert.equal(socialProviderById('naver').probe, 'authorize')
  assert.equal(socialProviderById('qq').probe, 'authorize')
})
check('every provider carries real setup steps and a console link', () => {
  socialProviders.forEach((p) => {
    assert.ok(p.setup.steps.length >= 4, `${p.id} needs real steps`)
    assert.match(p.setup.console, /^https:\/\//)
    assert.ok(p.setup.steps.some((s) => s.includes('losmkvvwzijipqrlelyt.supabase.co/auth/v1/callback')),
      `${p.id} must state the exact callback URL`)
  })
})
check('the QQ entry warns that Tencent usually requires a China entity', () => {
  const steps = socialProviderById('qq').setup.steps.join(' ')
  assert.match(steps, /ICP/)
  assert.match(steps, /mainland-China-registered company|rejected/)
})
check('unknown provider ids return null rather than throwing', () => {
  assert.equal(socialProviderById('wechat'), null)
  assert.equal(socialProviderById(''), null)
})

console.log('\nAvailability detection — the button must never lie')
const withFetch = async (impl, fn) => {
  const original = globalThis.fetch
  globalThis.fetch = impl
  try { return await fn() } finally { globalThis.fetch = original }
}
const settingsResponse = (external) => ({ ok: true, status: 200, json: async () => ({ external }) })

await checkAsync('a provider disabled in settings is reported unavailable', async () => {
  const result = await withFetch(async (url) => {
    if (String(url).includes('/settings')) return settingsResponse({ facebook: false, kakao: false })
    return { status: 400, ok: false, type: 'basic' }
  }, () => detectAvailableSocialProviders())
  assert.equal(result.facebook, false)
  assert.equal(result.kakao, false)
})

await checkAsync('a provider enabled in settings is reported available', async () => {
  const result = await withFetch(async (url) => {
    if (String(url).includes('/settings')) return settingsResponse({ facebook: true, kakao: false })
    return { status: 400, ok: false, type: 'basic' }
  }, () => detectAvailableSocialProviders())
  assert.equal(result.facebook, true)
  assert.equal(result.kakao, false)
})

await checkAsync('a custom provider answering 400 is unavailable', async () => {
  const result = await withFetch(async (url) => {
    if (String(url).includes('/settings')) return settingsResponse({})
    return { status: 400, ok: false, type: 'basic' }
  }, () => detectAvailableSocialProviders())
  assert.equal(result.naver, false)
  assert.equal(result.qq, false)
})

await checkAsync('a custom provider that redirects is available', async () => {
  const result = await withFetch(async (url) => {
    if (String(url).includes('/settings')) return settingsResponse({})
    if (String(url).includes('custom%3Anaver') || String(url).includes('custom:naver')) {
      return { status: 0, ok: false, type: 'opaqueredirect' }
    }
    return { status: 400, ok: false, type: 'basic' }
  }, () => detectAvailableSocialProviders())
  assert.equal(result.naver, true, 'an opaque redirect means the provider is configured')
  assert.equal(result.qq, false)
})

await checkAsync('a 302 from the authorize endpoint counts as available', async () => {
  const result = await withFetch(async (url) => {
    if (String(url).includes('/settings')) return settingsResponse({})
    return { status: 302, ok: false, type: 'basic' }
  }, () => detectAvailableSocialProviders())
  assert.equal(result.naver, true)
  assert.equal(result.qq, true)
})

await checkAsync('a network failure reports unavailable, never available', async () => {
  const result = await withFetch(async () => { throw new Error('offline') }, () => detectAvailableSocialProviders())
  Object.values(result).forEach((value) => assert.equal(value, false))
})

await checkAsync('a broken settings endpoint does not make custom providers lie', async () => {
  const result = await withFetch(async (url) => {
    if (String(url).includes('/settings')) return { ok: false, status: 500, json: async () => ({}) }
    return { status: 400, ok: false, type: 'basic' }
  }, () => detectAvailableSocialProviders())
  assert.equal(result.facebook, false)
  assert.equal(result.naver, false)
})

await checkAsync('detection reports every provider, never a partial map', async () => {
  const result = await withFetch(async (url) => {
    if (String(url).includes('/settings')) return settingsResponse({ facebook: true })
    return { status: 400, ok: false, type: 'basic' }
  }, () => detectAvailableSocialProviders())
  assert.deepEqual(Object.keys(result).sort(), ['facebook', 'kakao', 'naver', 'qq'])
})

console.log('\nRedirect target')
check('redirect stays on our own origin and carries the marker', () => {
  const url = socialRedirectUrl()
  assert.ok(url.startsWith('https://www.tutorpro.site'), 'must return to our own site')
  assert.match(url, /social=1/)
})

console.log('\nPending sign-in hand-off')
check('a fresh pending sign-in is read back', () => {
  store.clear()
  window.sessionStorage.setItem('tutorpro_social_pending', JSON.stringify({ id: 'facebook', plan: 'Weekly', startedAt: Date.now() }))
  const pending = readPendingSocialSignIn()
  assert.equal(pending.id, 'facebook')
  assert.equal(pending.plan, 'Weekly')
})
check('a stale pending sign-in is discarded, not replayed', () => {
  store.clear()
  const longAgo = Date.now() - 16 * 60 * 1000
  window.sessionStorage.setItem('tutorpro_social_pending', JSON.stringify({ id: 'kakao', startedAt: longAgo }))
  assert.equal(readPendingSocialSignIn(), null)
  assert.equal(window.sessionStorage.getItem('tutorpro_social_pending'), null, 'stale record is cleaned up')
})
check('corrupt stored JSON never throws', () => {
  store.clear()
  window.sessionStorage.setItem('tutorpro_social_pending', '{not json')
  assert.equal(readPendingSocialSignIn(), null)
})
check('clearing removes the record', () => {
  store.clear()
  window.sessionStorage.setItem('tutorpro_social_pending', JSON.stringify({ id: 'naver', startedAt: Date.now() }))
  clearPendingSocialSignIn()
  assert.equal(readPendingSocialSignIn(), null)
})

console.log('\nReading the parent back out of the provider payload')
check('Facebook full_name is used', () => {
  assert.equal(nameFromSocialUser({ user_metadata: { full_name: 'Maria Santos' } }), 'Maria Santos')
})
check('Kakao nickname is used when there is no full name', () => {
  assert.equal(nameFromSocialUser({ user_metadata: { nickname: '민지' } }), '민지')
})
check('Naver name field is used', () => {
  assert.equal(nameFromSocialUser({ user_metadata: { name: '김영희' } }), '김영희')
})
check('falls back to the email local part when no name is sent', () => {
  assert.equal(nameFromSocialUser({ email: 'parent@qq.com', user_metadata: {} }), 'parent')
})
check('QQ sends neither name nor email without crashing', () => {
  assert.equal(nameFromSocialUser({ user_metadata: {} }), '')
  assert.equal(nameFromSocialUser(null), '')
})
check('the custom: prefix is stripped for display', () => {
  assert.equal(providerFromSocialUser({ app_metadata: { provider: 'custom:naver' } }), 'naver')
  assert.equal(providerFromSocialUser({ app_metadata: { provider: 'custom:qq' } }), 'qq')
})
check('built-in provider names pass through unchanged', () => {
  assert.equal(providerFromSocialUser({ app_metadata: { provider: 'facebook' } }), 'facebook')
  assert.equal(providerFromSocialUser({ app_metadata: { provider: 'kakao' } }), 'kakao')
})
check('a missing provider does not crash', () => {
  assert.equal(providerFromSocialUser({}), '')
  assert.equal(providerFromSocialUser(null), '')
})

console.log(`\n${passed} checks passed.`)
