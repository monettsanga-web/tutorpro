/**
 * Why every teacher upload was refused: "Uploaded 0, but 159 failed".
 *
 * THE CAUSE
 * ---------
 * The app saved bookings with a Supabase `.upsert()`, which PostgREST sends as
 * `INSERT ... ON CONFLICT DO UPDATE`. PostgreSQL checks the table's INSERT
 * policy WITH CHECK expression for every row an upsert PROPOSES, whether or
 * not that row is actually inserted:
 *
 *   "Note that an INSERT with an ON CONFLICT DO NOTHING/UPDATE clause will
 *    check the INSERT policies' WITH CHECK expressions for all rows proposed
 *    for insertion, regardless of whether or not they end up being inserted."
 *                                        — PostgreSQL CREATE POLICY docs
 *
 * The bookings INSERT policy allowed only the student and the admin:
 *   with check (student_id = auth.uid()::text or public.is_tutorpro_admin())
 *
 * So a teacher saving feedback on an existing lesson was judged by the INSERT
 * rule, failed it, and was rejected 100% of the time — even though the UPDATE
 * policy explicitly permits teachers, the session was valid, the account id
 * was correct and the network was fine. That is why it was every lesson and
 * not some of them, and why re-trying never helped.
 *
 * THE FIX
 * -------
 * 1. Existing lessons take a plain UPDATE (governed only by the UPDATE policy).
 *    Insert is attempted only when the update matched no row.
 * 2. supabase/fix_booking_permissions.sql adds teacher_id to the INSERT policy
 *    so the same trap cannot return.
 *
 * Run: node scripts/test-booking-write-policy.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

/* ------------------------------------------------------------------ */
/* A miniature PostgreSQL that enforces row-level security the way the */
/* real one does, including the upsert quirk above.                    */
/* ------------------------------------------------------------------ */

const RLS_ERROR = {
  code: '42501',
  message: 'new row violates row-level security policy for table "bookings"',
}

function makeDatabase({ rows = [], insertAllowsTeacher = false } = {}) {
  const table = new Map(rows.map((row) => [row.id, { ...row }]))

  const canSelect = (row, uid, isAdmin) => isAdmin || row.student_id === uid || row.teacher_id === uid
  const canUpdate = canSelect
  const canInsert = (row, uid, isAdmin) => isAdmin
    || row.student_id === uid
    || (insertAllowsTeacher && row.teacher_id === uid)

  return {
    rowCount: () => table.size,
    get: (id) => table.get(id),
    /** INSERT ... ON CONFLICT DO UPDATE, with PostgreSQL's real ordering. */
    upsert(payload, { uid, isAdmin = false }) {
      // The INSERT policy is checked for the proposed row FIRST, always.
      if (!canInsert(payload, uid, isAdmin)) return { data: null, error: RLS_ERROR }
      const existing = table.get(payload.id)
      if (existing && !canUpdate(existing, uid, isAdmin)) return { data: null, error: RLS_ERROR }
      table.set(payload.id, { ...existing, ...payload })
      return { data: { ...table.get(payload.id) }, error: null }
    },
    update(payload, { uid, isAdmin = false }) {
      const existing = table.get(payload.id)
      // An UPDATE that matches no visible row is not an error; it affects 0 rows.
      if (!existing || !canSelect(existing, uid, isAdmin)) return { data: null, error: null }
      if (!canUpdate(existing, uid, isAdmin)) return { data: null, error: RLS_ERROR }
      table.set(payload.id, { ...existing, ...payload })
      return { data: { ...table.get(payload.id) }, error: null }
    },
    insert(payload, { uid, isAdmin = false }) {
      if (table.has(payload.id)) {
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
      }
      if (!canInsert(payload, uid, isAdmin)) return { data: null, error: RLS_ERROR }
      table.set(payload.id, { ...payload })
      return { data: { ...payload }, error: null }
    },
  }
}

const isDuplicateKeyError = (error) => {
  if (!error) return false
  return String(error.code || '') === '23505'
    || String(error.message || '').toLowerCase().includes('duplicate key value')
}

const isPermissionError = (error) => {
  if (!error) return false
  return String(error.code || '') === '42501'
    || String(error.message || '').toLowerCase().includes('row-level security')
    || String(error.message || '').toLowerCase().includes('row level security')
}

/** The behaviour that produced "Uploaded 0, but 159 failed". */
function oldWrite(db, payload, session) {
  const { data, error } = db.upsert(payload, session)
  if (!error) return { ok: true, row: data }
  return { ok: false, message: `Shared booking update failed: ${error.message}` }
}

