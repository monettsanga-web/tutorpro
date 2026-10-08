/**
 * A family who signed up with a phone number can add an email, so a
 * forgotten password is recoverable.
 *
 * THE PROBLEM THIS CLOSES
 * -----------------------
 * Registering with WhatsApp or WeChat produces a login like
 * `whatsapp.639...@accounts.tutorpro.site` - a handle this site invents
 * so Supabase has something email-shaped to store. Nobody reads that
 * mailbox, because it does not exist. If that parent forgets their
 * password there is nowhere to send a code, and until WhatsApp sending
 * is switched on their only route back in is to message the owner.
 *
 * So both dashboards now carry a recovery-email card, and the card has
 * to be honest about which of two states the account is in: reachable,
 * or not reachable at all.
 *
 * Run: node scripts/verify-recovery-email.mjs   (server on :4173)
 */
const SANDBOX = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PHONE_PARENT = '22222222-2222-4222-8222-000000000011'
const EMAIL_PARENT = '22222222-2222-4222-8222-000000000012'
const learner = { id: 'l1', name: 'Juan Santos', year: 'Year 3', curriculum: 'Cambridge', goal: 'Speaking', accessStatus: 'active' }

/* The account at the heart of it: signed up by WhatsApp, so its "email"
   is a handle nobody can read. */
const accounts = [
  {
    id: PHONE_PARENT, role: 'student', status: 'active', parentName: 'Maria Santos',
    email: 'whatsapp.639625284849@accounts.tutorpro.site',
    loginId: 'whatsapp.639625284849@accounts.tutorpro.site',
    authProvider: 'whatsapp', registrationCountry: 'PH', children: [learner], child: learner,
  },
  {
    id: EMAIL_PARENT, role: 'student', status: 'active', parentName: 'Ana Cruz',
    email: 'ana@gmail.com', loginId: 'ana@gmail.com',
    authProvider: 'gmail', registrationCountry: 'PH', children: [learner], child: learner,
  },
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function profilePage(id, width) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 950 }, isMobile: width < 700, hasTouch: width < 700 })
  await page.route('**/*.{mp4,webm}', (r) => r.abort())
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) }))
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline"}' }))
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');
    localStorage.setItem('tutorpro_accounts_v2', ${JSON.stringify(JSON.stringify(accounts))});
    localStorage.setItem('tutorpro_session_v2', '${id}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2400)
  const enter = page.locator('button:has-text("My dashboard"):visible').first()
  if (await enter.count()) await enter.click()
  else {
    const b = page.locator('.menu-button'); if (await b.count()) { await b.click(); await page.waitForTimeout(400) }
    await page.locator('button:has-text("My dashboard"):visible').first().click()
  }
  await page.waitForSelector('.portal-nav', { timeout: 20000 })
  const menu = page.locator('.portal-menu')
  if (await menu.count() && await menu.first().isVisible()) { await menu.first().click(); await page.waitForTimeout(350) }
  await page.locator('.portal-nav button:has-text("My profile")').first().click()
  await page.waitForTimeout(1100)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
  return page
}

