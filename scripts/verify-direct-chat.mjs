/**
 * The direct chat is a docked panel that does not block the dashboard,
 * and a person's name opens it.
 *
 * WHAT IT REPLACED
 * ----------------
 * A `portal-dialog-backdrop` at z-index 9999: a dark sheet over the whole
 * dashboard with a fixed 450x550 box in the middle, built from inline
 * styles. You could not look at the booking, the schedule or the student's
 * profile while typing a message about them. On a phone the fixed 550px
 * height overflowed short screens and the keyboard covered the input.
 *
 * It also could not be reached from the admin dashboard at all.
 */
const SANDBOX = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX))
import { mkdirSync } from 'node:fs'
mkdirSync('/home/user/tutorpro/shots', { recursive: true })

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN = '11111111-1111-4111-8111-111111111111'
const PARENT = '22222222-2222-4222-8222-000000000001'
const learner = { id: 'l1', name: 'Juan Santos', year: 'Year 3', curriculum: 'Cambridge', goal: 'Speaking with confidence', accessStatus: 'active' }
const accounts = [
  { id: ADMIN, role: 'admin', status: 'active', parentName: 'Monett', fullName: 'Monett', email: 'admin@tutorpro.site', loginId: 'admin@tutorpro.site' },
  { id: PARENT, role: 'student', status: 'active', parentName: 'Maria Santos', email: 'maria@gmail.com', loginId: 'maria@gmail.com', registrationCountry: 'PH', children: [learner], child: learner },
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function adminStudents(width) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 950 }, isMobile: width < 700, hasTouch: width < 700 })
  await page.route('**/paypal.com/**', (r) => r.abort())
  await page.route('**/*.{mp4,webm}', (r) => r.abort())
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: ADMIN }) }))
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline"}' }))
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');
    localStorage.setItem('tutorpro_accounts_v2', ${JSON.stringify(JSON.stringify(accounts))});
    localStorage.setItem('tutorpro_session_v2', '${ADMIN}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2400)
  const enter = page.locator('button:has-text("My dashboard"):visible').first()
  if (await enter.count()) await enter.click()
  else {
    const b = page.locator('.menu-button'); if (await b.count()) { await b.click(); await page.waitForTimeout(400) }
    await page.locator('button:has-text("My dashboard"):visible').first().click()
  }
  await page.waitForSelector('.portal-nav', { timeout: 20000 })
  const menu = page.locator('.portal-menu')
  if (await menu.count() && await menu.first().isVisible()) { await menu.first().click(); await page.waitForTimeout(350) }
  await page.locator('.portal-nav button:has-text("Students")').first().click()
  await page.waitForTimeout(800)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
  await page.evaluate("document.querySelectorAll('.sync-health-banner, .portal-error').forEach((e) => e.remove())")
  await page.waitForTimeout(500)
  return page
}

/* ---------- desktop ---------- */
const page = await adminStudents(1440)

const nameButton = page.locator('.chat-name-button', { hasText: 'Maria Santos' }).first()
ok(await nameButton.count() > 0, 'the family name in Admin → Students is clickable')

await nameButton.click()
await page.waitForTimeout(700)

const chat = page.locator('.direct-chat')
ok(await chat.count() > 0, 'clicking the name opens the chat — the admin had no direct chat at all before')

const shape = await page.evaluate(`(() => {
  const el = document.querySelector('.direct-chat')
  if (!el) return null
  const s = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return {
    position: s.position,
    right: Math.round(innerWidth - r.right),
    bottom: Math.round(innerHeight - r.bottom),
    width: Math.round(r.width),
    height: Math.round(r.height),
    fitsVertically: r.top >= 0 && r.bottom <= innerHeight + 1,
    blockingBackdrop: Boolean(document.querySelector('.portal-dialog-backdrop')),
    title: el.querySelector('.direct-chat__head strong')?.textContent?.trim(),
    dashboardStillVisible: Boolean(document.querySelector('.admin-table__row')),
    inlineStyled: el.getAttribute('style') || '',
  }
})()`)
ok(shape.position === 'fixed', 'it is pinned to the viewport')
ok(shape.right < 40 && shape.bottom < 40, `docked to the bottom-right corner (${shape.right}px from the right, ${shape.bottom}px from the bottom)`)
ok(!shape.blockingBackdrop, 'there is no dark backdrop over the dashboard any more')
ok(shape.dashboardStillVisible, 'the student list is still on screen and readable behind it')
ok(shape.fitsVertically, `the panel fits on screen (${shape.height}px tall)`)
ok(shape.title === 'Maria Santos', `the header names the person (${shape.title})`)
ok(!shape.inlineStyled, 'the panel is styled by a stylesheet, not by inline styles')

/* The empty state used an emoji, which draws an empty box where the OS has
   no glyph — the same fault already removed elsewhere on this site. */
const emptyText = await page.locator('.direct-chat__empty').innerText().catch(() => '')
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(emptyText), 'no emoji in the empty state')
ok(/No messages yet/.test(emptyText), 'the empty state explains what to do')

/* Typing must work and the compose box must be reachable. */
await page.fill('.direct-chat__compose input', 'Hello, this is a test')
const composeOk = await page.evaluate(`(() => {
  const input = document.querySelector('.direct-chat__compose input')
  const r = input.getBoundingClientRect()
  return { value: input.value, visible: r.top >= 0 && r.bottom <= innerHeight + 1, fontSize: parseFloat(getComputedStyle(input).fontSize) }
})()`)
ok(composeOk.value === 'Hello, this is a test', 'you can type a message')
ok(composeOk.visible, 'the compose box is on screen')
/* Below 16px, iOS Safari zooms the page in on focus and never zooms back. */
ok(composeOk.fontSize >= 16, `the input is at least 16px so iOS does not zoom the page (${composeOk.fontSize}px)`)

await page.screenshot({ path: '/home/user/tutorpro/shots/chat-desktop.png' })

/* Escape closes it. */
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
ok(await page.locator('.direct-chat').count() === 0, 'Escape closes the chat')
await page.close()

/* ---------- phone ---------- */
const phone = await adminStudents(390)
await phone.locator('.chat-name-button', { hasText: 'Maria Santos' }).first().click()
await phone.waitForTimeout(700)
const small = await phone.evaluate(`(() => {
  const el = document.querySelector('.direct-chat')
  const r = el.getBoundingClientRect()
  const input = el.querySelector('.direct-chat__compose input').getBoundingClientRect()
  const msgs = el.querySelector('.direct-chat__messages')
  return {
    fullWidth: Math.round(r.width) >= innerWidth - 1,
    coversScreen: Math.round(r.height) >= innerHeight - 2,
    inputOnScreen: input.bottom <= innerHeight + 1,
    messagesScroll: getComputedStyle(msgs).overflowY,
    sideScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bottomBarHidden: !document.querySelector('.mobile-guest-action-bar')
      || getComputedStyle(document.querySelector('.mobile-guest-action-bar')).display === 'none',
  }
})()`)
ok(small.fullWidth, 'on a phone it uses the full width')
ok(small.coversScreen, 'as a full-height sheet rather than a 550px box on a short screen')
ok(small.inputOnScreen, 'the compose box is on screen')
ok(small.messagesScroll === 'auto' || small.messagesScroll === 'scroll', 'the message list scrolls, so the input stays put')
ok(small.sideScroll <= 1, `no sideways scrolling (${small.sideScroll}px)`)
ok(small.bottomBarHidden, 'the floating bottom bars are hidden while chatting, instead of sitting on the compose box')
await phone.screenshot({ path: '/home/user/tutorpro/shots/chat-phone.png' })
await phone.close()

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
