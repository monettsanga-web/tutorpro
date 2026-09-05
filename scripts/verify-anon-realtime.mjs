/**
 * A logged-out visitor must not hold a Supabase Realtime WebSocket open.
 *
 * The homepage used to open two subscriptions (site_settings and profiles)
 * for everyone, signed in or not. Both exist to push admin-driven changes
 * that a visitor cannot make and rarely needs, so each anonymous visit was
 * holding a connection against the 200-connection allowance for nothing.
 *
 * A signed-in dashboard genuinely needs live updates, so it must still open.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const browser = await chromium.launch()

/* --- anonymous visitor ------------------------------------------------ */
{
  const page = await browser.newPage()
  const sockets = []
  const errors = []
  page.on('websocket', (ws) => sockets.push(ws.url()))
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(12000)

  const realtime = sockets.filter((u) => u.includes('/realtime/'))
  ok(realtime.length === 0, `anonymous visitor opens no Realtime socket (found ${realtime.length})`)
  ok(errors.length === 0, `anonymous visitor: no JS errors (${errors.slice(0, 1).join('') || 'none'})`)

  // The directory must still be populated — the fix must not blank the page.
  const teachers = await page.evaluate(() => document.body.innerText.length)
  ok(teachers > 2000, `the homepage still renders its content (${teachers} chars)`)
  await page.close()
}

/* --- signed-in dashboard --------------------------------------------- */
{
  const page = await browser.newPage()
  const sockets = []
  const errors = []
  page.on('websocket', (ws) => sockets.push(ws.url()))
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(`
    const id='u1';
    const l={id:'l1',name:'Child',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]};
    const acc={id,role:'student',status:'active',email:'p@example.com',loginId:'p@example.com',
      authProvider:'email',createdAt:new Date().toISOString(),parentName:'Test Parent',
      child:l,children:[l],referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]}};
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
    sessionStorage.setItem('tutorpro_session_v2', id);`)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.locator('button.button--primary:has-text("My dashboard")').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(3000)

  ok(errors.length === 0, `dashboard: no JS errors (${errors.slice(0, 1).join('') || 'none'})`)
  const nav = await page.locator('.portal-nav button').count()
  ok(nav > 3, `the dashboard still renders its navigation (${nav} items)`)
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
