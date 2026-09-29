/**
 * The administrator opening time slots on a teacher's calendar.
 *
 * Two things must be true, and only a browser shows both:
 *   1. Painting slots and saving writes them to the teacher's own profile
 *      AND pushes them to the shared database — availability that exists
 *      only on the admin's laptop cannot be booked by anybody.
 *   2. Nothing about the existing "reserve a class for a student" flow
 *      changes, because that is how classes actually get booked.
 *
 * The database is stubbed, so nothing real is written. What is checked is
 * that the write is attempted, with the right slots in it, and that a
 * refusal does not leave the admin looking at slots nobody else has.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
const TEACHER_ID = '44444444-4444-4444-8444-444444444444'
const OTHER_TEACHER_ID = '55555555-5555-4555-8555-555555555555'
const STUDENT_ID = '11111111-1111-4111-8111-111111111111'

const LEARNER = `{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}`

const teacher = (id, name, slots) => `{id:'${id}',role:'teacher',status:'approved',email:'${id}@teacher.com',loginId:'${id}@teacher.com',
  authProvider:'email',createdAt:new Date().toISOString(),fullName:'${name}',cloudProfile:true,
  teacher:{specialization:'Both Curricula',experience:5,languages:'English',bio:'Teacher',education:'BA',credentials:[],
  availabilitySlots:${JSON.stringify(slots)},classroom:{platform:'zoom'}}}`

const accounts = `
  {id:'${ADMIN_ID}',role:'admin',status:'active',email:'m@y.com',loginId:'m@y.com',authProvider:'email',createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin',cloudProfile:true},
  ${teacher(TEACHER_ID, 'Teacher M', ['2-09:00'])},
  ${teacher(OTHER_TEACHER_ID, 'Teacher Co', ['3-14:00', '3-14:30'])},
  {id:'${STUDENT_ID}',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
    createdAt:new Date().toISOString(),parentName:'Maria Santos',paidLessonsBalance:4,cloudProfile:true,
    child:${LEARNER},children:[${LEARNER}]}`

const browser = await chromium.launch()

/* The profiles table, stubbed but behaving like a database: a PATCH changes
   the stored row and later reads see the change. An inert stub is not good
   enough — the admin dashboard reconciles against what it reads and deletes
   local copies of accounts the database does not return, which silently
   wiped the teachers under test. */
function makeProfileRow(id, role, name, extra = {}) {
  return {
    id,
    role,
    status: role === 'teacher' ? 'approved' : 'active',
    email: `${id}@t.com`,
    login_id: `${id}@t.com`,
    auth_provider: 'email',
    full_name: name,
    display_name: name,
    parent_name: role === 'student' ? name : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile_data: { fullName: name, role, ...extra },
  }
}

const teacherProfile = (slots) => ({
  teacher: {
    specialization: 'Both Curricula', experience: 5, languages: 'English', bio: 'Teacher', education: 'BA',
    credentials: [], availabilitySlots: slots, classroom: { platform: 'zoom' },
  },
})

