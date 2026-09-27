/**
 * Teacher invitations by email, confirmed with a one-time code.
 *
 * WHAT THIS PROTECTS
 * ------------------
 * The old flow had the administrator invent a temporary password and pass it
 * to the teacher somehow. The administrator then knew the password to an
 * account that can see children's names, lesson recordings and written
 * feedback. The invitation flow exists so that never happens, and these
 * checks pin down the properties that make it worth having.
 *
 * Supabase Auth owns the code itself — randomness, hashing, expiry and
 * attempt limits. Reimplementing any of that by hand would turn a bug into a
 * security hole, so the test asserts we did NOT reimplement it.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The module imports the Supabase client, which builds a Realtime client on
// load. Sandbox Node is v20 with no native WebSocket.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class { constructor() { throw new Error('sockets unused in unit tests') } }
}

const {
  INVITE_CODE_MINUTES, describeInviteError, isValidEmail, isValidOtp, normalizeOtp,
} = await import('../src/teacherInvites.js')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

/* --- the code itself --------------------------------------------------- */
console.log('--- reading the code a teacher types ---')
ok(normalizeOtp('123456') === '123456', 'a plain six-digit code is accepted')
// People copy codes out of emails with spaces and dashes in them.
ok(normalizeOtp('123 456') === '123456', 'spaces are forgiven')
ok(normalizeOtp('123-456') === '123456', 'dashes are forgiven')
ok(normalizeOtp('  123456  ') === '123456', 'surrounding whitespace is forgiven')
ok(normalizeOtp('1234567890') === '123456', 'extra digits are trimmed rather than rejected outright')
ok(normalizeOtp('abc123') === '123', 'letters are stripped')
ok(normalizeOtp('') === '', 'an empty code stays empty')
ok(normalizeOtp(null) === '', 'a null code does not throw')
ok(isValidOtp('123456'), 'six digits is valid')
ok(!isValidOtp('12345'), 'five digits is not enough')
ok(!isValidOtp(''), 'an empty code is invalid')
ok(isValidOtp('123 456'), 'a spaced code is still valid once normalised')

/* --- email validation --------------------------------------------------- */
console.log('\n--- email addresses ---')
ok(isValidEmail('teacher@example.com'), 'an ordinary address is accepted')
ok(isValidEmail('first.last+tag@school.co.uk'), 'a tagged address is accepted')
ok(!isValidEmail('teacher@'), 'a truncated address is refused')
ok(!isValidEmail('teacher'), 'an address with no domain is refused')
ok(!isValidEmail('a b@c.com'), 'an address with a space is refused')
ok(!isValidEmail(''), 'an empty address is refused')
ok(!isValidEmail(null), 'a null address does not throw')

/* --- errors the admin will actually hit --------------------------------- */
console.log('\n--- explaining failures usefully ---')
// A free Supabase project sends only a couple of auth emails an hour. This is
// the failure the owner WILL hit, so it must not surface as jargon.
const limited = describeInviteError({ message: 'Email rate limit exceeded' })
ok(/hour/i.test(limited), 'the rate limit explains the wait in plain words')
ok(/temporary password/i.test(limited), 'it offers the fallback route')
ok(!/rate limit exceeded/i.test(limited), 'the raw Supabase wording is not shown')

const exists = describeInviteError({ message: 'User already registered' })
ok(/already an account/i.test(exists), 'a duplicate address is explained')
ok(!/User already registered/.test(exists), 'the raw wording is not shown')

ok(/expired/i.test(describeInviteError({ message: 'Token has expired' })), 'an expired code is explained')
ok(/new invitation/i.test(describeInviteError({ message: 'Token has expired' })), 'and says what to do about it')
ok(/sign-ups/i.test(describeInviteError({ message: 'Signups not allowed for otp' })), 'disabled sign-ups are explained')
ok(/connection/i.test(describeInviteError({ message: 'Failed to fetch' })), 'a network failure is explained')
ok(describeInviteError(null).length > 0, 'a null error still produces a message')
ok(describeInviteError({}).length > 0, 'an empty error still produces a message')

/* --- the security properties -------------------------------------------- */
console.log('\n--- the code is not reimplemented by hand ---')
const src = readFileSync(new URL('../src/teacherInvites.js', import.meta.url), 'utf8')
ok(/signInWithOtp/.test(src), 'invitations use Supabase Auth to send the code')
ok(/verifyOtp/.test(src), 'confirmation uses Supabase Auth to check the code')
// Rolling our own would mean getting randomness, hashing, expiry and
// timing-safe comparison right. Assert we did not try.
ok(!/Math\.random\(\)[\s\S]{0,80}(code|otp|token)/i.test(src), 'codes are not generated with Math.random')
ok(!/createHash|pbkdf2|bcrypt/.test(src), 'no hand-rolled password or token hashing')
ok(!/===\s*storedCode|===\s*expectedCode/.test(src), 'no hand-rolled code comparison')

