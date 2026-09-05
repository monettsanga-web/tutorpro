/**
 * Backup panel — real headless-browser verification against the built site.
 *
 * Checks the panel actually appears in the admin sidebar, renders a real
 * measurement, and that pressing the button produces a genuine download
 * containing real data. Nothing here is asserted from source code alone.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let pass = 0, fail = 0
const ok = (cond, msg) => { cond ? pass++ : fail++; console.log((cond ? '  ok  ' : 'FAIL  ') + msg) }

const seedAdmin = `
  const id='u1';
  const base={id,status:'active',email:'monettsanga@yahoo.com',loginId:'monettsanga@yahoo.com',authProvider:'email',createdAt:new Date().toISOString()};
  const acc={...base,role:'admin',fullName:'TutorPro Online English user',parentName:'TutorPro Online English user'};
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
  localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([{id:'bk1',studentId:'u1',status:'completed',date:'2026-08-01'}]));
  sessionStorage.setItem('tutorpro_session_v2', id);`

const browser = await chromium.launch()
const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tutorpro-backup-'))
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.evaluate(seedAdmin)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await page.locator('button.button--primary:has-text("My dashboard")').first().click()
await page.waitForSelector('.portal-nav', { timeout: 15000 })
await page.waitForTimeout(1800)

/* --- the item exists in the sidebar -------------------------------- */
const navItem = page.locator('.portal-nav button:has-text("Backup & usage")')
ok(await navItem.count() === 1, 'a single "Backup & usage" item exists in the admin sidebar')
ok(await navItem.isVisible(), 'the item is visible without opening anything else')

const group = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.portal-nav button')].find((b) => b.textContent.includes('Backup'))
  const grp = btn?.closest('.portal-nav__group')
  return grp?.querySelector('.portal-nav__heading')?.textContent?.trim() || ''
})
ok(/business/i.test(group), `the item sits under the Business group (found "${group}")`)

/* --- opening the panel --------------------------------------------- */
await navItem.click()
await page.waitForSelector('.backup-view', { timeout: 15000 })
ok(true, 'the panel opens without error')

// Wait for the measurement to finish rather than a fixed sleep.
await page.waitForSelector('.backup-table__row', { timeout: 25000 })

const view = await page.evaluate(() => {
  const v = document.querySelector('.backup-view')
  const gauge = document.querySelector('.backup-gauge__track i')
  const verdict = document.querySelector('.backup-verdict')
  const rows = [...document.querySelectorAll('.backup-table__row')].map((r) => r.textContent.trim())
  const alertBox = document.querySelector('.backup-alert')
  return {
    hasHeading: !!v.querySelector('h1'),
    heading: v.querySelector('h1')?.textContent?.trim(),
    gaugeWidth: gauge ? gauge.style.width : '',
    verdictText: verdict?.textContent?.trim() || '',
    verdictClass: verdict?.className || '',
    rows,
    alertText: alertBox?.textContent?.trim() || '',
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})

ok(view.hasHeading && /Backup and plan usage/i.test(view.heading), `the panel has its heading ("${view.heading}")`)
ok(view.gaugeWidth !== '', `the usage gauge rendered with a real width (${view.gaugeWidth})`)
ok(view.rows.length >= 4, `per-table rows are listed (${view.rows.length} rows)`)
ok(/profiles/i.test(view.rows.join(' ')), 'the profiles table appears in the list')
ok(/bookings/i.test(view.rows.join(' ')), 'the bookings table appears in the list')
ok(view.verdictText.length > 30, 'a plain-English verdict is shown')
ok(/backup/i.test(view.alertText), 'the backup-age reminder is shown')
ok(/no backup taken yet/i.test(view.alertText), 'with no prior backup it says so honestly')
ok(view.overflow <= 2, `no sideways page scroll (${view.overflow}px)`)

/* --- the verdict must be honest for a near-empty database ----------- */
ok(/backup-verdict--safe/.test(view.verdictClass), 'a near-empty database is reported as safe, not as needing an upgrade')
ok(/no reason to pay/i.test(view.verdictText), 'the verdict states plainly that paying is not needed')

/* --- the download actually produces a real file --------------------- */
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.locator('.portal-primary-button:has-text("Download backup")').click(),
])
const file = path.join(downloadDir, download.suggestedFilename())
await download.saveAs(file)
ok(fs.existsSync(file), `a file was really downloaded (${download.suggestedFilename()})`)
ok(/^tutorpro-backup-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), 'the file is named and dated correctly')

const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
ok(parsed.format === 'tutorpro-backup', 'the file identifies itself as a TutorPro backup')
ok(typeof parsed.createdAt === 'string' && parsed.createdAt.length > 10, 'the backup is timestamped')
ok(parsed.tables && typeof parsed.tables === 'object', 'the file contains a tables section')
ok(parsed.local && typeof parsed.local === 'object', 'the file contains this browser\u2019s local data')
ok(Array.isArray(parsed.local.tutorpro_accounts_v2), 'the seeded account really is inside the file')
ok(parsed.local.tutorpro_accounts_v2[0].id === 'u1', 'the account contents are intact, not just the key')
ok(Array.isArray(parsed.local.tutorpro_bookings_v1) && parsed.local.tutorpro_bookings_v1[0].id === 'bk1',
  'the seeded booking really is inside the file')
ok(Array.isArray(parsed.warnings), 'a warnings list is present so a partial backup is visible')
ok(parsed.counts && typeof parsed.counts === 'object', 'row counts are recorded in the file')

/* --- after downloading, the reminder must update -------------------- */
await page.waitForTimeout(900)
const afterText = await page.evaluate(() => document.querySelector('.backup-alert')?.textContent || '')
ok(/last backup today/i.test(afterText), 'the reminder updates to "Last backup today" after downloading')
const afterClass = await page.evaluate(() => document.querySelector('.backup-alert')?.className || '')
ok(/backup-alert--ok/.test(afterClass), 'the reminder turns from a warning into a confirmation')

ok(errors.length === 0, `no JavaScript errors (${errors.slice(0, 2).join(' | ') || 'none'})`)

/* --- mobile ---------------------------------------------------------- */
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await mobile.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await mobile.evaluate(seedAdmin)
await mobile.reload({ waitUntil: 'networkidle' })
await mobile.waitForTimeout(2500)
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
ok(mobileOverflow <= 2, `mobile: no sideways scroll (${mobileOverflow}px)`)
await mobile.close()

await context.close()
await browser.close()
fs.rmSync(downloadDir, { recursive: true, force: true })
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
