/**
 * Automatic timezone conversion, verified in a real browser.
 *
 * What we are proving:
 *   1. The timezone comes from the IP address, and beats the device clock.
 *   2. A family is never offered a "switch to Manila time" control.
 *   3. The weekly calendar is drawn in the family's own clock AND their own
 *      calendar day — a Manila morning lesson has to appear in the previous
 *      day's column for New York.
 *   4. Lesson cards, dialogs and the "Add to phone calendar" file all agree.
 *
 * The page is opened with the DEVICE clock set to Manila while the cached IP
 * timezone says New York, so anything still reading the device clock shows
 * Manila time and fails loudly.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

/* A Wednesday in the current week, so the lesson is always on screen. */
const monday = (() => {
  const d = new Date(); d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
})()
const key = (offset) => {
  const d = new Date(monday); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const WED = key(2)
const TUE = key(1)
/* Next week's Tuesday and Wednesday: this week's are already in the past. */
const NEXT_TUE = key(8)
const NEXT_WED = key(9)
const dayLabel = (dateKey) => {
  const d = new Date(`${dateKey}T12:00:00Z`)
  return `${d.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })}${d.getUTCDate()}`
}

const LEARNER = `{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}`

/* Teacher availability is stored per Manila weekday: Wednesday is index 2. */
const TEACHER = `{id:'t1',role:'teacher',status:'approved',email:'t@e.com',loginId:'t@e.com',authProvider:'email',
  createdAt:new Date().toISOString(),fullName:'Teacher M',
  teacher:{specialization:'Both Curricula',experience:5,availabilitySlots:['2-09:00','2-09:30','2-10:00','2-20:00','2-20:30'],credentials:[],classroom:{platform:'zoom'}}}`

/* Manila 09:00 Wednesday = New York 20:00 or 21:00 TUESDAY. */
const seed = (ipZone) => `
  const acc={id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
    parentName:'Maria Cruz',createdAt:new Date().toISOString(),paidLessonsBalance:8,
    child:${LEARNER},children:[${LEARNER}]};
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc, ${TEACHER}]));
  localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([
    {id:'b1',teacherId:'t1',studentId:'a1',learnerId:'l1',learnerName:'Ana',date:'${WED}',time:'09:00',duration:25,status:'confirmed',focus:'Reading'},
    {id:'b2',teacherId:'t1',studentId:'a1',learnerId:'l1',learnerName:'Ana',date:'${WED}',time:'20:00',duration:25,status:'confirmed',focus:'Speaking'}
  ]));
  sessionStorage.setItem('tutorpro_session_v2','a1');
  ${ipZone ? `sessionStorage.setItem('tutorpro_ip_timezone','${ipZone}');` : ''}
  localStorage.setItem('tutorpro_timezone_mode','school');`

const browser = await chromium.launch()

/* The real IP lookup is blocked in every case so the cached zone under test
   is the only thing in play. Case 7 stubs the endpoint to prove the lookup
   itself works. */
async function blockIpLookups(page) {
  await page.route('**/ipwho.is/**', (route) => route.abort())
  await page.route('**/ipapi.co/**', (route) => route.abort())
  await page.route('**/worldtimeapi.org/**', (route) => route.abort())
}

async function openDashboard(page, ipZone) {
  if (!page.__ipRouted) { await blockIpLookups(page); page.__ipRouted = true }
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(seed(ipZone))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const enter = page.locator('button:has-text("My dashboard"):visible').first()
  if (await enter.count()) await enter.click()
  else {
    const burger = page.locator('.menu-button')
    if (await burger.count()) { await burger.click(); await page.waitForTimeout(400) }
    await page.locator('button:has-text("My dashboard"):visible').first().click()
  }
  await page.waitForSelector('.portal-nav', { timeout: 20000 })
  await page.waitForTimeout(1200)
}

/* ------------------------------------------------------------------ */
/* 1. New York family, device clock deliberately set to Manila         */
/* ------------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Manila' })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await openDashboard(page, 'America/New_York')

  ok(errors.length === 0, `the dashboard renders with no JavaScript errors${errors[0] ? ` (${errors[0]})` : ''}`)

  await page.locator('.portal-nav button:has-text("My lessons")').first().click()
  await page.waitForSelector('.schedule-calendar', { timeout: 15000 })
  await page.waitForTimeout(700)

  /* --- the switch is gone -------------------------------------------- */
  ok(await page.locator('.schedule-timezone-switch').count() === 0, 'the old timezone switch no longer exists')
  ok(await page.locator('button:has-text("Manila (UTC+8)")').count() === 0, 'there is no button to switch to Manila time')
  const bodyText = await page.locator('.schedule-calendar').innerText()
  ok(!/my time/i.test(bodyText), 'no "My time / Manila" choice is presented')

  /* --- the badge shows the IP timezone, not the device clock ---------- */
  const badge = page.locator('.schedule-timezone-note')
  ok(await badge.count() === 1, 'a read-only timezone badge is shown instead')
  const badgeText = (await badge.innerText()).replace(/\s+/g, ' ').trim()
  ok(/New York/.test(badgeText), `the badge names the IP city, not the device one (found "${badgeText}")`)
  ok(/UTC-[45]/.test(badgeText), 'the badge shows the New York offset')
  ok(!/UTC\+8/.test(badgeText), 'Manila time is not offered anywhere on the badge')

  const heading = (await page.locator('.schedule-time-heading').innerText()).trim()
  ok(/UTC-[45]/.test(heading), `the time column is headed with the family's offset (found "${heading}")`)

  /* --- rows are the family's own clock -------------------------------- */
  const rows = await page.$$eval('.schedule-time', (nodes) => nodes.map((n) => n.textContent.trim()))
  ok(rows.length === 48, `there are still 48 half-hour rows (found ${rows.length})`)
  ok(rows[0] === '00:00' && rows[47] === '23:30', `rows run 00:00 to 23:30 in local time (found ${rows[0]}–${rows[47]})`)

  /* --- the lesson lands on the family's own day and hour --------------- */
  const cells = await page.evaluate(() => [...document.querySelectorAll('.schedule-cell.booked.booking-start')].map((node) => {
    const row = node.closest('.schedule-row')
    const index = [...row.children].indexOf(node) - 1
    return {
      time: row?.querySelector('.schedule-time')?.textContent?.trim() || '',
      day: [...document.querySelectorAll('.schedule-day-heading')][index]?.textContent?.trim() || '',
    }
  }))
  ok(cells.length === 2, `both confirmed lessons are drawn on the calendar (found ${cells.length})`)
  const tuesdayNumber = String(new Date(`${TUE}T12:00:00Z`).getUTCDate())
  const wednesdayNumber = String(new Date(`${WED}T12:00:00Z`).getUTCDate())
  const morning = cells.find((c) => c.day.includes(tuesdayNumber))
  const evening = cells.find((c) => c.day.includes(wednesdayNumber))
  ok(Boolean(morning), `the Manila Wednesday 09:00 lesson moves back to the family's Tuesday ${tuesdayNumber} column (found ${cells.map((c) => c.day).join(', ')})`)
  ok(morning && /^(20|21):00$/.test(morning.time), `and shows at 8–9 PM New York time (found ${morning?.time})`)
  ok(evening && /^(07|08):00$/.test(evening.time), `the Manila 20:00 lesson shows as a 7–8 AM Wednesday class (found ${evening?.time})`)
  ok(!cells.some((c) => c.time === '09:00'), 'Manila 09:00 is never shown to a New York family')

  /* --- the lesson card agrees with the calendar ------------------------ */
  const lessonTimes = await page.$$eval('.lesson-time', (nodes) => nodes.map((n) => n.textContent.trim()))
  ok(lessonTimes.length > 0, `lesson cards show a start time (found ${lessonTimes.length})`)
  ok(lessonTimes.every((t) => /(AM|PM)/.test(t)), `every lesson card time is a readable clock time (${lessonTimes.join(', ')})`)
  ok(lessonTimes.includes('9:00 PM') || lessonTimes.includes('8:00 AM'), `card times match the calendar, not Manila (${lessonTimes.join(', ')})`)
  ok(!lessonTimes.includes('9:00 AM'), 'no card still shows the raw Manila 09:00')
  const timeColours = await page.$$eval('.lesson-time', (nodes) => nodes.map((n) => getComputedStyle(n).color))
  ok(timeColours.every((c) => c !== 'rgb(255, 255, 255)'), `the lesson time is not white-on-white (${timeColours.join(', ')})`)
  const badges = await page.$$eval('.lesson-card__date', (nodes) => nodes.map((n) => n.innerText.replace(/\s+/g, ' ').trim()))
  ok(badges.length === 2, `both lesson cards show a date badge (found ${badges.length})`)
  const tueBadge = String(new Date(`${TUE}T12:00:00Z`).getUTCDate())
  const wedBadge = String(new Date(`${WED}T12:00:00Z`).getUTCDate())
  ok(badges.some((b) => b.startsWith(tueBadge)), `the big date badge follows the family's calendar — ${tueBadge} for the Manila-morning lesson (found ${badges.join(', ')})`)
  ok(badges.some((b) => b.startsWith(wedBadge)), 'the evening lesson keeps its own day')
  const boxes = await page.$$eval('.booking-person-name', (nodes) => nodes.map((n) => n.textContent.trim()))
  ok(boxes.every((t) => !/[\u{1F300}-\u{1FAFF}]/u.test(t)), `no emoji that could render as an empty box (${boxes.join(', ')})`)
  ok(await page.locator('.booking-person-name svg').count() > 0, 'an inline SVG icon is used instead')

  /* --- the "Add to phone calendar" button ------------------------------ */
  const addButton = page.locator('.add-calendar-button').first()
  if (await addButton.count()) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
      addButton.click(),
    ])
    ok(Boolean(download), 'the "Add to phone calendar" button produces a file')
    if (download) {
      const name = download.suggestedFilename()
      ok(/^TutorPro-English-\d{4}-\d{2}-\d{2}-\d{4}\.ics$/.test(name), `the file is named for the family's own date (${name})`)
      const path = await download.path()
      const text = path ? (await import('node:fs')).readFileSync(path, 'utf8') : ''
      ok(/DTSTART:\d{8}T\d{6}Z/.test(text), 'the event is written as an absolute UTC instant, so phones place it correctly')
      ok(/your time\\?, New York \(UTC-[45]\)/.test(text), 'the reminder spells out the time in the family\'s own timezone')
      ok(/Manila time \(our teaching base\)/.test(text), 'Manila time is still noted for reference')
    }
  } else {
    ok(false, 'the "Add to phone calendar" button was not found')
  }

  await page.screenshot({ path: 'screenshots/timezone-newyork-calendar.png', fullPage: false })
  await page.close()
}

