/**
 * Teacher invitations — real browser verification.
 *
 * Proves the two screens exist and behave: the administrator can send an
 * invitation instead of inventing a password, and an invited teacher has a
 * way to enter their code. Supabase is stubbed so no real email is sent and
 * no account is created.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const admin = `{id:'ad1',role:'admin',status:'active',email:'m@y.com',loginId:'m@y.com',authProvider:'email',
  createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin'}`

const browser = await chromium.launch()

/* ================================================================== */
console.log('\n--- the admin can invite instead of inventing a password ---')
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.route('**/paypal.com/sdk/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  // Intercept the OTP send so no real email leaves.
  let otpSent = null
  await page.route('**/auth/v1/otp**', (route) => {
    otpSent = route.request().postDataJSON()
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${admin}]));
    sessionStorage.setItem('tutorpro_session_v2', 'ad1');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.locator('.portal-nav button:has-text("Teachers")').first().click()
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("Add teacher")').first().click()
  await page.waitForSelector('.add-teacher-dialog', { timeout: 10000 })

  const dialog = page.locator('.add-teacher-dialog')
  ok(await dialog.locator('.invite-method button').count() === 2, 'two ways to add a teacher are offered')
  ok(/never see or handle it/i.test(await dialog.textContent()), 'it explains why invitation is safer')

  // Invitation is the default, and asks for no password.
  ok(await dialog.locator('input[name="password"]').count() === 0, 'the invitation form asks for NO password')
  ok(await dialog.locator('input[name="fullName"]').count() === 1, 'it asks for a name')
  ok(await dialog.locator('input[name="email"]').count() === 1, 'it asks for an email')

  await dialog.locator('input[name="fullName"]').fill('Grace Reyes')
  await dialog.locator('input[name="email"]').fill('grace@example.com')
  await dialog.locator('button:has-text("Send invitation")').click()
  await page.waitForTimeout(1500)

  ok(otpSent !== null, 'an invitation was actually requested')
  ok(otpSent?.email === 'grace@example.com', 'it was sent to the address entered')
  ok(otpSent?.data?.role === 'teacher', 'the invitation marks the account as a teacher')
  ok(otpSent?.data?.status === 'pending', 'the account will arrive pending, needing approval')
  ok(otpSent?.data?.display_name === 'Grace Reyes', 'the name travels with the invitation')
  ok(otpSent?.create_user === true || otpSent?.options?.shouldCreateUser !== false,
    'the account is created when the code is used')

  const confirmation = await dialog.textContent()
  ok(/Invitation sent to grace@example.com/i.test(confirmation), 'the admin is told it was sent')
  ok(/pending/i.test(confirmation), 'the admin is reminded they still need to approve')
  ok(/Teacher portal/i.test(confirmation), 'the admin is told where the teacher should go')

  // The manual fallback must still exist for a teacher with no email.
  await page.locator('button:has-text("Invite another")').click()
  await page.waitForTimeout(500)
  await dialog.locator('.invite-method button:has-text("Set a temporary password")').click()
  await page.waitForTimeout(500)
  ok(await dialog.locator('input[name="password"]').count() === 1, 'the manual route still offers a password field')
  ok(/only when the teacher has no working email/i.test(await dialog.textContent()),
    'the manual route warns when it should be used')

  ok(errors.length === 0, `no page errors (${errors.length})`)
  await page.close()
}

/* ================================================================== */
console.log('\n--- an invited teacher can enter their code ---')
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2200)
  await page.locator('button:has-text("Teacher portal"):visible').first().click()
  await page.waitForTimeout(1800)

  const entry = page.locator('button:has-text("I have an invitation code")')
  ok(await entry.count() >= 1, 'invited teachers have a visible way in')
  await entry.first().click()
  await page.waitForTimeout(900)

  const body = await page.locator('body').textContent()
  ok(/Enter your invitation code/i.test(body), 'the code screen opens')
  ok(/six-digit/i.test(body), 'it says how long the code is')
  ok(/nobody else will know it/i.test(body), 'it reassures the teacher about the password')

  const code = page.locator('input[name="code"]')
  ok(await code.count() === 1, 'there is a code field')
  ok(await code.getAttribute('inputmode') === 'numeric', 'it opens a numeric keypad on a phone')
  ok(await code.getAttribute('autocomplete') === 'one-time-code', 'phones can autofill the code from the email')

  // The submit button must stay disabled until the form is genuinely complete.
  const submit = page.locator('button:has-text("Confirm and set my password")')
  ok(await submit.isDisabled(), 'the button is disabled while the form is empty')
  await page.locator('input[name="email"]').last().fill('grace@example.com')
  await code.fill('12345')
  await page.locator('input[name="password"]').last().fill('Password1')
  await page.waitForTimeout(400)
  ok(await submit.isDisabled(), 'still disabled with only five digits')
  await code.fill('123456')
  await page.waitForTimeout(400)
  ok(!(await submit.isDisabled()), 'enabled once the code is six digits')

  // Spaces pasted from an email must be forgiven.
  await code.fill('123 456')
  await page.waitForTimeout(300)
  ok(await code.inputValue() === '123456', 'a pasted code with a space is cleaned up')

  ok(errors.length === 0, `no page errors (${errors.length})`)
  await page.close()
}

/* ================================================================== */
console.log('\n--- mobile ---')
{
  const phone = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  await phone.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await phone.waitForTimeout(2200)
  await phone.locator('button:has-text("Teacher portal"):visible').first().click()
  await phone.waitForTimeout(1800)
  await phone.locator('button:has-text("I have an invitation code")').first().click()
  await phone.waitForTimeout(900)
  ok(await phone.locator('input[name="code"]').count() === 1, 'the code screen works on a phone')
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(overflow <= 0, `no horizontal overflow at 375px (${overflow}px)`)
  await phone.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
