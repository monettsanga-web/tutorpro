/* Recently-deleted families (owner, 2026-11-07: "i accidentally deleted
 * student account"). Deleting a family used to be permanent the moment the
 * confirm button was pressed. Now every student/family deletion first drops
 * a snapshot here - account, learners and bookings - for 30 days, and the
 * admin's Students page can put it all back, including the shared cloud
 * profile row (the Supabase auth user was never deleted, so the parent's
 * original password still works after a restore).
 *
 * The trash lives in this browser's local store, which is where deletions
 * happen, so the undo button is available on the device that deleted. */
import { getAccountById, insertAccount } from './auth.js'
import { getBookings, restoreBookings } from './bookings.js'

const TRASH_KEY = 'tutorpro_deleted_families_v1'
const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000
const TRASH_MAX = 30

function readTrash() {
  try {
    const list = JSON.parse(localStorage.getItem(TRASH_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch { return [] }
}
function writeTrash(list) {
  try { localStorage.setItem(TRASH_KEY, JSON.stringify(list)) } catch { /* full store: undo simply unavailable */ }
}
function prune(list) {
  const cutoff = Date.now() - TRASH_TTL_MS
  return list
    .filter((entry) => entry && entry.id && entry.account && new Date(entry.deletedAt || 0).getTime() > cutoff)
    .slice(0, TRASH_MAX)
}

/** Snapshot a family right before it is deleted. */
export function captureFamily(accountId) {
  const account = getAccountById(accountId)
  if (!account) return null
  const entry = {
    id: accountId,
    deletedAt: new Date().toISOString(),
    account,
    bookings: getBookings({ studentId: accountId }),
  }
  writeTrash(prune([entry, ...readTrash().filter((item) => item.id !== accountId)]))
  return entry
}

export function listFamilyTrash() {
  return prune(readTrash())
}

export function discardFamily(accountId) {
  writeTrash(readTrash().filter((entry) => entry.id !== accountId))
}

/** Put a deleted family back: account, learners, bookings. Cloud row is
 *  re-created by the caller (restoreCloudProfile) because it is async. */
export function restoreFamily(accountId) {
  const entry = readTrash().find((item) => item.id === accountId)
  if (!entry) throw new Error('That family is no longer in the recently-deleted list.')
  const account = insertAccount(entry.account)
  const bookings = restoreBookings(entry.bookings || [])
  discardFamily(accountId)
  return { account, bookings }
}
