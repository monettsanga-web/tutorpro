/**
 * The dashboard has to be able to tell the owner whether booking emails
 * are still going out in the wrong language.
 *
 * Email wording lives inside a Supabase Edge Function. Pushing a fix to
 * this website does not change it — the function must be redeployed by
 * hand — and until now there was no way to know which version was live
 * except to book a lesson and read the email that arrived. That is how a
 * bilingual English/Chinese template kept going out unnoticed.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
const accounts = `{id:'${ADMIN_ID}',role:'admin',status:'active',email:'m@y.com',loginId:'m@y.com',authProvider:'email',
  createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin',cloudProfile:true}`

const browser = await chromium.launch()

async function openAdmin(functionHandler) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.route('**/paypal.com/**', (route) => route.abort())
  await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: ADMIN_ID }) }))
  await page.route('**/rest/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"offline in this test"}' }))
  await page.route('**/functions/v1/booking-notification', functionHandler)

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro-supabase-auth', JSON.stringify({
      access_token: 'admin-token', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
      user: { id: '${ADMIN_ID}', aud: 'authenticated', role: 'authenticated', email: 'm@y.com', created_at: new Date().toISOString() },
    }));
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${accounts}]));
    sessionStorage.setItem('tutorpro_session_v2', '${ADMIN_ID}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(1500)
  return page
}

/* ================================================================== */
console.log('\n--- the old bilingual template is reported, with the fix ---')
{
  let sent = 0
  // What the CURRENTLY DEPLOYED function does with an unknown body: refuse.
  const page = await openAdmin((route) => {
    sent += 1
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid booking notification request' }) })
  })

  const card = page.locator('.admin-email-check')
  ok(await card.count() === 1, 'the check is on the first screen the owner sees')
  const intro = (await card.innerText()).replace(/\s+/g, ' ')
  ok(/Are booking emails in the right language\?/.test(intro), 'it asks the question in plain words')
  ok(/stored in Supabase, not on this website/.test(intro), 'and explains why the website updating is not enough')

  await card.locator('button:has-text("Run check")').click()
  await page.waitForTimeout(2000)

  ok(sent >= 1, `the check actually calls the email service (${sent})`)
  const result = page.locator('.admin-email-check__result')
  ok(await result.count() === 1, 'an answer is shown')
  ok((await result.getAttribute('class')).includes('is-bad'), 'an out-of-date template is flagged as a problem')
  const text = (await result.innerText()).replace(/\s+/g, ' ')
  ok(/Still sending the old English \+ Chinese email/.test(text), `it names the exact fault (${text.slice(0, 60)}…)`)
  ok(/booking-notification/.test(text), 'it names the function to redeploy')
  ok(/Deploy/.test(text), 'and the button to press')
  ok(await result.locator('a[href*="supabase.com/dashboard"]').count() === 1, 'with a direct link to the right Supabase page')
  ok((await result.locator('ol li').count()) === 3, 'the fix is three numbered steps')
  await page.screenshot({ path: 'screenshots/email-language-stale.png' })
  await page.close()
}

/* ================================================================== */
console.log('\n--- once redeployed, it confirms the fix ---')
{
  const page = await openAdmin((route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ version: 'single-language-2026-09', languages: ['en', 'tl', 'ko', 'zh-CN', 'zh-TW', 'ja', 'es', 'pt', 'fr', 'de', 'vi', 'th', 'pl', 'ar'], singleLanguagePerRecipient: true }),
  }))
  await page.locator('.admin-email-check button:has-text("Run check")').click()
  await page.waitForTimeout(2000)

  const result = page.locator('.admin-email-check__result')
  ok((await result.getAttribute('class')).includes('is-ok'), 'a current template is reported as fine')
  const text = (await result.innerText()).replace(/\s+/g, ' ')
  ok(/every email goes out in one language/.test(text), `it says so plainly (${text.slice(0, 60)}…)`)
  ok(/14 languages/.test(text), 'and how many languages are covered')
  ok(!/Chinese/.test(text), 'with no warning left over')
  await page.screenshot({ path: 'screenshots/email-language-ok.png' })
  await page.close()
}

/* ================================================================== */
console.log('\n--- a wrong version is not mistaken for the right one ---')
{
  const page = await openAdmin((route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ version: 'something-older', languages: [] }),
  }))
  await page.locator('.admin-email-check button:has-text("Run check")').click()
  await page.waitForTimeout(2000)
  const result = page.locator('.admin-email-check__result')
  ok((await result.getAttribute('class')).includes('is-bad'), 'an unexpected version still counts as out of date')
  ok(/something-older/.test(await result.innerText()), 'and the version found is reported')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