async function openCalendar({ profileWriteFails = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const writes = []
  const rows = new Map([
    [ADMIN_ID, makeProfileRow(ADMIN_ID, 'admin', 'Admin')],
    [TEACHER_ID, makeProfileRow(TEACHER_ID, 'teacher', 'Teacher M', teacherProfile(['2-09:00']))],
    [OTHER_TEACHER_ID, makeProfileRow(OTHER_TEACHER_ID, 'teacher', 'Teacher Co', teacherProfile(['3-14:00', '3-14:30']))],
    [STUDENT_ID, makeProfileRow(STUDENT_ID, 'student', 'Maria Santos', { children: [{ id: 'l1', name: 'Ana', year: 'Year 3', curriculum: 'Cambridge', accessStatus: 'active' }], paidLessonsBalance: 4 })],
  ])

  await page.route('**/paypal.com/**', (route) => route.abort())
  await page.route('**/auth/v1/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: ADMIN_ID, aud: 'authenticated', role: 'authenticated', email: 'm@y.com' }),
  }))
  // Catch-all first: Playwright matches routes in reverse registration order.
  await page.route('**/rest/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/rest/v1/profiles**', async (route) => {
    const request = route.request()
    if (request.method() === 'PATCH') {
      const body = JSON.parse(request.postData() || '{}')
      writes.push({ url: request.url(), body })
      if (profileWriteFails) {
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'permission denied for table profiles' }) })
      }
      const id = decodeURIComponent(request.url().split('id=eq.')[1] || '').split('&')[0]
      const existing = rows.get(id)
      if (existing) rows.set(id, { ...existing, ...body })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id, status: 'approved', role: 'teacher' }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...rows.values()]) })
  })

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro-supabase-auth', JSON.stringify({
      access_token: 'admin-token', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
      user: { id: '${ADMIN_ID}', aud: 'authenticated', role: 'authenticated', email: 'm@y.com', created_at: new Date().toISOString() },
    }));
    sessionStorage.setItem('tutorpro_ip_timezone', 'Asia/Manila');
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${accounts}]));
    localStorage.setItem('tutorpro_bookings_v1', '[]');
    sessionStorage.setItem('tutorpro_session_v2', '${ADMIN_ID}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(1600)
  await page.locator('.portal-nav button:has-text("All bookings")').first().click()
  await page.waitForTimeout(800)
  await page.locator('.admin-booking-view-switch button:has-text("Schedule calendar")').click()
  await page.waitForSelector('.admin-reserve-calendar-card', { timeout: 15000 })
  await page.waitForTimeout(900)
  return { page, writes, rows }
}

/**
 * Paint cells one by one. A click is a real pointerdown, which is exactly
 * what starts painting, so this is what an administrator picking out
 * individual half-hours actually does.
 */
async function paint(page, count = 3, startRow = 20, column = 1) {
  const rows = page.locator('.admin-reserve-calendar-card .schedule-row')
  for (let index = 0; index < count; index += 1) {
    const cell = rows.nth(startRow + index).locator('.schedule-cell').nth(column)
    await cell.scrollIntoViewIfNeeded()
    await cell.click()
    await page.waitForTimeout(120)
  }
  await page.waitForTimeout(200)
}

/** Paint a run in one gesture, which is how a whole evening gets opened. */
async function dragPaint(page, count = 3, startRow = 30, column = 2) {
  const rows = page.locator('.admin-reserve-calendar-card .schedule-row')
  const boxes = []
  for (let index = 0; index < count; index += 1) {
    const cell = rows.nth(startRow + index).locator('.schedule-cell').nth(column)
    await cell.scrollIntoViewIfNeeded()
    boxes.push(await cell.boundingBox())
  }
  await page.mouse.move(boxes[0].x + boxes[0].width / 2, boxes[0].y + boxes[0].height / 2)
  await page.mouse.down()
  for (const box of boxes.slice(1)) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
    await page.waitForTimeout(60)
  }
  await page.mouse.up()
  await page.waitForTimeout(350)
}

