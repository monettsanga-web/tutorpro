/**
 * A teacher added by the administrator must exist in the DATABASE, not just
 * in the administrator's browser.
 *
 * The bug this guards against was silent: the teacher appeared in the admin
 * list, could be approved, could be given lessons — and then could not log
 * in from their own phone, because no such account existed anywhere but in
 * one browser's localStorage. Nothing failed; it just did not work.
 *
 * These checks cover the shared account shape, the id rule that keeps a
 * teacher's timetable attached to them, and mechanical proof that the
 * creation path goes through the server rather than local storage.
 */
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

const teachers = await import('../src/teacherAccounts.js')

/* ================================================================== */
/* 1. What may be created                                              */
/* ================================================================== */
ok(teachers.isValidTeacherEmail('teacher@example.com'), 'a normal email is accepted')
ok(teachers.isValidTeacherEmail('  Teacher@Example.COM '), 'spacing and capitals are forgiven')
ok(!teachers.isValidTeacherEmail('teacher@example'), 'an address with no domain suffix is refused')
ok(!teachers.isValidTeacherEmail(''), 'an empty address is refused')
ok(teachers.normalizeTeacherEmail(' Teacher@Example.COM ') === 'teacher@example.com', 'emails are normalised before use')

ok(!teachers.validateTeacherPassword('short1').valid, 'a short password is refused')
ok(!teachers.validateTeacherPassword('nodigitshere').valid, 'a password with no number is refused')
ok(teachers.validateTeacherPassword('Panda-Maple1234').valid, 'a strong password is accepted')
ok(teachers.validateTeacherPassword('short1').error.includes('8'), 'the length rule is explained')
ok(teachers.validateTeacherPassword('nodigitshere').error.includes('number'), 'the number rule is explained')

ok(!teachers.validateTeacherDetails({ fullName: 'A', email: 'a@b.com', password: 'Panda1234' }).valid, 'a one-letter name is refused')
ok(!teachers.validateTeacherDetails({ fullName: 'Ana Cruz', email: 'nope', password: 'Panda1234' }).valid, 'a bad email is refused')
ok(!teachers.validateTeacherDetails({ fullName: 'Ana Cruz', email: 'a@b.com', password: 'weak' }).valid, 'a weak password is refused')
ok(teachers.validateTeacherDetails({ fullName: 'Ana Cruz', email: 'a@b.com', password: 'Panda1234' }).valid, 'a complete set of details is accepted')

/* The suggested password has to survive being read out over the phone. */
let suggestions = new Set()
for (let index = 0; index < 200; index += 1) suggestions.add(teachers.suggestTemporaryPassword())
ok(suggestions.size > 150, `suggested passwords are not repetitive (${suggestions.size} distinct in 200)`)
ok([...suggestions].every((value) => teachers.validateTeacherPassword(value).valid), 'every suggested password passes our own rules')
ok([...suggestions].every((value) => value.includes('-') && value.length >= 12), 'suggestions are long and have a separator, so they survive being read out')
ok([...suggestions].every((value) => /^[A-Za-z-]+\d{4}$/.test(value)), 'suggestions are two words and four digits, with no confusing punctuation')
ok(teachers.suggestTemporaryPassword(() => 0) === 'Panda-Panda1000', 'the generator is deterministic when given a fixed source')

/* ================================================================== */
/* 2. The profile written to the database                              */
/* ================================================================== */
const details = { fullName: '  Ana Cruz ', email: ' ANA@Example.com ', specialization: 'Cambridge', experience: '6', languages: 'English, Filipino' }
const profile = teachers.buildTeacherProfileData(details, { id: 'uuid-1', createdAt: '2026-01-01T00:00:00.000Z' })
ok(profile.id === 'uuid-1', 'the profile carries the database id')
ok(profile.role === 'teacher', 'the role is teacher')
ok(profile.status === 'approved', 'an admin-created teacher is approved by default')
ok(teachers.buildTeacherProfileData({ ...details, status: 'pending' }, {}).status === 'pending', 'pending can be requested')
ok(teachers.buildTeacherProfileData({ ...details, status: 'admin' }, {}).status === 'approved', 'an unknown status never becomes something else')
ok(profile.fullName === 'Ana Cruz', 'the name is trimmed')
ok(profile.email === 'ana@example.com' && profile.loginId === 'ana@example.com', 'the login id is the normalised email')
ok(profile.teacher.specialization === 'Cambridge', 'the specialization is kept')
ok(profile.teacher.experience === 6, 'experience is stored as a number')
ok(teachers.buildTeacherProfileData({ fullName: 'B C', email: 'b@c.com' }, {}).teacher.specialization === 'Both Curricula', 'a missing specialization falls back')
ok(Array.isArray(profile.teacher.availabilitySlots) && profile.teacher.availabilitySlots.length === 0, 'they start with no availability')
ok(profile.teacher.classroom.platform === 'zoom', 'the classroom defaults are present')
ok(profile.createdByAdmin === true, 'the record says an administrator created it')

const metadata = teacherMeta()
function teacherMeta() { return teachers.teacherSignupMetadata(details, profile) }
ok(metadata.role === 'teacher', 'the signup metadata sets the role the database trigger reads')
ok(metadata.status === 'approved', 'and the status')
ok(metadata.login_id === 'ana@example.com', 'and the login id, in the snake_case the table uses')
ok(metadata.profile_data === profile, 'and carries the profile itself')
ok(metadata.auth_provider === 'email', 'the provider is email')

