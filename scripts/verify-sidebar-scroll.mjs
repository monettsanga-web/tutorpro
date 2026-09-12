/**
 * The mobile dashboard drawer must scroll.
 *
 * Measured on an iPhone SE, the admin sidebar held 19 items totalling
 * 1,433px inside a 667px screen with overflow-y: visible. Ten items sat below
 * the fold and could not be reached at all — Log out was at 1,235px. The
 * scrolling treatment existed but was written inside @media (min-width: 901px),
 * so it only applied to desktop, which is where it was least needed.
 *
 * These checks run the shortest common phone first, because a taller screen
 * can hide the fault entirely.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ROLES = {
  admin: `{id:'a1',role:'admin',status:'active',email:'m@y.com',loginId:'m@y.com',authProvider:'email',
    createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin'}`,
  teacher: `{id:'a1',role:'teacher',status:'approved',email:'t@e.com',loginId:'t@e.com',authProvider:'email',
    createdAt:new Date().toISOString(),fullName:'Teacher M',
    teacher:{specialization:'Both',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}}}`,
  student: `{id:'a1',role:'student',status:'active',email:'p@e.com',loginId:'p@e.com',authProvider:'email',
    createdAt:new Date().toISOString(),parentName:'Maria',
    child:{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]},
    children:[{id:'l1',name:'Ana',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}],
    referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]}}`,
}

const browser = await chromium.launch()

async function openDrawer(page, role) {
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${ROLES[role]}]));
    sessionStorage.setItem('tutorpro_session_v2', 'a1');`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(800)
  await page.locator('.portal-menu').click()
  await page.waitForSelector('.portal-sidebar--open', { timeout: 8000 })
  await page.waitForTimeout(500)
}

for (const [device, width, height] of [['iPhone SE', 375, 667], ['iPhone 14', 390, 844]]) {
  for (const role of ['admin', 'teacher', 'student']) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true })
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await openDrawer(page, role)
    const tag = `${device} · ${role}`

    const s = await page.evaluate(() => {
      const side = document.querySelector('.portal-sidebar')
      const nav = document.querySelector('.portal-nav')
      const foot = document.querySelector('.portal-sidebar__foot')
      const brand = document.querySelector('.portal-brand')
      return {
        items: nav.querySelectorAll('button').length,
        overflowY: getComputedStyle(nav).overflowY,
        sideFits: side.getBoundingClientRect().height <= window.innerHeight + 1,
        sideNoSelfScroll: side.scrollHeight <= side.clientHeight + 1,
        brandVisible: brand.getBoundingClientRect().top >= -1,
        footVisible: foot.getBoundingClientRect().bottom <= window.innerHeight + 1,
        needsScroll: nav.scrollHeight > nav.clientHeight + 1,
      }
    })

    ok(s.overflowY === 'auto', `${tag}: the item list scrolls (overflow-y: ${s.overflowY})`)
    ok(s.sideFits, 'the drawer fits the screen height')
    ok(s.sideNoSelfScroll, 'the drawer itself does not scroll — only the list inside it does')
    ok(s.brandVisible, 'the brand stays pinned at the top')
    ok(s.footVisible, `the account block and Log out stay visible without scrolling`)

    /* Every item must be reachable, which is the whole point. */
    const reach = await page.evaluate(() => {
      const nav = document.querySelector('.portal-nav')
      nav.scrollTop = nav.scrollHeight
      return new Promise((res) => setTimeout(() => {
        const items = [...nav.querySelectorAll('button')]
        const last = items[items.length - 1]
        const nb = nav.getBoundingClientRect(), lb = last.getBoundingClientRect()
        res({
          atBottom: Math.abs(nav.scrollTop - (nav.scrollHeight - nav.clientHeight)) <= 2,
          lastInView: lb.top >= nb.top - 1 && lb.bottom <= nb.bottom + 1,
          lastText: last.textContent.trim().slice(0, 20),
        })
      }, 350))
    })
    if (s.needsScroll) {
      ok(reach.atBottom, `${tag}: the list can be scrolled to its end`)
      ok(reach.lastInView, `${tag}: the final item ("${reach.lastText}") becomes visible`)
    } else {
      ok(true, `${tag}: all ${s.items} items fit without scrolling`)
      ok(true, `${tag}: nothing is out of reach`)
    }

    // And it must actually be usable, not just visible.
    const clicked = await page.locator('.portal-nav button').last()
      .click({ timeout: 5000 }).then(() => true).catch(() => false)
    ok(clicked, `${tag}: the final item can actually be tapped`)

    ok(errors.length === 0, `${tag}: no JavaScript errors`)
    await page.close()
  }
}

/* Desktop must keep its existing behaviour. */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${ROLES.admin}]));
    sessionStorage.setItem('tutorpro_session_v2', 'a1');`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(700)
  const d = await page.evaluate(() => {
    const nav = document.querySelector('.portal-nav')
    const foot = document.querySelector('.portal-sidebar__foot')
    return {
      overflowY: getComputedStyle(nav).overflowY,
      footVisible: foot.getBoundingClientRect().bottom <= window.innerHeight + 1,
      noMenuButton: getComputedStyle(document.querySelector('.portal-menu')).display === 'none',
    }
  })
  ok(d.overflowY === 'auto', 'desktop: the sidebar list still scrolls as before')
  ok(d.footVisible, 'desktop: the account block is still pinned and visible')
  ok(d.noMenuButton, 'desktop: the mobile menu button stays hidden')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
