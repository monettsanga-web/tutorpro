/**
 * Backup logic — pure unit checks, no browser needed.
 *
 * The backup is the free tier's missing safety net, so the rules that matter
 * are: it never throws, it never silently loses a table, and a partial
 * backup is always reported as partial.
 */
import assert from 'node:assert/strict'

// Minimal browser shims so the module can be imported under plain Node.
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class { constructor(parts) { this.size = Buffer.byteLength(parts.join('')) } }
}
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
}
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class { constructor() { throw new Error('sockets unused') } }
}

const {
  collectLocalData, estimateDatabaseBytes, formatBytes, upgradeVerdict,
  backupFileName, FREE_TIER, BACKUP_TABLES,
} = await import('../src/backup.js')

let pass = 0, fail = 0
const ok = (cond, msg) => { cond ? pass++ : fail++; console.log((cond ? '  ok  ' : 'FAIL  ') + msg) }

/* --- file name --------------------------------------------------- */
const name = backupFileName(new Date('2026-09-05T10:00:00Z'))
ok(name === 'tutorpro-backup-2026-09-05.json' || /^tutorpro-backup-2026-09-0[45]\.json$/.test(name),
  `file name is dated and sortable (${name})`)
ok(name.endsWith('.json'), 'file name is a .json file')

/* --- local data collection --------------------------------------- */
localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([{ id: 'a', role: 'student' }]))
localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([{ id: 'b1' }]))
localStorage.setItem('unrelated_key', 'ignore me')
const local = collectLocalData()
ok(Array.isArray(local.tutorpro_accounts_v2), 'accounts are collected and parsed back into an array')
ok(local.tutorpro_accounts_v2[0].id === 'a', 'account contents survive the round trip')
ok(Array.isArray(local.tutorpro_bookings_v1), 'bookings are collected')
ok(!('unrelated_key' in local), 'unrelated keys are not swept into the backup')
ok(!('tutorpro_homework_v1' in local), 'keys with no data are omitted rather than stored as null')

/* --- corrupt data must not throw --------------------------------- */
localStorage.setItem('tutorpro_homework_v1', '{not valid json')
let threw = false
let corrupt
try { corrupt = collectLocalData() } catch { threw = true }
ok(!threw, 'corrupt stored data does not throw')
ok(corrupt.tutorpro_homework_v1 === '{not valid json', 'unparseable data is preserved verbatim rather than dropped')
localStorage.removeItem('tutorpro_homework_v1')

/* --- the four tables are all covered ------------------------------ */
for (const table of ['profiles', 'bookings', 'direct_messages', 'site_settings']) {
  ok(BACKUP_TABLES.includes(table), `${table} is included in the backup`)
}

/* --- size estimate ------------------------------------------------ */
const sample = { tables: { profiles: [{ id: 1, name: 'x'.repeat(100) }], bookings: [] } }
const est = estimateDatabaseBytes(sample)
ok(est.bytes > 0, 'a non-empty database estimates above zero')
ok(est.perTable.profiles.rows === 1, 'per-table row counts are reported')
ok(est.perTable.bookings.rows === 0, 'an empty table is reported as zero rows, not omitted')
ok(est.percentOfFreeTier > 0 && est.percentOfFreeTier < 1, 'a tiny database is a tiny fraction of the free tier')

const empty = estimateDatabaseBytes({ tables: {} })
ok(empty.bytes === 0, 'an empty backup estimates zero bytes')
ok(Number.isFinite(empty.percentOfFreeTier), 'the empty case still yields a finite percentage')

// The estimate must be pessimistic: never smaller than the raw JSON.
const rawJson = new Blob([JSON.stringify(sample.tables.profiles)]).size
ok(est.bytes >= rawJson, 'the estimate is pessimistic (never under-reports)')

/* --- free tier figures -------------------------------------------- */
ok(FREE_TIER.databaseBytes === 500 * 1024 * 1024, 'free database allowance recorded as 500 MB')
ok(FREE_TIER.egressBytes === 5 * 1024 * 1024 * 1024, 'free egress allowance recorded as 5 GB')

/* --- verdict thresholds ------------------------------------------- */
ok(upgradeVerdict({ percentOfFreeTier: 0.2 }).level === 'safe', 'tiny usage is reported as safe')
ok(upgradeVerdict({ percentOfFreeTier: 50 }).level === 'watch', 'half full is reported as worth watching')
ok(upgradeVerdict({ percentOfFreeTier: 92 }).level === 'act', 'nearly full is reported as needing action')
ok(upgradeVerdict({ percentOfFreeTier: 0.2 }).detail.includes('no reason to pay'),
  'the safe verdict says plainly that paying is unnecessary')

/* --- byte formatting ---------------------------------------------- */
ok(formatBytes(512) === '512 B', 'bytes are shown as bytes')
ok(formatBytes(2048) === '2.0 KB', 'kilobytes are shown as KB')
ok(formatBytes(5 * 1024 * 1024) === '5.0 MB', 'megabytes are shown as MB')
ok(formatBytes(0) === '0 B', 'zero formats cleanly')

assert.ok(true)
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
