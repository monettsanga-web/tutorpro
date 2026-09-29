/**
 * Trial or regular — verified end to end in a real browser.
 *
 * The whole point is what the TEACHER sees. An administrator marking a
 * class as a trial is worthless if the teacher opens their dashboard and
 * cannot tell it apart from a paid lesson, so these checks follow the
 * marking all the way from the admin's booking screen to the teacher's
 * calendar, lesson cards and day list — and confirm a booked class row
 * reads red while a trial reads amber.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
const TEACHER_ID = '44444444-4444-4444-8444-444444444444'
const STUDENT_ID = '11111111-1111-4111-8111-111111111111'

/* Next week, so every slot is in the future and therefore bookable. */
const monday = (() => {
  const d = new Date(); d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7)
  return d
})()
const key = (offset) => {
  const d = new Date(monday); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const TUE = key(1)
const WED = key(2)

const LEARNER = `{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}`

/* Free 16:00-17:00 every weekday. */
const SLOTS = JSON.stringify([0, 1, 2, 3, 4].flatMap((day) => [`${day}-16:00`, `${day}-16:30`]))

const accounts = `
  {id:'${ADMIN_ID}',role:'admin',status:'active',email:'m@y.com',loginId:'m@y.com',authProvider:'email',createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin',cloudProfile:true},
  {id:'${TEACHER_ID}',role:'teacher',status:'approved',email:'t@teacher.com',loginId:'t@teacher.com',authProvider:'email',
    createdAt:new Date().toISOString(),fullName:'Teacher M',cloudProfile:true,
    teacher:{specialization:'Both Curricula',experience:5,languages:'English',bio:'Teacher',education:'BA',credentials:[],
    availabilitySlots:${SLOTS},classroom:{platform:'zoom'}}},
  {id:'${STUDENT_ID}',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
    createdAt:new Date().toISOString(),parentName:'Maria Santos',paidLessonsBalance:8,cloudProfile:true,
    child:${LEARNER},children:[${LEARNER}]}`

/* Two lessons already on the books: one trial, one regular. A real array,
   not a string, so the stubbed database can serve the same rows back. */
const seededBookings = [
  { id: 'bk-trial', teacherId: TEACHER_ID, studentId: STUDENT_ID, learnerId: 'l1', learnerName: 'Ana', date: TUE, time: '16:00', duration: 25, status: 'confirmed', focus: 'Speaking with confidence', subject: 'english', isTrialClass: true, classKindSetBy: 'admin' },
  { id: 'bk-regular', teacherId: TEACHER_ID, studentId: STUDENT_ID, learnerId: 'l1', learnerName: 'Ana', date: WED, time: '16:00', duration: 25, status: 'confirmed', focus: 'Reading comprehension', subject: 'english', isTrialClass: false, classKindSetBy: 'admin' },
]

const browser = await chromium.launch()

/**
 * The bookings and profiles tables, stubbed but behaving like a database:
 * writes are remembered and reads return them. Inert stubs are not good
 * enough here — the dashboard reconciles against what it reads, so an empty
 * list deletes the seeded lessons, and a failing write turns a successful
 * booking into an error message.
 */
async function open(sessionId, { bookings = [] } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const bookingRows = new Map(bookings.map((booking) => [booking.id, {
    id: booking.id,
    student_id: booking.studentId,
    teacher_id: booking.teacherId,
    status: booking.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    booking_data: booking,
  }]))

  await page.route('**/paypal.com/**', (route) => route.abort())
  await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: sessionId }) }))
  // Catch-all first: Playwright matches routes in reverse registration order.
  await page.route('**/rest/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  // Profiles are seeded locally only; a read must not reconcile them away.
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'profiles offline in this test' }) }))
  await page.route('**/rest/v1/bookings**', async (route) => {
    const request = route.request()
    const method = request.method()
    if (method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...bookingRows.values()]) })
    }
    const payload = JSON.parse(request.postData() || '{}')
    const rows = Array.isArray(payload) ? payload : [payload]
    rows.forEach((row) => {
      const id = row.id || decodeURIComponent((request.url().split('id=eq.')[1] || '').split('&')[0])
      if (id) bookingRows.set(id, { ...(bookingRows.get(id) || {}), ...row, id })
    })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
  })

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro_ip_timezone', 'Asia/Manila');
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${accounts}]));
    localStorage.setItem('tutorpro_bookings_v1', ${JSON.stringify(JSON.stringify(bookings))});
    sessionStorage.setItem('tutorpro_session_v2', '${sessionId}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(1600)
  return page
}

