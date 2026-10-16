/**
 * The Novakid-style bookings calendar on the teacher Bookings page.
 *
 * Owner complaint (2026-10-16): booked dates were buried - the page opened on
 * an oldest-first list, so this week's classes sat at the bottom of months of
 * history, and the old week grid gave no month-at-a-glance view.
 *
 * Contracts proved here against the built site:
 *   1. The page opens on the month grid, cursor on the month of the nearest
 *      upcoming class, with that day's classes already in the panel below.
 *   2. Every booking appears as a coloured chip ON ITS OWN DAY (today, a day
 *      three days out, a day ~40 days out), never on a neighbouring date.
 *   3. Picking a day swaps the panel to exactly that day's classes.
 *   4. "Next class" jumps back to the nearest booked day from anywhere.
 *   5. The list view is upcoming-first: future classes ascend, history last.
 *   6. The grid survives a phone viewport.
 */
const { chromium } = await (async () => {
  try { return await import('playwright') } catch { return await import('playwright-core') }
})()

let pass = 0
let fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL ') + m) }

const keyOf = (offsetDays, time) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, date: d, time }
}
const today = keyOf(0, '23:59')
const soon = keyOf(3, '09:00')
const soon2 = keyOf(3, '10:00')
const far = keyOf(40, '16:00')
const past1 = keyOf(-3, '10:00')
const past2 = keyOf(-40, '10:00')

const seed = `
  const id='t1';
  const acc={id,role:'teacher',status:'approved',email:'teacher@example.com',loginId:'teacher@example.com',
    authProvider:'email',createdAt:new Date().toISOString(),fullName:'Teacher M',
    teacher:{specialization:'Both Curricula',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}}};
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
  localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([
    {id:'p2',teacherId:id,studentId:'s5',learnerName:'PastKid B',date:'${past2.key}',time:'${past2.time}',duration:25,status:'completed'},
    {id:'p1',teacherId:id,studentId:'s4',learnerName:'PastKid A',date:'${past1.key}',time:'${past1.time}',duration:25,status:'completed'},
    {id:'f1',teacherId:id,studentId:'s3',learnerName:'FarKid',date:'${far.key}',time:'${far.time}',duration:25,status:'confirmed'},
    {id:'n2',teacherId:id,studentId:'s2',learnerName:'NextKid B',date:'${soon.key}',time:'${soon2.time}',duration:25,status:'pending'},
    {id:'n1',teacherId:id,studentId:'s1',learnerName:'NextKid A',date:'${soon.key}',time:'${soon.time}',duration:25,status:'confirmed'},
    {id:'t1',teacherId:id,studentId:'s0',learnerName:'NowKid',date:'${today.key}',time:'${today.time}',duration:25,status:'confirmed'}
  ]));
  sessionStorage.setItem('tutorpro_session_v2', id);`

const browser = await chromium.launch()

async function openBookings(viewport) {
  const page = await browser.newPage({ viewport })
  // Seed before the app boots, then land directly on the hash route a real
  // teacher uses (…/#/teacher/bookings). The router only reads the hash on
  // first load, and on a phone the sidebar is an off-canvas drawer, so this
  // is both the honest and the robust way in.
  await page.addInitScript({ content: seed })
  await page.goto('http://localhost:4173/#/teacher/bookings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  return page
}

const page = await openBookings({ width: 1440, height: 1000 })

ok(await page.locator('.tbcal__grid').count() === 1, 'bookings opens on the month grid by default')
const monthLabel = await page.locator('.tbcal__title strong').innerText()
const nowMonth = new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })
ok(monthLabel === nowMonth, `the month opens on the nearest upcoming class (${monthLabel} = ${nowMonth})`)
ok(await page.locator('.tbcal__day--today .tbcal-chip').count() === 1, "today's class sits on today's square")
ok((await page.locator('.tbcal__day--today .tbcal-chip').first().innerText()).includes('23:59'), "today's chip carries the lesson time")
ok((await page.locator('.tbcal-daypanel').innerText()).includes('NowKid'), 'the day panel opens on the nearest booked day, no scrolling')

// A chip click opens the manage dialog directly - the shortcut the grid promises.
await page.locator('.tbcal__day--today .tbcal-chip').click()
await page.waitForTimeout(500)
ok(await page.locator('.booking-slot-dialog').count() === 1, 'clicking a class chip opens its manage dialog straight away')
await page.locator('.booking-slot-dialog .portal-dialog__close').click()
await page.waitForTimeout(400)
ok(await page.locator('.booking-slot-backdrop').count() === 0, 'the manage dialog closes cleanly')

const soonLabel = soon.date.toDateString()
// Click the day NUMBER, not the cell centre: a chip under the cursor would
// (by design) open the manage dialog instead of selecting the day.
await page.locator(`.tbcal__day[aria-label^="${soonLabel}"]`).click({ position: { x: 10, y: 10 } })
await page.waitForTimeout(500)
const panel = await page.locator('.tbcal-daypanel').innerText()
ok(panel.includes('NextKid A') && panel.includes('NextKid B') && !panel.includes('NowKid'), 'picking a day shows exactly that day\'s two classes')
ok(await page.locator(`.tbcal__day[aria-label^="${soonLabel}"] .tbcal-chip`).count() === 2, 'the picked day carries both chips on its own square')

const farLabel = far.date.toDateString()
const farVisibleNow = await page.locator(`.tbcal__day[aria-label^="${farLabel}"] .tbcal-chip`).count()
if (!farVisibleNow) {
  await page.locator('.tbcal__nav button[aria-label="Next month"]').click()
  await page.waitForTimeout(300)
  if (!(await page.locator(`.tbcal__day[aria-label^="${farLabel}"] .tbcal-chip`).count())) {
    await page.locator('.tbcal__nav button[aria-label="Next month"]').click()
    await page.waitForTimeout(300)
  }
}
ok(await page.locator(`.tbcal__day[aria-label^="${farLabel}"] .tbcal-chip`).count() === 1, 'a class 40 days out sits on its own day after navigating months')

await page.locator('.tbcal__nav button[aria-label="Previous month"]').click()
await page.locator('.tbcal__nav button[aria-label="Previous month"]').click()
await page.waitForTimeout(300)
await page.locator('.tbcal__nav button:has-text("Next class")').click()
await page.waitForTimeout(400)
ok((await page.locator('.tbcal__title strong').innerText()) === nowMonth, '"Next class" jumps back to the nearest booked month from anywhere')
ok((await page.locator('.tbcal-daypanel').innerText()).includes('NowKid'), 'and selects that day in the panel')

await page.locator('.teacher-booking-view-toggle button:has-text("List view")').click()
await page.waitForTimeout(600)
const names = await page.locator('.lessons-list-card .lesson-card').allInnerTexts()
const indexOf = (n) => names.findIndex((t) => t.includes(n))
ok(indexOf('NowKid') === 0 && indexOf('NextKid A') === 1 && indexOf('FarKid') === 3, 'list view is upcoming-first (now, soon, far)')
ok(indexOf('PastKid A') > indexOf('FarKid') && indexOf('PastKid B') === names.length - 1, 'history trails behind, nearest past last-of-history order')

await page.close()

const phone = await openBookings({ width: 390, height: 844 })
ok(await phone.locator('.tbcal__grid').count() === 1, 'phone: the month grid renders')
ok(await phone.evaluate(() => document.documentElement.scrollWidth) <= 391, 'phone: no horizontal overflow')
await phone.screenshot({ path: '/home/user/pending/screens/15-bookings-calendar-phone.png' })
await phone.close()

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