for (const width of [1440, 390]) {
  const label = `@${width}px`

  /* ---------- the WhatsApp family: currently unrecoverable ---------- */
  let page = await profilePage(PHONE_PARENT, width)
  const card = page.locator('.recovery-email-card')
  ok(await card.count() > 0, `phone account ${label}: the recovery-email card is on the profile page`)

  const state = await page.evaluate(`(() => {
    const el = document.querySelector('.recovery-email-card')
    if (!el) return null
    const input = el.querySelector('input')
    const r = el.getBoundingClientRect()
    return {
      warns: Boolean(el.querySelector('.recovery-email-card__state--warn')),
      says: el.innerText.replace(/\\s+/g, ' '),
      inputFont: parseFloat(getComputedStyle(input).fontSize),
      inputType: input.type,
      onscreen: r.left >= -1 && r.right <= innerWidth + 1,
      buttonHeights: [...el.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().height)),
    }
  })()`)
  ok(state.warns, `phone account ${label}: it warns that no reset is possible today`)
  ok(/not a mailbox/i.test(state.says), `phone account ${label}: and explains why - the login is a handle, not a mailbox`)
  ok(state.inputType === 'email', `phone account ${label}: the field is type=email, so a phone keyboard offers @`)
  /* Under 16px, iOS Safari zooms the page in on focus and never zooms out. */
  ok(state.inputFont >= 16, `phone account ${label}: the input is at least 16px (${state.inputFont}px)`)
  ok(state.onscreen, `phone account ${label}: the card fits the screen`)
  ok(Math.min(...state.buttonHeights) >= 44, `phone account ${label}: buttons are thumb-sized (${Math.min(...state.buttonHeights)}px)`)

  /* A bad address is refused before anything is sent anywhere. */
  await page.fill('.recovery-email-card input', 'not-an-email')
  await page.locator('.recovery-email-card button').first().click()
  await page.waitForTimeout(900)
  const refused = await page.evaluate(`(() => document.querySelector('.recovery-email-card .portal-error')?.textContent?.trim() || '')()`)
  ok(/valid email/i.test(refused), `phone account ${label}: a malformed address is refused (${refused || 'no message'})`)

  /* The invented handle must not be accepted as a recovery address. */
  await page.fill('.recovery-email-card input', 'whatsapp.639625284849@accounts.tutorpro.site')
  await page.locator('.recovery-email-card button').first().click()
  await page.waitForTimeout(900)
  const handleRefused = await page.evaluate(`(() => document.querySelector('.recovery-email-card .portal-error')?.textContent?.trim() || '')()`)
  ok(/login handle, not a mailbox/i.test(handleRefused), `phone account ${label}: the login handle itself is refused as a recovery address`)
  await page.close()

  /* ---------- the email family: already reachable ---------- */
  page = await profilePage(EMAIL_PARENT, width)
  const emailState = await page.evaluate(`(() => {
    const el = document.querySelector('.recovery-email-card')
    return el ? { ok: Boolean(el.querySelector('.recovery-email-card__state--ok')), says: el.innerText.replace(/\\s+/g, ' ') } : null
  })()`)
  ok(emailState?.ok, `email account ${label}: shown as already recoverable`)
  ok(/ana@gmail\.com/.test(emailState.says), `email account ${label}: and told which address that is`)
  await page.close()
}

/* ---------- it has to find the parent, not wait to be found ----------
 * The card existed on the profile page and the owner still asked for the
 * feature twice, which is the clearest possible signal that a thing
 * nobody can see does not exist. A family who cannot reset their
 * password now meets it on the first screen after logging in.
 */
{
  const page = await profilePage(PHONE_PARENT, 1440)
  /* profilePage() ends on My profile; go back to where a parent lands. */
  await page.locator('.portal-nav button:has-text("Overview")').first().click()
  await page.waitForTimeout(1200)
  ok(await page.locator('.recovery-email-card').count() > 0, 'phone account: the card is on the Overview, the first screen after logging in')
  await page.close()

  const fine = await profilePage(EMAIL_PARENT, 1440)
  await fine.locator('.portal-nav button:has-text("Overview")').first().click()
  await fine.waitForTimeout(1200)
  ok(await fine.locator('.recovery-email-card').count() === 0, 'email account: the Overview is not cluttered for a family who can already reset')
  await fine.close()
}

/* ---- the contract, in the source ---- */
import { readFileSync } from 'node:fs'
const route = readFileSync(new URL('../api/auth/reset.js', import.meta.url), 'utf8')
const helper = readFileSync(new URL('../src/recoveryEmail.js', import.meta.url), 'utf8')

ok(/action === 'set-recovery-email'/.test(route), 'the server has an action for saving it')
ok(/admin_members/.test(route), 'an administrator saving somebody else is checked against admin_members, not profiles.role')
ok(/targetId !== auth\.user\.id/.test(route), 'and a parent cannot set a recovery email on an account that is not theirs')
ok(/profile_data->>recoveryEmail/.test(route), 'a reset request can find an account by its recovery email')
ok(/recoveryEmail/.test(route.slice(route.indexOf('async function emailCode'), route.indexOf('async function requestCode'))), 'and the code is sent there when the login is a handle')
ok(/accounts\.tutorpro\.site/.test(helper), 'the client knows which addresses are invented handles')

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
