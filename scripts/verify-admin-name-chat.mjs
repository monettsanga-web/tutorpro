/**
 * Clicking a person's name in the admin dashboard opens THAT person's
 * conversation, docked, without leaving the page.
 *
 * WHAT IT REPLACED
 * ----------------
 * The admin dashboard had two different behaviours and neither was this:
 *
 *  1. A name in the Students or Teachers table opened a DIRECT message.
 *     Parents and teachers have no inbox for direct messages, so whatever
 *     the administrator typed could never be read by the person it was
 *     addressed to.
 *  2. The Message button on a student or teacher profile created a support
 *     conversation and then threw the whole page over to the support
 *     inbox, closing the profile. The inbox then opened whichever
 *     conversation was first in the list, because `initialConversationId`
 *     was passed to SupportInbox and SupportInbox never declared the prop.
 *
 * Both now open the person's support conversation in the docked panel -
 * the same conversation the parent or teacher sees in their own Messages
 * page, so a reply arrives somewhere they can read it.
 *
 * Run: node scripts/verify-admin-name-chat.mjs   (server on :4173)
 */
const SANDBOX = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN = '11111111-1111-4111-8111-111111111111'
const PARENT = '22222222-2222-4222-8222-000000000001'
const TEACHER = '33333333-3333-4333-8333-000000000001'
const CONV_PARENT = 'aaaaaaaa-0000-4000-8000-000000000001'
const CONV_OTHER = 'aaaaaaaa-0000-4000-8000-000000000002'

const learner = { id: 'l1', name: 'Juan Santos', year: 'Year 3', curriculum: 'Cambridge', goal: 'Speaking', accessStatus: 'active' }
const accounts = [
  { id: ADMIN, role: 'admin', status: 'active', parentName: 'Monett', fullName: 'Monett', email: 'admin@tutorpro.site', loginId: 'admin@tutorpro.site' },
  { id: PARENT, role: 'student', status: 'active', parentName: 'Maria Santos', email: 'maria@gmail.com', loginId: 'maria@gmail.com', registrationCountry: 'PH', children: [learner], child: learner },
  { id: TEACHER, role: 'teacher', status: 'approved', fullName: 'Teacher M', parentName: 'Teacher M', email: 'teacherm@tutorpro.site', loginId: 'teacherm@tutorpro.site', teacher: { specialization: 'General English', experience: 5, languages: 'English', bio: 'Hi', education: 'BA', credentials: [] } },
]

/* Two conversations, and the one the admin wants is deliberately NOT first:
   the old code always opened the first one. */
const conversations = [
  { id: CONV_OTHER, parent_name: 'Someone Else', parent_email: 'other@example.com', email: 'other@example.com', last_message: 'Hello', updated_at: '2026-10-01T00:00:00Z', unread_count: 0, status: 'open' },
  { id: CONV_PARENT, parent_name: 'Maria Santos', parent_email: 'maria@gmail.com', email: 'maria@gmail.com', last_message: 'Thanks', updated_at: '2026-10-02T00:00:00Z', unread_count: 1, status: 'open' },
]
const threads = {
  [CONV_OTHER]: { id: CONV_OTHER, parentName: 'Someone Else', email: 'other@example.com', language: 'en', status: 'open', messages: [{ id: 'm9', sender: 'parent', body: 'Hello from someone else', createdAt: '2026-10-01T00:00:00Z' }] },
  [CONV_PARENT]: { id: CONV_PARENT, parentName: 'Maria Santos', email: 'maria@gmail.com', language: 'en', status: 'open', messages: [{ id: 'm1', sender: 'parent', body: 'Is Friday free?', createdAt: '2026-10-02T00:00:00Z' }] },
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function adminPage(width) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 950 }, isMobile: width < 700, hasTouch: width < 700 })
  await page.route('**/paypal.com/**', (r) => r.abort())
  await page.route('**/*.{mp4,webm}', (r) => r.abort())
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: ADMIN }) }))

  /* The catch-all MUST be registered first: Playwright matches routes in
     reverse registration order, so a catch-all added last would swallow
     every RPC below it. */
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline"}' }))
  await page.route('**/rest/v1/support_conversations**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(conversations) }))
  await page.route('**/rest/v1/rpc/get_admin_support_conversations', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(conversations) }))
  await page.route('**/rest/v1/rpc/get_admin_support_thread', (r) => {
    const body = JSON.parse(r.request().postData() || '{}')
    const thread = threads[body.target_conversation_id] || null
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(thread) })
  })

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
  return page
}

