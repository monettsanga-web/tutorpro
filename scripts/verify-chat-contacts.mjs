/**
 * A teacher with no bookings could message nobody but the administrator.
 *
 * WHAT WENT WRONG
 * ---------------
 * The contact list on the Messages page was built from bookings and
 * nothing else. That is empty for exactly the teachers who most need to
 * write to somebody:
 *
 *   - a teacher the administrator has just assigned students to, before
 *     the family books the first lesson;
 *   - a teacher whose lessons have all been completed and cleared;
 *   - either side of a conversation that already exists in the thread
 *     cache but has no live booking behind it.
 *
 * So the page showed one card, "TutorPro Admin", and the reported
 * symptom was exactly that: the teacher can only chat to admin support.
 *
 * The same hole existed on the parent side: a family assigned a teacher
 * but not yet booked had nobody to write to either.
 *
 * Run: node scripts/verify-chat-contacts.mjs   (server on :4173)
 */
const SANDBOX = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PARENT = '22222222-2222-4222-8222-000000000001'
const TEACHER = '33333333-3333-4333-8333-000000000001'

/* The whole point: this learner is ASSIGNED to the teacher and there is
   not a single booking anywhere in the system. */
const learner = {
  id: 'l1',
  name: 'Juan Santos',
  year: 'Year 3',
  curriculum: 'Cambridge',
  goal: 'Speaking',
  accessStatus: 'active',
  assignedTeacherId: TEACHER,
}
const accounts = [
  { id: PARENT, role: 'student', status: 'active', parentName: 'Maria Santos', email: 'maria@gmail.com', loginId: 'maria@gmail.com', registrationCountry: 'PH', children: [learner], child: learner },
  { id: TEACHER, role: 'teacher', status: 'approved', fullName: 'Teacher M', parentName: 'Teacher M', email: 'teacherm@tutorpro.site', loginId: 'teacherm@tutorpro.site', teacher: { specialization: 'General English', experience: 5, languages: 'English', bio: 'Hi', education: 'BA', credentials: [] } },
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function messagesPage(id, width) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 950 }, isMobile: width < 700, hasTouch: width < 700 })
  await page.route('**/paypal.com/**', (r) => r.abort())
  await page.route('**/*.{mp4,webm}', (r) => r.abort())
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) }))
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline"}' }))
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');
    localStorage.setItem('tutorpro_accounts_v2', ${JSON.stringify(JSON.stringify(accounts))});
    localStorage.removeItem('tutorpro_bookings_v1');
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
  await page.waitForTimeout(1000)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
  await page.evaluate("document.querySelectorAll('.sync-health-banner, .portal-error').forEach((e) => e.remove())")
  return page
}

for (const width of [1440, 390]) {
  const label = `@${width}px`

  /* ---------- teacher: assigned student, zero bookings ---------- */
  let page = await messagesPage(TEACHER, width)
  let names = await page.locator('.chat-person .chat-name-button').allInnerTexts()
  ok(names.length > 1, `teacher ${label}: there is somebody besides the administrator (${names.length} contacts)`)
  ok(names.some((n) => /Maria Santos|Juan Santos/.test(n)), `teacher ${label}: the assigned family is listed — with no booking anywhere (${names.join(' | ')})`)
  const sub = await page.locator('.chat-person:not(.chat-person--support) small').first().innerText()
  ok(/Juan Santos/.test(sub), `teacher ${label}: the card names the child, so the teacher knows who it is ("${sub}")`)

  await page.locator('.chat-person:not(.chat-person--support) .chat-name-button').first().click()
  await page.waitForTimeout(800)
  const chat = await page.evaluate(`(() => {
    const el = document.querySelector('.direct-chat')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { onscreen: r.top >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, title: el.querySelector('.direct-chat__head strong')?.textContent?.trim() }
  })()`)
  ok(Boolean(chat), `teacher ${label}: clicking the family's name opens the chat`)
  ok(chat && chat.onscreen, `teacher ${label}: the panel fits on screen`)
  await page.close()

  /* ---------- parent: assigned teacher, zero bookings ---------- */
  page = await messagesPage(PARENT, width)
  names = await page.locator('.chat-person .chat-name-button').allInnerTexts()
  ok(names.includes('Teacher M'), `parent ${label}: the assigned teacher is listed before any lesson is booked (${names.join(' | ')})`)
  await page.locator('.chat-person:not(.chat-person--support) .chat-name-button').first().click()
  await page.waitForTimeout(800)
  const pChat = await page.evaluate(`(() => {
    const el = document.querySelector('.direct-chat')
    return el ? el.querySelector('.direct-chat__head strong')?.textContent?.trim() : null
  })()`)
  ok(pChat === 'Teacher M', `parent ${label}: it opens a chat with the teacher (${pChat})`)
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
