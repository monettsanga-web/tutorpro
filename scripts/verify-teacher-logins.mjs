/**
 * Teacher logins — real browser verification.
 *
 * The thing being proved is the one that silently failed before: a teacher
 * the administrator adds must end up in the DATABASE, under the same id the
 * local copy uses, so they can sign in from their own phone and still see
 * their own lessons.
 *
 * The server function is stubbed, so nothing real is created. What we check
 * is that the browser calls it, sends an administrator token, waits for the
 * id, and refuses to write a local-only teacher when the call fails.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
const NEW_TEACHER_ID = '33333333-3333-4333-8333-333333333333'
const LOCAL_TEACHER_ID = 'local-teacher-1'

const admin = `{id:'${ADMIN_ID}',role:'admin',status:'active',email:'m@y.com',loginId:'m@y.com',authProvider:'email',
  createdAt:new Date().toISOString(),fullName:'Admin',parentName:'Admin',cloudProfile:true}`

/* A teacher added the old way: present here, invisible to the database. */
const localTeacher = `{id:'${LOCAL_TEACHER_ID}',role:'teacher',status:'approved',email:'old@teacher.com',loginId:'old@teacher.com',
  authProvider:'email',createdAt:new Date().toISOString(),fullName:'Grace Reyes',createdByAdmin:true,
  teacher:{specialization:'Cambridge',experience:4,languages:'English',bio:'Teacher',education:'BA',credentials:[],availabilitySlots:[],classroom:{platform:'zoom'}}}`

const cloudTeacher = `{id:'44444444-4444-4444-8444-444444444444',role:'teacher',status:'approved',email:'cloud@teacher.com',
  loginId:'cloud@teacher.com',authProvider:'email',createdAt:new Date().toISOString(),fullName:'Teacher Cloud',cloudProfile:true,
  teacher:{specialization:'Oxford',experience:6,languages:'English',bio:'Teacher',education:'BA',credentials:[],availabilitySlots:[],classroom:{platform:'zoom'}}}`

const browser = await chromium.launch()

const profileRow = (account) => ({
  id: account.id,
  role: account.role,
  status: account.status,
  email: account.email,
  login_id: account.email,
  auth_provider: 'email',
  full_name: account.fullName,
  display_name: account.fullName,
  parent_name: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  profile_data: account.profileData || {},
})

const ADMIN_ROW = profileRow({ id: ADMIN_ID, role: 'admin', status: 'active', email: 'm@y.com', fullName: 'Admin' })
const CLOUD_TEACHER_ROW = profileRow({
  id: '44444444-4444-4444-8444-444444444444',
  role: 'teacher',
  status: 'approved',
  email: 'cloud@teacher.com',
  fullName: 'Teacher Cloud',
  profileData: { teacher: { specialization: 'Oxford', experience: 6, languages: 'English', education: 'BA', credentials: [], availabilitySlots: [], classroom: { platform: 'zoom' } } },
})

async function openAdmin(accountsJs, { createHandler, cloudRows = [ADMIN_ROW, CLOUD_TEACHER_ROW] } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const calls = []
  await page.route('**/paypal.com/**', (route) => route.abort())
  await page.route('**/auth/v1/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: ADMIN_ID, aud: 'authenticated', role: 'authenticated', email: 'm@y.com' }),
  }))
  /* Playwright matches routes in REVERSE order of registration, so the
     catch-all goes first and the specific one after it. Registered the
     other way round, the catch-all swallowed the profiles request.

     The profiles stub must return real rows: the admin dashboard
     reconciles against them and deletes local copies of accounts the
     database does not return, so an empty list would quietly wipe the very
     teacher under test. */
  await page.route('**/rest/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(cloudRows),
  }))
  await page.route('**/api/teachers/create', async (route) => {
    calls.push({ body: JSON.parse(route.request().postData() || '{}'), auth: route.request().headers().authorization || '' })
    if (createHandler) return createHandler(route)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: NEW_TEACHER_ID, email: 'new@teacher.com', status: 'approved' }),
    })
  })

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(`
    sessionStorage.setItem('tutorpro-supabase-auth', JSON.stringify({
      access_token: 'admin-access-token', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
      user: { id: '${ADMIN_ID}', aud: 'authenticated', role: 'authenticated', email: 'm@y.com', created_at: new Date().toISOString() },
    }));
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([${accountsJs}]));
    localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([
      {id:'bk-1',teacherId:'${LOCAL_TEACHER_ID}',studentId:'s1',learnerName:'Ana',date:'2026-12-01',time:'16:00',duration:25,status:'confirmed'},
      {id:'bk-2',teacherId:'someone-else',studentId:'s1',learnerName:'Ben',date:'2026-12-02',time:'16:00',duration:25,status:'confirmed'}
    ]));
    sessionStorage.setItem('tutorpro_session_v2', '${ADMIN_ID}');`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.locator('button:has-text("My dashboard"):visible').first().click()
  await page.waitForSelector('.portal-nav', { timeout: 15000 })
  await page.waitForTimeout(1800)
  await page.locator('.portal-nav button:has-text("Teachers")').first().click()
  await page.waitForSelector('.admin-table--teachers', { timeout: 15000 })
  await page.waitForTimeout(700)
  return { page, calls }
}