console.log('\n--- an invited teacher cannot let themselves in ---')
ok(/role: 'teacher'/.test(src), 'the invitation marks the account as a teacher')
// The invitation proves an email address. It must not grant working access.
ok(/status: 'pending'/.test(src), 'the account arrives PENDING, so an admin must still approve it')
ok(/shouldCreateUser: true/.test(src), 'the account is created only when the code is used')

console.log('\n--- the teacher sets their own password ---')
ok(/updateUser\(\{ password/.test(src), 'the teacher sets the password themselves')
ok(/length < 8/.test(src) && /\[0-9\]/.test(src), 'a minimum password strength is enforced')

/* --- the admin dialog --------------------------------------------------- */
console.log('\n--- the admin side ---')
const dash = readFileSync(new URL('../src/Dashboards.jsx', import.meta.url), 'utf8')
ok(/inviteTeacherByEmail/.test(dash), 'the admin dialog can send an invitation')
ok(/Invite by email/.test(dash), 'invitation is offered as a method')
ok(/Set a temporary password/.test(dash), 'the manual route is kept for teachers with no email')
ok(/method === 'invite'/.test(dash), 'the two methods are switchable')
ok(/never see or handle it/i.test(dash), 'the dialog explains why invitation is preferable')

const portal = readFileSync(new URL('../src/PortalAccess.jsx', import.meta.url), 'utf8')
ok(/confirmTeacherInvite/.test(portal), 'the teacher portal can confirm a code')
ok(/I have an invitation code/.test(portal), 'invited teachers have a way in')
ok(/one-time-code/.test(portal), 'the code field uses the one-time-code autocomplete, so phones offer it')
ok(/inputMode="numeric"/.test(portal), 'the code field opens a numeric keypad on a phone')

/* --- every icon used is actually imported -------------------------------- */
// ESLint did not catch <Lock /> being used while only LockKeyhole was
// imported, and that would have crashed the screen the moment an invited
// teacher opened it. Checked mechanically here instead.
console.log('\n--- every icon used is imported ---')
for (const [label, source] of [['PortalAccess.jsx', portal], ['Dashboards.jsx', dash]]) {
  // Collect EVERY imported name: default imports, named imports and aliases.
  // An earlier version only read the lucide block and produced false
  // positives on default-imported components such as ContactFallback.
  const imported = new Set()
  for (const line of source.match(/^import [\s\S]*?from '[^']+'/gm) || []) {
    const named = line.match(/\{([\s\S]*?)\}/)
    if (named) {
      for (const part of named[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim()
        if (name) imported.add(name)
      }
    }
    const def = line.match(/^import\s+([A-Za-z_$][\w$]*)/)
    if (def) imported.add(def[1])
  }
  // Components defined in the file itself, and lazy()-loaded ones.
  const local = new Set([
    ...(source.match(/^(?:export )?function ([A-Z][A-Za-z0-9]*)/gm) || [])
      .map((m) => m.replace(/^(?:export )?function /, '')),
    ...(source.match(/const ([A-Z][A-Za-z0-9]*)\s*=/g) || [])
      .map((m) => m.replace(/const /, '').replace(/\s*=/, '')),
    // Classes, e.g. AdminRenderErrorBoundary.
    ...(source.match(/^(?:export )?class ([A-Z][A-Za-z0-9]*)/gm) || [])
      .map((m) => m.replace(/^(?:export )?class /, '')),
    // Capitalised components received as props, e.g. ({ icon: Icon }).
    ...(source.match(/:\s*([A-Z][A-Za-z0-9]*)\s*[,}]/g) || [])
      .map((m) => m.replace(/^:\s*/, '').replace(/\s*[,}]$/, '')),
  ])
  const used = new Set((source.match(/<([A-Z][A-Za-z0-9]*)[\s/>]/g) || [])
    .map((m) => m.slice(1).replace(/[\s/>]$/, '')))
  const missing = [...used].filter((name) => !imported.has(name) && !local.has(name))
  ok(missing.length === 0, `${label}: every component used is imported (${missing.join(', ') || 'all present'})`)
}

ok(INVITE_CODE_MINUTES > 0, 'the code lifetime is stated for the admin wording')

assert.ok(typeof describeInviteError === 'function')
ok(true, 'the module exports what the UI expects')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
