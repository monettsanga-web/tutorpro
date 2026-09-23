/**
 * The new-parent welcome card — real browser verification.
 *
 * The unit tests cover the rules. These prove a parent actually sees the card
 * on their dashboard, that the contact buttons work, and — most importantly —
 * that an established family never sees a "thanks for joining" message.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const DAY = 24 * 60 * 60 * 1000
const LEARNER = `{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}`
const account = (ageDays) => `{id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',
  authProvider:'email',createdAt:new Date(Date.now()-${ageDays}*${DAY}).toISOString(),
  parentName:'Maria Santos',paidLessonsBalance:0,child:${LEARNER},children:[${LEARNER}]}`

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
})

async function openDashboard(ageDays, { mobile = false } = {}) {
  const page = mobile
    ? await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
    : await context.newPage()
  await page.route('**/paypal.com/sdk/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${account(ageDays)}]));
    sessionStorage.setItem('tutorpro_session_v2', 'a1');
    localStorage.removeItem('tutorpro_welcome_dismissed_v1');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(2200)
  return page
}

/* ================================================================== */
console.log('\n--- a brand-new parent sees the welcome ---')
{
  const page = await openDashboard(0)
  const card = page.locator('.welcome-card')
  ok(await card.count() === 1, 'the welcome card appears')
  ok(await card.isVisible(), 'it is actually visible')

  const text = await card.textContent()
  ok(/Maria/.test(text), 'it greets the parent by name')
  ok(/free/i.test(text), 'it mentions the free first class')
  ok(/no card required/i.test(text), 'it reassures that no card is needed')
  ok(/real person/i.test(text), 'it promises a real person will answer')
  ok(/no obligation/i.test(text), 'it removes the pressure to book')
  ok(!/undefined|null/.test(text), 'no placeholder values leak into the copy')

  console.log('\n--- every contact channel is present and correct ---')
  const wa = card.locator('.welcome-card__channel--whatsapp')
  ok(await wa.count() === 1, 'WhatsApp is offered')
  const waHref = await wa.getAttribute('href')
  ok(waHref.startsWith('https://wa.me/639625284849'), 'WhatsApp uses the real number')
  ok(decodeURIComponent(waHref).includes('Maria Santos'), 'the parent name is prefilled into the message')
  ok(decodeURIComponent(waHref).includes('Ana'), "the child's name is prefilled")

  ok(await card.locator('.welcome-card__channel--messenger').getAttribute('href') === 'https://m.me/526047974195321',
    'Messenger uses the real page link')
  ok((await card.locator('.welcome-card__channel--email').getAttribute('href')).includes('sejongenglish@yahoo.com'),
    'Email uses the real address')

  // WeChat and KakaoTalk have no dependable deep link, so they must copy.
  const wc = card.locator('.welcome-card__channel--wechat')
  ok(await wc.evaluate((n) => n.tagName) === 'BUTTON', 'WeChat is a button, not a link that would fail')
  await wc.click()
  await page.waitForTimeout(400)
  ok(await page.evaluate(() => navigator.clipboard.readText()) === 't_cora', 'WeChat copies the exact ID')

  const kk = card.locator('.welcome-card__channel--kakao')
  ok(await kk.evaluate((n) => n.tagName) === 'BUTTON', 'KakaoTalk is a button')
  await kk.click()
  await page.waitForTimeout(400)
  ok(await page.evaluate(() => navigator.clipboard.readText()) === '+639625284849', 'KakaoTalk copies the exact number')

  console.log('\n--- dismissing it works, and sticks ---')
  await card.locator('.welcome-card__close').click()
  await page.waitForTimeout(500)
  ok(await page.locator('.welcome-card').count() === 0, 'dismissing hides the card')
  // The hash route restores the dashboard directly after a reload, so there
  // is no "My dashboard" button to press — waiting for one times out.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(2200)
  ok(await page.locator('.welcome-card').count() === 0, 'it stays dismissed after a reload')
  await page.close()
}

/* ================================================================== */
console.log('\n--- an established family must NEVER see it ---')
{
  const page = await openDashboard(400)
  ok(await page.locator('.welcome-card').count() === 0, 'a 400-day-old account sees no welcome')
  const body = await page.locator('body').textContent()
  ok(!/Thanks for joining us/i.test(body), 'the "thanks for joining" wording appears nowhere')
  ok(await page.locator('.student-welcome').count() === 1, 'the normal dashboard still renders')
  await page.close()
}

/* ================================================================== */
console.log('\n--- the rest of the dashboard is untouched ---')
{
  const page = await openDashboard(1)
  ok(await page.locator('.student-welcome').count() === 1, 'the usual welcome section still renders')
  ok(await page.locator('.student-payment-pro').count() === 1, 'the payment section still renders')
  ok(await page.locator('.portal-nav').count() === 1, 'navigation still renders')
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.waitForTimeout(600)
  ok(errors.length === 0, `no page errors (${errors.length})`)
  await page.close()
}

/* ================================================================== */
console.log('\n--- mobile ---')
{
  const page = await openDashboard(0, { mobile: true })
  await page.evaluate(() => document.querySelector('.portal-scrim')?.click())
  await page.waitForTimeout(500)
  ok(await page.locator('.welcome-card').count() === 1, 'the card renders on a phone')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(overflow <= 0, `no horizontal overflow at 375px (${overflow}px)`)
  const small = await page.evaluate(() => [...document.querySelectorAll('.welcome-card__channel')]
    .filter((n) => n.getBoundingClientRect().height < 44).length)
  ok(small === 0, `every channel button meets the 44px tap target (${small} too small)`)
  const closeBox = await page.locator('.welcome-card__close').boundingBox()
  ok(closeBox && closeBox.width >= 32, 'the dismiss button is reachable on mobile')
  await page.screenshot({ path: '/tmp/welcome-mobile.png' })
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
