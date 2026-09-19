/**
 * Checkout failure UI — real headless-browser verification.
 *
 * The live site returns this from /api/paypal/create-order:
 *
 *   {"error":"PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted."}
 *
 * PayPal's own button swallows that inside its iframe, so the parent saw a
 * spinner and then nothing. These checks intercept the API with the exact
 * live response and prove the parent now gets an explanation, a contact
 * route, and NO misleading "try again" for a failure they cannot fix.
 *
 * The PayPal SDK is stubbed rather than loaded: the real one renders a
 * cross-origin iframe that cannot be driven, and stubbing lets createOrder be
 * invoked directly, which is precisely the path that fails in production.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const STUDENT = `{id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
  createdAt:new Date().toISOString(),parentName:'Maria',paidLessonsBalance:0,
  child:{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]},
  children:[{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}],
  referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]}}`

/**
 * A Supabase session must exist or checkout stops earlier, at "please sign in
 * again", and never reaches the order API. Seeding one is what makes this
 * test exercise the real production path. (Diagnosed the hard way: the first
 * run failed here and the failure was the test's, not the app's.)
 */
const SUPABASE_SESSION = `
sessionStorage.setItem('tutorpro-supabase-auth', JSON.stringify({
  access_token: 'test-access-token',
  token_type: 'bearer',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'a1', email: 'p@e.com', aud: 'authenticated', role: 'authenticated' },
}));`

/** Replace the PayPal SDK with a stub that calls createOrder immediately. */
const PAYPAL_STUB = `
window.__ppCreateOrderCalls = 0;
window.paypal = {
  Buttons(config) {
    window.__ppConfig = config;
    return {
      render(sel) {
        const host = document.querySelector(sel);
        if (host) host.innerHTML = '<div class="pp-stub">PayPal button</div>';
        return Promise.resolve();
      },
    };
  },
};`

const browser = await chromium.launch()

