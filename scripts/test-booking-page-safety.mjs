/**
 * Safety checks for the capped booking sync.
 *
 * `fetchCloudBookings()` now returns at most BOOKING_SYNC_LIMIT rows so the
 * query cannot grow without bound as the school takes more lessons. That is
 * only safe because of one property, which these tests exist to protect:
 *
 *     A booking already known to this device must NEVER disappear just
 *     because it fell outside the page that was fetched.
 *
 * The dangerous interaction is `mergeCloudBookings(rows, { reconcile: true })`,
 * which deliberately DELETES local bookings whose id is absent from `rows` —
 * that is how the admin view reflects a lesson someone else removed. Handing
 * that a truncated page would erase real history from the admin's browser.
 * Only the admin path reconciles, and it passes `complete: true`.
 */

import assert from 'node:assert/strict'

let passed = 0
const check = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok  ${name}`) }
  catch (error) { console.error(`FAIL  ${name}\n      ${error.message}`); process.exitCode = 1 }
}

// supabase-js builds a realtime client on import and needs a global
// WebSocket. Node 22 (this project's engine) has one; the sandbox runs Node 20.
// Nothing under test opens a socket, so a stub is enough to load the module.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class { constructor() { throw new Error('sockets unused in these tests') } }
}

// --- minimal browser shims, because bookings.js talks to localStorage -------
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}
globalThis.window = { dispatchEvent() {}, queueMicrotask: (fn) => fn(), localStorage: globalThis.localStorage }
globalThis.dispatchEvent = () => {}

const { mergeCloudBookings } = await import('../src/bookings.js')

const KEY = 'tutorpro_bookings_v1'
const seed = (rows) => store.set(KEY, JSON.stringify(rows))
const read = () => JSON.parse(store.get(KEY) || '[]')

const booking = (id, extra = {}) => ({
  id,
  studentId: 's1',
  teacherId: 't1',
  status: 'completed',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  cloudBooking: true,
  ...extra,
})

console.log('\nA capped page must never lose local history')

check('a booking outside the fetched page survives a normal merge', () => {
  seed([booking('old-1'), booking('old-2')])
  // The cloud page contains only the newest lesson.
  mergeCloudBookings([booking('new-1')])
  const ids = read().map((b) => b.id).sort()
  assert.deepEqual(ids, ['new-1', 'old-1', 'old-2'], 'older lessons must still be present')
})

check('reconcile DOES prune, which is why it must get the complete list', () => {
  seed([booking('old-1'), booking('old-2')])
  mergeCloudBookings([booking('old-1')], { reconcile: true })
  const ids = read().map((b) => b.id)
  // This is the documented behaviour that makes `complete: true` mandatory.
  assert.deepEqual(ids, ['old-1'], 'reconcile removes cloud rows missing from the list')
})

check('a purely local booking is never pruned by reconcile', () => {
  // Not yet uploaded: no cloudBooking flag.
  seed([{ ...booking('local-only'), cloudBooking: false }])
  mergeCloudBookings([], { reconcile: true })
  assert.deepEqual(read().map((b) => b.id), ['local-only'], 'unsynced local work must survive')
})

check('a newer cloud copy still wins on the fields it owns', () => {
  seed([booking('b1', { status: 'confirmed', updatedAt: '2026-01-01T00:00:00.000Z' })])
  mergeCloudBookings([booking('b1', { status: 'completed', updatedAt: '2026-02-01T00:00:00.000Z' })])
  assert.equal(read()[0].status, 'completed')
})

check('an older cloud copy does not overwrite newer local work', () => {
  seed([booking('b1', { status: 'completed', updatedAt: '2026-03-01T00:00:00.000Z' })])
  mergeCloudBookings([booking('b1', { status: 'confirmed', updatedAt: '2026-01-01T00:00:00.000Z' })])
  assert.equal(read()[0].status, 'completed', 'local newer state is kept')
})

check('an empty page leaves everything untouched', () => {
  seed([booking('a'), booking('b')])
  mergeCloudBookings([])
  assert.equal(read().length, 2)
})

check('a malformed response is ignored rather than destroying data', () => {
  seed([booking('a')])
  mergeCloudBookings(null)
  assert.equal(read().length, 1)
})

console.log('\nThe fetch layer itself')

const source = await import('node:fs').then((fs) => fs.readFileSync('src/cloudBookings.js', 'utf8'))

check('the capped path orders newest-first', () => {
  assert.match(source, /ascending: false \}\)\s*\.limit\(BOOKING_SYNC_LIMIT\)/)
})

check('a limit is actually applied', () => {
  assert.match(source, /\.limit\(BOOKING_SYNC_LIMIT\)/)
  assert.match(source, /const BOOKING_SYNC_LIMIT = \d+/)
})

check('a complete mode exists for reconciling callers', () => {
  assert.match(source, /complete = false/)
})

check('booking_data is still selected — the lesson lives in it', () => {
  // Trimming columns here would lose feedback, ratings and attendance.
  assert.match(source, /\.select\('\*'\)/)
})

const dashboards = await import('node:fs').then((fs) => fs.readFileSync('src/Dashboards.jsx', 'utf8'))

check('every reconciling booking sync asks for the complete list', () => {
  const reconcileLines = dashboards.split('\n')
    .map((line, i) => [line, i])
    .filter(([line]) => line.includes('mergeCloudBookings') && line.includes('reconcile: true'))
  assert.ok(reconcileLines.length >= 1, 'expected at least one reconciling caller')
  reconcileLines.forEach(([, i]) => {
    const context = dashboards.split('\n').slice(Math.max(0, i - 12), i + 1).join('\n')
    assert.match(context, /fetchCloudBookings\(\{ complete: true \}\)/,
      `the reconciling merge near line ${i + 1} must be fed a complete fetch`)
  })
})

console.log(`\n${passed} checks passed.`)
