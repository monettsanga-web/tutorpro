/**
 * Every sign-up button on the registration modal must actually create an
 * account, and that account must be able to log back in.
 *
 * THE FAULT THIS LOCKS OUT
 * ------------------------
 * The modal offered five ways to sign up. Two of them could never work,
 * because they used Supabase providers that are switched off on this
 * project:
 *
 *   WhatsApp -> supabase.auth.signUp({ phone })   -> 400 phone_provider_disabled
 *   WeChat   -> supabase.auth.signInAnonymously() -> 422 anonymous_provider_disabled
 *
 * A parent who tapped either button was shown "Shared registration failed:
 * Phone signups are disabled" and could not create an account at all. Nobody
 * noticed because every test only ever used an email address.
 *
 * Logging in was broken the same way: anything without an "@" was sent to
 * the phone endpoint, which is also off.
 *
 * This walks the real form in a real browser, for every provider, and then
 * signs out and signs back in with the same handle.
 *
 * Run against a local build:  npm run verify:registration
 * It creates throwaway accounts, so point it at the local server, not
 * production, unless you mean to.
 */
const SANDBOX_PLAYWRIGHT = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX_PLAYWRIGHT))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const PASSWORD = 'TestPassw0rd!2026'
const stamp = Date.now().toString().slice(-9)

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PROVIDERS = [
  { key: 'default', label: 'Gmail (the option already selected)', login: `arenagm${stamp}@gmail.com` },
  { key: 'yahoo', label: 'Yahoo Mail', login: `arenaya${stamp}@yahoo.com` },
  { key: 'email', label: 'Other email', login: `arenaot${stamp}@example.com` },
  { key: 'wechat', label: 'WeChat ID', login: `arenawc${stamp}` },
  { key: 'whatsapp', label: 'WhatsApp number', login: `+63917${stamp.slice(-7)}` },
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function freshPage() {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const page = await ctx.newPage()
  const calls = []
  page.on('response', async (r) => {
    if (/auth\/v1\/(signup|token)/.test(r.url())) {
      calls.push({ status: r.status(), body: r.status() >= 400 ? (await r.text().catch(() => '')).slice(0, 200) : '' })
    }
  })
  return { ctx, page, calls }
}

const visibleErrors = (page) =>
  page.evaluate("[...document.querySelectorAll('.auth-alert,.field-error,[role=alert]')].map((e) => e.textContent.trim()).filter(Boolean)")

async function register(page, provider, login) {
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(2200)
  await page.locator('button', { hasText: /Book a free first class|Book free class/i }).first().click()
  await page.waitForTimeout(1100)
  if (provider !== 'default') await page.locator('.provider-method--' + provider).first().click()
  await page.waitForTimeout(400)
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
  await page.waitForTimeout(300)
  await page.locator('button', { hasText: /Create my free account/i }).first().click()
  await page.waitForTimeout(9000)
}

for (const { key, label, login } of PROVIDERS) {
  console.log(`\n${label}  ->  ${login}`)
  const { ctx, page, calls } = await freshPage()
  try {
    await register(page, key, login)
    const errors = await visibleErrors(page)
    const done = await page.evaluate("Boolean([...document.querySelectorAll('*')].find((e) => /YOU.?RE ALL SET/i.test(e.textContent || '') && e.children.length === 0))")
    ok(errors.length === 0, `the form shows no error (${errors.join(' | ') || 'none'})`)
    ok(done, 'the "You\'re all set" confirmation appears')
    const bad = calls.filter((c) => c.status >= 400)
    ok(bad.length === 0, `Supabase accepted the sign-up (${bad.map((b) => b.status + ' ' + b.body).join('; ') || 'no errors'})`)
  } finally {
    await ctx.close()
  }

  /* Now the part that was equally broken: coming back later. */
  const second = await freshPage()
  try {
    await second.page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 })
    await second.page.waitForTimeout(2200)
    /* Several "Student login" buttons exist; only the one in the mobile bar is
       on screen at this width. */
    const loginButtons = second.page.locator('button', { hasText: /^Student login$/i })
    const count = await loginButtons.count()
    let opened = false
    for (let i = 0; i < count; i++) {
      if (await loginButtons.nth(i).isVisible()) { await loginButtons.nth(i).click(); opened = true; break }
    }
    if (!opened) throw new Error('no visible "Student login" button')
    await second.page.waitForTimeout(1100)
    await second.page.locator('input[name="email"]').fill(login)
    await second.page.locator('input[type="password"]').first().fill(PASSWORD)
    const submits = second.page.locator('.auth-backdrop button')
    let clicked = false
    for (let i = 0; i < await submits.count(); i++) {
      const el = submits.nth(i)
      if (!(await el.isVisible())) continue
      if ((await el.innerText()).trim().toLowerCase() === 'log in') { await el.click(); clicked = true; break }
    }
    if (!clicked) throw new Error('no visible "Log in" submit button')
    await second.page.waitForTimeout(8000)
    const errors = await visibleErrors(second.page)
    const inside = await second.page.evaluate("Boolean(document.querySelector('.portal'))")
    ok(inside, `they can log back in on a new device (${errors.join(' | ') || 'no error shown'})`)
  } finally {
    await second.ctx.close()
  }
}

/* Registering the same login twice must read like a sentence, not a stack trace. */
{
  console.log('\nsomeone who already has an account and tries to register again')
  const login = `arenadup${stamp}@gmail.com`
  for (const attempt of [1, 2]) {
    const { ctx, page } = await freshPage()
    try {
      await register(page, 'default', login)
      if (attempt === 2) {
        const errors = await visibleErrors(page)
        const text = errors.join(' ')
        ok(errors.length > 0, `they are told something (${text || 'NOTHING AT ALL'})`)
        ok(!/Shared registration failed|supabase|user_already_exists/i.test(text), 'the message is not raw Supabase jargon')
        ok(/log in/i.test(text), 'and it tells them to log in instead')
      }
    } finally {
      await ctx.close()
    }
  }
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