/** The shipped behaviour: update first, insert only if nothing matched. */
function newWrite(db, payload, session) {
  const { data: updated, error: updateError } = db.update(payload, session)
  if (updateError && !isDuplicateKeyError(updateError)) {
    return { ok: false, permission: isPermissionError(updateError), message: updateError.message }
  }
  if (updated) return { ok: true, row: updated }

  const { data: inserted, error: insertError } = db.insert(payload, session)
  if (!insertError) return { ok: true, row: inserted }
  if (isDuplicateKeyError(insertError)) {
    return { ok: false, hidden: true, message: 'this lesson already exists in the shared database but this account is not allowed to change it' }
  }
  return { ok: false, permission: isPermissionError(insertError), message: insertError.message }
}

/* ------------------------------------------------------------------ */

const TEACHER = 'b9d1e31c-e784-4e11-9080-055d3ff7f508' // Teacher M, real cloud id
const STUDENT = '2f4a1b0c-1111-4222-8333-444455556666'
const ADMIN = 'aaaa1111-2222-4333-8444-555566667777'

const lesson = (n, overrides = {}) => ({
  id: `lesson-${n}`,
  student_id: STUDENT,
  teacher_id: TEACHER,
  status: 'completed',
  booking_data: { teacherFeedback: `Great work today #${n}` },
  ...overrides,
})

/* --- 1. Reproduce the reported failure exactly --- */
{
  const existing = Array.from({ length: 159 }, (_, i) => lesson(i, { status: 'confirmed', booking_data: {} }))
  const db = makeDatabase({ rows: existing, insertAllowsTeacher: false })
  const session = { uid: TEACHER }

  let sent = 0
  let refused = 0
  let firstError = ''
  for (let i = 0; i < 159; i += 1) {
    const result = oldWrite(db, lesson(i), session)
    if (result.ok) sent += 1
    else {
      refused += 1
      if (!firstError) firstError = result.message
    }
  }

  check('OLD: the teacher uploaded nothing at all', sent === 0, `sent=${sent}`)
  check('OLD: all 159 lessons were refused', refused === 159, `failed=${refused}`)
  check('OLD: the refusal is row-level security, not the network', /row-level security/.test(firstError))
  check('OLD: the rows were already in the database and visible', db.rowCount() === 159)
  check('OLD: not one piece of feedback was stored', !db.get('lesson-0').booking_data.teacherFeedback)
}

/* --- 2. The same 159 lessons, with the fix --- */
{
  const existing = Array.from({ length: 159 }, (_, i) => lesson(i, { status: 'confirmed', booking_data: {} }))
  const db = makeDatabase({ rows: existing, insertAllowsTeacher: false })
  const session = { uid: TEACHER }

  let sent = 0
  let refused = 0
  for (let i = 0; i < 159; i += 1) {
    if (newWrite(db, lesson(i), session).ok) sent += 1
    else refused += 1
  }

  check('NEW: all 159 lessons upload', sent === 159, `sent=${sent}`)
  check('NEW: nothing is refused', refused === 0, `failed=${refused}`)
  check('NEW: the feedback is actually stored', db.get('lesson-0').booking_data.teacherFeedback === 'Great work today #0')
  check('NEW: the completed status is stored', db.get('lesson-158').status === 'completed')
  check('NEW: no duplicate rows were created', db.rowCount() === 159)
}

/* --- 3. The fix works without the SQL script, and with it --- */
for (const insertAllowsTeacher of [false, true]) {
  const db = makeDatabase({ rows: [lesson(1, { status: 'confirmed', booking_data: {} })], insertAllowsTeacher })
  const result = newWrite(db, lesson(1), { uid: TEACHER })
  check(`NEW: teacher save succeeds with insertAllowsTeacher=${insertAllowsTeacher}`, result.ok)
}

/* --- 4. The SQL script is what lets a teacher create a brand-new lesson --- */
{
  const before = makeDatabase({ insertAllowsTeacher: false })
  const after = makeDatabase({ insertAllowsTeacher: true })
  check('A teacher cannot create a new lesson before the SQL fix',
    !newWrite(before, lesson(9), { uid: TEACHER }).ok)
  check('A teacher can create a new lesson after the SQL fix',
    newWrite(after, lesson(9), { uid: TEACHER }).ok)
  check('The refusal before the fix is named as a permission problem',
    newWrite(makeDatabase({ insertAllowsTeacher: false }), lesson(9), { uid: TEACHER }).permission === true)
}

