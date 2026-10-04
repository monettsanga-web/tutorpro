/**
 * The same chat, in all three dashboards: a name you click, a panel that
 * docks in the corner.
 *
 * WHAT IT REPLACED
 * ----------------
 * The admin dashboard got the docked chat first. Parents and teachers were
 * left with two things that were not it:
 *
 *   1. No list of people at all. The only way into a conversation was the
 *      Message button on a lesson card, so a family whose lessons had all
 *      finished — or who had not booked yet — could not reach anybody.
 *   2. A "support" page that embedded a 650px-tall chat in the middle of
 *      the dashboard, under a Messenger card you had to scroll past, which
 *      then asked a signed-in parent to type their own name and email.
 *
 * Both are now a Messages page with the administrator as a clickable
 * name opening a docked panel. Teachers and families are deliberately NOT
 * listed: every conversation goes through admin, which is the school
 * owner's rule - see DIRECT_PARENT_TEACHER_CHAT.
 *
 * Run: node scripts/verify-chat-everywhere.mjs   (server on :4173)
 */
const SANDBOX = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PARENT = '22222222-2222-4222-8222-000000000001'
const TEACHER = '33333333-3333-4333-8333-000000000001'
const learner = { id: 'l1', name: 'Juan Santos', year: 'Year 3', curriculum: 'Cambridge', goal: 'Speaking', accessStatus: 'active' }
const accounts = [
  { id: PARENT, role: 'student', status: 'active', parentName: 'Maria Santos', email: 'maria@gmail.com', loginId: 'maria@gmail.com', registrationCountry: 'PH', children: [learner], child: learner },
  { id: TEACHER, role: 'teacher', status: 'approved', fullName: 'Teacher M', parentName: 'Teacher M', email: 't@tutorpro.site', loginId: 't@tutorpro.site', teacher: { specialization: 'General English', experience: 5, languages: 'English', bio: 'Hello', education: 'BA', credentials: [], rating: 5, ratingCount: 2 } },
]
const bookings = [
  { id: 'b1', studentId: PARENT, learnerId: 'l1', learnerName: 'Juan Santos', teacherId: TEACHER, teacherName: 'Teacher M', date: '2026-10-10', time: '16:00', duration: 25, status: 'confirmed', subject: 'English' },
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function messagesPage(id, width) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 950 }, isMobile: width < 700, hasTouch: width < 700 })
  await page.route('**/paypal.com/**', (r) => r.abort())
  await page.route('**/*.{mp4,webm}', (r) => r.abort())
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) }))
  /* The catch-all goes first: Playwright matches routes in reverse
     registration order, so a later specific route would never be reached. */
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline"}' }))
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');
    localStorage.setItem('tutorpro_accounts_v2', ${JSON.stringify(JSON.stringify(accounts))});
    localStorage.setItem('tutorpro_bookings_v1', ${JSON.stringify(JSON.stringify(bookings))});
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
  await page.locator('.portal-nav button:has-text("Messages")').first().click()
  await page.waitForTimeout(900)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
  await page.evaluate("document.querySelectorAll('.sync-health-banner, .portal-error').forEach((e) => e.remove())")
  await page.waitForTimeout(300)
  return page
}

for (const [role, id] of [['parent', PARENT], ['teacher', TEACHER]]) {
  for (const width of [1440, 390]) {
    const label = `${role} @${width}px`
    const page = await messagesPage(id, width)

    const names = await page.locator('.chat-person .chat-name-button').allInnerTexts()
    ok(names.includes('TutorPro Admin'), `${label}: the administrator is in the list of people to message`)
    ok(names.length === 1, `${label}: the administrator is the only contact (${names.join(' | ')})`)

    /* The old page asked a signed-in person who they were. */
    const asksAgain = await page.locator('.portal-view .support-start input').count()
    ok(asksAgain === 0, `${label}: it no longer asks a signed-in user to retype their name and email`)
    const embedded = await page.locator('.support-widget--embedded').count()
    ok(embedded === 0, `${label}: the full-page embedded chat is gone from the dashboard body`)

    /* A name opens the admin conversation, docked. */
    await page.locator('.chat-person--support .chat-name-button').first().click()
    await page.waitForTimeout(1100)
    const dock = await page.evaluate(`(() => {
      const el = document.querySelector('.support-widget--docked .support-panel')
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        position: getComputedStyle(document.querySelector('.support-widget--docked')).position,
        width: Math.round(r.width),
        height: Math.round(r.height),
        right: Math.round(innerWidth - r.right),
        bottom: Math.round(innerHeight - r.bottom),
        onscreen: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
        sideScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pageVisible: Boolean(document.querySelector('.chat-person')),
        backdrop: Boolean(document.querySelector('.portal-dialog-backdrop')),
      }
    })()`)
    ok(Boolean(dock), `${label}: clicking the admin's name opens the support chat`)
    ok(dock && dock.position === 'fixed', `${label}: it is pinned to the viewport`)
    ok(dock && dock.onscreen, `${label}: the whole panel is on screen (${dock?.width}x${dock?.height})`)
    ok(dock && dock.sideScroll <= 1, `${label}: it causes no sideways scrolling`)
    ok(dock && !dock.backdrop, `${label}: no dark sheet over the dashboard`)
    if (width >= 700) {
      ok(dock && dock.right < 40 && dock.bottom < 40, `${label}: docked to the bottom-right corner`)
      ok(dock && dock.pageVisible, `${label}: the dashboard stays readable behind it`)
    } else {
      ok(dock && dock.width >= 389, `${label}: on a phone it is a full-width sheet`)
      ok(dock && dock.height >= 840, `${label}: full height, so the keyboard shrinks the messages, not the input`)
    }

    const closeBtn = page.locator('.support-widget--docked .support-panel > header button').first()
    ok(await closeBtn.count() > 0, `${label}: the support chat has a close button`)
    await closeBtn.click()
    await page.waitForTimeout(400)
    ok(await page.locator('.support-widget--docked').count() === 0, `${label}: closing it actually closes it`)

    /* There must be no way into a private parent-teacher thread. Every
       conversation goes through the administrator - see
       DIRECT_PARENT_TEACHER_CHAT and verify-chat-contacts.mjs. */
    ok(await page.locator('.chat-person:not(.chat-person--support)').count() === 0, `${label}: nobody but the administrator is offered as a contact`)
    ok(await page.locator('.direct-chat').count() === 0, `${label}: no direct chat panel is reachable`)

    await page.close()
  }
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
