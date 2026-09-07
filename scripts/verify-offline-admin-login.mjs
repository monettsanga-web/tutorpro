/**
 * Offline sign-in — verified against a SIMULATED SUPABASE OUTAGE.
 *
 * The administrator must be able to open their own dashboard when Supabase is
 * paused, restricted or unreachable, using a password already verified on
 * this device. That is exactly when they most need to look at the site.
 *
 * The security boundary is tested just as hard as the feature: a WRONG
 * password must still be refused during the same outage, and an unknown
 * account must not be able to sign in at all.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN = 'monettsanga@yahoo.com'
const PASSWORD = 'AdminPass123'
const WRONG = 'NotMyPassword999'

const browser = await chromium.launch()

/**
 * Seed a real account the way registration would: a genuine salt and a real
 * SHA-256 hash, so the login path is exercised properly rather than stubbed.
 */
const seedAdmin = (email, password) => `
  (async () => {
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)),
      (b) => b.toString(16).padStart(2, '0')).join('');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + '${password}'));
    const hash = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
    const acc = {
      id: 'admin-1', role: 'admin', status: 'active',
      email: '${email}', loginId: '${email}', authProvider: 'email',
      fullName: 'TutorPro Online English Administrator',
      parentName: 'TutorPro Online English Administrator',
      passwordHash: hash, salt, cloudProfile: true,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
    localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([
      { id: 'b1', studentId: 's1', teacherId: 't1', status: 'completed', date: '2026-08-01', learnerName: 'Ana' }
    ]));
  })()`

async function attemptLogin(page, { email, password, offline }) {
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(seedAdmin(ADMIN, PASSWORD))
  if (offline) await page.route('**://*.supabase.co/**', (route) => route.abort('failed'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  await page.locator('button:has-text("Student login"):visible, button:has-text("Log in"):visible').first().click()
  await page.waitForSelector('.auth-form', { timeout: 15000 })
  const provider = page.locator('button:has-text("Other email")')
  if (await provider.count()) await provider.click()
  await page.waitForSelector('.auth-form input[name="email"]', { timeout: 10000 })
  await page.fill('.auth-form input[name="email"]', email)
  await page.fill('.auth-form input[name="password"]', password)
  await page.locator('.auth-form button[type="submit"]').click()
  await page.waitForTimeout(4000)
}

/* === 1. THE FEATURE: correct password during an outage lets the admin in === */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await attemptLogin(page, { email: ADMIN, password: PASSWORD, offline: true })

  const state = await page.evaluate(() => ({
    session: sessionStorage.getItem('tutorpro_session_v2') || '',
    nav: document.querySelectorAll('.portal-nav button').length,
    alert: document.querySelector('.auth-alert')?.innerText || '',
    fallback: !!document.querySelector('.contact-fallback'),
  }))

  ok(state.session === 'admin-1', 'the administrator IS signed in during a full Supabase outage')
  ok(state.nav > 5, `the admin dashboard opens with its navigation (${state.nav} items)`)
  ok(!state.fallback, 'the parent-facing "message us" card is NOT shown to a signed-in admin')
  ok(state.alert === '', 'no error is displayed')

  // The offline state must be visible, not hidden.
  const warned = await page.evaluate(() => document.body.innerText.includes('not connected to the shared database'))
  ok(warned, 'the dashboard warns plainly that this device is not connected')

  // And the data they came to see is there.
  const data = await page.evaluate(() => document.body.innerText.includes('Ana'))
  ok(data, 'cached booking data is visible')

  ok(errors.length === 0, `no JavaScript errors (${errors.slice(0, 1).join('') || 'none'})`)
  await page.close()
}

/* === 2. THE BOUNDARY: a wrong password is still refused during the outage === */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await attemptLogin(page, { email: ADMIN, password: WRONG, offline: true })

  const state = await page.evaluate(() => ({
    session: sessionStorage.getItem('tutorpro_session_v2') || '',
    nav: document.querySelectorAll('.portal-nav button').length,
    alert: document.querySelector('.auth-alert')?.innerText || '',
  }))

  ok(state.session === '', 'CRITICAL: a wrong password is REFUSED even while Supabase is down')
  ok(state.nav === 0, 'no dashboard is opened for a wrong password')
  ok(/not correct/i.test(state.alert), `the password error is shown ("${state.alert.slice(0, 40)}")`)
  await page.close()
}

/* === 3. THE BOUNDARY: an unknown account cannot sign in offline ============ */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await attemptLogin(page, { email: 'stranger@example.com', password: PASSWORD, offline: true })

  const session = await page.evaluate(() => sessionStorage.getItem('tutorpro_session_v2') || '')
  ok(session === '', 'CRITICAL: an account never used on this device cannot sign in offline')
  await page.close()
}

/* === 4. Normal operation is unchanged ====================================== */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  // Supabase reachable, but it rejects the credentials as it would for a
  // genuinely wrong password. The local hash must NOT rescue this.
  await page.route('**://*.supabase.co/auth/v1/token**', (route) => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
  }))
  await attemptLogin(page, { email: ADMIN, password: PASSWORD, offline: false })

  const session = await page.evaluate(() => sessionStorage.getItem('tutorpro_session_v2') || '')
  ok(session === '', 'CRITICAL: when Supabase ANSWERS and rejects, the local hash is not consulted')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
