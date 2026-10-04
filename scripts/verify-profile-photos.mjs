/**
 * A teacher's photo has to be visible to somebody who is not that teacher.
 *
 * WHAT WAS WRONG
 * --------------
 * Two separate faults, and either one alone was enough to hide the photo:
 *
 * 1. `uploadTeacherMedia` saved the image into this browser's IndexedDB and
 *    into the LOCAL account record, and stopped. It never called
 *    updateCloudProfile - the sibling function saveTeacherName does, three
 *    lines further down - so the picture never left the teacher's laptop.
 *    The teacher saw their own face and concluded it had worked.
 *
 * 2. Even synced, a parent still could not see it. Families read teachers
 *    through the `get_public_teachers` RPC, which returns `id`, `full_name`
 *    and the `teacher` JSON and nothing else. A photo stored as a
 *    top-level `profilePhotoUrl` is simply not in that payload. It now goes
 *    into `teacher.photo` as well, at 256px so the teacher list does not
 *    cost a megabyte to open.
 *
 * This checks the places a face should appear, from the point of view of
 * people who did NOT upload it - no IndexedDB entry, exactly like a real
 * second device.
 *
 * Run: node scripts/verify-profile-photos.mjs   (server on :4173)
 */
const SANDBOX = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN = '11111111-1111-4111-8111-111111111111'
const PARENT = '22222222-2222-4222-8222-000000000001'
const TEACHER = '33333333-3333-4333-8333-000000000001'

/* A 2x2 red JPEG. Tiny, but a real image: the test asserts the <img> is
   actually decoded by the browser, not merely present in the DOM. */
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DwnwEJMKEL0EoAAFzfAgNRa0OtAAAAAElFTkSuQmCC'

const learner = { id: 'l1', name: 'Juan Santos', year: 'Year 3', curriculum: 'Cambridge', goal: 'Speaking', accessStatus: 'active' }
const accounts = [
  { id: ADMIN, role: 'admin', status: 'active', parentName: 'Monett', fullName: 'Monett', email: 'admin@tutorpro.site', loginId: 'admin@tutorpro.site' },
  { id: PARENT, role: 'student', status: 'active', parentName: 'Maria Santos', email: 'maria@gmail.com', loginId: 'maria@gmail.com', registrationCountry: 'PH', children: [learner], child: learner },
  {
    id: TEACHER,
    role: 'teacher',
    status: 'approved',
    fullName: 'Teacher M',
    parentName: 'Teacher M',
    email: 'teacherm@tutorpro.site',
    loginId: 'teacherm@tutorpro.site',
    /* Exactly what the fixed upload writes: the admin-readable copy... */
    profilePhotoUrl: PHOTO,
    /* ...and the copy families can actually reach. */
    teacher: { specialization: 'General English', experience: 8, languages: 'English', bio: 'Hi', education: 'BA', credentials: [], photo: PHOTO, availabilitySlots: ['1-10:00', '1-10:30'] },
  },
]
const bookings = [
  { id: 'b1', studentId: PARENT, learnerId: 'l1', learnerName: 'Juan Santos', teacherId: TEACHER, teacherName: 'Teacher M', date: '2026-09-10', time: '16:00', duration: 25, status: 'completed', subject: 'English' },
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
  await page.waitForTimeout(1200)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
  await page.evaluate("document.querySelectorAll('.sync-health-banner, .portal-error').forEach((e) => e.remove())")
  return true
}

/* A photo counts as shown only if the browser decoded it and it is on
   screen at a sensible size. A broken <img> has naturalWidth 0. */
const PHOTO_PROBE = `(() => {
  const shots = [...document.querySelectorAll('.profile-media-photo img')]
  const live = shots.filter((img) => img.complete && img.naturalWidth > 0)
  const boxes = live.map((img) => { const r = img.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)) })
  return { total: shots.length, live: live.length, smallest: boxes.length ? Math.min(...boxes) : 0, initials: document.querySelectorAll('.profile-media-photo strong').length }
})()`

for (const width of [1440, 390]) {
  const size = `@${width}px`

  /* ---------------- admin ---------------- */
  let page = await dashboard(ADMIN, width)
  await section(page, 'Teachers')
  let shot = await page.evaluate(PHOTO_PROBE)
  ok(shot.live > 0, `admin ${size}: the teacher's photo appears in the Teachers list (${shot.live} of ${shot.total} images loaded)`)
  ok(shot.smallest >= 24, `admin ${size}: it is big enough to recognise (${shot.smallest}px)`)

  await page.locator('.table-access-button').first().click()
  await page.waitForTimeout(1500)
  shot = await page.evaluate(PHOTO_PROBE)
  ok(shot.live > 0, `admin ${size}: and on the teacher's profile page`)
  await page.close()

  /* ---------------- parent ---------------- */
  page = await dashboard(PARENT, width)
  await section(page, 'My teachers')
  shot = await page.evaluate(PHOTO_PROBE)
  ok(shot.live > 0, `parent ${size}: the teacher's photo appears in My teachers — this is the one that needs teacher.photo`)

  await section(page, 'Book a class')
  const preview = await page.evaluate(`(() => {
    const card = document.querySelector('.booking-teacher-preview')
    if (!card) return null
    const img = card.querySelector('img')
    const r = card.getBoundingClientRect()
    return { name: card.querySelector('strong')?.textContent?.trim(), photo: Boolean(img && img.complete && img.naturalWidth > 0), onscreen: r.width > 0 && r.right <= innerWidth + 1 }
  })()`)
  ok(Boolean(preview), `parent ${size}: the booking page shows who the chosen teacher is`)
  ok(preview && preview.name === 'Teacher M', `parent ${size}: it names them (${preview?.name})`)
  ok(preview && preview.photo, `parent ${size}: with their photo, which a <select> can never show`)
  ok(preview && preview.onscreen, `parent ${size}: and the card fits the screen`)
  await page.close()
}

/* ---------------- the fallback still works ---------------- */
const noPhoto = JSON.parse(JSON.stringify(accounts))
noPhoto[2].profilePhotoUrl = ''
delete noPhoto[2].teacher.photo
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: ADMIN }) }))
await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline"}' }))
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.evaluate(`
  localStorage.setItem('tutorpro_accounts_v2', ${JSON.stringify(JSON.stringify(noPhoto))});
  localStorage.setItem('tutorpro_session_v2', '${ADMIN}');`)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2400)
const enter = page.locator('button:has-text("My dashboard"):visible').first()
if (await enter.count()) await enter.click()
await page.waitForSelector('.portal-nav', { timeout: 20000 })
await section(page, 'Teachers')
const fallback = await page.evaluate(PHOTO_PROBE)
ok(fallback.initials > 0, 'a teacher with no photo still shows a letter, not an empty box')
await page.close()

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
