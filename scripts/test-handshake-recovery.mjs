/**
 * Models the offer/answer guard logic in OnlineClassroom.jsx.
 *
 * The original guard already recovered when signalingState was non-stable and
 * the offer had gone stale, so it was not the total deadlock first suspected —
 * these tests proved that and the claim was corrected.
 *
 * What the change does add:
 *  - recovery when connectionState is 'connecting' but signalingState is
 *    'stable', which the old stale check did not cover
 *  - the teacher's 2.5s reminder now re-offers directly instead of only
 *    emitting 'teacher-ready' and waiting for the student to respond, so a
 *    single dropped signalling message can no longer stall the pair
 *
 * Run: node scripts/test-handshake-recovery.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const STALE_MS = 7000

/** The guard as it was before the fix. */
function oldGuard({ connectionState, signalingState, offerAgeMs, forceRestart }) {
  const offerIsStale = offerAgeMs > 0 && offerAgeMs > STALE_MS
  let didReset = false
  if (forceRestart || connectionState === 'failed' || connectionState === 'closed'
      || (signalingState !== 'stable' && offerIsStale)) {
    didReset = true
    connectionState = 'new'
    signalingState = 'stable'
  }
  if (connectionState === 'connected' || signalingState !== 'stable') {
    return { sentOffer: false, didReset }
  }
  return { sentOffer: true, didReset }
}

/** The guard after the fix. */
function newGuard({ connectionState, signalingState, offerAgeMs, forceRestart }) {
  const offerIsStale = offerAgeMs > 0 && offerAgeMs > STALE_MS
  const stuckConnecting = connectionState === 'connecting' && offerIsStale
  let didReset = false
  if (forceRestart || stuckConnecting || connectionState === 'failed' || connectionState === 'closed'
      || (signalingState !== 'stable' && offerIsStale)) {
    didReset = true
    connectionState = 'new'
    signalingState = 'stable'
  }
  if (connectionState === 'connected') return { sentOffer: false, didReset }
  if (signalingState !== 'stable' && !offerIsStale) return { sentOffer: false, didReset }
  return { sentOffer: true, didReset }
}

/** The 2.5s reminder's decision about whether to demand a restart. */
function reminderNeedsRestart({ connectionState, offerAgeMs }, isNew) {
  const stalled = offerAgeMs > 0 && offerAgeMs > STALE_MS
  const base = ['failed', 'disconnected'].includes(connectionState)
  return isNew ? (base || stalled) : base
}

// --- The exact reported situation ---
const stalled = { connectionState: 'connecting', signalingState: 'have-local-offer', offerAgeMs: 20000, forceRestart: false }

check('OLD: recovers only via the non-stable path', oldGuard(stalled).didReset === true)
check('OLD: reminder does not ask for a restart', reminderNeedsRestart(stalled, false) === false)
check('NEW: stalled handshake rebuilds the peer', newGuard(stalled).didReset === true)
check('NEW: stalled handshake sends a fresh offer', newGuard(stalled).sentOffer === true)
check('NEW: reminder asks for a restart', reminderNeedsRestart(stalled, true) === true)

// --- Must not disturb a healthy connection ---
const connected = { connectionState: 'connected', signalingState: 'stable', offerAgeMs: 60000, forceRestart: false }
check('connected: no offer resent', newGuard(connected).sentOffer === false)
// The live reminder returns before this check when connected, verified in source.

// --- A negotiation still in flight must be left alone ---
const fresh = { connectionState: 'connecting', signalingState: 'have-local-offer', offerAgeMs: 1500, forceRestart: false }
check('fresh offer: not interrupted', newGuard(fresh).sentOffer === false)
check('fresh offer: no reset', newGuard(fresh).didReset === false)
check('fresh offer: reminder waits', reminderNeedsRestart(fresh, true) === false)

// --- Normal first offer ---
const brandNew = { connectionState: 'new', signalingState: 'stable', offerAgeMs: 0, forceRestart: false }
check('first offer is sent', newGuard(brandNew).sentOffer === true)
check('first offer needs no reset', newGuard(brandNew).didReset === false)

// --- Genuine failure still recovers ---
const broken = { connectionState: 'failed', signalingState: 'stable', offerAgeMs: 10000, forceRestart: false }
check('failed: resets', newGuard(broken).didReset === true)
check('failed: sends offer', newGuard(broken).sentOffer === true)
check('failed: reminder asks for restart', reminderNeedsRestart(broken, true) === true)

// --- Explicit restart request ---
const forced = { connectionState: 'connecting', signalingState: 'have-local-offer', offerAgeMs: 100, forceRestart: true }
check('forced restart always rebuilds', newGuard(forced).didReset === true)
check('forced restart sends offer', newGuard(forced).sentOffer === true)

// --- The loop must terminate: repeated retries eventually send an offer ---
{
  let state = { connectionState: 'connecting', signalingState: 'have-local-offer', offerAgeMs: 0, forceRestart: false }
  let offers = 0
  for (let tick = 1; tick <= 8; tick += 1) {
    state.offerAgeMs = tick * 2500
    const result = newGuard(state)
    if (result.sentOffer) {
      offers += 1
      state = { connectionState: 'connecting', signalingState: 'have-local-offer', offerAgeMs: 0, forceRestart: false }
    }
  }
  check('NEW: retries eventually re-offer', offers >= 1, `${offers} offers over 20s`)
}
{
  let state = { connectionState: 'connecting', signalingState: 'have-local-offer', offerAgeMs: 0, forceRestart: false }
  let offers = 0
  for (let tick = 1; tick <= 8; tick += 1) {
    state.offerAgeMs = tick * 2500
    if (oldGuard(state).sentOffer) offers += 1
  }
  check('OLD: also retried (no total deadlock)', offers >= 1, `${offers} offers over 20s`)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
