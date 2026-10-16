/**
 * The classroom gate, in a real browser, on the built site.
 *
 * Three contracts, proved against http://localhost:4173 (serve dist/ first):
 *
 *   1. GLOBAL: a normal visitor with a confirmed booking sees a working
 *      "Enter private classroom" button - and the ~877 kB classroom chunk is
 *      NOT fetched until the button is actually clicked (lazy relight: the
 *      dashboard stays light for everybody who is not in a class).
 *   2. CHINA: the same dashboard, with the session country hint set to CN
 *      (the same key src/VisitorCountry.jsx writes from the visitor's IP),
 *      shows the plain region explanation instead of the button, fetches no
 *      classroom chunk and never touches camera or microphone.
 *   3. Neither path requests media permissions before the click.
 */
/* Resolves whichever Playwright this machine has: the project install
 * first, then a global playwright-core. The old hard-coded npx cache
 * path broke the moment the cache was cleared. */
const { chromium } = await (async () => {
  try { return await import('playwright') } catch { return await import('playwright-core') }
})()

let pass = 0
let fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL ') + m) }

const b = await chromium.launch()

async function openDashboard(country) {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
  const errs = []
  const reqs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  p.on('request', (r) => reqs.push(r.url()))
  await p.addInitScript((cn) => {
    window.__media = []
    const n = navigator.mediaDevices
    if (n) {
      n.getUserMedia = () => { window.__media.push('gum'); return Promise.reject(new Error('x')) }
      n.getDisplayMedia = () => { window.__media.push('gdm'); return Promise.reject(new Error('x')) }
    }
    if (cn) sessionStorage.setItem('tutorpro_visitor_country', cn)
  }, country)
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await p.evaluate(() => {
    const id = 'test-student-1'
    const learner = { id: 'l1', name: 'Test Child', year: 'Year 3', curriculum: 'Cambridge', accessStatus: 'active', achievements: [] }
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([{
      id, role: 'student', status: 'active', parentName: 'Test Parent', email: 't@example.com',
      loginId: 't@example.com', authProvider: 'email', child: learner, children: [learner],
      referralWallet: { freeLessons: 0, coupons: [], coins: 0, xp: 0, transactions: [] }, createdAt: new Date().toISOString(),
    }]))
    sessionStorage.setItem('tutorpro_session_v2', id)
    localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([{
      id: 'b1', studentId: id, teacherId: 'teach1', teacherName: 'Teacher M', learnerName: 'Test Child',
      date: '2026-11-20', time: '10:00', duration: 25, status: 'confirmed', createdAt: new Date().toISOString(),
    }]))
  })
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await p.locator('button.button--primary:has-text("My dashboard")').first().click()
  await p.waitForTimeout(3000)
  return { p, errs, reqs }
}

const classroomChunkRequests = (reqs) => reqs.filter((u) => /OnlineClassroom-[^/]+\.js/.test(u))

// ---- 1. global visitor -------------------------------------------------
let { p, errs, reqs } = await openDashboard('')
ok(await p.locator('.tutorpro-classroom-link').count() === 1, 'global visitor: the Enter private classroom button is back')
ok(!(await p.locator('body').innerText()).includes('Classroom Coming Soon'), 'global visitor: no "Coming Soon" placeholder left')
ok(classroomChunkRequests(reqs).length === 0, 'global visitor: classroom chunk NOT fetched on dashboard load (lazy)')
ok((await p.evaluate(() => window.__media || [])).length === 0, 'global visitor: no camera/mic requested before entering')
await p.locator('.tutorpro-classroom-link').click()
await p.waitForTimeout(6000)
ok(classroomChunkRequests(reqs).length >= 1, 'global visitor: clicking enters the classroom and only then fetches its chunk')
await p.close()

// ---- 2. mainland China visitor -----------------------------------------
;({ p, errs, reqs } = await openDashboard('CN'))
const body = await p.locator('body').innerText()
ok(body.includes('Live class unavailable in your region'), 'china visitor: the region label replaces the button')
ok(body.includes('mainland China networks'), 'china visitor: the plain explanation is visible on the card')
ok(await p.locator('.tutorpro-classroom-link').count() === 0, 'china visitor: no classroom button rendered at all')
ok(classroomChunkRequests(reqs).length === 0, 'china visitor: classroom chunk never fetched')
ok((await p.evaluate(() => window.__media || [])).length === 0, 'china visitor: no camera/mic requested')
ok(errs.length === 0, `china visitor: no JS errors (${JSON.stringify(errs.slice(0, 2))})`)
await p.screenshot({ path: '/home/user/pending/screens/14-china-classroom-gate.png' })
await p.close()

await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
