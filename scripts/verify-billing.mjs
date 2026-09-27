/**
 * Billing a family for class sessions — real browser verification.
 *
 * Three things have to be true at once and only a browser shows all three:
 *   1. The admin types a session count and gets the right total for THAT
 *      family, and sending it writes a bill onto the student's account.
 *   2. The parent sees an amount due with a pay button, and pressing pay
 *      asks the server for the BILLED amount, not a weekly plan.
 *   3. A family with no bill sees no trace of one.
 *
 * PayPal itself is stubbed: the point is to prove our wiring, not theirs.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const LEARNER = `{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}`

/* Real account ids are UUIDs, and the cloud write rejects anything else. */
const STUDENT_ID = '11111111-1111-4111-8111-111111111111'
const ADMIN_ID = '22222222-2222-4222-8222-222222222222'

const student = (extra = '') => `{id:'${STUDENT_ID}',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',
  authProvider:'email',createdAt:new Date(Date.now()-400*86400000).toISOString(),parentName:'Maria Santos',
  paidLessonsBalance:2,preferredBillingPlan:'monthly',preferredWeeklySessions:4,
  ${extra}child:${LEARNER},children:[${LEARNER}]}`

const admin = `{id:'${ADMIN_ID}',role:'admin',status:'active',email:'m@y.com',loginId:'m@y.com',authProvider:'email',
  createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin'}`

/* A stub PayPal SDK that hands us the callbacks the app registered.
   Installed BEFORE the app boots: the dashboard only downloads the real SDK
   when window.paypal is missing, so this keeps the test off PayPal's network
   entirely while still exercising our own createOrder wiring. */
const STUB_SDK = `
  window.paypal = {
    Buttons(options) {
      window.__paypalOptions = options;
      return {
        render(selector) {
          const host = document.querySelector(selector);
          if (host) host.innerHTML = '<button type="button" id="stub-paypal">Pay with PayPal</button>';
          return Promise.resolve();
        },
      };
    },
  };`

const browser = await chromium.launch()