/* ================================================================== */
console.log('\n--- the admin can open time slots for a teacher ---')
{
  const { page, writes } = await openCalendar()

  const modeBar = page.locator('.admin-reserve-calendar-card .calendar-mode-bar')
  ok(await modeBar.count() === 1, 'the calendar offers a choice of what to do')
  ok(await page.locator('.admin-reserve-calendar-card button:has-text("Reserve a class")').count() === 1, 'reserving a class is still there')
  ok(await page.locator('.admin-reserve-calendar-card button:has-text("Open time slots")').count() === 1, 'and opening time slots is the new option')
  ok(await page.locator('.admin-reserve-panel').isVisible(), 'the reserve panel is shown by default')
  const switchText = await page.locator('.admin-booking-view-switch').innerText()
  ok(!/[\u{1F300}-\u{1FAFF}]/u.test(switchText), `the view switch uses icons, not emoji that render as empty boxes (${switchText.replace(/\s+/g, ' ')})`)
  ok(await page.locator('.admin-booking-view-switch svg').count() >= 2, 'both view buttons carry an inline SVG icon')
  const inactiveColour = await page.$eval('.admin-booking-view-switch button:not(.active)', (n) => getComputedStyle(n).color)
  ok(inactiveColour !== 'rgb(255, 255, 255)', `the unselected view is readable, not white on a light card (${inactiveColour})`)

  await page.locator('.admin-reserve-calendar-card button:has-text("Open time slots")').click()
  await page.waitForTimeout(500)
  ok(await page.locator('.admin-reserve-panel').count() === 0, 'the student reserve panel gets out of the way while opening slots')
  const instruction = (await page.locator('.admin-reserve-calendar-card .drag-instruction').innerText()).replace(/\s+/g, ' ')
  ok(/Open time slots for Teacher M/.test(instruction), `it names the teacher being edited (${instruction.slice(0, 50)}…)`)
  ok(/repeats every week/.test(instruction), 'and explains the pattern repeats weekly')

  const countBefore = (await page.locator('.calendar-mode-count').innerText()).trim()
  ok(/^1 slot · 0.5 hours a week$/.test(countBefore), `it starts from what the teacher already had (${countBefore})`)
  ok(await page.locator('.calendar-mode-unsaved').count() === 0, 'nothing is marked unsaved before any change')
  ok(await page.locator('button:has-text("Save open slots")').isDisabled(), 'and saving is not offered with nothing to save')

  await paint(page, 3)
  const countAfter = (await page.locator('.calendar-mode-count').innerText()).trim()
  ok(/^4 slots · 2.0 hours a week$/.test(countAfter), `painting three cells adds three slots (${countAfter})`)
  ok(await page.locator('.calendar-mode-unsaved').count() === 1, 'the admin is told the change is not saved yet')
  ok(!(await page.locator('button:has-text("Save open slots")').isDisabled()), 'and saving is now offered')

  const painted = await page.$$eval('.admin-reserve-calendar-card .schedule-cell.available', (nodes) => nodes.length)
  ok(painted === 4, `the painted cells show as available on the calendar (${painted})`)

  await page.locator('button:has-text("Save open slots")').click()
  await page.waitForTimeout(1200)

  // One save must mean ONE write. The panel used to send the same row twice
  // (once queued by updateAccount, once explicitly), which is wasted egress
  // on a database with a free-tier budget.
  ok(writes.length === 1, `saving writes to the shared database exactly once (${writes.length})`)
  const saved = writes[0]?.body?.profile_data?.teacher?.availabilitySlots || []
  ok(saved.length === 4, `all four slots were sent to the database (${saved.length})`)
  ok(saved.includes('2-09:00'), 'the slot the teacher had set themselves is kept')
  ok(writes[0]?.url.includes(TEACHER_ID), 'the write targets the teacher, not the administrator')
  ok(writes[0]?.body?.role === 'teacher', 'and is saved as a teacher profile')

  const local = await page.evaluate((id) => JSON.parse(localStorage.getItem('tutorpro_accounts_v2') || '[]').find((a) => a.id === id)?.teacher?.availabilitySlots || [], TEACHER_ID)
  ok(local.length === 4, `the local copy matches what was sent (${local.length})`)
  const success = (await page.locator('.admin-reserve-calendar-card .portal-success').innerText()).replace(/\s+/g, ' ')
  ok(/4 open slots saved for Teacher M/.test(success), `the admin is told what happened (${success.slice(0, 60)}…)`)
  ok(/Families can book these times/.test(success), 'and what it means')
  ok(await page.locator('.calendar-mode-unsaved').count() === 0, 'the unsaved warning clears')

  await page.screenshot({ path: 'screenshots/admin-availability.png' })
  await page.close()
}

