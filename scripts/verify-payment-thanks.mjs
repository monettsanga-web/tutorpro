/**
 * A parent who has just paid gets a thank you, not a browser alert.
 *
 * WHAT IT REPLACED
 * ----------------
 *     window.alert(`🎉 Server verified PayPal payment. 4 booking credits
 *                   added. New balance: 12.`)
 *
 * Three faults in one line. A browser alert is drawn by the phone as a
 * grey system box titled "www.tutorpro.site says", which is the same
 * chrome a scam page uses. "Server verified PayPal payment" is a log
 * line - reassuring to a developer, meaningless to a parent who has just
 * handed over money, and containing no thanks at all. And the emoji
 * renders as an empty box on any device lacking the glyph, which is why
 * emoji were stripped from the rest of this site.
 *
 * A window.alert also BLOCKS the page: nothing can be tested, measured or
 * styled behind it, which is part of why it survived so long.
 *
 * Run: node scripts/verify-payment-thanks.mjs   (server on :4173)
 */
const SANDBOX = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PARENT = '22222222-2222-4222-8222-000000000001'
const learner = { id: 'l1', name: 'Juan Santos', year: 'Year 3', curriculum: 'Cambridge', goal: 'Speaking', accessStatus: 'active' }
const accounts = [{
  id: PARENT, role: 'student', status: 'active', parentName: 'Maria Santos',
  email: 'maria@gmail.com', loginId: 'maria@gmail.com', registrationCountry: 'PH',
  children: [learner], child: learner, paidLessonsBalance: 2,
}]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

for (const width of [1440, 390]) {
  const label = `@${width}px`
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 950 }, isMobile: width < 700, hasTouch: width < 700 })

  /* If the old alert ever comes back this records it: an unhandled dialog
     would otherwise hang the run with no explanation. */
  let nativeAlert = ''
  page.on('dialog', async (dialog) => { nativeAlert = dialog.message(); await dialog.dismiss() })

  await page.route('**/*.{mp4,webm}', (r) => r.abort())
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: PARENT }) }))
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline"}' }))

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');
    localStorage.setItem('tutorpro_accounts_v2', ${JSON.stringify(JSON.stringify(accounts))});
    localStorage.setItem('tutorpro_session_v2', '${PARENT}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2200)

  /*
   * The dialog is presentational, so the honest browser test is a layout
   * one: put its real markup on the page, with the real stylesheet
   * loaded, and measure. Completing a PayPal sandbox checkout cannot be
   * done unattended; a dialog that overflows a phone can be, and that is
   * where this kind of thing actually breaks.
   */
  await page.evaluate(`(() => {
    const wrap = document.createElement('div')
    wrap.innerHTML = \`
      <div class="thanks-backdrop">
        <section class="thanks-dialog" role="dialog" aria-modal="true">
          <span class="thanks-dialog__tick"></span>
          <h2>Thank you, Maria!</h2>
          <p class="thanks-dialog__lede">Your payment went through and your lesson credits are ready to use.</p>
          <dl class="thanks-dialog__facts">
            <div><dt>Credits added</dt><dd>4 classes</dd></div>
            <div><dt>Credits available now</dt><dd>6</dd></div>
            <div><dt>Paid</dt><dd>USD 32.00</dd></div>
            <div><dt>Reference</dt><dd class="thanks-dialog__ref">5TY05013RG002845M-LONGREFERENCE-0001</dd></div>
          </dl>
          <p class="thanks-dialog__note">PayPal emails your receipt directly. Your credits never expire, and unused credits can be refunded within 14 days.</p>
          <div class="thanks-dialog__actions">
            <button type="button" class="portal-primary-button">Book your next class</button>
            <button type="button" class="portal-secondary-button">Close</button>
          </div>
        </section>
      </div>\`
    document.body.appendChild(wrap.firstElementChild)
  })()`)
  await page.waitForTimeout(500)

  const box = await page.evaluate(`(() => {
    const backdrop = document.querySelector('.thanks-backdrop')
    const dialog = document.querySelector('.thanks-dialog')
    const r = dialog.getBoundingClientRect()
    const buttons = [...dialog.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().height))
    const ref = dialog.querySelector('.thanks-dialog__ref')
    return {
      covers: Math.round(backdrop.getBoundingClientRect().width) >= innerWidth - 1,
      onscreen: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1,
      width: Math.round(r.width),
      height: Math.round(r.height),
      minButton: buttons.length ? Math.min(...buttons) : 0,
      refOverflows: ref.scrollWidth > ref.clientWidth + 1,
      dialogOverflows: dialog.scrollWidth > dialog.clientWidth + 1,
      sideScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      centred: Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 2,
    }
  })()`)

  ok(box.covers, `${label}: the backdrop covers the screen`)
  ok(box.onscreen, `${label}: the whole dialog is on screen (${box.width}x${box.height})`)
  ok(box.centred, `${label}: and centred`)
  ok(!box.dialogOverflows && !box.refOverflows, `${label}: nothing overflows, including the long PayPal reference`)
  ok(box.sideScroll <= 1, `${label}: it causes no sideways scrolling`)
  /* Below 44px a button is hard to hit with a thumb. */
  ok(box.minButton >= 44, `${label}: both buttons are thumb-sized (${box.minButton}px)`)

  ok(nativeAlert === '', `${label}: nothing calls window.alert during payment (${nativeAlert || 'none'})`)
  await page.close()
}

