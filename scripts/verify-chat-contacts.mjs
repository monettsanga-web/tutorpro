/**
 * Every conversation goes through the administrator.
 *
 * THE RULE
 * --------
 * A teacher's Messages page lists TutorPro Admin and nobody else. So does
 * a parent's. Teachers and parents do not hold private threads with each
 * other; admin passes on anything that needs passing on. This is the
 * school owner's safeguarding decision, recorded in code as
 * DIRECT_PARENT_TEACHER_CHAT = false.
 *
 * WHAT THIS GUARDS AGAINST
 * ------------------------
 * The contact list was briefly built from bookings, assigned students and
 * existing threads, which put parents' names in front of teachers. The
 * entry points are easy to re-add by accident - a lesson card takes an
 * `onOpenChat` prop, so does the teacher card on "My teachers" - and each
 * one is a way back into a private staff-to-family conversation. This
 * checks the page, the lesson cards and the teacher cards together.
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

/* Deliberately the most generous possible case for leaking a name: the
   learner is assigned to the teacher AND there is a confirmed booking
   between them. Neither may produce a contact. */
const learner = { id: 'l1', name: 'Juan Santos', year: 'Year 3', curriculum: 'Cambridge', goal: 'Speaking', accessStatus: 'active', assignedTeacherId: TEACHER }
const accounts = [
  { id: PARENT, role: 'student', status: 'active', parentName: 'Maria Santos', email: 'maria@gmail.com', loginId: 'maria@gmail.com', registrationCountry: 'PH', children: [learner], child: learner },
  { id: TEACHER, role: 'teacher', status: 'approved', fullName: 'Teacher M', parentName: 'Teacher M', email: 'teacherm@tutorpro.site', loginId: 'teacherm@tutorpro.site', teacher: { specialization: 'General English', experience: 5, languages: 'English', bio: 'Hi', education: 'BA', credentials: [] } },
]
const bookings = [
  { id: 'b1', studentId: PARENT, learnerId: 'l1', learnerName: 'Juan Santos', teacherId: TEACHER, teacherName: 'Teacher M', date: '2026-10-10', time: '16:00', duration: 25, status: 'confirmed', subject: 'English' },
  { id: 'b2', studentId: PARENT, learnerId: 'l1', learnerName: 'Juan Santos', teacherId: TEACHER, teacherName: 'Teacher M', date: '2026-09-10', time: '16:00', duration: 25, status: 'completed', subject: 'English' },
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function dashboard(id, width) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 950 }, isMobile: width < 700, hasTouch: width < 700 })
  await page.route('**/paypal.com/**', (r) => r.abort())
  await page.route('**/*.{mp4,webm}', (r) => r.abort())
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id }) }))
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
  return page
}

async function section(page, label) {
  const menu = page.locator('.portal-menu')
  if (await menu.count() && await menu.first().isVisible()) { await menu.first().click(); await page.waitForTimeout(400) }
  const button = page.locator(`.portal-nav button:has-text("${label}")`).first()
  if (!(await button.count())) return false
  await button.click()
  await page.waitForTimeout(1000)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
  await page.evaluate("document.querySelectorAll('.sync-health-banner, .portal-error').forEach((e) => e.remove())")
  return true
}

for (const width of [1440, 390]) {
  const size = `@${width}px`

  /* ---------------- teacher ---------------- */
  let page = await dashboard(TEACHER, width)
  await section(page, 'Messages')
  let names = await page.locator('.chat-person .chat-name-button').allInnerTexts()
  ok(names.length === 1, `teacher ${size}: exactly one person to message (${names.join(' | ') || 'none'})`)
  ok(names[0] === 'TutorPro Admin', `teacher ${size}: and it is the administrator`)
  let text = await page.locator('.portal-view').innerText()
  ok(!/Maria Santos/.test(text), `teacher ${size}: no parent's name anywhere on the Messages page`)
  ok(!/Juan Santos.{0,12}parent|parent of Juan/i.test(text), `teacher ${size}: no family is offered as a contact`)

  /* The administrator conversation still opens. */
  await page.locator('.chat-person--support .chat-name-button').first().click()
  await page.waitForTimeout(1200)
  ok(await page.locator('.support-widget--docked').count() > 0, `teacher ${size}: the admin chat still opens as a docked panel`)
  const closeBtn = page.locator('.support-widget--docked .support-panel > header button').first()
  if (await closeBtn.count()) { await closeBtn.click(); await page.waitForTimeout(400) }

  /* No way back in through a lesson card. */
  await section(page, 'Bookings')
  const teacherCards = await page.evaluate(`(() => ({
    messageButtons: document.querySelectorAll('.booking-chat-button').length,
    clickableNames: document.querySelectorAll('.chat-name-button').length,
  }))()`)
  ok(teacherCards.messageButtons === 0, `teacher ${size}: no "Message parent" button on a lesson card`)
  ok(teacherCards.clickableNames === 0, `teacher ${size}: the student's name on a lesson card does not open a chat`)
  await page.close()

  /* ---------------- parent ---------------- */
  page = await dashboard(PARENT, width)
  await section(page, 'Messages')
  names = await page.locator('.chat-person .chat-name-button').allInnerTexts()
  ok(names.length === 1 && names[0] === 'TutorPro Admin', `parent ${size}: the parent also messages admin only (${names.join(' | ') || 'none'})`)
  text = await page.locator('.portal-view').innerText()
  ok(!/Teacher M/.test(text), `parent ${size}: the teacher is not offered as a contact`)

  await page.locator('.chat-person--support .chat-name-button').first().click()
  await page.waitForTimeout(1200)
  ok(await page.locator('.support-widget--docked').count() > 0, `parent ${size}: the admin chat opens as a docked panel`)
  const pClose = page.locator('.support-widget--docked .support-panel > header button').first()
  if (await pClose.count()) { await pClose.click(); await page.waitForTimeout(400) }

  await section(page, 'My lessons')
  const parentCards = await page.evaluate(`(() => ({
    messageButtons: document.querySelectorAll('.booking-chat-button').length,
    clickableNames: document.querySelectorAll('.chat-name-button').length,
  }))()`)
  ok(parentCards.messageButtons === 0, `parent ${size}: no "Message teacher" button on a lesson card`)
  ok(parentCards.clickableNames === 0, `parent ${size}: the teacher's name on a lesson card does not open a chat`)

  await section(page, 'My teachers')
  const reviewCards = await page.evaluate(`(() => ({
    messageButtons: document.querySelectorAll('.ptr-message-button').length,
    clickableNames: document.querySelectorAll('.chat-name-button').length,
  }))()`)
  ok(reviewCards.messageButtons === 0, `parent ${size}: no Message button on a teacher card in My teachers`)
  ok(reviewCards.clickableNames === 0, `parent ${size}: the teacher's name there does not open a chat either`)

  /* Nothing may open a direct chat panel anywhere in the dashboard. */
  ok(await page.locator('.direct-chat').count() === 0, `parent ${size}: no direct chat panel is reachable`)
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
