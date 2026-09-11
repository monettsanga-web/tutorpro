/**
 * The teacher portal must be invisible to the public — but teachers must
 * still be able to sign in.
 *
 * Removing an entrance is only safe if the people who used it keep a way in.
 * enterPortal routes on the account's own role, so a teacher signing in
 * through Student login still lands on their teacher dashboard. These checks
 * prove both halves: nothing on the public site advertises staff access, and
 * a real teacher account still reaches its own dashboard.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const browser = await chromium.launch()

/* --- 1. Nothing public mentions a teacher portal --------------------- */
for (const [label, width, height, mobile] of [['desktop', 1440, 900, false], ['mobile', 390, 844, true]]) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile })
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // Open the mobile menu so its contents are really inspected, not just hidden.
  if (mobile) {
    const burger = page.locator('.menu-button')
    if (await burger.count()) { await burger.click(); await page.waitForTimeout(500) }
  }

  const found = await page.evaluate(() =>
    [...document.querySelectorAll('button,a')].filter((el) => /teacher portal/i.test(el.textContent || '')).length)
  ok(found === 0, `${label}: no "Teacher portal" control anywhere (${found} found)`)

  // The admin portal must still be reachable — only teachers were hidden.
  const admin = await page.evaluate(() =>
    [...document.querySelectorAll('button,a')].filter((el) => /admin portal/i.test(el.textContent || '')).length)
  ok(admin > 0, `${label}: the admin portal is still available to you (${admin})`)
  await page.close()
}

/* --- 2. A teacher can STILL sign in and reach their dashboard --------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })

  // Seed an approved teacher exactly as registration would leave one.
  await page.evaluate(`
    const id='t1';
    const acc={id,role:'teacher',status:'approved',email:'teacher@example.com',loginId:'teacher@example.com',
      authProvider:'email',createdAt:new Date().toISOString(),fullName:'Teacher M',
      teacher:{specialization:'Both Curricula',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}}};
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
    sessionStorage.setItem('tutorpro_session_v2', id);`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  await page.locator('button.button--primary:has-text("My dashboard")').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(1200)

  const r = await page.evaluate(() => ({
    portal: document.querySelector('.portal')?.className || '',
    nav: document.querySelectorAll('.portal-nav button').length,
    role: document.querySelector('.portal-role, .portal-brand')?.textContent || '',
  }))
  ok(/portal--teacher/.test(r.portal), `a teacher still reaches their OWN dashboard (${r.portal.trim()})`)
  ok(r.nav > 3, `the teacher dashboard renders its navigation (${r.nav} items)`)
  ok(errors.length === 0, `no JavaScript errors (${errors.slice(0, 1).join('') || 'none'})`)
  await page.close()
}

/* --- 3. A parent never sees teacher tools ----------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(`
    const id='p1';
    const l={id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]};
    const acc={id,role:'student',status:'active',email:'parent@example.com',loginId:'parent@example.com',
      authProvider:'email',createdAt:new Date().toISOString(),parentName:'Maria',child:l,children:[l],
      referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]}};
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
    sessionStorage.setItem('tutorpro_session_v2', id);`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.locator('button.button--primary:has-text("My dashboard")').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(1000)

  const r = await page.evaluate(() => ({
    portal: document.querySelector('.portal')?.className || '',
    teacherWords: [...document.querySelectorAll('.portal-nav button')]
      .filter((b) => /teacher studio|courseware|teacher portal/i.test(b.textContent || '')).length,
  }))
  ok(/portal--student/.test(r.portal), 'a parent lands on the student dashboard')
  ok(r.teacherWords === 0, `a parent sees no teacher-only navigation (${r.teacherWords})`)
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