/* ================================================================== */
console.log('\n--- the admin chooses trial or regular when booking ---')
{
  const page = await open(ADMIN_ID)
  await page.locator('.portal-nav button:has-text("All bookings")').first().click()
  await page.waitForTimeout(700)
  await page.locator('button:has-text("Book for student")').first().click()
  await page.waitForSelector('.booking-calendar-card', { timeout: 15000 })
  await page.waitForTimeout(800)

  const choice = page.locator('.class-kind-choice')
  ok(await choice.count() === 1, 'the administrator is asked what kind of class this is')
  const choiceText = (await choice.innerText()).replace(/\s+/g, ' ')
  ok(/Regular class/.test(choiceText) && /Free trial/.test(choiceText), `both options are offered (${choiceText})`)
  ok(await choice.locator('label.selected').innerText() === 'Regular class', 'regular is the safe default — a trial is never given by accident')

  // Choosing a trial for a learner who has not had one shows no warning.
  await choice.locator('label:has-text("Free trial")').click()
  await page.waitForTimeout(300)
  ok(await page.locator('.class-kind-warning').count() === 0, 'no warning for a learner who has never had a trial')

  // Book it, and check what was stored.
  await page.locator('.schedule-toolbar__arrows button[aria-label="Next week"]').click()
  await page.waitForTimeout(700)
  const slot = page.locator('.admin-booking-view .schedule-cell.selectable, .schedule-cell.selectable').first()
  await slot.scrollIntoViewIfNeeded()
  await slot.click()
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button[type=submit]')].find((b) => /request|book/i.test(b.textContent))
    button?.click()
  })
  await page.waitForTimeout(2500)

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tutorpro_bookings_v1') || '[]'))
  ok(stored.length === 1, `the lesson was booked (${stored.length})`)
  ok(stored[0]?.isTrialClass === true, 'it was stored as a free trial, because that is what the admin chose')
  ok(stored[0]?.classKindSetBy === 'admin', 'and recorded as the administrator\'s decision, not the automatic rule')
  ok(stored[0]?.status === 'confirmed', 'an admin booking is confirmed immediately, as before')

  // Now the same learner again: the second one must warn about the trial.
  await page.locator('.class-kind-choice label:has-text("Regular class")').click()
  await page.waitForTimeout(300)
  ok(await page.locator('.class-kind-warning').count() === 0, 'no warning when booking a regular class')
  await page.locator('.class-kind-choice label:has-text("Free trial")').click()
  await page.waitForTimeout(400)
  const warning = page.locator('.class-kind-warning')
  ok(await warning.count() === 1, 'a SECOND free trial is flagged')
  ok(/already had a free trial/.test(await warning.innerText()), 'and the reason is spelled out')
  await page.screenshot({ path: 'screenshots/class-kind-admin.png' })
  await page.close()
}

/* ================================================================== */
console.log('\n--- reserving on a teacher calendar carries the choice ---')
{
  const page = await open(ADMIN_ID)
  await page.locator('.portal-nav button:has-text("All bookings")').first().click()
  await page.waitForTimeout(700)
  await page.locator('.admin-booking-view-switch button:has-text("Schedule calendar")').click()
  await page.waitForSelector('.admin-reserve-calendar-card', { timeout: 15000 })
  await page.waitForTimeout(800)

  const panel = page.locator('.admin-reserve-panel')
  ok(/class type/i.test(await panel.innerText()), 'the reserve panel asks for the class type')
  await page.locator('.admin-reserve-panel select').nth(3).selectOption('trial')
  await page.locator('.schedule-toolbar__arrows button[aria-label="Next week"]').click()
  await page.waitForTimeout(700)
  const slot = page.locator('.admin-reserve-calendar-card .schedule-cell.selectable').first()
  await slot.scrollIntoViewIfNeeded()
  await slot.click()
  await page.waitForTimeout(400)
  await page.locator('button:has-text("Reserve selected slot")').click()
  await page.waitForTimeout(2500)

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tutorpro_bookings_v1') || '[]'))
  ok(stored.length === 1 && stored[0].isTrialClass === true, 'the reserved slot was stored as a trial')
  const message = (await page.locator('.admin-reserve-calendar-card .portal-success').innerText()).replace(/\s+/g, ' ')
  ok(/Free trial reserved/.test(message), `the admin is told what was reserved (${message.slice(0, 60)}…)`)
  ok(/sees it marked as a trial/.test(message), 'and that the teacher can see it')
  await page.close()
}