/* ================================================================== */
console.log('\n--- a browser-only teacher is flagged, a database one is not ---')
{
  const { page } = await openAdmin(`${admin},${localTeacher},${cloudTeacher}`)

  const banner = page.locator('.login-missing-banner')
  ok(await banner.count() === 1, 'the administrator is warned at the top of the page')
  const bannerText = (await banner.innerText()).replace(/\s+/g, ' ')
  ok(/1 teacher cannot log in from their own device/.test(bannerText), `it counts them (${bannerText.slice(0, 60)}…)`)
  ok(/Grace Reyes/.test(bannerText), 'and names them')
  ok(!/Teacher Cloud/.test(bannerText), 'a teacher who already has a database login is not named')

  const rows = await page.$$eval('.admin-table--teachers .admin-table__row .table-person strong', (nodes) => nodes.map((n) => n.textContent.trim()))
  ok(rows.length === 2 && rows.includes('Grace Reyes') && rows.includes('Teacher Cloud'), `both teachers are listed (${rows.join(', ')})`)
  const chips = await page.$$eval('.login-missing-chip', (nodes) => nodes.length)
  ok(chips === 1, `exactly one row is marked "No phone login" (found ${chips})`)
  const fixButtons = await page.$$eval('.table-action--fix-login', (nodes) => nodes.length)
  ok(fixButtons === 1, 'and exactly one row offers the fix')
  await page.screenshot({ path: 'screenshots/teacher-login-warning.png' })
  await page.close()
}

/* ================================================================== */
console.log('\n--- adding a teacher creates the DATABASE login first ---')
{
  const { page, calls } = await openAdmin(`${admin}`, { cloudRows: [ADMIN_ROW] })
  await page.locator('button:has-text("Add teacher")').first().click()
  await page.waitForSelector('.add-teacher-dialog', { timeout: 10000 })
  await page.locator('.invite-method button:has-text("Set a temporary password")').click()
  await page.waitForTimeout(400)

  const suggested = await page.locator('.add-teacher-dialog input[name="password"]').inputValue()
  ok(suggested.length >= 12, `a temporary password is suggested for the admin (${suggested})`)
  ok(await page.locator('.add-teacher-dialog input[name="password"]').getAttribute('type') === 'text', 'it is visible, because the admin has to pass it on')

  await page.locator('.add-teacher-dialog input[name="fullName"]').fill('Nora Diaz')
  await page.locator('.add-teacher-dialog input[name="email"]').fill('new@teacher.com')
  await page.locator('.add-teacher-dialog button[type="submit"]').click()
  await page.waitForTimeout(1500)

  ok(calls.length === 1, `the server was asked to create the login (${calls.length} call)`)
  ok(calls[0]?.auth === 'Bearer admin-access-token', 'the administrator session was sent with it')
  ok(calls[0]?.body?.email === 'new@teacher.com', 'the email was sent')
  ok(calls[0]?.body?.fullName === 'Nora Diaz', 'the name was sent')
  ok(calls[0]?.body?.password === suggested, 'the temporary password was sent')

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tutorpro_accounts_v2') || '[]').find((a) => a.email === 'new@teacher.com'))
  ok(Boolean(stored), 'a local copy of the teacher exists for the admin list')
  ok(stored?.id === '33333333-3333-4333-8333-333333333333', `it reuses the DATABASE id, so their lessons follow them (got ${stored?.id})`)
  ok(stored?.cloudProfile === true, 'it is marked as living in the database')
  ok(!stored?.passwordHash, 'no copy of the password is kept in the browser')

  const confirmation = (await page.locator('.add-teacher-dialog').innerText()).replace(/\s+/g, ' ')
  ok(/can now log in/.test(confirmation), 'the admin is told the teacher can log in')
  ok(/works on their own phone/.test(confirmation), 'and that it works on their own phone')
  ok(confirmation.includes('new@teacher.com') && confirmation.includes(suggested), 'the exact details to send are shown')
  ok(await page.locator('.add-teacher-dialog button:has-text("Copy the details")').count() === 1, 'and can be copied in one press')
  await page.screenshot({ path: 'screenshots/teacher-login-created.png' })
  await page.close()
}

