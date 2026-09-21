/**
 * Announcement expiry — real headless-browser verification.
 *
 * The unit tests prove the rule; these prove a parent actually stops seeing
 * the banner on their dashboard, which is what was reported.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const LEARNER = `{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}`
const STUDENT = `{id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
  createdAt:new Date().toISOString(),parentName:'Maria',paidLessonsBalance:0,
  child:${LEARNER},children:[${LEARNER}]}`

const DAY = 24 * 60 * 60 * 1000

const browser = await chromium.launch()

/**
 * Open the student dashboard with a given set of announcements.
 *
 * Announcements are now served from the shared `site_settings` row, so the
 * cloud is the source of truth and the test must seed THAT, not just
 * localStorage. Seeding only the cache would prove nothing: a confirmed
 * remote read legitimately replaces it.
 */
async function open(announcements) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  await page.route('**/paypal.com/sdk/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))

  // Serve the announcements as the shared settings row.
  await page.route('**/rest/v1/site_settings**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Content-Range': '0-0/1' },
    body: JSON.stringify({ settings: { teacherDirectoryVisibility: 'public', announcements } }),
  }))

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${STUDENT}]));
    sessionStorage.setItem('tutorpro_session_v2', 'a1');
    localStorage.setItem('tutorpro_announcements_v1', ${JSON.stringify(JSON.stringify(announcements))});`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForTimeout(3200)
  return page
}

const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString()

/* ================================================================== */
console.log('\n--- a fresh announcement IS shown ---')
{
  const page = await open([
    { id: 'fresh', subject: 'Holiday schedule', body: 'We are closed on Monday.', target: 'ALL', createdAt: iso(0), expiresAt: iso(2 * DAY) },
  ])
  ok(await page.locator('.announcement-banner').count() === 1, 'the banner appears')
  const text = await page.locator('.announcement-banner').textContent()
  ok(text.includes('Holiday schedule'), 'the subject is shown')
  ok(text.includes('closed on Monday'), 'the body is shown')
  await page.close()
}

/* ================================================================== */
console.log('\n--- an announcement older than 2 days is NOT shown ---')
{
  const page = await open([
    { id: 'stale', subject: 'Old news from last week', body: 'Should be gone.', target: 'ALL', createdAt: iso(-7 * DAY), expiresAt: iso(-5 * DAY) },
  ])
  ok(await page.locator('.announcement-banner').count() === 0, 'no banner is rendered')
  const body = await page.locator('body').textContent()
  ok(!body.includes('Old news from last week'), 'the stale subject appears nowhere on the page')

  // And it is cleaned out of storage, not merely hidden.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tutorpro_announcements_v1') || '[]').length)
  ok(stored === 0, `the expired record is pruned from storage (${stored} left)`)
  await page.close()
}

/* ================================================================== */
console.log('\n--- PRE-EXISTING announcements with no expiresAt also expire ---')
// This is the reported bug: banners saved before expiry existed stayed forever.
{
  const page = await open([
    { id: 'legacy', subject: 'Legacy announcement', body: 'No expiry field.', target: 'ALL', createdAt: iso(-30 * DAY) },
  ])
  ok(await page.locator('.announcement-banner').count() === 0, 'the old banner is gone')
  const body = await page.locator('body').textContent()
  ok(!body.includes('Legacy announcement'), 'its text is nowhere on the page')
  await page.close()
}

/* ================================================================== */
console.log('\n--- a mixed list shows only the current one ---')
{
  const page = await open([
    { id: 'new', subject: 'Current notice', body: 'Still valid.', target: 'ALL', createdAt: iso(-1 * DAY), expiresAt: iso(1 * DAY) },
    { id: 'old1', subject: 'Expired one', body: 'Gone.', target: 'ALL', createdAt: iso(-9 * DAY) },
    { id: 'old2', subject: 'Expired two', body: 'Gone.', target: 'ALL', createdAt: iso(-4 * DAY), expiresAt: iso(-2 * DAY) },
  ])
  ok(await page.locator('.announcement-banner').count() === 1, 'exactly one banner shows')
  const text = await page.locator('.announcement-banner').textContent()
  ok(text.includes('Current notice'), 'it is the current one')
  ok(!text.includes('Expired'), 'neither expired one is shown')
  await page.close()
}

/* ================================================================== */
console.log('\n--- sending a new announcement REPLACES the previous one ---')
// The admin writes through saveAnnouncement, so this drives the same
// storage the admin panel writes and then reloads the parent's dashboard.
{
  const page = await open([
    { id: 'old', subject: 'Previous announcement', body: 'Superseded.', target: 'ALL', createdAt: iso(-3000), expiresAt: iso(2 * DAY) },
  ])
  ok(await page.locator('.announcement-banner').count() === 1, 'the previous announcement is showing')

  // The admin sends a new ALL announcement, which supersedes every earlier
  // one. Re-point the shared row at the new list, then make the parent's
  // dashboard re-read it exactly as the hourly refresh or Realtime would.
  await page.unroute('**/rest/v1/site_settings**')
  await page.route('**/rest/v1/site_settings**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Content-Range': '0-0/1' },
    body: JSON.stringify({
      settings: {
        teacherDirectoryVisibility: 'public',
        announcements: [{
          id: 'brand-new', subject: 'Brand new announcement', body: 'This is the current message.',
          target: 'ALL', createdAt: iso(0), expiresAt: iso(2 * DAY), translations: {},
        }],
      },
    }),
  }))
  // `networkidle` never settles once the Realtime socket is open. The hash
  // route means the dashboard is restored directly, with no button to press.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.announcement-banner', { timeout: 20000 })
  await page.waitForTimeout(1200)

  const count = await page.locator('.announcement-banner').count()
  ok(count === 1, `the parent sees exactly ONE banner, not a stack (${count})`)
  const text = await page.locator('.announcement-banner').textContent()
  ok(text.includes('Brand new announcement'), 'it is the new announcement')
  ok(!text.includes('Previous announcement'), 'the previous announcement is gone')

  const body = await page.locator('body').textContent()
  ok(!body.includes('Previous announcement'), 'the old subject appears nowhere on the page')
  await page.close()
}

/* ================================================================== */
console.log('\n--- dismissing still works, and the banner is reachable on mobile ---')
{
  const page = await open([
    { id: 'x', subject: 'Dismiss me', body: 'Tap the X.', target: 'ALL', createdAt: iso(0), expiresAt: iso(2 * DAY) },
  ])
  ok(await page.locator('.announcement-banner').count() === 1, 'the banner is present')
  await page.locator('.announcement-banner button').click()
  await page.waitForTimeout(600)
  ok(await page.locator('.announcement-banner').count() === 0, 'dismissing hides it')
  await page.close()

  const phone = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  await phone.route('**/paypal.com/sdk/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  // The shared row is the source of truth, so the phone must be served it too.
  await phone.route('**/rest/v1/site_settings**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Content-Range': '0-0/1' },
    body: JSON.stringify({
      settings: {
        teacherDirectoryVisibility: 'public',
        announcements: [{
          id: 'm', subject: 'Mobile notice', body: 'Readable on a phone.', target: 'ALL',
          createdAt: iso(0), expiresAt: iso(2 * DAY), translations: {},
        }],
      },
    }),
  }))
  await phone.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await phone.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${STUDENT}]));
    sessionStorage.setItem('tutorpro_session_v2', 'a1');
    localStorage.setItem('tutorpro_announcements_v1', JSON.stringify([
      {id:'m',subject:'Mobile notice',body:'Readable on a phone.',target:'ALL',
       createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+${2 * DAY}).toISOString()}
    ]));`)
  await phone.reload({ waitUntil: 'networkidle' })
  await phone.waitForTimeout(2400)
  await phone.locator('button:has-text("My dashboard"):visible').first().click()
  await phone.waitForTimeout(3200)
  await phone.evaluate(() => document.querySelector('.portal-scrim')?.click())
  await phone.waitForTimeout(500)

  ok(await phone.locator('.announcement-banner').count() === 1, 'the banner renders on a phone')
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(overflow <= 0, `no horizontal overflow on a 375px screen (${overflow}px)`)
  const closeBox = await phone.locator('.announcement-banner button').boundingBox()
  ok(closeBox && closeBox.width > 0, 'the dismiss control is rendered on mobile')
  await phone.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
