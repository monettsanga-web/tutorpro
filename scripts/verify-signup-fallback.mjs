/**
 * Sign-up failure fallback — verified against a SIMULATED SUPABASE OUTAGE.
 *
 * Every request to supabase.co is blocked, then a parent fills in the real
 * registration form and submits. This reproduces the exact situation the
 * owner asked about: Supabase is closed, the parent cannot sign up.
 *
 * The test then proves they are offered a way to reach a human instead of a
 * dead end — and, just as importantly, that an ordinary mistake such as a
 * weak password does NOT trigger it.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const browser = await chromium.launch()

async function openRegistration(page, { blockSupabase }) {
  if (blockSupabase) {
    // The outage: nothing reaches Supabase, exactly as if the project were
    // paused, restricted with a 402, or unreachable.
    await page.route('**://*.supabase.co/**', (route) => route.abort('failed'))
  }
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  // The header button is hidden inside the collapsed menu on a phone, so the
  // first VISIBLE registration control is the one a real person would press.
  await page.locator('button:has-text("Student registration"):visible').first().click()
  await page.waitForSelector('.auth-form', { timeout: 15000 })
}

async function fillStepOne(page, { password = 'TestPass123' } = {}) {
  // The fields only render once a sign-in provider is chosen.
  await page.locator('button:has-text("Other email")').click()
  await page.waitForSelector('input[name="parentName"]', { timeout: 10000 })
  await page.fill('input[name="parentName"]', 'Maria Santos')
  await page.fill('input[name="email"]', `parent${Date.now()}@example.com`)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="confirmPassword"]', password)
  // The guardian confirmation is required before step one will advance.
  await page.locator('input[name="terms"]').check({ force: true })
  await page.locator('.auth-form button[type="submit"]').click()
}

async function fillStepTwo(page) {
  await page.waitForSelector('input[name="childName"]', { timeout: 10000 })
  await page.fill('input[name="childName"]', 'Ana Santos')
  await page.selectOption('select[name="year"]', { index: 2 })
  await page.selectOption('select[name="curriculum"]', { index: 1 })
  await page.selectOption('select[name="goal"]', { index: 1 })
  // Lesson rhythm is a radio group whose visible label overlays the input.
  await page.locator('input[name="frequency"]').first().check({ force: true })
}

/* === 1. Supabase is down: the parent must be offered a human =========== */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await openRegistration(page, { blockSupabase: true })
  await fillStepOne(page)
  await fillStepTwo(page)
  await page.locator('.auth-form button[type="submit"]').last().click()

  const fallback = page.locator('.contact-fallback')
  await fallback.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  ok(await fallback.count() === 1, 'a contact fallback appears when Supabase is unreachable')
  ok(await fallback.isVisible(), 'the fallback is actually visible to the parent')

  const text = await fallback.textContent()
  ok(/sorry/i.test(text), 'it apologises')
  ok(/not with anything you typed/i.test(text), 'it says the parent did nothing wrong')
  ok(/by hand/i.test(text), 'it promises a person will set the account up')
  ok(/nothing has been charged/i.test(text), 'it confirms nothing was charged')

  // The raw technical error must not be shown alongside it.
  const rawAlert = await page.locator('.auth-alert').count()
  ok(rawAlert === 0, 'the raw technical error is replaced, not shown as well')
  ok(!/Shared registration failed/i.test(text), 'no internal error text leaks to the parent')

  /* --- every channel must be present and correct --------------------- */
  const wa = fallback.locator('.contact-fallback__button--whatsapp')
  const waHref = await wa.getAttribute('href')
  ok(waHref?.startsWith('https://wa.me/639625284849'), `WhatsApp uses the right number (${waHref?.slice(0, 34)})`)
  ok(decodeURIComponent(waHref).includes('Maria Santos'), 'the WhatsApp message is prefilled with the parent name')
  ok(decodeURIComponent(waHref).includes('Ana Santos'), 'the prefilled message includes the student name')
  ok(decodeURIComponent(waHref).includes('did not work'), 'the prefilled message explains what happened')

  const fb = fallback.locator('.contact-fallback__button--facebook')
  ok(await fb.getAttribute('href') === 'https://m.me/526047974195321', 'Messenger link is correct')

  const em = fallback.locator('.contact-fallback__button--email')
  const emHref = await em.getAttribute('href')
  ok(emHref?.startsWith('mailto:sejongenglish@yahoo.com'), 'the email link uses the published address')
  ok(decodeURIComponent(emHref).includes('Maria Santos'), 'the email body is prefilled too')

  const wc = fallback.locator('.contact-fallback__button--wechat')
  ok(await wc.evaluate((n) => n.tagName) === 'BUTTON', 'WeChat is a button, not a broken link')
  ok((await wc.textContent()).includes('t_cora'), 'the WeChat ID is shown')

  ok(errors.length === 0, `no JavaScript errors (${errors.slice(0, 1).join('') || 'none'})`)
  await page.close()
}

/* === 2. An ordinary mistake must NOT show the fallback ================= */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await openRegistration(page, { blockSupabase: false })
  // A password that fails the app's own rule never reaches the network.
  await fillStepOne(page, { password: 'weak' })
  await page.waitForTimeout(800)
  ok(await page.locator('.contact-fallback').count() === 0,
    'a weak password shows no contact fallback - the parent can fix that themselves')
  const stillStepOne = await page.locator('input[name="parentName"]').isVisible()
  ok(stillStepOne, 'the form keeps the parent on the step they can correct')
  await page.close()
}

/* === 3. Mobile layout ================================================== */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await openRegistration(page, { blockSupabase: true })
  await fillStepOne(page)
  await fillStepTwo(page)
  await page.locator('.auth-form button[type="submit"]').last().click()
  await page.locator('.contact-fallback').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})

  const m = await page.evaluate(() => {
    const box = document.querySelector('.contact-fallback')
    if (!box) return null
    const buttons = [...box.querySelectorAll('.contact-fallback__button')].map((b) => b.getBoundingClientRect())
    return {
      buttons: buttons.length,
      inViewport: buttons.every((b) => b.left >= -1 && b.right <= window.innerWidth + 1),
      tappable: buttons.every((b) => b.height >= 40),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  ok(m !== null, 'mobile: the fallback renders')
  ok(m?.buttons === 4, `mobile: all four contact options are present (${m?.buttons})`)
  ok(m?.inViewport, 'mobile: no button spills off the screen')
  ok(m?.tappable, 'mobile: every button is a comfortable tap target')
  ok(m?.overflow <= 2, `mobile: no sideways scroll (${m?.overflow}px)`)
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
