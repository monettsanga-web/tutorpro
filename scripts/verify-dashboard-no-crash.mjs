/**
 * The dashboard must survive an account with missing name fields.
 *
 * THE BUG THIS EXISTS FOR
 * -----------------------
 * `account.parentName.split(' ')[0]` ran while rendering the student
 * overview. For any account without a parentName that threw, the error
 * boundary swallowed the whole dashboard, and the parent saw:
 *
 *     "Something didn't load correctly."
 *
 * The payment section is INSIDE that dashboard, so the PayPal button never
 * rendered at all. The reported symptom was "the payment button is not
 * working"; the actual cause was the entire page crashing before the button
 * existed. That is why this test loads the dashboard rather than the button.
 *
 * Real Supabase accounts store the name in `profile_data`, so a row where
 * that is empty produces exactly this shape.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const LEARNER = `{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}`

/** Accounts that previously crashed the dashboard. */
const CASES = [
  {
    name: 'student with NO parentName (the live crash)',
    role: 'student',
    account: `{id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
      createdAt:new Date().toISOString(),paidLessonsBalance:0,
      child:${LEARNER},children:[${LEARNER}]}`,
  },
  {
    name: 'student with an empty parentName',
    role: 'student',
    account: `{id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
      createdAt:new Date().toISOString(),parentName:'',paidLessonsBalance:0,
      child:${LEARNER},children:[${LEARNER}]}`,
  },
  {
    name: 'student with a null parentName',
    role: 'student',
    account: `{id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
      createdAt:new Date().toISOString(),parentName:null,paidLessonsBalance:0,
      child:${LEARNER},children:[${LEARNER}]}`,
  },
  {
    name: 'teacher with NO fullName',
    role: 'teacher',
    account: `{id:'a1',role:'teacher',status:'approved',email:'t@e.com',loginId:'t@e.com',authProvider:'email',
      createdAt:new Date().toISOString(),
      teacher:{specialization:'Both',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}}}`,
  },
]

const browser = await chromium.launch()

for (const testCase of CASES) {
  console.log(`\n--- ${testCase.name} ---`)
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  const crashes = []
  page.on('pageerror', (e) => crashes.push(String(e.message)))
  page.on('console', (m) => { if (m.type() === 'error' && /split|undefined|null/i.test(m.text())) crashes.push(m.text().slice(0, 160)) })

  // Keep PayPal out of it: this test is about the dashboard rendering.
  await page.route('**/paypal.com/sdk/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${testCase.account}]));
    sessionStorage.setItem('tutorpro_session_v2', 'a1');`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForTimeout(3500)

  const body = (await page.locator('body').textContent()) || ''

  // The headline assertion: the recovery screen must NOT appear.
  ok(!/Something didn.t load correctly/i.test(body), 'the dashboard does not fall back to the recovery screen')
  ok(await page.locator('.portal-nav').count() === 1, 'the dashboard navigation renders')

  const splitCrash = crashes.filter((c) => /reading .split.|is not a function/i.test(c))
  ok(splitCrash.length === 0, `no name-splitting crash (${splitCrash[0] || 'none'})`)

  // A missing name must never print as "undefined" at the parent.
  ok(!/Welcome back, undefined|Good day, undefined|Welcome back, null/i.test(body),
    'no "undefined" or "null" leaks into the greeting')

  if (testCase.role === 'student') {
    // The payment gateway sits on the Overview page itself, not behind its own
    // tab, so it is already on screen — which is exactly why the crash took
    // the payment button down with the rest of the dashboard.
    ok(await page.locator('.student-payment-pro').count() === 1, 'the payment section renders')
    ok(await page.locator('.student-payment-pro__paypal-buttons').count() === 1,
      'the PayPal button container renders (it could not before this fix)')
  }

  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
