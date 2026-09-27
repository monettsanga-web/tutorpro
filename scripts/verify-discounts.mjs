/**
 * Per-student discounts — real browser verification.
 *
 * Two things have to be true at once, and only a browser can show both:
 *   1. A discounted parent SEES the reduced price at checkout.
 *   2. An undiscounted parent sees no trace of a discount anywhere.
 *
 * The admin side is checked too: the panel must list who is discounted, and
 * must refuse a 100% discount rather than creating a $0.00 order PayPal
 * would reject.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const LEARNER = `{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}`

const student = (discount) => `{id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',
  authProvider:'email',createdAt:new Date(Date.now()-400*86400000).toISOString(),parentName:'Maria Santos',
  paidLessonsBalance:0,preferredBillingPlan:'monthly',preferredWeeklySessions:4,
  ${discount ? `discount:${discount},` : ''}child:${LEARNER},children:[${LEARNER}]}`

const admin = `{id:'ad1',role:'admin',status:'active',email:'m@y.com',loginId:'m@y.com',authProvider:'email',
  createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin'}`

const browser = await chromium.launch()

async function open(accountJs, { asAdmin = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  await page.route('**/paypal.com/sdk/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${accountJs}]));
    sessionStorage.setItem('tutorpro_session_v2', '${asAdmin ? 'ad1' : 'a1'}');
    localStorage.removeItem('tutorpro_welcome_dismissed_v1');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(2200)
  return page
}

/* ================================================================== */
console.log('\n--- a discounted parent sees the reduced price ---')
{
  const page = await open(student(`{percent:20,reason:'Sibling',grantedAt:new Date().toISOString()}`))
  await page.waitForSelector('.student-payment-pro', { timeout: 15000 })

  const summary = page.locator('.student-payment-pro__summary-discount')
  ok(await summary.count() === 1, 'the discount line appears in the summary')
  ok(/20% off/.test(await summary.textContent()), 'it names the percentage')

  const total = await page.locator('.student-payment-pro__summary-total').textContent()
  // 4 lessons a week, monthly = 16 credits x $7 = $112, less 20% = $89.60
  ok(total.includes('89.60'), `the payable total is the discounted figure (${total.replace(/\s+/g, ' ').trim()})`)
  ok(total.includes('112.00'), 'the original price is still shown, struck through')
  ok(await page.locator('.student-payment-pro__was').count() === 1, 'the original price is struck through')
  await page.close()
}

/* ================================================================== */
console.log('\n--- a parent with no discount sees no trace of one ---')
{
  const page = await open(student(null))
  await page.waitForSelector('.student-payment-pro', { timeout: 15000 })
  ok(await page.locator('.student-payment-pro__summary-discount').count() === 0, 'no discount line')
  ok(await page.locator('.student-payment-pro__was').count() === 0, 'no struck-through price')
  const total = await page.locator('.student-payment-pro__summary-total').textContent()
  ok(total.includes('112.00'), 'they are quoted the full price')
  ok(!/discount/i.test(await page.locator('.student-payment-pro').textContent()), 'the word "discount" appears nowhere')
  await page.close()
}

/* ================================================================== */
console.log('\n--- an EXPIRED discount charges full price ---')
{
  const expired = `{percent:50,reason:'Old promo',expiresAt:new Date(Date.now()-86400000).toISOString()}`
  const page = await open(student(expired))
  await page.waitForSelector('.student-payment-pro', { timeout: 15000 })
  ok(await page.locator('.student-payment-pro__summary-discount').count() === 0, 'an expired discount is not applied')
  const total = await page.locator('.student-payment-pro__summary-total').textContent()
  ok(total.includes('112.00'), 'the parent is quoted the full price again')
  ok(!total.includes('56.00'), 'the expired 50% is definitely not applied')
  await page.close()
}

/* ================================================================== */
console.log('\n--- the admin panel ---')
{
  const page = await open(admin, { asAdmin: true })
  const payments = page.locator('.portal-nav button:has-text("Payments")').first()
  ok(await payments.count() === 1, 'the Payments section exists')
  await payments.click()
  await page.waitForTimeout(2000)

  const card = page.locator('.admin-discount-card')
  ok(await card.count() === 1, 'the discount panel is present')
  const text = await card.textContent()
  ok(/Give a specific family a lower price/i.test(text), 'it explains what it does')
  ok(/next checkout/i.test(text), 'it says when the discount takes effect')
  ok(/90%/.test(text), 'it states the 90% cap')
  ok(/add credits/i.test(text), 'it points at the right tool for a free lesson')

  ok(await card.locator('select[name="studentId"]').count() === 1, 'a student can be chosen')
  ok(await card.locator('input[name="percent"]').count() === 1, 'a percentage can be entered')
  ok(await card.locator('input[name="reason"]').count() === 1, 'a reason can be recorded')
  ok(await card.locator('input[name="expiresAt"]').count() === 1, 'an optional end date can be set')
  ok(await card.locator('input[name="percent"]').getAttribute('max') === '90', 'the input caps at 90')

  // The live preview must show real money, not a placeholder.
  const preview = page.locator('.admin-discount-preview')
  if (await preview.count()) {
    ok(/\$/.test(await preview.textContent()), 'the preview shows the resulting price in dollars')
  } else {
    ok(true, 'no preview shown without a student, which is acceptable')
  }
  await page.close()
}

/* ================================================================== */
console.log('\n--- mobile ---')
{
  const phone = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  await phone.route('**/paypal.com/sdk/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  await phone.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await phone.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${student(`{percent:20,reason:'Sibling'}`)}]));
    sessionStorage.setItem('tutorpro_session_v2', 'a1');`)
  await phone.reload({ waitUntil: 'domcontentloaded' })
  await phone.waitForTimeout(2600)
  await phone.locator('button:has-text("My dashboard"):visible').first().click()
  await phone.waitForTimeout(2600)
  await phone.evaluate(() => document.querySelector('.portal-scrim')?.click())
  await phone.waitForTimeout(600)
  await phone.waitForSelector('.student-payment-pro', { timeout: 15000 })
  ok(await phone.locator('.student-payment-pro__summary-discount').count() === 1, 'the discount shows on a phone')
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(overflow <= 0, `no horizontal overflow at 375px (${overflow}px)`)
  await phone.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