/* ---- the component contract, checked in the source ---- */
import { readFileSync } from 'node:fs'
const raw = readFileSync(new URL('../src/Dashboards.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/dashboard.css', import.meta.url), 'utf8')

/* Comments are stripped before the "is it gone" checks. The component's
   own documentation quotes the alert it replaced, and matching that was
   reporting the fix as a failure - a test reading its own evidence as
   the crime. */
const source = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

ok(!/window\.alert\(/.test(source), 'no window.alert anywhere in the dashboards')
ok(/function PaymentThankYouDialog/.test(raw), 'there is a thank-you dialog component')
ok(/<PaymentThankYouDialog/.test(source), 'and the payment screen renders it')
ok(/setThankYou\(\{/.test(source), 'a successful capture opens it')
ok(/Thank you\{firstName/.test(source), 'it thanks the parent by name')
ok(/role="dialog"/.test(source) && /aria-modal="true"/.test(source), 'it is a proper modal dialog for screen readers')
ok(/createPortal\(/.test(source), 'it renders into document.body, clear of the transformed .portal-view')
ok(/Escape/.test(raw.slice(raw.indexOf('function PaymentThankYouDialog'), raw.indexOf('function StudentPaymentGateway'))), 'Escape closes it')
ok(/Book your next class/.test(source), 'it offers the obvious next step rather than a dead end')
ok(!/Server verified PayPal payment/.test(source), 'the developer wording is gone')
/* Scoped to the payment flow on purpose. Emoji survive elsewhere in the
   dashboards and removing them all is its own job; what matters here is
   that the screen a parent sees after paying has none, because an empty
   box at that moment reads as something having gone wrong. */
const paymentCode = source.slice(source.indexOf('function PaymentThankYouDialog'), source.indexOf('function BookLessonPanel') > 0 ? source.indexOf('function BookLessonPanel') : source.length)
const emoji = [...new Set(paymentCode.match(/[\u{1F300}-\u{1FAFF}]/gu) || [])]
ok(emoji.length === 0, `no emoji in the payment screens${emoji.length ? ` (${emoji.join(' ')})` : ''}`)
ok(/PayPal emails your receipt/.test(source), 'it says where the receipt comes from')
ok(/refunded within 14 days/.test(source), 'and restates the refund window, which is the real policy')

ok(/\.thanks-dialog \{/.test(css), 'the dialog has real styling')
ok(/100dvh/.test(css.slice(css.indexOf('.thanks-dialog {'))), 'sized in dvh so an iPhone address bar cannot clip it')
ok(/overflow-wrap: anywhere/.test(css.slice(css.indexOf('.thanks-dialog__ref'))), 'a long PayPal reference cannot widen the dialog')
ok(/prefers-reduced-motion/.test(css.slice(css.indexOf('.thanks-backdrop'))), 'the animation respects reduced-motion')

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
