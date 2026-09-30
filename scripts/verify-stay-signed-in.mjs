/**
 * Closing the browser must not sign anybody out.
 *
 * THE FAULT THIS LOCKS OUT
 * ------------------------
 * Both halves of the sign-in lived in `sessionStorage`, which every browser
 * empties the moment the tab is closed:
 *
 *   src/supabaseClient.js  storage: window.sessionStorage
 *   src/auth.js            writeSessionId() wrote to sessionStorage AND
 *                          deleted the localStorage copy
 *
 * So parents, teachers and the administrator were asked for their password
 * again on every visit. On a phone it was worse than it sounds: switching
 * apps can discard the tab, so a parent could be signed out between booking
 * a lesson and paying for it.
 *
 * HOW THIS TEST WORKS
 * Playwright's storageState is exactly what a browser keeps on disk between
 * runs. Sign in, save it, throw the browser context away, open a brand new
 * one with that state, and see whether the dashboard is still there. Under
 * the old code the state contained nothing and the second visit was a
 * logged-out homepage.
 */
const SANDBOX_PLAYWRIGHT = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX_PLAYWRIGHT))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const PASSWORD = 'TestPassw0rd!2026'
const stamp = Date.now().toString().slice(-9)

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const PHONE = {
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}

async function registerParent(page, login) {
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(2200)
  await page.locator('button', { hasText: /Book a free first class|Book free class/i }).first().click()
  await page.waitForTimeout(1100)
  await page.locator('input[name="parentName"]').fill('Arena Check Parent')
  await page.locator('input[name="email"]').fill(login)
  const pw = page.locator('input[type="password"]')
  for (let i = 0; i < await pw.count(); i++) await pw.nth(i).fill(PASSWORD)
  await page.locator('input[name="terms"]').check({ force: true })
  await page.waitForTimeout(250)
  await page.locator('button', { hasText: /Continue to student profile/i }).first().click()
  await page.waitForTimeout(1100)
  await page.locator('input[name="childName"]').fill('Arena Check Child')
  await page.selectOption('select[name="year"]', 'Year 3')
  await page.selectOption('select[name="curriculum"]', 'Cambridge')
  await page.selectOption('select[name="goal"]', 'Speaking with confidence')
  await page.locator('label', { hasText: '1–2 weekly' }).first().click()
  await page.waitForTimeout(250)
  await page.locator('button', { hasText: /Create my free account/i }).first().click()
  await page.waitForTimeout(9000)
  const open = page.locator('button', { hasText: /Open student dashboard/i })
  if (await open.count()) await open.first().click()
  await page.waitForTimeout(3500)
}

const login = `arenass${stamp}@gmail.com`
console.log(`signing up ${login}`)

/* ---- first visit ---------------------------------------------------- */
const first = await browser.newContext(PHONE)
const page1 = await first.newPage()
await registerParent(page1, login)
ok(await page1.evaluate("Boolean(document.querySelector('.portal'))"), 'the dashboard opens right after registering')

const stored = await page1.evaluate(`({
  local: Object.keys(localStorage),
  session: Object.keys(sessionStorage),
})`)
ok(stored.local.includes('tutorpro-supabase-auth'), 'the Supabase session is written somewhere that survives a restart')
ok(stored.local.includes('tutorpro_session_v2'), 'so is the record of who is signed in')
ok(!stored.session.includes('tutorpro-supabase-auth'), 'and it is no longer only in the per-tab store the browser throws away')

const state = await first.storageState()
await first.close()

/* ---- they close the browser and come back --------------------------- */
const second = await browser.newContext({ ...PHONE, storageState: state })
const page2 = await second.newPage()
await page2.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 })
await page2.waitForTimeout(4000)

const back = await page2.evaluate(`({
  askedToLogIn: Boolean(document.querySelector('.auth-backdrop')),
  guestBar: Boolean(document.querySelector('.mobile-guest-action-bar')),
  bodyText: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 200),
})`)
ok(!back.askedToLogIn, 'coming back does not throw a login box at them')
ok(!back.guestBar, 'the site knows they are signed in (the signed-out action bar is gone)')

/* And their dashboard is one tap away, with no password. */
const dashLink = page2.locator('button, a').filter({ hasText: /dashboard|my account|account/i })
let opened = false
for (let i = 0; i < await dashLink.count(); i++) {
  const el = dashLink.nth(i)
  if (await el.isVisible()) { await el.click(); opened = true; break }
}
await page2.waitForTimeout(3500)
const reachedDashboard = await page2.evaluate("Boolean(document.querySelector('.portal'))")
const askedAgain = await page2.evaluate("Boolean(document.querySelector('input[type=\"password\"]'))")
ok(opened, 'there is a visible way back into their account')
ok(reachedDashboard, 'it opens the dashboard')
ok(!askedAgain, 'and never asks for the password again')

/* ---- the Supabase session itself is still valid --------------------- */
const sessionAlive = await page2.evaluate(`
  JSON.parse(localStorage.getItem('tutorpro-supabase-auth') || 'null')?.access_token ? true : false
`)
ok(sessionAlive, 'the Supabase access token came back with them, so cloud data still loads')
await second.close()

/* ---- a deep link into the dashboard survives a restart too ---------- */
const third = await browser.newContext({ ...PHONE, storageState: state })
const page3 = await third.newPage()
await page3.goto(BASE + '/#/parent', { waitUntil: 'load', timeout: 60000 })
await page3.waitForTimeout(4500)
ok(
  await page3.evaluate("Boolean(document.querySelector('.portal'))"),
  'opening a saved dashboard link after a restart lands in the dashboard, not on a login form',
)
await third.close()

/* ---- signing out must still work ------------------------------------ */
/* Desktop for this one: on a phone the Log out button sits in the portal
   sidebar, which is collapsed off-screen, and the point here is whether
   signing out still clears storage — not where the button is. */
const fourth = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: state })
const page4 = await fourth.newPage()
await page4.goto(BASE + '/#/parent', { waitUntil: 'load', timeout: 60000 })
await page4.waitForTimeout(4000)
const logout = page4.locator('button', { hasText: /log ?out|sign ?out/i })
let signedOut = false
for (let i = 0; i < await logout.count(); i++) {
  const el = logout.nth(i)
  if (!(await el.isVisible())) continue
  /* On a phone the Log out button lives at the bottom of the portal
     sidebar, off the first screen. Bring it into view before clicking. */
  const box = await el.boundingBox()
  if (!box || box.x < 0 || box.y < 0) continue
  await el.scrollIntoViewIfNeeded().catch(() => {})
  await page4.waitForTimeout(200)
  await el.click()
  signedOut = true
  break
}
await page4.waitForTimeout(2500)
if (signedOut) {
  const after = await page4.evaluate(`({
    supa: localStorage.getItem('tutorpro-supabase-auth'),
    who: localStorage.getItem('tutorpro_session_v2'),
  })`)
  ok(!after.who, 'signing out still clears the record of who was signed in')
  ok(!after.supa || !JSON.parse(after.supa)?.access_token, 'and the Supabase session with it')
} else {
  ok(false, 'could not find a Log out button to check that signing out still works')
}
await fourth.close()

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
