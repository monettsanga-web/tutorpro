/**
 * Only a real administrator may reach the administrator endpoints.
 *
 * THE HOLE THIS LOCKS OUT
 * -----------------------
 * api/_admin.js used to decide by reading `profiles.role`. The row-level
 * security policy on that table is:
 *
 *     create policy "Users can update own profile"
 *       on public.profiles for update
 *       using (id = auth.uid()) with check (id = auth.uid());
 *
 * which restricts WHICH ROW may be updated, not WHICH COLUMNS. So anyone
 * could sign up through the normal form and then:
 *
 *     PATCH /rest/v1/profiles?id=eq.<own id>   { "role": "admin" }
 *
 * Verified against production: the PATCH returned 200, and
 * /api/admin/test-accounts then answered that caller with the real total.
 *
 * `admin_members` is the authority now. Its only policy is
 * SELECT-your-own-row; there is no INSERT or UPDATE policy at all, so no
 * API caller can add themselves to it. It is also what the database's own
 * is_tutorpro_admin() reads, so the server and the database finally agree.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = (file) => readFileSync(join(root, file), 'utf8')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const admin = read('api/_admin.js')
const code = admin.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1 ')

/* ================================================================== */
/* 1. The decision is made against a table users cannot write          */
/* ================================================================== */
ok(/from\('admin_members'\)/.test(code), 'membership is read from admin_members')
ok(
  code.indexOf("from('admin_members')") < code.indexOf("from('profiles')"),
  'and that is what gates the request, before the profile is even read',
)
ok(/if \(!membership\) throw/.test(code), 'no membership row means refused')
ok(
  !/profile\.role !== 'admin'/.test(code),
  'the request is no longer allowed or refused on profiles.role, which the caller can rewrite',
)
ok(/getSupabaseAdmin\(\)/.test(code), 'the lookup uses the service-role key, so it sees the real membership, not the caller\'s view')
ok(/auth\.getUser\(token\)/.test(code), 'the token is still resolved to a real user first')

/* ================================================================== */
/* 2. A suspended administrator is still shut out                      */
/* ================================================================== */
ok(/suspended/.test(code) && /removed/.test(code), 'a suspended or removed administrator is refused')

/* ================================================================== */
/* 3. Every administrator endpoint goes through it                     */
/* ================================================================== */
for (const file of ['api/teachers/create.js', 'api/admin/test-accounts.js']) {
  ok(existsSync(join(root, file)), `${file} exists`)
  const text = read(file)
  ok(/requireAdmin\(req\)/.test(text), `${file} is behind requireAdmin`)
  ok(
    !/profiles'\)[\s\S]{0,200}role[\s\S]{0,80}=== 'admin'/.test(text),
    `${file} does not make its own admin decision from profiles.role`,
  )
}

/* ================================================================== */
/* 4. The root cause is written down with a fix the owner can run      */
/* ================================================================== */
const sqlPath = 'supabase/lock_profile_columns.sql'
ok(existsSync(join(root, sqlPath)), 'the database-level fix is written down')
const sql = read(sqlPath)
ok(/before update on public\.profiles/i.test(sql), 'it guards updates to profiles')
ok(/new\.role\s*:=\s*old\.role/.test(sql), 'it freezes role for non-administrators')
ok(/new\.status\s*:=\s*old\.status/.test(sql), 'and status')
for (const key of ['pricing', 'discount', 'paymentRequest', 'credits']) {
  ok(new RegExp(`'${key}'`).test(sql), `and ${key} inside profile_data, which decides what a family pays`)
}
ok(/is_tutorpro_admin\(\)/.test(sql), 'administrators are exempt, so your own edits still work')
ok(!/&\s*'\{\}'::jsonb/.test(sql), 'the guard contains no placeholder left over from drafting')

/* The exemption that the first version of the file was missing. Without it
   the trigger also blocked the website's OWN server key, so a verified
   PayPal payment could not add the lessons it had just paid for, and a
   teacher created by the admin stayed a student. */
ok(
  /auth\.uid\(\) is null/.test(sql),
  "the server's own key is exempt, so a paid lesson is still credited and a new teacher still gets their role",
)
ok(
  /auth\.uid\(\) is null or public\.is_tutorpro_admin\(\)/.test(sql),
  'the exemption is on the very first check, before anything is frozen',
)

/* Part 1 guards UPDATE only. The profile row is CREATED from the sign-up
   request's own metadata, so the 90%-off attack simply moved to
   registration until a BEFORE INSERT guard existed too. */
ok(/before insert on public\.profiles/i.test(sql), 'sign-up is guarded as well as editing')
ok(/new\.role := 'student'/.test(sql), 'nobody can register themselves as an administrator')
ok(/new\.status := 'pending'/.test(sql), 'a teacher application still has to be approved by hand')
ok(
  /current_user = 'service_role'/.test(sql),
  "the insert guard tells the server apart from a visitor by the database role, because auth.uid() is null for BOTH at sign-up",
)
ok(
  !/security definer[\s\S]{0,400}current_user = 'service_role'/.test(sql),
  'and it is not security definer, which would have made current_user the function owner and broken that test',
)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
