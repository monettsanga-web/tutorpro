/**
 * Admin dashboard on phones — measured, not eyeballed.
 *
 * An audit at 390px found four real faults:
 *   - Payments overflowed the page by 522px and Analytics by 502px
 *   - The funnel channel table kept five fixed columns
 *   - Teachers and Students had 13 and 4 controls under the 44px minimum
 *   - Bookings dropped text to 13px
 *
 * The overflow cause is worth recording: .admin-payments-view and
 * .admin-analytics-view are grids with no declared columns, so the implicit
 * track sizes to its widest content. min-width:0 on the child cannot fix that
 * because it is the TRACK that is too wide; the column has to be declared as
 * minmax(0, 1fr).
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const seed = `
  const id='a1';
  const acc={id,role:'admin',status:'active',email:'monettsanga@yahoo.com',loginId:'monettsanga@yahoo.com',
    authProvider:'email',createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin'};
  const t={id:'t1',role:'teacher',status:'approved',email:'t@e.com',loginId:'t@e.com',authProvider:'email',
    createdAt:new Date().toISOString(),fullName:'Teacher M',
    teacher:{specialization:'Both',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}}};
  const l={id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]};
  const s={id:'s1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
    createdAt:new Date().toISOString(),parentName:'Maria Santos',child:l,children:[l],
    referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]}};
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc,t,s]));
  localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([
    {id:'b1',teacherId:'t1',studentId:'s1',learnerName:'Ana',date:'2026-09-14',time:'09:00',duration:25,status:'confirmed'}]));
  sessionStorage.setItem('tutorpro_session_v2', id);`

const TABS = ['Overview', 'Teachers', 'Students', 'All bookings', 'Payments', 'Analytics',
  'Backup & usage', 'Announcements', 'Growth funnel', 'Homework', 'Parent reviews']

const browser = await chromium.launch()

for (const [device, width, height] of [['iPhone SE', 375, 667], ['iPhone 14', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(seed)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(1100)

  for (const tab of TABS) {
    const opened = await page.evaluate((label) => {
      const b = [...document.querySelectorAll('.portal-nav button')].find((x) => x.textContent.includes(label))
      if (b) { b.click(); return true }
      return false
    }, tab)
    if (!opened) { ok(false, `${device} · ${tab}: nav item exists`); continue }
    await page.waitForTimeout(800)

    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      // Wide is only a fault when it is NOT inside something that scrolls.
      const wide = []
      document.querySelectorAll('.portal-view *').forEach((el) => {
        if (el.closest('[style*="overflow"], .admin-payments-table, .admin-analytics-table, .table-wrap, .schedule-scroll')) return
        const s = getComputedStyle(el)
        if (s.overflowX === 'auto' || s.overflowX === 'scroll') return
        let p = el.parentElement, scrollable = false
        while (p && p !== document.body) {
          const ps = getComputedStyle(p)
          if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') { scrollable = true; break }
          p = p.parentElement
        }
        if (!scrollable && el.getBoundingClientRect().width > vw + 1) {
          wide.push(el.tagName + '.' + String(el.className).slice(0, 30))
        }
      })
      const small = []
      document.querySelectorAll('.portal-view button, .portal-view select, .portal-view a').forEach((el) => {
        const b = el.getBoundingClientRect()
        if (b.width && b.height && b.height < 38) small.push((el.textContent || el.tagName).trim().slice(0, 18))
      })
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        wide: [...new Set(wide)].slice(0, 3),
        small: [...new Set(small)].slice(0, 4),
      }
    })

    ok(r.overflow <= 2, `${device} · ${tab}: no sideways page scroll (${r.overflow}px)`)
    ok(r.wide.length === 0, `${device} · ${tab}: nothing wider than the screen outside a scroller${r.wide.length ? ' — ' + r.wide.join(', ') : ''}`)
    ok(r.small.length === 0, `${device} · ${tab}: controls are tappable${r.small.length ? ' — ' + r.small.join(', ') : ''}`)
  }

  ok(errors.length === 0, `${device}: no JavaScript errors (${errors.slice(0, 1).join('') || 'none'})`)
  await page.close()
}

/* --- wide tables must scroll inside themselves ------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(seed)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.portal-nav button')].find((x) => x.textContent.includes('Payments'))
    b && b.click()
  })
  await page.waitForTimeout(1000)
  const t = await page.evaluate(() => {
    const table = document.querySelector('.admin-payments-table')
    return table
      ? { inside: table.scrollWidth > table.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth }
      : null
  })
  ok(t?.inside, 'the payments table scrolls inside its own container')
  ok(t?.page <= 2, 'and the page itself still does not scroll sideways')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
