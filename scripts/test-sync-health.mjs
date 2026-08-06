/**
 * Detecting a device that cannot write to the shared database.
 *
 * Reported symptom: after fixing the status upload and the feedback upload,
 * data still did not appear on a second computer.
 *
 * Root cause found by reading loginAccount(): when the Supabase sign-in fails
 * for any reason — unconfirmed email, offline at the moment of login, a
 * password that works locally but not against Supabase, a profile that only
 * ever existed on this device — the app falls back to a LOCAL-ONLY login and
 * says nothing. The dashboard then looks completely normal, but there is no
 * Supabase session, so row-level security rejects every write. Nothing the
 * teacher does on that device can ever reach another one.
 *
 * No amount of fixing the upload calls helps, because the uploads were never
 * permitted in the first place.
 *
 * Run: node scripts/test-sync-health.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const SYNC_STATE = {
  SYNCED: 'synced',
  OFFLINE_BUILD: 'offline-build',
  NO_SESSION: 'no-session',
  WRONG_SESSION: 'wrong-session',
  UNREACHABLE: 'unreachable',
}

/** Mirrors checkSyncHealth() without the network. */
async function health({ configured = true, session = null, sessionError = null, reachError = null, account }) {
  if (!configured) return { state: SYNC_STATE.OFFLINE_BUILD, canSync: false }
  if (sessionError) return { state: SYNC_STATE.UNREACHABLE, canSync: false, detail: sessionError }
  if (!session?.user?.id) return { state: SYNC_STATE.NO_SESSION, canSync: false }
  if (account?.id && String(session.user.id) !== String(account.id)) {
    return { state: SYNC_STATE.WRONG_SESSION, canSync: false, sessionUserId: session.user.id }
  }
  if (reachError) return { state: SYNC_STATE.UNREACHABLE, canSync: false, detail: reachError }
  return { state: SYNC_STATE.SYNCED, canSync: true }
}

function message(h) {
  switch (h.state) {
    case SYNC_STATE.SYNCED: return null
    case SYNC_STATE.OFFLINE_BUILD: return { tone: 'warn', title: 'Shared database not configured' }
    case SYNC_STATE.NO_SESSION: return { tone: 'error', title: 'This device is not connected to the shared database' }
    case SYNC_STATE.WRONG_SESSION: return { tone: 'error', title: 'Signed in as a different account' }
    case SYNC_STATE.UNREACHABLE: return { tone: 'warn', title: 'Shared database unreachable' }
    default: return null
  }
}

const teacher = { id: 'T1' }

/* --- The reported situation: local-only login --- */
{
  const h = await health({ session: null, account: teacher })
  check('no Supabase session is detected', h.state === SYNC_STATE.NO_SESSION)
  check('it is reported as unable to sync', h.canSync === false)
  const m = message(h)
  check('the teacher is warned', m !== null && m.tone === 'error')
  check('the warning is specific', m.title.includes('not connected to the shared database'))
}

/* --- Working normally --- */
{
  const h = await health({ session: { user: { id: 'T1' } }, account: teacher })
  check('a valid session reports synced', h.state === SYNC_STATE.SYNCED && h.canSync === true)
  check('no banner is shown when healthy', message(h) === null)
}

/* --- Signed in as somebody else --- */
{
  const h = await health({ session: { user: { id: 'OTHER' } }, account: teacher })
  check('mismatched session detected', h.state === SYNC_STATE.WRONG_SESSION)
  check('mismatched session cannot sync', h.canSync === false)
  check('mismatch is reported as an error', message(h).tone === 'error')
}

/* --- Network or database down --- */
{
  const h = await health({ session: { user: { id: 'T1' } }, reachError: 'Failed to fetch', account: teacher })
  check('unreachable database detected', h.state === SYNC_STATE.UNREACHABLE)
  check('unreachable is a warning, not an error', message(h).tone === 'warn')
  check('the underlying reason is kept', h.detail === 'Failed to fetch')
}
{
  const h = await health({ sessionError: 'network error', account: teacher })
  check('a failed session lookup is unreachable', h.state === SYNC_STATE.UNREACHABLE)
}

/* --- A deliberately offline install must not be alarming --- */
{
  const h = await health({ configured: false, account: teacher })
  check('offline build detected', h.state === SYNC_STATE.OFFLINE_BUILD)
  check('offline build is a warning, not an error', message(h).tone === 'warn')
}

/* --- Id comparison must survive type differences --- */
{
  const h = await health({ session: { user: { id: 1 } }, account: { id: '1' } })
  check('numeric and string ids match', h.state === SYNC_STATE.SYNCED)
}

/* --- Missing account must not produce a false mismatch --- */
{
  const h = await health({ session: { user: { id: 'T1' } }, account: undefined })
  check('no account does not cause a false mismatch', h.state === SYNC_STATE.SYNCED)
}

/* --- Why the earlier fixes could not work --- */
{
  const canWrite = (h) => h.canSync
  const stranded = await health({ session: null, account: teacher })
  check('uploads are impossible without a session', canWrite(stranded) === false)
  const working = await health({ session: { user: { id: 'T1' } }, account: teacher })
  check('uploads are possible with one', canWrite(working) === true)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
