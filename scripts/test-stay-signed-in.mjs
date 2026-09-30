/**
 * Nobody — parent, teacher or administrator — is asked to log in twice.
 *
 * THE FAULT THIS LOCKS OUT
 * ------------------------
 * Both halves of the sign-in were kept in `sessionStorage`, which every
 * browser empties when the tab is closed:
 *
 *   src/supabaseClient.js   storage: window.sessionStorage
 *   src/auth.js             writeSessionId() wrote to sessionStorage and
 *                           then DELETED the localStorage copy, so the
 *                           fallback that looked like a safety net could
 *                           never fire
 *
 * Everyone had to type their password again on every visit. On a phone,
 * switching apps can discard the tab, so a parent could be signed out
 * between booking a lesson and paying for it.
 *
 * All three roles go through the same two functions, so the browser check
 * (scripts/verify-stay-signed-in.mjs) drives a parent end to end and this
 * file proves teachers and admins cannot be on a different path.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = (file) => readFileSync(join(root, file), 'utf8')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const client = read('src/supabaseClient.js')
const auth = read('src/auth.js')
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1 ')
const authCode = code(auth)
const clientCode = code(client)

/* ================================================================== */
/* 1. The Supabase session outlives the tab                            */
/* ================================================================== */
ok(/persistSession: true/.test(clientCode), 'the Supabase client is told to keep the session')
ok(/autoRefreshToken: true/.test(clientCode), 'and to refresh it, so a long gap does not expire it')
ok(
  !/storage:\s*typeof window !== 'undefined' \? window\.sessionStorage/.test(clientCode),
  'the session is no longer pinned to the per-tab store',
)
ok(/window\.localStorage/.test(clientCode), 'it uses localStorage, which survives closing the browser')
ok(/authStorage\(\)/.test(clientCode), 'through one helper, so there is a single place this can be got wrong')
ok(
  /carriedOver[\s\S]{0,300}localStorage\.setItem\(AUTH_STORAGE_KEY/.test(clientCode),
  'anyone already signed in is moved across rather than logged out on the day of the change',
)
ok(/return window\.sessionStorage/.test(clientCode), 'private browsing still falls back to a per-tab session rather than breaking sign-in')

/* ================================================================== */
/* 2. The record of WHO is signed in outlives the tab too              */
/* ================================================================== */
const writeBody = authCode.slice(authCode.indexOf('function writeSessionId'), authCode.indexOf('function clearSessionId'))
ok(/localStorage\.setItem\(SESSION_KEY/.test(writeBody), 'writeSessionId stores the account in localStorage')
ok(
  !/localStorage\.removeItem\(SESSION_KEY\)/.test(writeBody),
  'and no longer deletes that copy immediately afterwards — the bug that made the fallback dead code',
)
ok(/sessionStorage\.removeItem\(SESSION_KEY\)/.test(writeBody), 'the stale per-tab copy is cleared so it cannot shadow the durable one')

const readBody = authCode.slice(authCode.indexOf('function readSessionId'), authCode.indexOf('function writeSessionId'))
ok(/sessionStorage/.test(readBody) && /localStorage/.test(readBody), 'reading still accepts the old location, so nobody mid-session is thrown out')

/* ================================================================== */
/* 3. ALL THREE ROLES use the same path                                */
/* ================================================================== */
/* If a role had its own session handling it could quietly keep the old
   behaviour, which is exactly the kind of thing that gets missed. */
for (const entry of ['registerAccount', 'registerTeacher', 'registerAdmin', 'loginAccount']) {
  const start = authCode.indexOf(`function ${entry}(`)
  ok(start > -1, `${entry} exists`)
  const next = authCode.indexOf('\nexport ', start + 1)
  const body = authCode.slice(start, next === -1 ? undefined : next)
  ok(/writeSessionId\(/.test(body), `${entry} records the session through the one shared function`)
}
const sessionWrites = authCode.match(/sessionStorage\.setItem\(SESSION_KEY/g) || []
ok(sessionWrites.length <= 1, `only the private-browsing fallback writes a per-tab session (${sessionWrites.length})`)

/* ================================================================== */
/* 4. Logging out still really logs out                                */
/* ================================================================== */
/* This became load-bearing only after the change: while the token died with
   the tab, a missed signOut could not leave anything behind. Now it can. */
const logout = authCode.slice(authCode.indexOf('function logoutAccount'))
ok(/clearSessionId\(\)/.test(logout), 'logging out clears the record of who was signed in')
ok(/signOut/.test(logout), 'and revokes the Supabase session, so no working token is left on a shared computer')
ok(/scope: 'local'/.test(logout), "using scope 'local', so signing out on one device does not sign them out on their phone")
ok(/\.catch\(/.test(logout), 'a failed revoke cannot block the local sign-out')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
