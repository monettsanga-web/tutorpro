/**
 * The test-account cleanup must never be able to delete a real family.
 *
 * This is the most dangerous button in the admin dashboard: it removes
 * Supabase auth users, and that cascade takes their profile, their children
 * and their booking history with it. Everything below is about the one
 * question that matters — can a genuine parent ever end up on the list?
 *
 * The rules live in src/testAccounts.js and are applied TWICE: once in the
 * browser to build the list the admin reads, and again on the server against
 * the row the database holds, before each delete. So a tampered request
 * cannot get past them either.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = (file) => readFileSync(join(root, file), 'utf8')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

/* Load the pure rules without the browser-only fetch helpers at the bottom. */
const source = read('src/testAccounts.js')
const pure = source.slice(0, source.indexOf('/* ---------------------------------------------------------------------------- */') + 1 || source.indexOf('/* Browser side'))
const { testAccountReason, isTestAccount, isProtectedAccount, findTestAccounts } = await import(
  'data:text/javascript;base64,' + Buffer.from(pure).toString('base64')
)

/* ================================================================== */
/* 1. REAL FAMILIES ARE NEVER MATCHED                                  */
/* ================================================================== */
const REAL = [
  { id: '1', role: 'student', email: 'maria.santos@gmail.com', parent_name: 'Maria Santos' },
  { id: '2', role: 'student', email: 'jun.delacruz@yahoo.com', parent_name: 'Jun Dela Cruz' },
  { id: '3', role: 'student', email: 'arena.reyes@gmail.com', parent_name: 'Arena Reyes' },
  { id: '4', role: 'student', email: 'arenas@gmail.com', parent_name: 'Liza Arenas' },
  { id: '5', role: 'student', email: 'checkers@outlook.com', parent_name: 'Ana Checker' },
  { id: '6', role: 'student', email: 'example@gmail.com', parent_name: 'Paolo Example' },
  { id: '7', role: 'student', email: 'test@gmail.com', parent_name: 'Tess Tan' },
  { id: '8', role: 'student', email: 'someone@myexample.com.ph', parent_name: 'Rico Bautista' },
  /* A real parent who signed up with WeChat or WhatsApp. Their address is on
     accounts.tutorpro.site, which must NEVER be enough on its own. */
  { id: '9', role: 'student', email: 'wechat.lixiaoming@accounts.tutorpro.site', parent_name: 'Li Xiaoming' },
  { id: '10', role: 'student', email: 'whatsapp.639171112222@accounts.tutorpro.site', parent_name: 'Grace Mendoza' },
  /* Names that are close to, but not, the check's name. */
  { id: '11', role: 'student', email: 'p@gmail.com', parent_name: 'Arena Check' },
  { id: '12', role: 'student', email: 'p2@gmail.com', parent_name: 'arena check parent' },
  { id: '13', role: 'student', email: 'p3@gmail.com', parent_name: 'Arena Check Parents' },
  { id: '14', role: 'teacher', email: 'teacher@gmail.com', parent_name: null, full_name: 'Teacher M' },
  { id: '15', role: 'admin', email: 'monettsanga@yahoo.com', parent_name: 'Monett' },
]
REAL.forEach((account) => {
  const reason = testAccountReason(account)
  ok(reason === '', `kept: ${account.parent_name || account.full_name} <${account.email}>${reason ? ' — WRONGLY MATCHED: ' + reason : ''}`)
})
ok(findTestAccounts(REAL).length === 0, 'a list of only real families produces nothing to delete')

/* ================================================================== */
/* 2. THE THROWAWAY ACCOUNTS ARE MATCHED                               */
/* ================================================================== */
const JUNK = [
  { id: 'a', role: 'student', email: 'arenagm771510425@gmail.com', parent_name: 'Arena Check Parent' },
  { id: 'b', role: 'student', email: 'arenaya771510425@yahoo.com', parent_name: 'Arena Check Parent' },
  { id: 'c', role: 'student', email: 'arenaot771510425@example.com', parent_name: 'Arena Check Parent' },
  { id: 'd', role: 'student', email: 'wechat.arenawc771510425@accounts.tutorpro.site', parent_name: 'Arena Check Parent' },
  { id: 'e', role: 'student', email: 'whatsapp.639171510425@accounts.tutorpro.site', parent_name: 'Arena Check Parent' },
  { id: 'f', role: 'student', email: 'arenadup771884941@gmail.com', parent_name: 'Arena Check Parent' },
  { id: 'g', role: 'student', email: 'arena-check-1790770119843@example.com', parent_name: 'Arena Check Parent' },
  /* Older leftovers from the PayPal work, and the one still sitting there. */
  { id: 'h', role: 'student', email: 'paypaltest@example.com', parent_name: 'PayPal Test' },
  { id: 'i', role: 'student', email: 'realpay.1234@example.com', parent_name: 'Test' },
  { id: 'j', role: 'student', email: 'insp3.99@example.com', parent_name: 'Insp' },
]
JUNK.forEach((account) => {
  const reason = testAccountReason(account)
  ok(reason !== '', `removed: <${account.email}> — ${reason || 'NOT MATCHED'}`)
})
ok(findTestAccounts(JUNK).length === JUNK.length, 'every throwaway account is on the list')

/* ================================================================== */
/* 3. PROTECTION BEATS EVERY OTHER RULE                                */
/* ================================================================== */
ok(isProtectedAccount({ role: 'admin', email: 'x@example.com' }), 'an admin is protected even on a reserved domain')
ok(isProtectedAccount({ role: 'teacher', email: 'x@example.com' }), 'so is a teacher')
ok(!isTestAccount({ role: 'admin', email: 'arenagm1@example.com', parent_name: 'Arena Check Parent' }), 'an admin matching every junk rule is still never deleted')
ok(!isTestAccount({ role: 'teacher', email: 'arenagm1@example.com', parent_name: 'Arena Check Parent' }), 'nor is a teacher')
ok(isProtectedAccount({ role: 'student', email: 'monettsanga@yahoo.com' }), 'the administrator address is protected whatever role the row claims')
ok(isProtectedAccount({ role: 'student', login_id: 'sejongenglish@yahoo.com' }), 'and the business address')

/* ================================================================== */
/* 4. MISSING AND ODD DATA NEVER MATCHES BY ACCIDENT                   */
/* ================================================================== */
ok(!isTestAccount({}), 'an empty row is not a test account')
ok(!isTestAccount({ id: 'z' }), 'a row with nothing but an id is not a test account')
ok(!isTestAccount({ role: 'student', email: '', parent_name: '' }), 'blank fields are not a test account')
ok(!isTestAccount({ role: 'student', email: null, parent_name: null }), 'nulls are not a test account')
ok(findTestAccounts([null, undefined, {}, { id: null }]).length === 0, 'junk input produces nothing to delete')

/* ================================================================== */
/* 5. THE SERVER CHECKS AGAIN BEFORE DELETING                          */
/* ================================================================== */
const api = read('api/admin/test-accounts.js')
ok(/requireAdmin/.test(api), 'the endpoint is behind the administrator check')
ok(/isProtectedAccount/.test(api) && /isTestAccount/.test(api), 'it re-applies the same rules server-side')
ok(/byId\.get\(id\)/.test(api), 'it checks the row the DATABASE holds, not the one the browser sent')
ok(/action === 'list'/.test(api) && api.indexOf("action === 'list'") < api.indexOf('deleteUser'), 'listing happens before, and separately from, deleting')
ok(/auth\.admin\.deleteUser/.test(api), 'it deletes the login too, not just the profile row')
ok(/refused/.test(api), 'anything it refuses is reported back rather than silently skipped')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