/* ================================================================== */
/* 3. Who can log in from another device                               */
/* ================================================================== */
ok(teachers.hasSharedLogin({ role: 'teacher', cloudProfile: true }), 'a teacher merged from the database can log in anywhere')
ok(teachers.hasSharedLogin({ role: 'teacher', cloudOnly: true }), 'so can one that exists only in the database')
ok(!teachers.hasSharedLogin({ role: 'teacher', id: 'local-1' }), 'a browser-only teacher cannot')
ok(teachers.hasSharedLogin({ role: 'teacher', systemProfile: true }), 'the built-in demo profile is not flagged as broken')
ok(teachers.hasSharedLogin({ role: 'student' }), 'students are not part of this check')
ok(teachers.hasSharedLogin(null), 'a missing account is not reported as broken')

ok(teachers.describeTeacherLogin({ role: 'teacher', cloudProfile: true }) === 'Can log in on any device', 'the good state reads plainly')
ok(/only exists in this browser/.test(teachers.describeTeacherLogin({ role: 'teacher' })), 'the broken state explains itself')

const list = [
  { role: 'teacher', id: '1', fullName: 'Cloud', cloudProfile: true },
  { role: 'teacher', id: '2', fullName: 'Local' },
  { role: 'student', id: '3' },
  { role: 'teacher', id: '4', systemProfile: true },
]
ok(teachers.teachersWithoutLogin(list).length === 1, 'exactly one teacher in that list needs fixing')
ok(teachers.teachersWithoutLogin(list)[0].fullName === 'Local', 'and it is the browser-only one')
ok(teachers.teachersWithoutLogin([]).length === 0, 'an empty list is fine')

/* ================================================================== */
/* 4. Failures the administrator can act on                            */
/* ================================================================== */
ok(/already a login/.test(teachers.describeTeacherCreateError(new Error('User already registered'))), 'a duplicate email is explained')
ok(/SUPABASE_SERVICE_ROLE_KEY/.test(teachers.describeTeacherCreateError(new Error('Supabase service role is not configured.'))), 'a missing service key names the exact setting to add')
ok(/Log out/.test(teachers.describeTeacherCreateError(new Error('Your administrator session could not be verified.'))), 'an expired admin session says what to do')
ok(/deployment/.test(teachers.describeTeacherCreateError(new Error('The server refused the request (404).'))), 'a missing endpoint explains the deployment is still building')
ok(/connection/.test(teachers.describeTeacherCreateError(new Error('Failed to fetch'))), 'a network failure is explained')
ok(teachers.describeTeacherCreateError(null).length > 10, 'even an empty failure says something useful')

/* ================================================================== */
/* 5. Mechanical: creation goes through the database, with one id      */
/* ================================================================== */
const auth = read('src/auth.js')
const invites = read('src/teacherInvites.js')
const dashboards = read('src/Dashboards.jsx')
const endpoint = read('api/teachers/create.js')
const adminGuard = read('api/_admin.js')
const bookings = read('src/bookings.js')

ok(/createTeacherByAdmin\(details, \{ cloudId = '', cloudProfile = false \} = \{\}\)/.test(auth), 'the local mirror accepts the database id')
ok(auth.includes("id: cloudId || crypto.randomUUID()"), 'and uses it as the account id')
ok(auth.includes('relinkTeacherAccount'), 'an existing browser-only teacher can be moved onto a real login')
ok(/passwordHash: await hashPassword/.test(auth) && auth.includes('cloudProfile\n      ? { cloudProfile: true }'), 'no local password hash is kept once the login lives in the database')
ok(bookings.includes('export function reassignTeacherBookings'), 'their lessons can be repointed at the new id')
ok(/booking.teacherId !== oldTeacherId/.test(bookings), 'only that teacher\'s lessons are touched')

ok(invites.includes("fetch('/api/teachers/create'"), 'the browser asks our server to create the login')
ok(invites.includes('Authorization: `Bearer ${token}`'), 'and proves who is asking')
ok(!/supabase\.auth\.signUp\(/.test(invites), 'it never calls signUp(), which would sign the administrator out of their own dashboard')

ok(endpoint.includes('requireAdmin'), 'the endpoint is behind an administrator check')
ok(endpoint.includes('auth.admin.createUser'), 'it creates a real auth user with the service role')
ok(endpoint.includes('email_confirm: true'), 'the email is pre-confirmed so the teacher can log in immediately')
ok(endpoint.includes("from('profiles')"), 'it makes sure the profile row exists')
ok(/existing\?\.id\n\s+\? await supabase\.from\('profiles'\)\.update/.test(endpoint), 'it updates the row the trigger made, or creates one if there is no trigger')
ok(endpoint.includes('validateTeacherDetails'), 'the server validates the details itself')
ok(endpoint.includes("buildTeacherProfileData"), 'and builds the profile with the shared code')

ok(adminGuard.includes("profile.role !== 'admin'"), 'only an admin passes the guard')
ok(adminGuard.includes('auth.getUser(token)'), 'the token is checked against the database')
ok(!adminGuard.includes('req.body'), 'the guard never trusts anything in the request body')

ok(dashboards.includes('await createTeacherWithPassword(form)'), 'the dialog creates the database login first')
const order = dashboards.indexOf('await createTeacherWithPassword(form)') < dashboards.indexOf('await createTeacherByAdmin(form, { cloudId')
ok(order, 'and only then writes the local copy — never the other way round')
ok(dashboards.includes('cloudId: created.id, cloudProfile: true'), 'the local copy reuses the database id')
ok(dashboards.includes('teachersWithoutLogin(teachers)'), 'the admin list flags teachers who cannot log in')
ok(dashboards.includes('TeacherLoginFixDialog'), 'and offers a way to fix them')
ok(dashboards.includes('reassignTeacherBookings(teacher.id, created.id)'), 'fixing one moves their lessons across')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
