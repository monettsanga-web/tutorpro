/**
 * Is this device actually able to share data with the other computers?
 *
 * WHY THIS EXISTS
 * ---------------
 * Bookings, feedback and lesson statuses are protected by row-level security,
 * which matches the signed-in Supabase user against the booking's teacher_id or
 * student_id. Without a Supabase session every write is rejected by the
 * database — but the app still saves locally, so the screen looks completely
 * normal.
 *
 * loginAccount() falls back to a local-only login whenever the cloud sign-in
 * fails (wrong password against Supabase, unconfirmed email, offline at the
 * moment of login, a profile that only ever existed on this device). Nothing
 * told the user, so a teacher could work all week on a device whose changes
 * never left it. That is the reported "not syncing" symptom.
 *
 * This module answers one question honestly: can this device write to the
 * shared database right now?
 */

import { isSupabaseConfigured, supabase } from './supabaseClient.js'

export const SYNC_STATE = {
  CHECKING: 'checking',
  /** Fully working: signed in and the session matches this account. */
  SYNCED: 'synced',
  /** No Supabase project configured at all — a deliberate offline install. */
  OFFLINE_BUILD: 'offline-build',
  /** Signed in locally but not to Supabase, so writes cannot leave this device. */
  NO_SESSION: 'no-session',
  /** Signed in as a different Supabase user than the dashboard account. */
  WRONG_SESSION: 'wrong-session',
  /** Session exists but the network or database is unreachable. */
  UNREACHABLE: 'unreachable',
  /**
   * Signed in correctly, but this account's local id is not the Supabase user
   * id, so row-level security rejects every write for its bookings.
   */
  ID_MISMATCH: 'id-mismatch',
}

/**
 * Check the real state. Cheap: one cached session read plus, when a session
 * exists, one tiny query to confirm the database is actually reachable.
 */
export async function checkSyncHealth(account) {
  if (!isSupabaseConfigured || !supabase) {
    return { state: SYNC_STATE.OFFLINE_BUILD, canSync: false }
  }
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) return { state: SYNC_STATE.UNREACHABLE, canSync: false, detail: error.message }

    const session = data?.session
    if (!session?.user?.id) {
      return { state: SYNC_STATE.NO_SESSION, canSync: false }
    }
    if (account?.id && String(session.user.id) !== String(account.id)) {
      // Registration assigns a random local UUID first and only replaces it
      // with the Supabase user id when cloud sign-up succeeded. If that step
      // failed, the account keeps its local id forever. Every booking then
      // carries a teacherId that can never equal auth.uid(), so row-level
      // security rejects all of them — which looks exactly like 'sync is
      // broken' while the session itself is perfectly healthy.
      const looksLocalOnly = !account.cloudProfile
      return {
        state: looksLocalOnly ? SYNC_STATE.ID_MISMATCH : SYNC_STATE.WRONG_SESSION,
        canSync: false,
        sessionUserId: session.user.id,
        accountId: account.id,
      }
    }

    // A session can exist while the project is unreachable, so confirm with a
    // request that returns almost nothing.
    const { error: reachError } = await supabase.from('bookings').select('id').limit(1)
    if (reachError) return { state: SYNC_STATE.UNREACHABLE, canSync: false, detail: reachError.message }

    return { state: SYNC_STATE.SYNCED, canSync: true }
  } catch (error) {
    return { state: SYNC_STATE.UNREACHABLE, canSync: false, detail: error?.message || 'Unknown error' }
  }
}

/** Plain-language explanation, written for a non-technical school owner. */
export function syncHealthMessage(health) {
  switch (health?.state) {
    case SYNC_STATE.SYNCED:
      return null
    case SYNC_STATE.OFFLINE_BUILD:
      return {
        tone: 'warn',
        title: 'Shared database not configured',
        detail: 'This build has no Supabase connection, so nothing is shared between devices.',
      }
    case SYNC_STATE.NO_SESSION:
      return {
        tone: 'error',
        title: 'This device is not connected to the shared database',
        detail: 'You are signed in on this computer only. Feedback, lesson statuses and bookings you change here will NOT appear on your other devices. Log out and log back in to reconnect. If that fails, the email may still need confirming.',
      }
    case SYNC_STATE.ID_MISMATCH:
      return {
        tone: 'error',
        title: 'This account was created without a shared-database record',
        detail: 'You are signed in, but this account was registered while the shared database was unavailable, so it has a different internal id. The database rejects everything saved under it, which is why nothing reaches your other devices. An administrator needs to re-create this teacher account so it is linked properly. Work already saved here stays on this device until then.',
      }
    case SYNC_STATE.WRONG_SESSION:
      return {
        tone: 'error',
        title: 'Signed in as a different account',
        detail: 'The shared database session belongs to another account, so changes here are rejected. Log out and log back in with this account.',
      }
    case SYNC_STATE.UNREACHABLE:
      return {
        tone: 'warn',
        title: 'Shared database unreachable',
        detail: `Changes are saved on this device and will upload when the connection returns.${health.detail ? ` (${health.detail})` : ''}`,
      }
    default:
      return null
  }
}