/* ------------------------------------------------------------------ */
/* 2. Seoul family — a one-hour shift must not move the day            */
/* ------------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Manila' })
  await openDashboard(page, 'Asia/Seoul')
  await page.locator('.portal-nav button:has-text("My lessons")').first().click()
  await page.waitForSelector('.schedule-calendar', { timeout: 15000 })
  await page.waitForTimeout(600)

  const badgeText = (await page.locator('.schedule-timezone-note').innerText()).replace(/\s+/g, ' ')
  ok(/Seoul/.test(badgeText) && /UTC\+9/.test(badgeText), `Seoul is detected and labelled UTC+9 (found "${badgeText}")`)

  const cells = await page.evaluate(() => [...document.querySelectorAll('.schedule-cell.booked.booking-start')].map((node) => {
    const row = node.closest('.schedule-row')
    const index = [...row.children].indexOf(node) - 1
    return {
      time: row?.querySelector('.schedule-time')?.textContent?.trim() || '',
      day: [...document.querySelectorAll('.schedule-day-heading')][index]?.textContent?.trim() || '',
    }
  }))
  ok(cells.length === 2, `both lessons are drawn (found ${cells.length})`)
  ok(cells.some((c) => c.time === '10:00'), `the Manila 09:00 lesson shows at 10:00 in Seoul (found ${cells.map((c) => c.time).join(', ')})`)
  ok(cells.some((c) => c.time === '21:00'), 'the Manila 20:00 lesson shows at 21:00 in Seoul')
  const wednesdayNumber = String(new Date(`${WED}T12:00:00Z`).getUTCDate())
  ok(cells.every((c) => c.day.includes(wednesdayNumber)), 'a one-hour shift keeps both lessons on the same day column')

  await page.screenshot({ path: 'screenshots/timezone-seoul-calendar.png' })
  await page.close()
}

/* ------------------------------------------------------------------ */
/* 3. Manila family — nothing changes for them                         */
/* ------------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Manila' })
  await openDashboard(page, 'Asia/Manila')
  await page.locator('.portal-nav button:has-text("My lessons")').first().click()
  await page.waitForSelector('.schedule-calendar', { timeout: 15000 })
  await page.waitForTimeout(600)

  const badgeText = (await page.locator('.schedule-timezone-note').innerText()).replace(/\s+/g, ' ')
  ok(/Manila/.test(badgeText) && /UTC\+8/.test(badgeText), `a Manila family simply sees Manila (found "${badgeText}")`)

  const cells = await page.evaluate(() => [...document.querySelectorAll('.schedule-cell.booked.booking-start')].map((node) =>
    node.closest('.schedule-row')?.querySelector('.schedule-time')?.textContent?.trim() || ''))
  ok(cells.includes('09:00') && cells.includes('20:00'), `stored times are shown untouched (found ${cells.join(', ')})`)
  await page.close()
}

/* ------------------------------------------------------------------ */
/* 4. No IP answer at all — the device clock takes over                */
/* ------------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Warsaw' })
  await openDashboard(page, '')
  await page.locator('.portal-nav button:has-text("My lessons")').first().click()
  await page.waitForSelector('.schedule-calendar', { timeout: 15000 })
  await page.waitForTimeout(600)

  const badgeText = (await page.locator('.schedule-timezone-note').innerText()).replace(/\s+/g, ' ')
  ok(/Warsaw/.test(badgeText), `a failed IP lookup falls back to the device clock (found "${badgeText}")`)
  ok(!/UTC\+8/.test(badgeText), 'it never silently falls back to Manila time')
  await page.close()
}

/* ------------------------------------------------------------------ */
/* 5. Phone — the badge must survive the narrow toolbar                */
/* ------------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Manila', isMobile: true, hasTouch: true })
  await openDashboard(page, 'America/New_York')
  // On a phone the sidebar is collapsed; .portal-menu opens it.
  const menu = page.locator('.portal-menu')
  if (await menu.count()) { await menu.first().click(); await page.waitForTimeout(500) }
  await page.locator('.portal-nav button:has-text("My lessons")').first().click()
  await page.waitForTimeout(500)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(400) }
  await page.waitForSelector('.schedule-calendar', { timeout: 15000 })
  await page.waitForTimeout(600)

  const visible = await page.locator('.schedule-timezone-note').isVisible()
  ok(visible, 'the timezone badge is still readable on a phone')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(overflow <= 1, `the badge does not push the page sideways (overflow ${overflow}px)`)
  await page.screenshot({ path: 'screenshots/timezone-mobile.png' })
  await page.close()
}

/* ------------------------------------------------------------------ */
/* 6. Booking still stores Manila time, whatever the family clicked     */
/* ------------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Manila' })
  await openDashboard(page, 'America/New_York')
  await page.locator('.portal-nav button:has-text("Book a class")').first().click()
  await page.waitForSelector('.booking-calendar-card', { timeout: 15000 })
  await page.waitForTimeout(900)
  // This week's Wednesday is already in the past, so look at the next one.
  await page.locator('.schedule-toolbar__arrows button[aria-label="Next week"]').click()
  await page.waitForTimeout(800)

  const open = await page.evaluate(() => [...document.querySelectorAll('.schedule-cell.selectable')].map((node) => {
    const row = node.closest('.schedule-row')
    const index = [...row.children].indexOf(node) - 1
    return `${[...document.querySelectorAll('.schedule-day-heading')][index]?.textContent?.trim()} ${row.querySelector('.schedule-time')?.textContent?.trim()}`
  }))
  ok(open.length === 5, `all five available Manila slots are offered (found ${open.length})`)
  ok(open.filter((slot) => /Tue/.test(slot)).length === 3, `the teacher's Manila 09:00–10:30 block lands on Tuesday evening in New York (${open.join(', ')})`)
  ok(open.includes(`${dayLabel(NEXT_TUE)} 21:00`), `Manila Wednesday 09:00 is offered as ${dayLabel(NEXT_TUE)} 21:00`)
  ok(open.includes(`${dayLabel(NEXT_WED)} 08:00`), `Manila Wednesday 20:00 is offered as ${dayLabel(NEXT_WED)} 08:00`)
  ok(!open.some((slot) => / 09:00$/.test(slot)), 'no raw Manila time is offered as a bookable slot')

  // Click the 08:00 Wednesday cell. Its summary line is rendered by converting
  // the STORED value back again, so reading "Wed, ... 8:00 AM" proves the
  // booking was stored as Manila 20:00 and not as the 08:00 that was clicked.
  await page.evaluate(() => {
    const cell = [...document.querySelectorAll('.schedule-cell.selectable')].find((node) =>
      node.closest('.schedule-row')?.querySelector('.schedule-time')?.textContent?.trim() === '08:00')
    cell?.click()
  })
  await page.waitForTimeout(700)
  const summary = (await page.locator('.booking-calendar-card').innerText()).replace(/\s+/g, ' ')
  ok(/1 lesson time selected/.test(summary), 'the slot is selected')
  const expectedDay = new Date(`${NEXT_WED}T12:00:00Z`).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  ok(summary.includes(`${expectedDay} at 8:00 AM`), `the selection reads back as the family's own 8:00 AM (summary: ...${summary.slice(summary.indexOf('lesson time selected'), summary.indexOf('lesson time selected') + 70)})`)
  ok(!/at 8:00 PM/.test(summary), 'the stored Manila time was not double-converted')
  await page.close()
}

/* ------------------------------------------------------------------ */
/* 7. The IP lookup itself: answer, cache, redraw                       */
/* ------------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Manila' })
  let calls = 0
  await page.route('**/ipwho.is/**', async (route) => {
    calls += 1
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ timezone: { id: 'Europe/Madrid' } }) })
  })
  await page.route('**/ipapi.co/**', (route) => route.abort())
  await page.route('**/worldtimeapi.org/**', (route) => route.abort())
  page.__ipRouted = true
  await openDashboard(page, '')

  ok(calls >= 1, `the IP address is looked up on start-up (${calls} request${calls === 1 ? '' : 's'})`)
  const cached = await page.evaluate(() => sessionStorage.getItem('tutorpro_ip_timezone'))
  ok(cached === 'Europe/Madrid', `the answer is cached for the session (found ${cached})`)

  await page.locator('.portal-nav button:has-text("My lessons")').first().click()
  await page.waitForSelector('.schedule-calendar', { timeout: 15000 })
  await page.waitForTimeout(600)
  const badgeText = (await page.locator('.schedule-timezone-note').innerText()).replace(/\s+/g, ' ')
  ok(/Madrid/.test(badgeText), `the IP answer beats the device clock, which says Manila (found "${badgeText}")`)

  const before = calls
  await page.locator('.portal-nav button:has-text("Overview")').first().click()
  await page.waitForTimeout(800)
  ok(calls === before, 'the lookup is not repeated while moving around the dashboard')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