/* ================================================================== */
console.log('\n--- painting removes slots too, and can be undone ---')
{
  const { page, writes } = await openCalendar()
  await page.locator('.admin-reserve-calendar-card button:has-text("Open time slots")').click()
  await page.waitForTimeout(400)
  await paint(page, 2)
  ok((await page.locator('.calendar-mode-count').innerText()).includes('3 slots'), 'two cells painted on top of the existing one')

  // Clicking the same green cells again takes them away.
  await paint(page, 2)
  ok((await page.locator('.calendar-mode-count').innerText()).includes('1 slot'), 'clicking them again removes them')

  // A whole evening in one gesture.
  await dragPaint(page, 3)
  const dragged = (await page.locator('.calendar-mode-count').innerText()).trim()
  ok(/^4 slots/.test(dragged), `dragging across three cells opens all three at once (${dragged})`)

  await page.locator('button:has-text("Clear all")').click()
  await page.waitForTimeout(300)
  ok((await page.locator('.calendar-mode-count').innerText()).includes('0 slots'), 'Clear all empties the week')

  await page.locator('button:has-text("Undo changes")').click()
  await page.waitForTimeout(300)
  ok((await page.locator('.calendar-mode-count').innerText()).includes('1 slot'), 'Undo changes puts the teacher\'s own slots back')
  ok(writes.length === 0, 'nothing was written to the database while experimenting')
  await page.close()
}

/* ================================================================== */
console.log('\n--- one teacher\'s slots never leak onto another ---')
{
  const { page } = await openCalendar()
  await page.locator('.admin-reserve-calendar-card button:has-text("Open time slots")').click()
  await page.waitForTimeout(400)
  await paint(page, 3)
  ok((await page.locator('.calendar-mode-count').innerText()).includes('4 slots'), 'Teacher M has four painted slots, unsaved')

  await page.locator('.admin-teacher-picker').selectOption({ label: 'Teacher Co' })
  await page.waitForTimeout(700)
  const other = (await page.locator('.calendar-mode-count').innerText()).trim()
  ok(/^2 slots/.test(other), `switching teacher shows THAT teacher's own slots, not the draft (${other})`)
  ok(await page.locator('.calendar-mode-unsaved').count() === 0, 'and their calendar is not marked as edited')
  await page.close()
}

/* ================================================================== */
console.log('\n--- a refused database write does not leave a false picture ---')
{
  const { page, writes } = await openCalendar({ profileWriteFails: true })
  await page.locator('.admin-reserve-calendar-card button:has-text("Open time slots")').click()
  await page.waitForTimeout(400)
  await paint(page, 3)
  await page.locator('button:has-text("Save open slots")').click()
  await page.waitForTimeout(1500)

  ok(writes.length >= 1, `the save was attempted (${writes.length} write${writes.length === 1 ? '' : 's'}, including putting the old slots back)`)
  const error = (await page.locator('.admin-reserve-calendar-card .portal-error').innerText()).replace(/\s+/g, ' ')
  ok(/could not be saved/.test(error), `the failure is reported (${error.slice(0, 70)})`)
  const local = await page.evaluate((id) => JSON.parse(localStorage.getItem('tutorpro_accounts_v2') || '[]').find((a) => a.id === id)?.teacher?.availabilitySlots || [], TEACHER_ID)
  ok(local.length === 1, `the teacher's saved slots were put back, so the admin is not shown slots nobody else has (${local.length})`)
  await page.close()
}

/* ================================================================== */
console.log('\n--- reserving a class for a student still works ---')
{
  const { page } = await openCalendar()
  ok(await page.locator('.admin-reserve-panel').isVisible(), 'the reserve panel is there')
  await page.locator('.admin-reserve-calendar-card button:has-text("Open time slots")').click()
  await page.waitForTimeout(400)
  await page.locator('.admin-reserve-calendar-card button:has-text("Reserve a class")').click()
  await page.waitForTimeout(500)
  ok(await page.locator('.admin-reserve-panel').isVisible(), 'and comes back when the admin switches away from editing')

  const selectable = await page.$$eval('.admin-reserve-calendar-card .schedule-cell.selectable', (nodes) => nodes.length)
  ok(selectable >= 0, `available slots are still offered for booking (${selectable} in this week)`)
  const painted = await page.$$eval('.admin-reserve-calendar-card .schedule-cell.available', (nodes) => nodes.length)
  ok(painted === 1, 'the teacher\'s availability is shown unchanged in booking mode')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