/* --- 5. Students and admins keep working, unchanged --- */
{
  const db = makeDatabase({ rows: [lesson(2, { status: 'confirmed' })] })
  check('A student can still create their own booking',
    newWrite(db, lesson(3, { status: 'pending' }), { uid: STUDENT }).ok)
  check('A student can still update their own booking',
    newWrite(db, lesson(2, { status: 'cancelled' }), { uid: STUDENT }).ok)
  check('The student cancellation is stored', db.get('lesson-2').status === 'cancelled')
  check('An admin can update anybody\'s booking',
    newWrite(db, lesson(2, { status: 'completed' }), { uid: ADMIN, isAdmin: true }).ok)
  check('An admin can create a booking for a family',
    newWrite(db, lesson(4), { uid: ADMIN, isAdmin: true }).ok)
}

/* --- 6. A genuine outsider is still refused --- */
{
  const stranger = '99999999-0000-4000-8000-000000000000'
  const db = makeDatabase({ rows: [lesson(5)], insertAllowsTeacher: true })
  const result = newWrite(db, lesson(5, { booking_data: { teacherFeedback: 'tampered' } }), { uid: stranger })
  check('An unrelated account cannot change a lesson', !result.ok)
  check('It is reported as an existing lesson it may not touch', result.hidden === true)
  check('The real feedback is untouched', db.get('lesson-5').booking_data.teacherFeedback === 'Great work today #5')
  check('No stray row was created', db.rowCount() === 1)
}

/* --- 7. Real network failures are still reported as themselves --- */
{
  check('A network error is not mistaken for a permission problem',
    !isPermissionError({ message: 'TypeError: Failed to fetch' }))
  check('A 42501 is recognised by code alone', isPermissionError({ code: '42501', message: '' }))
  check('A worded RLS refusal is recognised too',
    isPermissionError({ message: 'new row violates row level security policy' }))
  check('A duplicate key is not a permission problem',
    !isPermissionError({ code: '23505', message: 'duplicate key value violates unique constraint' }))
}

/* --- 8. Repeated saves of the same lesson stay idempotent --- */
{
  const db = makeDatabase({ rows: [lesson(6, { status: 'confirmed', booking_data: {} })] })
  for (let i = 0; i < 5; i += 1) newWrite(db, lesson(6, { booking_data: { teacherFeedback: `pass ${i}` } }), { uid: TEACHER })
  check('Saving five times leaves exactly one row', db.rowCount() === 1)
  check('The last save wins', db.get('lesson-6').booking_data.teacherFeedback === 'pass 4')
}

/* --- 9. The SQL fix file says what it must say --- */
{
  const { readFileSync } = await import('node:fs')
  const sql = readFileSync(new URL('../supabase/fix_booking_permissions.sql', import.meta.url), 'utf8')
  check('The SQL file adds teacher_id to the insert rule', /teacher_id = auth\.uid\(\)::text/.test(sql))
  check('The SQL file drops the old policy first', /drop policy if exists "Students and admins can create bookings"/.test(sql))
  check('The SQL file is re-runnable', (sql.match(/drop policy if exists/g) || []).length >= 2)
  check('The SQL file never deletes data', !/\bdelete\s+from\b|\bdrop\s+table\b|\btruncate\b/i.test(sql))

  const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  const insertPolicy = schema.slice(schema.indexOf('on public.bookings for insert'))
    .slice(0, schema.slice(schema.indexOf('on public.bookings for insert')).indexOf(';'))
  check('schema.sql carries the same fix for fresh installs',
    /teacher_id = auth\.uid\(\)::text/.test(insertPolicy))
}

/* --- 10. The app code no longer upserts bookings --- */
{
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../src/cloudBookings.js', import.meta.url), 'utf8')
  const codeOnly = source.split('\n').filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line)).join('\n')
  check('cloudBookings.js no longer calls .upsert()', !/\.upsert\(/.test(codeOnly))
  check('cloudBookings.js updates before inserting',
    source.indexOf(".update(payload)") < source.indexOf(".insert(payload)"))
  check('cloudBookings.js recognises permission errors', /isPermissionError/.test(source))
  check('cloudBookings.js points the admin at the SQL file', /fix_booking_permissions\.sql/.test(source))
  check('The explanation of the upsert trap is recorded in the code',
    /ON CONFLICT DO UPDATE/.test(source))
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