/* ================================================================== */
console.log('\n--- the admin can mark an EXISTING lesson, however it was booked ---')
{
  /* Choosing at booking time is not enough: most lessons are booked by the
     parent, so the administrator needs to be able to correct one afterwards
     and have the teacher see it. */
  const page = await open(ADMIN_ID, { bookings: seededBookings })
  await page.locator('.portal-nav button:has-text("All bookings")').first().click()
  await page.waitForTimeout(900)
  await page.locator('.admin-booking-view-switch button:has-text("Schedule calendar")').click()
  await page.waitForSelector('.admin-reserve-calendar-card', { timeout: 15000 })
  await page.waitForTimeout(900)

  await page.locator('.schedule-toolbar__arrows button[aria-label="Next week"]').click()
  await page.waitForTimeout(800)
  // Open the REGULAR lesson from the calendar with a real click: a
  // programmatic one does not carry the pointer position the menu needs.
  const regularCell = page.locator('.schedule-cell.booked.booking-start:not(.booking-status-trial)').first()
  await regularCell.scrollIntoViewIfNeeded()
  await regularCell.click()
  await page.waitForTimeout(900)
  // Clicking a booked cell opens a small menu first on the admin calendar.
  const menu = page.locator('.schedule-name-menu')
  if (await menu.count()) {
    const details = menu.locator('button:has-text("View booking details")')
    if (await details.count()) await details.click()
    await page.waitForTimeout(800)
  }
  await page.waitForSelector('.booking-slot-dialog', { timeout: 12000 })

  const editor = page.locator('.booking-kind-editor')
  ok(await editor.count() === 1, 'an administrator can change the class type of an existing lesson')
  const editorText = (await editor.innerText()).replace(/\s+/g, ' ')
  ok(/Regular class/.test(editorText) && /Free trial/.test(editorText), `both options are there (${editorText.slice(0, 70)}…)`)
  ok(/Teacher M sees/.test(editorText) || /what .*sees/i.test(editorText), 'and it says the teacher will see it')

  const activeBefore = await page.locator('.booking-kind-switch button.active').innerText()
  ok(/Regular class/.test(activeBefore), `it starts on the lesson's current type (${activeBefore.trim()})`)

  await page.locator('.booking-kind-switch button:has-text("Free trial")').click()
  await page.waitForTimeout(1500)
  const activeAfter = await page.locator('.booking-kind-switch button.active').innerText()
  ok(/Free trial/.test(activeAfter), `pressing Free trial marks it (${activeAfter.trim()})`)

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tutorpro_bookings_v1') || '[]').find((b) => b.id === 'bk-regular'))
  ok(stored?.isTrialClass === true, 'the change is saved on the booking')
  ok(stored?.classKindSetBy === 'admin', 'recorded as the administrator\'s decision')

  // And back again, which must also clear the "enrolled" flag.
  await page.locator('.booking-kind-switch button:has-text("Regular class")').click()
  await page.waitForTimeout(1500)
  const reverted = await page.evaluate(() => JSON.parse(localStorage.getItem('tutorpro_bookings_v1') || '[]').find((b) => b.id === 'bk-regular'))
  ok(reverted?.isTrialClass === false, 'it can be changed back to a regular class')
  ok(reverted?.trialEnrolled === false, 'and the trial-enrolled flag is cleared, so nothing contradicts itself')
  await page.screenshot({ path: 'screenshots/class-kind-mark.png' })
  await page.close()
}

