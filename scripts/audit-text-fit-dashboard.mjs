/**
 * Does the text fit inside the dashboards?
 *
 * Same survey as scripts/audit-text-fit.mjs, but for the screens people
 * actually work in all day: the parent, teacher and administrator
 * dashboards, at phone and tablet widths, section by section.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

const BASE = 'http://localhost:4173'
const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
const TEACHER_ID = '44444444-4444-4444-8444-444444444444'
const STUDENT_ID = '11111111-1111-4111-8111-111111111111'

const LEARNER = `{id:'l1',name:'Ana Mae Cruz',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',goal:'Speaking with confidence',achievements:[]}`
const SLOTS = JSON.stringify([0, 1, 2, 3, 4].flatMap((day) => [`${day}-16:00`, `${day}-16:30`]))

const accounts = `
  {id:'${ADMIN_ID}',role:'admin',status:'active',email:'monettsanga@yahoo.com',loginId:'monettsanga@yahoo.com',authProvider:'email',createdAt:new Date().toISOString(),fullName:'Administrator',parentName:'Administrator',cloudProfile:true},
  {id:'${TEACHER_ID}',role:'teacher',status:'approved',email:'teacher.marianne@example.com',loginId:'teacher.marianne@example.com',authProvider:'email',
    createdAt:new Date().toISOString(),fullName:'Teacher Marianne',cloudProfile:true,
    teacher:{specialization:'Both Curricula',experience:7,languages:'English, Filipino',bio:'Teacher',education:'BA Education',credentials:[],availabilitySlots:${SLOTS},classroom:{platform:'zoom'}}},
  {id:'${STUDENT_ID}',role:'student',status:'active',email:'maria.santos.family@example.com',loginId:'maria.santos.family@example.com',authProvider:'email',
    createdAt:new Date().toISOString(),parentName:'Maria Santos',paidLessonsBalance:8,registrationCountry:'PH',cloudProfile:true,
    paymentRequest:{id:'pr-1',sessions:12,amount:84,rate:7,note:'October block booking',status:'open',createdAt:new Date().toISOString()},
    child:${LEARNER},children:[${LEARNER}]}`

const today = (offset) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const bookings = [
  { id: 'bk-1', teacherId: TEACHER_ID, studentId: STUDENT_ID, learnerId: 'l1', learnerName: 'Ana Mae Cruz', date: today(1), time: '16:00', duration: 25, status: 'confirmed', focus: 'Speaking with confidence', subject: 'english', isTrialClass: true },
  { id: 'bk-2', teacherId: TEACHER_ID, studentId: STUDENT_ID, learnerId: 'l1', learnerName: 'Ana Mae Cruz', date: today(2), time: '16:00', duration: 50, status: 'confirmed', focus: 'Schoolwork and exam support', subject: 'english', isTrialClass: false },
  { id: 'bk-3', teacherId: TEACHER_ID, studentId: STUDENT_ID, learnerId: 'l1', learnerName: 'Ana Mae Cruz', date: today(-3), time: '16:00', duration: 25, status: 'completed', focus: 'Reading comprehension', subject: 'english', isTrialClass: false },
]

const ROLES = {
  admin: { id: ADMIN_ID, sections: ['Overview', 'Teachers', 'Students', 'All bookings', 'Payments', 'Announcements', 'Homework', 'Library', 'Analytics'] },
  teacher: { id: TEACHER_ID, sections: ['Overview', 'My schedule', 'Bookings', 'Availability', 'Courseware', 'Homework', 'My profile'] },
  student: { id: STUDENT_ID, sections: ['Overview', 'Book a class', 'My lessons', 'My teachers', 'Homework', 'Rewards', 'My profile'] },
}

const MEASURE = `(() => {
  const viewport = document.documentElement.clientWidth
  const report = { overflowX: document.documentElement.scrollWidth - viewport, clipped: [], pastEdge: [], tiny: [] }
  const seen = new Set()
  const describe = (el) => {
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''
    return (el.tagName.toLowerCase() + cls).slice(0, 62)
  }
  const textOf = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 42)
  /* Buttons carry a rotated "sheen" pseudo-element that is far wider than
     the button and clipped by overflow:hidden. It is invisible decoration,
     not text that does not fit, so it must not be reported. */
  const decoratedAndClipped = (el) => {
    if (getComputedStyle(el).overflowX !== 'hidden') return false
    return ['::before', '::after'].some((pseudo) => {
      const style = getComputedStyle(el, pseudo)
      return style.content !== 'none' && style.position === 'absolute'
    })
  }
  const insideScroller = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const overflow = getComputedStyle(node).overflowX
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
    return false
  }
  document.querySelectorAll('.portal-content *, .portal-shell > *').forEach((el) => {
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return
    if (style.position === 'fixed') return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const scrollable = ['auto', 'scroll'].includes(style.overflowX)
    const hasOwnText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())
    if (!hasOwnText) return
    if (!scrollable && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 4 && !insideScroller(el) && !decoratedAndClipped(el)) {
      const key = 'clip:' + describe(el)
      if (!seen.has(key)) { seen.add(key); report.clipped.push({ el: describe(el), text: textOf(el), box: el.clientWidth, needs: el.scrollWidth }) }
    }
    if (rect.right > viewport + 1 && rect.left < viewport && !insideScroller(el)) {
      const key = 'edge:' + describe(el)
      if (!seen.has(key)) { seen.add(key); report.pastEdge.push({ el: describe(el), text: textOf(el), over: Math.round(rect.right - viewport) }) }
    }
    const size = parseFloat(style.fontSize)
    if (size && size < 11.5 && textOf(el).length > 2) {
      const key = 'tiny:' + describe(el)
      if (!seen.has(key)) { seen.add(key); report.tiny.push({ el: describe(el), text: textOf(el), size: Math.round(size * 10) / 10 }) }
    }
  })
  return report
})()`

const browser = await chromium.launch()
let problems = 0

for (const viewport of [{ label: 'phone 390', width: 390, height: 844 }, { label: 'tablet 768', width: 768, height: 1024 }, { label: 'tablet 1024', width: 1024, height: 1366 }]) {
  for (const [role, config] of Object.entries(ROLES)) {
    console.log(`\n=============== ${viewport.label} · ${role} ===============`)
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 })
    await page.route('**/paypal.com/**', (route) => route.abort())
    await page.route('**/*.{mp4,webm}', (route) => route.abort())
    await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: config.id }) }))
    await page.route('**/rest/v1/**', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline in this audit"}' }))
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(`
      sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');
      localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${accounts}]));
      localStorage.setItem('tutorpro_bookings_v1', ${JSON.stringify(JSON.stringify(bookings))});
      sessionStorage.setItem('tutorpro_session_v2', '${config.id}');`)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2400)
    const enter = page.locator('button:has-text("My dashboard"):visible').first()
    if (await enter.count()) await enter.click()
    else {
      const burger = page.locator('.menu-button')
      if (await burger.count()) { await burger.click(); await page.waitForTimeout(400) }
      await page.locator('button:has-text("My dashboard"):visible').first().click()
    }
    await page.waitForSelector('.portal-nav', { timeout: 20000 })
    await page.waitForTimeout(1400)

    for (const section of config.sections) {
      const menu = page.locator('.portal-menu')
      if (await menu.count() && await menu.first().isVisible()) { await menu.first().click(); await page.waitForTimeout(350) }
      const item = page.locator(`.portal-nav button:has-text("${section}")`).first()
      if (!(await item.count())) { console.log(`  ??   ${section} — not found`); continue }
      await item.click()
      await page.waitForTimeout(300)
      const scrim = page.locator('.portal-scrim')
      if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
      await page.waitForTimeout(700)
      const report = await page.evaluate(MEASURE)
      const issues = report.clipped.length + report.pastEdge.length + report.tiny.length + (report.overflowX > 1 ? 1 : 0)
      problems += issues
      if (!issues) { console.log(`  ok   ${section}`); continue }
      console.log(`  --   ${section}${report.overflowX > 1 ? `   PAGE SCROLLS SIDEWAYS by ${report.overflowX}px` : ''}`)
      report.pastEdge.slice(0, 5).forEach((i) => console.log(`         past edge +${i.over}px  ${i.el}  "${i.text}"`))
      report.clipped.slice(0, 5).forEach((i) => console.log(`         cut off ${i.box}→${i.needs}px  ${i.el}  "${i.text}"`))
      report.tiny.slice(0, 5).forEach((i) => console.log(`         ${i.size}px text  ${i.el}  "${i.text}"`))
    }
    await page.close()
  }
}

await browser.close()
console.log(`\n${problems} dashboard text-fitting problems found\n`)
process.exit(problems ? 1 : 0)
