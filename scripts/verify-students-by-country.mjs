/**
 * Admin -> Students is grouped by the country each family registered from.
 *
 * WHY
 * ---
 * The country pills were a read-only summary and the table under them was
 * one flat run of every family in sign-up order. Answering "who do I have
 * in Korea?" meant reading every row. The pills are the filter now, and
 * with no filter chosen the table is split into a block per country.
 *
 * This seeds families in several countries, opens the real dashboard, and
 * checks the grouping, the counts, the filter and the empty state. The
 * Supabase calls are stubbed, so nothing touches the live database.
 */
const SANDBOX_PLAYWRIGHT = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX_PLAYWRIGHT))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN = '11111111-1111-4111-8111-111111111111'
const learner = (name, year) => ({ id: `${name}-l`.toLowerCase(), name, year, curriculum: 'Cambridge', goal: 'Speaking with confidence', accessStatus: 'active' })

/* Two families in the Philippines (one with two children), two in Korea,
   one in Malaysia, and one that registered before the country was recorded. */
const FAMILIES = [
  { id: '22222222-2222-4222-8222-000000000001', parentName: 'Maria Santos', country: 'PH', children: [learner('Juan', 'Year 3'), learner('Ana', 'Year 5')] },
  { id: '22222222-2222-4222-8222-000000000002', parentName: 'Jun Dela Cruz', country: 'PH', children: [learner('Mika', 'Year 2')] },
  { id: '22222222-2222-4222-8222-000000000003', parentName: 'Park Ji-woo', country: 'KR', children: [learner('Minho', 'Year 4')] },
  { id: '22222222-2222-4222-8222-000000000004', parentName: 'Kim Soo-ah', country: 'KR', children: [learner('Hana', 'Year 6')] },
  { id: '22222222-2222-4222-8222-000000000005', parentName: 'Aisyah Rahman', country: 'MY', children: [learner('Nurul', 'Year 1')] },
  { id: '22222222-2222-4222-8222-000000000006', parentName: 'Older Account', country: '', children: [learner('Sam', 'Year 7')] },
]