/* ================================================================== */
console.log('\n--- if the database refuses, NO half-made teacher is left behind ---')
{
  const { page, calls } = await openAdmin(`${admin}`, {
    cloudRows: [ADMIN_ROW],
    createHandler: (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'User already registered' }) }),
  })
  await page.locator('button:has-text("Add teacher")').first().click()
  await page.waitForSelector('.add-teacher-dialog', { timeout: 10000 })
  await page.locator('.invite-method button:has-text("Set a temporary password")').click()
  await page.waitForTimeout(300)
  await page.locator('.add-teacher-dialog input[name="fullName"]').fill('Nora Diaz')
  await page.locator('.add-teacher-dialog input[name="email"]').fill('taken@teacher.com')
  await page.locator('.add-teacher-dialog button[type="submit"]').click()
  await page.waitForTimeout(1200)

  ok(calls.length === 1, 'the server was asked')
  const error = (await page.locator('.add-teacher-dialog .portal-error').innerText()).replace(/\s+/g, ' ')
  ok(/already a login with that email/.test(error), `the refusal is explained in plain words (${error.slice(0, 70)})`)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tutorpro_accounts_v2') || '[]').filter((a) => a.role === 'teacher'))
  ok(stored.length === 0, `no local-only teacher was created (found ${stored.length})`)
  await page.close()
}

/* ================================================================== */
console.log('\n--- an existing browser-only teacher can be given a real login ---')
{
  const { page, calls } = await openAdmin(`${admin},${localTeacher}`, { cloudRows: [ADMIN_ROW] })
  await page.locator('.table-action--fix-login').first().click()
  await page.waitForSelector('.add-teacher-dialog', { timeout: 10000 })
  const dialog = (await page.locator('.add-teacher-dialog').innerText()).replace(/\s+/g, ' ')
  ok(/Create a login for Grace Reyes/.test(dialog), 'the dialog names the teacher')
  ok(/old@teacher\.com/.test(dialog), 'and shows the email the login will use')

  await page.locator('.add-teacher-dialog button[type="submit"]').click()
  await page.waitForTimeout(1800)

  ok(calls.length === 1, 'the server was asked to create their login')
  ok(calls[0]?.body?.email === 'old@teacher.com', 'using their existing email')
  ok(calls[0]?.body?.specialization === 'Cambridge', 'and keeping their existing profile details')

  const after = await page.evaluate(() => ({
    accounts: JSON.parse(localStorage.getItem('tutorpro_accounts_v2') || '[]').filter((a) => a.role === 'teacher').map((a) => ({ id: a.id, cloud: a.cloudProfile, name: a.fullName })),
    bookings: JSON.parse(localStorage.getItem('tutorpro_bookings_v1') || '[]').map((b) => ({ id: b.id, teacherId: b.teacherId })),
  }))
  ok(after.accounts.length === 1, 'the teacher is not duplicated')
  ok(after.accounts[0].id === NEW_TEACHER_ID, `their account moved onto the database id (got ${after.accounts[0].id})`)
  ok(after.accounts[0].cloud === true, 'and is marked as a database login')
  ok(after.bookings.find((b) => b.id === 'bk-1')?.teacherId === NEW_TEACHER_ID, 'their existing lesson moved with them')
  ok(after.bookings.find((b) => b.id === 'bk-2')?.teacherId === 'someone-else', 'another teacher\'s lesson was left alone')

  const done = (await page.locator('.add-teacher-dialog').innerText()).replace(/\s+/g, ' ')
  ok(/can now log in on any device/.test(done), 'the admin is told it worked')
  ok(/1 existing lesson moved/.test(done), `and how many lessons moved (${done.match(/\d+ existing lesson[^.]*/)?.[0] || 'not stated'})`)
  await page.close()
}

/* ================================================================== */
console.log('\n--- the warning clears once every teacher has a login ---')
{
  const { page } = await openAdmin(`${admin},${cloudTeacher}`)
  const rows = await page.$$eval('.admin-table--teachers .admin-table__row', (nodes) => nodes.length)
  ok(rows === 1, `the database teacher is listed (${rows} row)`)
  ok(await page.locator('.login-missing-banner').count() === 0, 'no warning when every teacher can log in')
  ok(await page.locator('.login-missing-chip').count() === 0, 'and no row is marked')
  ok(await page.locator('.table-action--fix-login').count() === 0, 'and no fix button is offered')
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
