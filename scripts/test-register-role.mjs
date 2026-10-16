/**
 * Role integrity at the registration route.
 *
 * WHAT THIS GUARDS
 * ----------------
 * /api/auth/register used to hard-code `role: 'student'` on every account it
 * created, while the teacher application in the browser posts to this same
 * route. A completed teacher application therefore landed in `profiles` as
 * an ACTIVE STUDENT: invisible to the admin approval queue, and able to sign
 * into a family dashboard. The route now honours exactly two declared roles
 * (student, teacher-as-pending-application) and refuses everything else
 * before it builds a database client.
 *
 * The validations sit before any Supabase call, so they can be exercised
 * here with a plain mock response object and no service-role key. The final
 * case proves that ordering: a fully valid family body gets as far as the
 * missing service-role key (500) rather than being rejected early.
 */
import handler from '../api/auth/register.js'
import { readFileSync } from 'node:fs'

let pass = 0
let fail = 0
const ok = (condition, label) => {
  if (condition) { pass += 1; console.log(`  ok  ${label}`) }
  else { fail += 1; console.log(`FAIL  ${label}`) }
}

delete process.env.SUPABASE_SERVICE_ROLE_KEY
delete process.env.SUPABASE_URL
delete process.env.VITE_SUPABASE_URL

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this },
    setHeader() { return this },
    end(payload) { this.body = JSON.parse(payload); return this },
  }
}

async function call(method, body) {
  const res = mockRes()
  await handler({ method, body, headers: {} }, res)
  return res
}

const familyProfile = {
  parentName: 'Maria Santos',
  child: { name: 'Ana Santos', year: '2015', curriculum: 'Primary English' },
  role: 'student',
}
const teacherProfile = {
  fullName: 'Liza Teacher',
  role: 'teacher',
  teacher: {
    specialization: 'Phonics',
    bio: 'I have taught young learners for six years and love every minute of it.',
    interview: { completedAt: '2026-10-01T00:00:00.000Z', transcript: Array(15).fill('answer') },
  },
}

let res = await call('GET', {})
ok(res.statusCode === 405, 'GET is refused (405)')

res = await call('POST', { email: 'admin@evil.example', password: 'password123', profile: { ...familyProfile, role: 'admin' } })
ok(res.statusCode === 400 && /family accounts and teacher applications/i.test(res.body?.error || ''), `role 'admin' is refused before any database access (400: ${res.body?.error})`)

res = await call('POST', { email: 'x@evil.example', password: 'password123', profile: { parentName: 'Me', role: 'admin' } })
ok(res.statusCode === 400, "a role elevation attempt is refused even with an incomplete body (400)")

res = await call('POST', { email: 't@example.com', password: 'password123', profile: { ...teacherProfile, teacher: { ...teacherProfile.teacher, bio: 'too short' } } })
ok(res.statusCode === 400 && /teacher profile and interview/i.test(res.body?.error || ''), `a teacher application with a short bio is refused (400: ${res.body?.error})`)

res = await call('POST', { email: 't@example.com', password: 'password123', profile: { ...teacherProfile, teacher: { ...teacherProfile.teacher, interview: undefined } } })
ok(res.statusCode === 400, 'a teacher application without a completed interview is refused (400)')

res = await call('POST', { email: 'family@example.com', password: 'password123', profile: { parentName: 'Maria', role: 'student' } })
ok(res.statusCode === 400 && /parent and student profile/i.test(res.body?.error || ''), 'an incomplete family registration is still refused (400)')

res = await call('POST', { email: 'family@example.com', password: 'password123', profile: familyProfile })
ok(res.statusCode === 500 && /service role is not configured/i.test(res.body?.error || ''), 'a valid family body passes validation and reaches the (absent) service-role key - ordering proof (500)')

res = await call('POST', { email: 't@example.com', password: 'password123', profile: teacherProfile })
ok(res.statusCode === 500 && /service role is not configured/i.test(res.body?.error || ''), 'a valid teacher application passes validation and reaches the (absent) service-role key (500)')

const source = readFileSync(new URL('../api/auth/register.js', import.meta.url), 'utf8')
ok(source.includes("const storedStatus = requestedRole === 'teacher' ? 'pending' : 'active'"), 'the route forces teacher applications to status pending')
ok(source.includes('role: requestedRole,\n      status: storedStatus,'), 'the profiles row carries the declared role and the forced status')
ok(!/user_metadata: \{\n\s*role: 'student'/.test(source) && !/const row = \{\n\s*id: userId,\n\s*role: 'student'/.test(source), 'no hard-coded student role remains in the write path')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