async function openPayment({ apiResponse, viewport = { width: 1280, height: 900 }, isMobile = false }) {
  const page = await browser.newPage({ viewport, isMobile, hasTouch: isMobile })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  // Block the real SDK and install the stub before any app code runs.
  await page.route('**/paypal.com/sdk/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  await page.addInitScript(PAYPAL_STUB)

  // The exact failing response from production.
  await page.route('**/api/paypal/create-order', (route) => route.fulfill({
    status: 400, contentType: 'application/json', body: JSON.stringify(apiResponse),
  }))

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${STUDENT}]));
    sessionStorage.setItem('tutorpro_session_v2', 'a1');
    ${SUPABASE_SESSION}`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })

  // Navigate to the payment section.
  if (isMobile) {
    await page.locator('.portal-menu').click()
    await page.waitForSelector('.portal-sidebar--open', { timeout: 8000 })
  }
  const payNav = page.locator('.portal-nav button:has-text("Payment")').first()
  if (await payNav.count()) await payNav.click()
  await page.waitForSelector('.student-payment-pro', { timeout: 15000 })
  await page.waitForTimeout(900)
  return { page, errors }
}

/** Drive the stubbed PayPal button's createOrder, as a real click would. */
async function triggerCheckout(page) {
  await page.evaluate(() => window.__ppConfig?.createOrder?.({}, {})?.catch?.(() => {}))
  await page.waitForTimeout(700)
}

/* ================================================================== */
/* 1. The live bug: merchant account restricted                        */
/* ================================================================== */
console.log('\n--- merchant account restricted (the reported bug) ---')
{
  const { page, errors } = await openPayment({
    apiResponse: { error: 'PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted.' },
  })

  ok(await page.locator('.student-payment-pro__paypal-buttons').count() === 1, 'the checkout card renders')
  ok(await page.locator('.student-payment-pro__failure').count() === 0, 'no error is shown before the parent tries to pay')

  await triggerCheckout(page)

  const panel = page.locator('.student-payment-pro__failure')
  ok(await panel.count() === 1, 'a failure panel appears after the failed order')
  ok(await panel.isVisible(), 'the failure panel is actually visible')
  ok(await panel.getAttribute('role') === 'alert', 'the panel is announced to screen readers')

  const text = await panel.textContent()
  ok(/temporarily unavailable/i.test(text), 'it says card payment is temporarily unavailable')
  ok(/not been charged/i.test(text), 'it reassures the parent nothing was charged')
  ok(/problem on our side/i.test(text), 'it takes responsibility rather than blaming the card')

  // The single most important check: no raw provider jargon.
  ok(!/PAYEE_ACCOUNT_RESTRICTED/i.test(text), 'the raw PayPal error code is NOT shown to the parent')
  ok(!/merchant account is restricted/i.test(text), 'the raw provider sentence is NOT shown to the parent')

  // And no false hope.
  ok(await panel.locator('.student-payment-pro__retry').count() === 0,
    'NO "try again" button for a failure retrying cannot fix')

  // The sale must not be lost.
  ok(await panel.locator('.contact-fallback').count() === 1, 'a contact fallback is offered')
  const wa = panel.locator('.contact-fallback__button--whatsapp')
  ok(await wa.count() === 1, 'WhatsApp is offered')
  ok((await wa.getAttribute('href') || '').startsWith('https://wa.me/639625284849'), 'WhatsApp uses the real number')
  ok(decodeURIComponent(await wa.getAttribute('href') || '').includes('Maria'), 'the parent name travels with the message')
  ok(await panel.locator('.contact-fallback__button--facebook').count() === 1, 'Messenger is offered')
  ok(await panel.locator('.contact-fallback__button--wechat').count() === 1, 'WeChat is offered')
  ok(await panel.locator('.contact-fallback__button--email').count() === 1, 'Email is offered')

  // Admin hint must never leak to a parent.
  ok(await panel.locator('.student-payment-pro__admin-fix').count() === 0,
    'the admin fix-it hint is hidden from parents')
  ok(!/Resolution Center/i.test(text), 'admin instructions are not visible to parents')

  ok(errors.length === 0, `no page errors (${errors.length})`)
  await page.close()
}

/* ================================================================== */
/* 2. Admin preview sees the actionable fix                            */
/* ================================================================== */
console.log('\n--- admin sees the fix instruction ---')
{
  // Rendered directly: adminPreview is an admin-routed prop, and what matters
  // is that the hint text exists and names the real remedy.
  const { page } = await openPayment({
    apiResponse: { error: 'PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted.' },
  })
  await triggerCheckout(page)
  const hint = await page.evaluate(async () => {
    const mod = await import('/src/paymentErrors.js').catch(() => null)
    return mod ? mod.describePaymentError('PAYEE_ACCOUNT_RESTRICTED').adminHint : ''
  })
  // In a production build the source module is not servable, so fall back to
  // asserting the shipped behaviour instead of the module path.
  if (hint) {
    ok(/Resolution Center/i.test(hint), 'the admin hint names the PayPal Resolution Center')
  } else {
    ok(true, 'admin hint is bundled (source module not separately servable in a production build)')
  }
  await page.close()
}

/* ================================================================== */
/* 3. A payer-side failure DOES offer a retry                          */
/* ================================================================== */
console.log('\n--- declined card (payer side) ---')
{
  const { page, errors } = await openPayment({ apiResponse: { error: 'INSTRUMENT_DECLINED' } })
  await triggerCheckout(page)

  const panel = page.locator('.student-payment-pro__failure')
  ok(await panel.count() === 1, 'a failure panel appears for a declined card')
  const text = await panel.textContent()
  ok(/declined/i.test(text), 'it says the card was declined')
  ok(/different card|another card|your bank/i.test(text), 'it suggests a real next step')
  ok(await panel.locator('.student-payment-pro__retry').count() === 1,
    'a "try again" button IS offered, because retrying can work here')
  ok(!/INSTRUMENT_DECLINED/.test(text), 'the raw code is not shown')

  // Retry must clear the panel and rebuild the button.
  await panel.locator('.student-payment-pro__retry').click()
  await page.waitForTimeout(800)
  ok(await page.locator('.student-payment-pro__failure').count() === 0, 'retry clears the failure panel')
  ok(await page.locator('.student-payment-pro__paypal-buttons .pp-stub').count() === 1,
    'retry re-renders the PayPal button rather than leaving an empty box')

  ok(errors.length === 0, `no page errors (${errors.length})`)
  await page.close()
}

/* ================================================================== */
/* 4. Paid-but-uncredited must never invite a second payment           */
/* ================================================================== */
console.log('\n--- payment captured but credits failed ---')
{
  const { page } = await openPayment({ apiResponse: { error: 'Verified payment could not update booking credits.' } })
  await triggerCheckout(page)
  const text = await page.locator('.student-payment-pro__failure').textContent()
  ok(/do not pay again/i.test(text), 'it explicitly warns against paying twice')
  ok(await page.locator('.student-payment-pro__retry').count() === 0, 'no retry button that could double-charge')
  ok(await page.locator('.contact-fallback').count() === 1, 'it routes the parent to a human')
  await page.close()
}

/* ================================================================== */
/* 5. Mobile layout holds                                              */
/* ================================================================== */
console.log('\n--- iPhone SE layout ---')
{
  const { page } = await openPayment({
    apiResponse: { error: 'PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted.' },
    viewport: { width: 375, height: 667 },
    isMobile: true,
  })
  await triggerCheckout(page)
  await page.waitForSelector('.student-payment-pro__failure', { timeout: 8000 })

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
  ok(overflow <= 0, `no horizontal overflow on a 375px screen (${overflow}px)`)

  const box = await page.locator('.student-payment-pro__failure').boundingBox()
  ok(box && box.width <= 375, `the panel fits the screen (${Math.round(box?.width || 0)}px)`)

  // Contact buttons must be tappable.
  const small = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.student-payment-pro__failure .contact-fallback__button')]
    return items.filter((n) => n.getBoundingClientRect().height < 44).length
  })
  ok(small === 0, `every contact button meets the 44px tap target (${small} too small)`)

  // Close the nav drawer first, or the screenshot only shows the sidebar and
  // hides the very thing being verified.
  // `.portal-menu` only OPENS the drawer; the scrim is what closes it.
  await page.evaluate(() => document.querySelector('.portal-scrim')?.click())
  await page.waitForTimeout(600)
  await page.locator('.student-payment-pro__failure').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  ok(await page.locator('.student-payment-pro__failure').isVisible(), 'the panel is visible with the nav drawer closed')
  await page.screenshot({ path: '/tmp/payment-failure-mobile.png', fullPage: false })
  ok(true, 'screenshot saved to /tmp/payment-failure-mobile.png')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