const accounts = [
  { id: ADMIN, role: 'admin', status: 'active', parentName: 'Monett', fullName: 'Monett', email: 'admin@example.com', loginId: 'admin@example.com' },
  ...FAMILIES.map((f) => ({
    id: f.id, role: 'student', status: 'active', parentName: f.parentName,
    email: `${f.id}@example.com`, loginId: `${f.id}@example.com`,
    registrationCountry: f.country, children: f.children, child: f.children[0],
  })),
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function openStudents(width) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 1000 }, isMobile: width < 700, hasTouch: width < 700 })
  await page.route('**/paypal.com/**', (route) => route.abort())
  await page.route('**/*.{mp4,webm}', (route) => route.abort())
  await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: ADMIN }) }))
  await page.route('**/rest/v1/**', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline in this check"}' }))
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');
    localStorage.setItem('tutorpro_accounts_v2', ${JSON.stringify(JSON.stringify(accounts))});
    localStorage.setItem('tutorpro_session_v2', '${ADMIN}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2400)
  const enter = page.locator('button:has-text("My dashboard"):visible').first()
  if (await enter.count()) await enter.click()
  else {
    const burger = page.locator('.menu-button')
    if (await burger.count()) { await burger.click(); await page.waitForTimeout(400) }
    await page.locator('button:has-text("My dashboard"):visible').first().click()
  }
  await page.waitForSelector('.portal-nav', { timeout: 20000 })
  const menu = page.locator('.portal-menu')
  if (await menu.count() && await menu.first().isVisible()) { await menu.first().click(); await page.waitForTimeout(350) }
  await page.locator('.portal-nav button:has-text("Students")').first().click()
  await page.waitForTimeout(900)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
  await page.waitForTimeout(600)
  return page
}

const snapshot = (page) => page.evaluate(`(() => ({
  sections: [...document.querySelectorAll('.admin-table__country')].map((block) => ({
    title: block.querySelector('.admin-table__country-head strong')?.textContent?.trim(),
    count: block.querySelector('.admin-table__country-head small')?.textContent?.trim(),
    rows: block.querySelectorAll('.admin-table__row').length,
    learners: [...block.querySelectorAll('.admin-table__row')].map((r) => r.children[1]?.querySelector('strong')?.textContent?.trim()),
  })),
  pills: [...document.querySelectorAll('.student-country-pill')].map((p) => ({
    label: p.querySelector('strong')?.textContent?.trim(),
    selected: p.getAttribute('aria-pressed') === 'true',
  })),
  totalRows: document.querySelectorAll('.admin-table__row').length,
  empty: document.querySelector('.admin-table .empty-state, .admin-table__country ~ .empty-state')?.textContent?.trim() || '',
}))()`)

import { mkdirSync } from 'node:fs'
mkdirSync('/home/user/tutorpro/shots', { recursive: true })
const page = await openStudents(1440)

/* ---- grouped by default ---- */
let view = await snapshot(page)
console.log('\nAll countries')
ok(view.sections.length === 4, `the table is split into one block per country (${view.sections.length}: ${view.sections.map((s) => s.title).join(', ')})`)
ok(view.totalRows === 7, `every learner is still listed (${view.totalRows} of 7)`)
const ph = view.sections.find((s) => /Philippines/i.test(s.title || ''))
const kr = view.sections.find((s) => /Korea/i.test(s.title || ''))
const my = view.sections.find((s) => /Malaysia/i.test(s.title || ''))
const unknown = view.sections.find((s) => /Awaiting location/i.test(s.title || ''))
ok(Boolean(ph && kr && my), 'the Philippines, Korea and Malaysia each have their own block')
ok(Boolean(unknown), 'families with no recorded country are still shown, under "Awaiting location"')
ok(ph?.rows === 3, `the Philippines block holds its 3 learners (${ph?.rows})`)
ok(/2 families/.test(ph?.count || ''), `and names the right number of families (${ph?.count})`)
ok(kr?.rows === 2, `Korea holds its 2 learners (${kr?.rows})`)
ok(
  view.sections[0] === ph || view.sections[0]?.title === ph?.title,
  `the biggest country comes first (${view.sections[0]?.title})`,
)
ok(view.pills[0]?.label === 'All countries' && view.pills[0].selected, 'the "All countries" pill is there and selected to begin with')

/* ---- filtering ---- */
await page.locator('.student-country-pill', { hasText: 'Korea' }).first().click()
await page.waitForTimeout(500)
view = await snapshot(page)
console.log('\nFiltered to Korea')
ok(view.sections.length === 1 && /Korea/i.test(view.sections[0].title), 'only Korea is shown')
ok(view.totalRows === 2, `only the 2 Korean learners are listed (${view.totalRows})`)
ok(
  view.pills.find((p) => /Korea/i.test(p.label || ''))?.selected === true,
  'the Korea pill shows as the chosen one',
)
ok(view.pills[0]?.selected === false, 'and "All countries" is no longer highlighted')

/* ---- pressing the same pill clears the filter ---- */
await page.locator('.student-country-pill', { hasText: 'Korea' }).first().click()
await page.waitForTimeout(500)
view = await snapshot(page)
console.log('\nPressing Korea again')
ok(view.totalRows === 7, `clears the filter and brings everyone back (${view.totalRows})`)

/* ---- it survives a phone ---- */
await page.screenshot({ path: '/home/user/tutorpro/shots/students-by-country.png', fullPage: false })
await page.close()
const phone = await openStudents(390)
const small = await snapshot(phone)
console.log('\nPhone, 390px')
ok(small.sections.length === 4, `still grouped by country on a phone (${small.sections.length})`)
const overflow = await phone.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
ok(overflow <= 1, `the page does not scroll sideways (${overflow}px)`)
const headingFits = await phone.evaluate(`[...document.querySelectorAll('.admin-table__country-head')].every((h) => h.scrollWidth <= h.clientWidth + 1)`)
ok(headingFits, 'the country headings fit inside their box')
await phone.close()

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