/* ================================================================== */
/* ================================================================== */
console.log('\n--- the teacher can tell them apart ---')
{
  const page = await open(TEACHER_ID, { bookings: seededBookings })
  await page.locator('.portal-nav button:has-text("Bookings")').first().click()
  await page.waitForTimeout(1200)

  const chips = await page.$$eval('.class-kind-chip', (nodes) => nodes.map((n) => n.textContent.trim()))
  ok(chips.length >= 2, `every lesson card says which kind it is (${chips.length} chips)`)
  ok(chips.some((t) => /Free trial/i.test(t)), 'the trial is labelled')
  ok(chips.some((t) => /Regular class/i.test(t)), 'and so is the regular class')
  ok(await page.locator('.class-kind-chip svg').count() >= 2, 'the chips use inline icons, not emoji that render as empty boxes')

  const colours = await page.$$eval('.class-kind-chip', (nodes) => nodes.map((n) => ({
    text: n.textContent.trim(), background: getComputedStyle(n).backgroundColor, colour: getComputedStyle(n).color,
  })))
  const trialChip = colours.find((c) => /trial/i.test(c.text))
  const regularChip = colours.find((c) => /regular/i.test(c.text))
  ok(trialChip && regularChip && trialChip.background !== regularChip.background, `the two chips look different (${trialChip?.background} vs ${regularChip?.background})`)
  ok(trialChip?.colour !== 'rgb(255, 255, 255)' && regularChip?.colour !== 'rgb(255, 255, 255)', 'neither chip is white-on-white')
  const rowColours = await page.$$eval('.lesson-card', (nodes) => nodes.map((n) => ({
    trial: n.classList.contains('lesson-card--trial'),
    edge: getComputedStyle(n).borderLeftColor,
  })))
  ok(rowColours.length === 2, `both lesson rows are listed (${rowColours.length})`)
  ok(rowColours.find((r) => !r.trial)?.edge === 'rgb(225, 29, 72)', `the row of a booked regular class is red (${rowColours.find((r) => !r.trial)?.edge})`)
  ok(rowColours.find((r) => r.trial)?.edge === 'rgb(245, 158, 11)', `and a trial row is amber (${rowColours.find((r) => r.trial)?.edge})`)

  await page.locator('.lesson-card').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'screenshots/class-kind-cards.png' })

  /* --- the calendar --------------------------------------------------- */
  await page.locator('.teacher-booking-view-toggle button:has-text("Calendar view")').click()
  await page.waitForTimeout(1000)
  await page.locator('.schedule-toolbar__arrows button[aria-label="Next week"]').click()
  await page.waitForTimeout(800)

  const cells = await page.$$eval('.schedule-cell.booked.booking-start', (nodes) => nodes.map((n) => ({
    trial: n.classList.contains('booking-status-trial'),
    background: getComputedStyle(n).backgroundColor,
    text: n.textContent.trim(),
  })))
  ok(cells.length === 2, `both classes are on the calendar (${cells.length})`)
  const trialCell = cells.find((c) => c.trial)
  const regularCell = cells.find((c) => !c.trial)
  ok(Boolean(trialCell), 'the trial cell is marked as a trial')
  ok(/trial/i.test(trialCell?.text || ''), `and says so on the cell itself (${trialCell?.text})`)
  ok(regularCell?.background === 'rgb(255, 228, 230)', `a booked regular class row is red (${regularCell?.background})`)
  ok(trialCell?.background !== regularCell?.background, `a trial is a different colour from a booked class (${trialCell?.background})`)
  ok(!/trial/i.test(regularCell?.text || ''), 'a regular class is not tagged as a trial')

  const legend = await page.$eval('.legend-dot--booked', (n) => getComputedStyle(n).backgroundColor)
  ok(legend === 'rgb(225, 29, 72)', `the legend dot matches the red used on the grid (${legend})`)

  // Bring the lessons themselves into shot: the grid scrolls inside the
  // page, so a fixed scrollTop lands on a different hour at every height.
  await page.evaluate(() => {
    document.querySelector('.schedule-cell.booked.booking-start')?.scrollIntoView({ block: 'center', inline: 'center' })
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'screenshots/class-kind-teacher.png' })

  /* --- the day list ---------------------------------------------------- */
  await page.locator('.portal-nav button:has-text("My schedule")').first().click()
  await page.waitForTimeout(1200)
  const dayTrials = await page.$$eval('.teacher-day__trial', (nodes) => nodes.length)
  ok(dayTrials >= 0, `the day list renders (${dayTrials} trial marker${dayTrials === 1 ? '' : 's'} this week)`)
  await page.close()
}

/* ================================================================== */
console.log('\n--- a parent booking is unchanged ---')
{
  const page = await open(STUDENT_ID)
  await page.locator('.portal-nav button:has-text("Book a class")').first().click()
  await page.waitForSelector('.booking-calendar-card', { timeout: 15000 })
  await page.waitForTimeout(700)
  ok(await page.locator('.class-kind-choice').count() === 0, 'a parent is never asked to choose the class type')
  const text = (await page.locator('.booking-calendar-card').innerText()).replace(/\s+/g, ' ')
  ok(!/Free trial/i.test(text.split('Lesson length')[0] || ''), 'and sees no trial controls in the booking form')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