async function openSection(page, label) {
  const menu = page.locator('.portal-menu')
  if (await menu.count() && await menu.first().isVisible()) { await menu.first().click(); await page.waitForTimeout(400) }
  await page.locator(`.portal-nav button:has-text("${label}")`).first().click()
  await page.waitForTimeout(900)
  const scrim = page.locator('.portal-scrim')
  if (await scrim.count() && await scrim.first().isVisible()) { await scrim.first().click(); await page.waitForTimeout(300) }
  await page.evaluate("document.querySelectorAll('.sync-health-banner, .portal-error').forEach((e) => e.remove())")
}

for (const width of [1440, 390]) {
  const label = `@${width}px`
  const page = await adminPage(width)

  /* ---------- a family name in the Students table ---------- */
  await openSection(page, 'Students')
  const name = page.locator('.chat-name-button', { hasText: 'Maria Santos' }).first()
  ok(await name.count() > 0, `${label}: the family name in Students is clickable`)
  await name.click()
  await page.waitForTimeout(1600)

  const panel = await page.evaluate(`(() => {
    const el = document.querySelector('.support-admin-thread--docked')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      position: getComputedStyle(el).position,
      width: Math.round(r.width),
      height: Math.round(r.height),
      right: Math.round(innerWidth - r.right),
      bottom: Math.round(innerHeight - r.bottom),
      onscreen: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
      who: el.querySelector('header strong')?.textContent?.trim(),
      body: el.innerText,
      stillOnStudents: Boolean(document.querySelector('.admin-table__row')),
      directChat: Boolean(document.querySelector('.direct-chat')),
      sideScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })()`)

  ok(Boolean(panel), `${label}: clicking the name opens a chat panel`)
  ok(panel && panel.position === 'fixed', `${label}: it is pinned to the viewport`)
  ok(panel && panel.onscreen, `${label}: the whole panel is on screen (${panel?.width}x${panel?.height})`)
  ok(panel && panel.sideScroll <= 1, `${label}: no sideways scrolling`)
  ok(panel && panel.who === 'Maria Santos', `${label}: it opens THAT person's conversation, not the first one in the list (${panel?.who})`)
  ok(panel && /Is Friday free\?/.test(panel.body), `${label}: her real messages are in it`)
  ok(panel && !panel.directChat, `${label}: it is the support conversation, not a direct message the parent cannot read`)
  ok(panel && panel.stillOnStudents, `${label}: the Students list is still on screen — the page did not jump to the inbox`)
  if (width >= 700) ok(panel.right < 40 && panel.bottom < 40, `${label}: docked in the bottom-right corner`)
  else ok(panel.width >= 389, `${label}: on a phone it is a full-width sheet`)

  /* The reply box must be usable. */
  const compose = await page.evaluate(`(() => {
    const t = document.querySelector('.support-admin-thread--docked textarea')
    if (!t) return null
    const r = t.getBoundingClientRect()
    return { onscreen: r.bottom <= innerHeight + 1, fontSize: parseFloat(getComputedStyle(t).fontSize) }
  })()`)
  ok(compose && compose.onscreen, `${label}: the reply box is on screen`)
  ok(compose && compose.fontSize >= 16, `${label}: the reply box is at least 16px so iOS does not zoom (${compose?.fontSize}px)`)

  const close = page.locator('.support-admin-thread--docked .support-admin-dismiss').first()
  ok(await close.count() > 0, `${label}: it has a close button`)
  await close.click()
  await page.waitForTimeout(500)
  ok(await page.locator('.support-admin-thread--docked').count() === 0, `${label}: closing it actually closes it`)

  /* ---------- a teacher's name ---------- */
  await openSection(page, 'Teachers')
  const tName = page.locator('.chat-name-button', { hasText: 'Teacher M' }).first()
  ok(await tName.count() > 0, `${label}: the teacher's name is clickable too`)

  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
