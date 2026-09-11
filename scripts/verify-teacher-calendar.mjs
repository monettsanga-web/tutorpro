/**
 * Teacher schedule tab — verified with real bookings in a real browser.
 *
 * The teacher dashboard already had a calendar, but it was hidden behind a
 * view toggle inside Bookings that defaults to a list, and the tab named
 * "schedule" is for setting availability rather than seeing classes. A
 * teacher had no direct answer to "what am I teaching this week".
 *
 * These checks prove the new tab exists, shows the right lessons in the right
 * places, counts only real workload, and works on a phone.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

// Monday of the current week, so the seeded lessons always land in view.
const monday = (() => {
  const d = new Date(); d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
})()
const key = (offset) => {
  const d = new Date(monday); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const seed = `
  const id='t1';
  const acc={id,role:'teacher',status:'approved',email:'teacher@example.com',loginId:'teacher@example.com',
    authProvider:'email',createdAt:new Date().toISOString(),fullName:'Teacher M',
    teacher:{specialization:'Both Curricula',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}}};
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
  localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([
    {id:'b1',teacherId:id,studentId:'s1',learnerName:'Ana',date:'${key(0)}',time:'09:00',duration:25,status:'confirmed'},
    {id:'b2',teacherId:id,studentId:'s2',learnerName:'Ben',date:'${key(0)}',time:'14:00',duration:50,status:'confirmed'},
    {id:'b3',teacherId:id,studentId:'s1',learnerName:'Ana',date:'${key(2)}',time:'10:00',duration:25,status:'completed'},
    {id:'b4',teacherId:id,studentId:'s3',learnerName:'Cara',date:'${key(4)}',time:'16:00',duration:50,status:'pending'},
    {id:'b5',teacherId:id,studentId:'s4',learnerName:'Dan',date:'${key(3)}',time:'11:00',duration:25,status:'cancelled'}
  ]));
  sessionStorage.setItem('tutorpro_session_v2', id);`

const browser = await chromium.launch()

async function openSchedule(page) {
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(seed)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  // On a phone the header button is inside the collapsed menu, so the first
  // VISIBLE one is what a real person would press.
  const enter = page.locator('button:has-text("My dashboard"):visible').first()
  if (await enter.count()) await enter.click()
  else {
    const burger = page.locator('.menu-button')
    if (await burger.count()) { await burger.click(); await page.waitForTimeout(400) }
    await page.locator('button:has-text("My dashboard"):visible').first().click()
  }
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(900)
}

/* --- desktop ---------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await openSchedule(page)

  const item = page.locator('.portal-nav button:has-text("My schedule")')
  ok(await item.count() === 1, 'a "My schedule" item exists in the teacher sidebar')

  const group = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.portal-nav button')].find((x) => x.textContent.includes('My schedule'))
    return b?.closest('.portal-nav__group')?.querySelector('.portal-nav__heading')?.textContent?.trim() || ''
  })
  ok(/teaching/i.test(group), `it sits under Teaching (found "${group}")`)

  await item.click()
  await page.waitForSelector('.teacher-calendar-view', { timeout: 15000 })
  await page.waitForTimeout(700)

  ok(await page.locator('h1:has-text("My schedule")').count() === 1, 'the page heading renders')
  ok(await page.locator('.booking-calendar-card').count() === 1, 'the weekly calendar is shown')

  /* --- the four summary figures --------------------------------------- */
  const stats = await page.evaluate(() =>
    [...document.querySelectorAll('.portal-stat-grid article')].map((a) => ({
      label: a.querySelector('small')?.textContent?.trim(),
      value: a.querySelector('strong')?.textContent?.trim(),
    })))
  const by = (n) => stats.find((s) => s.label === n)?.value

  // 4 non-cancelled lessons were seeded; the cancelled one must not count.
  ok(by('Classes this week') === '4', `classes this week counts only real workload (${by('Classes this week')} of 5 seeded, 1 cancelled)`)
  // 25 + 50 + 25 + 50 = 150 minutes = 2.5h
  ok(by('Teaching hours') === '2.5h', `hours use each lesson's own duration (${by('Teaching hours')})`)
  // Ana appears twice and must count once; Dan is cancelled and excluded.
  ok(by('Students') === '3', `distinct students counted once each (${by('Students')})`)
  ok(by('Next class') && by('Next class') !== '', `a next class is shown (${by('Next class')})`)

  /* --- day by day ------------------------------------------------------ */
  const days = await page.evaluate(() =>
    [...document.querySelectorAll('.teacher-day')].map((d) => ({
      weekday: d.querySelector('header strong')?.textContent?.trim(),
      lessons: [...d.querySelectorAll('li button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
      today: d.classList.contains('teacher-day--today'),
    })))
  ok(days.length === 7, `all seven days are listed (${days.length})`)
  ok(days[0].lessons.length === 2, `Monday shows both of its lessons (${days[0].lessons.length})`)
  ok(days[0].lessons[0].startsWith('09:00'), 'lessons are ordered by time within a day')
  ok(days[0].lessons.join(' ').includes('Ana') && days[0].lessons.join(' ').includes('Ben'), 'student names are shown')
  ok(days[3].lessons.some((l) => /cancelled/i.test(l)), 'a cancelled class is still visible, marked cancelled')
  ok(days.filter((d) => d.today).length <= 1, 'at most one day is marked today')
  ok(days[5].lessons.length === 0 || days[6].lessons.length === 0, 'a free day renders without lessons')

  /* --- clicking a lesson opens it -------------------------------------- */
  await page.locator('.teacher-day li button').first().click()
  await page.waitForTimeout(900)
  const opened = await page.evaluate(() => !!document.querySelector('.booking-dialog, .modal-backdrop, [class*=booking-slot]'))
  ok(opened, 'clicking a lesson opens the booking so it can be managed')

  ok(errors.length === 0, `no JavaScript errors (${errors.slice(0, 1).join('') || 'none'})`)
  await page.close()
}

/* --- empty state ------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(seed.replace(/localStorage\.setItem\('tutorpro_bookings_v1'[\s\S]*?\]\)\);/, ''))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.locator('button.button--primary:has-text("My dashboard")').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.locator('.portal-nav button:has-text("My schedule")').click()
  await page.waitForSelector('.teacher-calendar-view', { timeout: 15000 })
  await page.waitForTimeout(600)
  const text = await page.locator('.teacher-calendar-view').textContent()
  ok(/No classes booked this week/i.test(text), 'a teacher with no bookings sees a helpful empty state')
  await page.close()
}

/* --- mobile ------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await openSchedule(page)
  // The dashboard sidebar is off-canvas on a phone until this is pressed.
  await page.locator('.portal-menu').click()
  await page.waitForSelector('.portal-sidebar--open', { timeout: 8000 })
  await page.waitForTimeout(400)
  await page.locator('.portal-nav button:has-text("My schedule")').first().click()
  await page.waitForSelector('.teacher-calendar-view', { timeout: 12000 })
  await page.waitForTimeout(800)

  const m = await page.evaluate(() => ({
    shown: !!document.querySelector('.teacher-calendar-view'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    stacked: (() => {
      const d = document.querySelectorAll('.teacher-day')
      return d.length >= 2 ? d[0].getBoundingClientRect().top < d[1].getBoundingClientRect().top : true
    })(),
    taps: [...document.querySelectorAll('.teacher-day li button')].every((b) => b.getBoundingClientRect().height >= 44),
  }))
  ok(m.shown, 'mobile: the schedule opens')
  ok(m.overflow <= 2, `mobile: no sideways scroll (${m.overflow}px)`)
  ok(m.stacked, 'mobile: days stack into a single readable column')
  ok(m.taps, 'mobile: each lesson is a comfortable tap target')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
