/**
 * How often the dashboards are allowed to talk to Supabase.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * Every dashboard ran `setInterval(synchronizeCloud, 3000)` AND held Realtime
 * subscriptions to the same tables. The polling was therefore redundant: the
 * subscriptions already push changes the moment they happen. Measured on the
 * built app, a student dashboard left open and untouched cost:
 *
 *     72 requests and 85 KB per minute  ->  ~5 MB per hour, per open tab
 *
 * Almost all of it was `get_public_teachers` (26 calls, 85 KB in 60 seconds)
 * re-downloading the entire teacher directory, which changes maybe weekly.
 *
 * On Supabase's free tier (5 GB egress a month) a single teacher leaving a tab
 * open through a working day would burn roughly 40 MB. A handful of users
 * doing that is enough to threaten the whole allowance on its own.
 *
 * THE POLICY
 * ----------
 * 1. Realtime stays. It is cheap, event-driven, and it is what actually keeps
 *    two devices in step — that mechanism was hard-won and is not touched.
 * 2. Polling becomes a slow safety net, not the primary channel: a backstop in
 *    case a Realtime event is missed, rather than a 3-second heartbeat.
 * 3. Nothing polls while the tab is hidden. This is the single biggest saving,
 *    because most "open" tabs are background tabs.
 * 4. Repeated identical calls inside a short window are collapsed, so a burst
 *    of Realtime events cannot trigger a stampede of full refetches.
 *
 * WHAT DOES NOT CHANGE
 * --------------------
 * Every sync path still exists and still runs. Saving feedback, booking a
 * class, changing a status and cross-device sync all behave exactly as before,
 * because those are event-driven and were never the polling. The only
 * difference is how often an *idle* screen re-asks for data nobody requested.
 */

/**
 * Backstop interval for dashboard cloud sync, in milliseconds.
 *
 * 3 seconds -> 3 minutes. With Realtime subscriptions active this changes
 * nothing a user can perceive: updates still arrive instantly over the socket.
 * It only bounds how long a missed event could go unnoticed on an idle screen.
 */
export const CLOUD_SYNC_INTERVAL_MS = 180000

/** Minimum gap between two full refetches, however they were triggered. */
export const CLOUD_SYNC_MIN_GAP_MS = 4000

/**
 * Wrap a sync function so that it:
 *   - never runs while the tab is hidden (it runs once on return instead),
 *   - collapses calls that arrive within `minGapMs` of the last one.
 *
 * Returns the wrapped function with a `.dispose()` for cleanup.
 */
export function createCloudSyncScheduler(run, { minGapMs = CLOUD_SYNC_MIN_GAP_MS } = {}) {
  let lastRun = 0
  let pending = false
  let disposed = false

  const invoke = (...args) => {
    if (disposed) return undefined
    // A hidden tab cannot show the result, so the request is pure cost.
    // Remember that work is owed and do it when the tab comes back.
    if (typeof document !== 'undefined' && document.hidden) {
      pending = true
      return undefined
    }
    const now = Date.now()
    if (now - lastRun < minGapMs) {
      pending = true
      return undefined
    }
    lastRun = now
    pending = false
    return run(...args)
  }

  const onVisible = () => {
    if (disposed || typeof document === 'undefined' || document.hidden) return
    if (!pending) return
    pending = false
    lastRun = Date.now()
    run()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisible)
  }

  invoke.dispose = () => {
    disposed = true
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisible)
    }
  }

  return invoke
}