async function open(accountsJs, sessionId) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  await page.addInitScript(STUB_SDK)
  await page.route('**/paypal.com/**', (route) => route.abort())
  // The real database is never touched by a test. The cloud write is stubbed
  // as succeeding, because failing it is a different scenario entirely.
  await page.route('**/auth/v1/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: sessionId, aud: 'authenticated', role: 'authenticated', email: 'p@e.com' }),
  }))
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: STUDENT_ID, status: 'active', role: 'student' }),
  }))
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  // A signed-in Supabase session, so the pay button gets as far as calling
  // our own server. Nothing leaves the machine: the auth and profile
  // endpoints are stubbed above.
  await page.evaluate(`
    sessionStorage.setItem('tutorpro-supabase-auth', JSON.stringify({
      access_token: 'test-access-token', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test-refresh',
      user: { id: '${sessionId}', aud: 'authenticated', role: 'authenticated', email: 'p@e.com', created_at: new Date().toISOString() },
    }));
    window.__studentId = '${STUDENT_ID}';
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${accountsJs}]));
    sessionStorage.setItem('tutorpro_session_v2', '${sessionId}');
    sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');
    localStorage.removeItem('tutorpro_welcome_dismissed_v1');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.evaluate(`window.__studentId = '${STUDENT_ID}'`)
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(2000)
  return page
}

/* ================================================================== */
console.log('\n--- the admin bills a family for a block of sessions ---')
{
  const page = await open(`${admin},${student()}`, ADMIN_ID)
  await page.locator('.portal-nav button:has-text("Payments")').first().click()
  await page.waitForSelector('.admin-bill-card', { timeout: 15000 })
  await page.waitForTimeout(600)

  const card = page.locator('.admin-bill-card')
  ok(await card.count() === 1, 'the billing panel is on the Payments page')
  ok(/Charge for a set number of class sessions/.test(await card.innerText()), 'it explains itself in plain words')

  const sessions = card.locator('input[name="sessions"]')
  const amount = card.locator('input[name="amount"]')
  ok(await sessions.count() === 1 && await amount.count() === 1, 'there is a session box and an amount box')

  // 4 sessions at the package rate = $28
  await sessions.fill('4')
  await page.waitForTimeout(400)
  ok(await amount.inputValue() === '28.00', `4 sessions totals $28.00 automatically (got ${await amount.inputValue()})`)

  await sessions.fill('12')
  await page.waitForTimeout(400)
  ok(await amount.inputValue() === '84.00', `typing 12 sessions retotals to $84.00 (got ${await amount.inputValue()})`)
  const preview = await page.locator('.admin-bill-preview').innerText()
  ok(/\$7\.00/.test(preview) && /\$84\.00/.test(preview), `the preview shows the rate and the total (${preview.replace(/\s+/g, ' ').slice(0, 90)}…)`)
  ok(/12 booking credits/.test(preview), 'and says how many credits the parent receives')

  // 3 sessions must drop back to the standard $8 rate.
  await sessions.fill('3')
  await page.waitForTimeout(400)
  ok(await amount.inputValue() === '24.00', `3 sessions is $24.00 at the standard rate (got ${await amount.inputValue()})`)

  await sessions.fill('12')
  await page.waitForTimeout(300)
  await card.locator('input[name="note"]').fill('October block booking')
  await card.locator('button[type="submit"]').click()
  await page.waitForTimeout(1200)

  const stored = await page.evaluate(() => {
    const accounts = JSON.parse(localStorage.getItem('tutorpro_accounts_v2') || '[]')
    return accounts.find((a) => a.id === window.__studentId)?.paymentRequest || null
  })
  ok(Boolean(stored), 'the bill is saved onto the student account')
  ok(stored?.sessions === 12 && stored?.amount === 84, `it records 12 sessions at $84 (got ${stored?.sessions} / ${stored?.amount})`)
  ok(stored?.status === 'open', 'it starts unpaid')
  ok(stored?.note === 'October block booking', 'the note for the parent is saved')
  ok(/has been billed \$84\.00/.test(await page.locator('.admin-bill-card .portal-success').innerText()), 'the admin is told what was sent')
  ok(/Maria Santos/.test(await page.locator('.admin-bill-card .admin-discount-list').innerText()), 'the family is listed as awaiting payment')

  /* --- overriding the calculated total ------------------------------- */
  await amount.fill('50')
  await page.waitForTimeout(300)
  const overridePreview = await page.locator('.admin-bill-preview').innerText()
  ok(/charging \$50\.00/.test(overridePreview.replace(/\s+/g, ' ')), 'a manual total is echoed back before sending')
  ok(/\$34\.00 less/.test(overridePreview.replace(/\s+/g, ' ')), 'and the difference from the calculated price is spelled out')
  await page.locator('.admin-bill-card button:has-text("Use the calculated total")').click()
  await page.waitForTimeout(300)
  ok(await amount.inputValue() === '84.00', 'the calculated total can be restored in one click')

  /* --- refusing an impossible bill ----------------------------------- */
  // The browser itself blocks $0 before our code ever runs.
  ok(await amount.getAttribute('min') === '1', 'the amount box cannot be set below $1')
  ok(await sessions.getAttribute('min') === '1', 'the session box cannot be set below 1')
  await amount.fill('0')
  await card.locator('button[type="submit"]').click()
  await page.waitForTimeout(600)
  const stillOpen = await page.evaluate(() => {
    const accounts = JSON.parse(localStorage.getItem('tutorpro_accounts_v2') || '[]')
    return accounts.find((a) => a.id === window.__studentId)?.paymentRequest?.amount
  })
  ok(stillOpen === 84, `a $0 bill is never sent — the previous one is untouched (still $${stillOpen})`)

  // A figure the browser accepts but we refuse.
  await amount.fill('999999')
  await card.locator('button[type="submit"]').click()
  await page.waitForTimeout(700)
  const refusal = await page.locator('.admin-bill-card .portal-error').innerText()
  ok(/largest/.test(refusal), `an absurd total is refused with the reason (${refusal.slice(0, 70)})`)
  await amount.fill('')
  await page.waitForTimeout(300)

  /* --- withdrawing a bill -------------------------------------------- */
  await page.locator('.admin-bill-card button:has-text("Cancel bill")').click()
  await page.waitForTimeout(1000)
  const afterCancel = await page.evaluate(() => {
    const accounts = JSON.parse(localStorage.getItem('tutorpro_accounts_v2') || '[]')
    return accounts.find((a) => a.id === window.__studentId)?.paymentRequest?.status || ''
  })
  ok(afterCancel === 'cancelled', 'cancelling withdraws the bill without charging anything')
  await page.locator('.admin-bill-card').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'screenshots/billing-admin.png' })
  await page.close()
}

/* ================================================================== */
console.log('\n--- the parent sees the amount due and can pay it ---')
{
  const bill = `paymentRequest:{id:'pr-1',sessions:12,amount:84,rate:7,note:'October block booking',status:'open',createdAt:new Date().toISOString(),createdBy:'admin'},`
  const page = await open(student(bill), STUDENT_ID)
  await page.waitForSelector('.student-payment-pro', { timeout: 15000 })
  await page.waitForTimeout(600)

  const panel = page.locator('.student-bill-panel')
  ok(await panel.count() === 1, 'the amount due is shown on the parent dashboard')
  const panelText = (await panel.innerText()).replace(/\s+/g, ' ')
  ok(/\$84\.00/.test(panelText), `it shows the amount (${panelText.slice(0, 80)}…)`)
  ok(/12 class sessions/.test(panelText), 'it says what the amount is for')
  ok(/\$7\.00( USD)? each/.test(panelText), 'it shows the price per session')
  ok(/12 booking credits/.test(panelText), 'it says what the parent receives')
  ok(/October block booking/.test(panelText), 'the admin note is passed on')

  const header = (await page.locator('.student-payment-pro__header').innerText()).replace(/\s+/g, ' ')
  ok(/amount due/i.test(header) && /\$84\.00/.test(header), `the headline figure is the bill (${header.slice(0, 90)}…)`)
  ok(/payment requested by tutorpro/i.test(header), 'the parent is told the school asked for it')

  const summary = (await page.locator('.student-payment-pro__summary-panel').innerText()).replace(/\s+/g, ' ')
  ok(/Current booking credits 2/.test(summary), 'the current credit balance is shown')
  ok(/Credits after this payment 14/.test(summary), 'and what it becomes after paying')

  /* --- pressing pay must ask for the BILLED amount -------------------- */
  let requestBody = null
  await page.route('**/api/paypal/create-order', async (route) => {
    requestBody = JSON.parse(route.request().postData() || '{}')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orderId: 'TEST-ORDER' }) })
  })
  const created = await page.evaluate(async () => {
    try { return await window.__paypalOptions.createOrder() } catch (error) { return `ERROR: ${error.message}` }
  })
  ok(requestBody !== null, 'pressing pay reaches our own server first')
  ok(requestBody?.billingPlan === 'invoice', `it asks for the billed amount, not a weekly plan (sent "${requestBody?.billingPlan}")`)
  ok(requestBody?.accountId === STUDENT_ID, 'it names the logged-in account')
  ok(!('amount' in (requestBody || {})), 'the browser never sends an amount — the server reads it from the profile')
  ok(created === 'TEST-ORDER', 'the PayPal order id is handed back to the button')

  /* --- the parent can still choose a package instead ------------------ */
  await page.locator('.student-bill-panel__choice button:has-text("Choose a package myself")').click()
  await page.waitForTimeout(900)
  ok(await page.locator('.student-payment-pro__package-grid').count() === 1, 'the normal package picker is one click away')
  requestBody = null
  await page.evaluate(() => window.__paypalOptions.createOrder())
  await page.waitForTimeout(400)
  ok(requestBody?.billingPlan === 'monthly', `choosing a package charges the package again (sent "${requestBody?.billingPlan}")`)

  await page.locator('.student-bill-panel__choice button:has-text("Pay this amount")').click()
  await page.waitForTimeout(900)
  requestBody = null
  await page.evaluate(() => window.__paypalOptions.createOrder())
  await page.waitForTimeout(400)
  ok(requestBody?.billingPlan === 'invoice', 'and they can switch back to the bill')

  /* --- the selected choice must be unmistakable ---------------------- */
  const choiceColours = await page.$$eval('.student-bill-panel__choice button', (nodes) => nodes.map((n) => ({
    active: n.classList.contains('active'),
    background: getComputedStyle(n).backgroundColor,
    colour: getComputedStyle(n).color,
  })))
  const chosen = choiceColours.find((c) => c.active)
  const other = choiceColours.find((c) => !c.active)
  ok(chosen && other && chosen.background !== other.background, `the selected option looks different from the other (${chosen?.background} vs ${other?.background})`)
  const amountColour = await page.$eval('.student-bill-panel__amount', (n) => getComputedStyle(n).color)
  ok(amountColour !== 'rgb(255, 255, 255)', `the amount is not white-on-white (${amountColour})`)

  await page.screenshot({ path: 'screenshots/billing-parent.png' })
  await page.close()
}

/* ================================================================== */
console.log('\n--- a paid bill stops asking for money ---')
{
  const paid = `paymentRequest:{id:'pr-1',sessions:12,amount:84,rate:7,status:'paid',paidAt:new Date().toISOString(),paidAmount:84,orderId:'ORD-9'},`
  const page = await open(student(paid), STUDENT_ID)
  await page.waitForSelector('.student-payment-pro', { timeout: 15000 })
  await page.waitForTimeout(500)
  ok(await page.locator('.student-bill-panel--paid').count() === 1, 'the parent sees a paid confirmation')
  const text = (await page.locator('.student-payment-pro').innerText()).replace(/\s+/g, ' ')
  ok(/Paid — thank you/.test(text), 'it thanks them rather than asking again')
  ok(!/Amount due \$84/.test(text), 'the amount due is gone')
  ok(await page.locator('.student-payment-pro__package-grid').count() === 1, 'normal package checkout is available again')
  await page.close()
}

/* ================================================================== */
console.log('\n--- a family with no bill sees no trace of one ---')
{
  const page = await open(student(), STUDENT_ID)
  await page.waitForSelector('.student-payment-pro', { timeout: 15000 })
  await page.waitForTimeout(500)
  ok(await page.locator('.student-bill-panel').count() === 0, 'no bill panel')
  const text = (await page.locator('.student-payment-pro').innerText()).replace(/\s+/g, ' ')
  ok(!/payment requested by tutorpro/i.test(text), 'no mention of a requested payment')
  ok(/Choose your lesson package/.test(text), 'the normal checkout is unchanged')
  ok(/112\.00/.test(text), 'and still quotes the monthly package price')
  await page.close()
}

/* ================================================================== */
console.log('\n--- a discounted family is billed at THEIR rate ---')
{
  const page = await open(`${admin},${student(`pricing:{mode:'percent',percent:25,grantedAt:new Date().toISOString()},`)}`, ADMIN_ID)
  await page.locator('.portal-nav button:has-text("Payments")').first().click()
  await page.waitForSelector('.admin-bill-card', { timeout: 15000 })
  await page.waitForTimeout(600)
  await page.locator('.admin-bill-card input[name="sessions"]').fill('12')
  await page.waitForTimeout(400)
  const amount = await page.locator('.admin-bill-card input[name="amount"]').inputValue()
  ok(amount === '63.00', `12 sessions for a family on 25% off totals $63.00 (got ${amount})`)
  ok(/agreed rate/.test(await page.locator('.admin-bill-preview').innerText()), 'the admin is told it used their agreed rate')
  await page.close()
}

/* ================================================================== */
console.log('\n--- the admin can bill from a phone ---')
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await page.addInitScript(STUB_SDK)
  await page.route('**/paypal.com/**', (route) => route.abort())
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: STUDENT_ID, status: 'active', role: 'admin' }) }))
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${admin},${student()}]));
    sessionStorage.setItem('tutorpro_session_v2', '${ADMIN_ID}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(1500)
  const menu = page.locator('.portal-menu')
  if (await menu.count()) { await menu.first().click(); await page.waitForTimeout(500) }
  await page.locator('.portal-nav button:has-text("Payments")').first().click()
  await page.waitForTimeout(700)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(400) }
  await page.waitForSelector('.admin-bill-card', { timeout: 15000 })
  await page.locator('.admin-bill-card').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)

  ok(await page.locator('.admin-bill-card input[name="sessions"]').isVisible(), 'the session box is usable on a phone')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(overflow <= 1, `the billing panel does not push the admin page sideways (overflow ${overflow}px)`)
  const boxHeight = await page.$eval('.admin-bill-card input[name="sessions"]', (n) => n.getBoundingClientRect().height)
  ok(boxHeight >= 40, `the inputs are big enough to tap (${Math.round(boxHeight)}px)`)
  await page.screenshot({ path: 'screenshots/billing-admin-mobile.png' })
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
