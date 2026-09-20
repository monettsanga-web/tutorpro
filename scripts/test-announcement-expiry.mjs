/**
 * Announcements must disappear from dashboards after two days.
 *
 * WHY
 * ---
 * Left forever, the banner becomes wallpaper: parents stop reading it, so the
 * one announcement that actually matters gets ignored too. Two days is long
 * enough that somebody who logs in once over a weekend still sees it.
 *
 * The important edge case is announcements saved BEFORE this feature existed.
 * They have no `expiresAt`, so expiry is derived from `createdAt`. If that
 * fallback were missing, every old banner would stay up forever — which is
 * exactly the bug being fixed.
 */
import assert from 'node:assert/strict'

// localStorage shim so the module can run under plain Node.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}
// The module dispatches a DOM event on save; make that a no-op.
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }
globalThis.Event = class { constructor(type) { this.type = type } }

const {
  ANNOUNCEMENT_LIFETIME_DAYS, ANNOUNCEMENT_LIFETIME_MS,
  announcementCountdownLabel, announcementExpiry, clearAnnouncements,
  getAnnouncements, isAnnouncementExpired, pruneExpiredAnnouncements,
  removeAnnouncement, saveAnnouncement, supersedesAnnouncement, visibleAnnouncements,
} = await import('../src/announcements.js')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const KEY = 'tutorpro_announcements_v1'
const DISMISSED = 'tutorpro_announcements_dismissed_v1'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const reset = () => { store.clear() }
const seed = (items) => { store.set(KEY, JSON.stringify(items)) }
const student = { role: 'student' }

/* --- the lifetime is two days ------------------------------------- */
ok(ANNOUNCEMENT_LIFETIME_DAYS === 2, 'the lifetime is 2 days')
ok(ANNOUNCEMENT_LIFETIME_MS === 2 * DAY, 'the lifetime in ms matches 2 days')

/* --- a new announcement is stamped with an expiry ------------------ */
reset()
const saved = saveAnnouncement({ subject: 'Holiday', body: 'Closed Monday', target: 'ALL' })
ok(Boolean(saved.expiresAt), 'a new announcement records expiresAt')
const gap = Date.parse(saved.expiresAt) - Date.parse(saved.createdAt)
ok(Math.abs(gap - ANNOUNCEMENT_LIFETIME_MS) < 1000, `expiresAt is 2 days after createdAt (${gap}ms)`)
ok(getAnnouncements().length === 1, 'it is visible immediately')
ok(visibleAnnouncements(student).length === 1, 'a student sees it immediately')

/* --- it survives until the deadline, then goes ---------------------- */
const now = Date.now()
ok(getAnnouncements(now + HOUR).length === 1, 'still visible after 1 hour')
ok(getAnnouncements(now + DAY).length === 1, 'still visible after 1 day')
ok(getAnnouncements(now + (2 * DAY) - HOUR).length === 1, 'still visible 1 hour before the deadline')
ok(getAnnouncements(now + (2 * DAY) + 1000).length === 0, 'GONE just after 2 days')
ok(getAnnouncements(now + (5 * DAY)).length === 0, 'still gone after 5 days')

/* --- OLD announcements with no expiresAt must also expire ---------- */
// This is the actual reported bug: banners that never went away.
reset()
seed([
  { id: 'old', subject: 'Ancient', body: 'From last month', target: 'ALL',
    createdAt: new Date(Date.now() - (30 * DAY)).toISOString() },
])
ok(getAnnouncements().length === 0, 'a 30-day-old announcement with no expiresAt is expired')
ok(visibleAnnouncements(student).length === 0, 'students no longer see it')

reset()
seed([
  { id: 'fresh', subject: 'Recent', body: 'Yesterday', target: 'ALL',
    createdAt: new Date(Date.now() - DAY).toISOString() },
])
ok(getAnnouncements().length === 1, 'a 1-day-old announcement with no expiresAt is still shown')

/* --- a record with no usable date is treated as expired ------------ */
reset()
seed([{ id: 'broken', subject: 'No date', body: '', target: 'ALL' }])
ok(getAnnouncements().length === 0, 'a record with no date at all is treated as expired, not immortal')
seed([{ id: 'bad', subject: 'Bad date', body: '', target: 'ALL', createdAt: 'not-a-date' }])
ok(getAnnouncements().length === 0, 'an unparseable date is treated as expired')

/* --- pruning actually deletes from storage -------------------------- */
reset()
seed([
  { id: 'a', subject: 'Old', body: '', target: 'ALL', createdAt: new Date(Date.now() - (9 * DAY)).toISOString() },
  { id: 'b', subject: 'New', body: '', target: 'ALL', createdAt: new Date().toISOString() },
])
const removed = pruneExpiredAnnouncements()
ok(removed === 1, `pruning reports how many it removed (${removed})`)
ok(JSON.parse(store.get(KEY)).length === 1, 'the expired record is really gone from storage')
ok(pruneExpiredAnnouncements() === 0, 'pruning again removes nothing and reports 0')

/* --- sending a new one clears old ones ------------------------------ */
reset()
seed([{ id: 'stale', subject: 'Stale', body: '', target: 'ALL', createdAt: new Date(Date.now() - (10 * DAY)).toISOString() }])
saveAnnouncement({ subject: 'Fresh', body: 'Now', target: 'ALL' })
const afterSave = JSON.parse(store.get(KEY))
ok(afterSave.length === 1, 'sending a new announcement drops expired ones from storage')
ok(afterSave[0].subject === 'Fresh', 'only the new announcement remains')

/* --- a NEW announcement REPLACES the previous one -------------------- */
// The reported behaviour: parents should see the current message, not a
// stack of every announcement ever sent.
reset()
saveAnnouncement({ subject: 'First notice', body: 'Old info', target: 'ALL' })
saveAnnouncement({ subject: 'Second notice', body: 'New info', target: 'ALL' })
const afterReplace = getAnnouncements()
ok(afterReplace.length === 1, `only one announcement remains after sending a second (${afterReplace.length})`)
ok(afterReplace[0].subject === 'Second notice', 'the newest announcement is the one kept')
ok(visibleAnnouncements(student).length === 1, 'a parent sees exactly one banner')
ok(visibleAnnouncements(student)[0].subject === 'Second notice', 'the parent sees the newest message')

reset()
saveAnnouncement({ subject: 'One', body: '', target: 'ALL' })
saveAnnouncement({ subject: 'Two', body: '', target: 'ALL' })
saveAnnouncement({ subject: 'Three', body: '', target: 'ALL' })
ok(getAnnouncements().length === 1, 'sending three in a row still leaves one')
ok(getAnnouncements()[0].subject === 'Three', 'the latest wins')

/* --- but replacing must NOT silently delete another audience's notice */
reset()
saveAnnouncement({ subject: 'For everyone', body: '', target: 'ALL' })
saveAnnouncement({ subject: 'For teachers', body: '', target: 'TEACHER' })
ok(getAnnouncements().length === 2, 'a teacher-only notice does not wipe the all-audience one')
ok(visibleAnnouncements({ role: 'teacher' }).length === 2, 'teachers see both')
ok(visibleAnnouncements({ role: 'student' }).length === 1, 'parents still see the all-audience notice')
ok(visibleAnnouncements({ role: 'student' })[0].subject === 'For everyone', 'parents keep the notice meant for them')

reset()
saveAnnouncement({ subject: 'Teachers only', body: '', target: 'TEACHER' })
saveAnnouncement({ subject: 'Parents only', body: '', target: 'STUDENT' })
ok(getAnnouncements().length === 2, 'a parent notice does not wipe a teacher notice')
ok(visibleAnnouncements({ role: 'student' }).length === 1, 'parents see only theirs')
ok(visibleAnnouncements({ role: 'teacher' }).length === 1, 'teachers see only theirs')

reset()
saveAnnouncement({ subject: 'Teachers', body: '', target: 'TEACHER' })
saveAnnouncement({ subject: 'Parents', body: '', target: 'STUDENT' })
saveAnnouncement({ subject: 'Everyone', body: '', target: 'ALL' })
ok(getAnnouncements().length === 1, 'an all-audience notice replaces both narrower ones')
ok(getAnnouncements()[0].subject === 'Everyone', 'the all-audience notice is what remains')

/* --- the supersede rule itself --------------------------------------- */
ok(supersedesAnnouncement('ALL', 'ALL') === true, 'ALL replaces ALL')
ok(supersedesAnnouncement('ALL', 'STUDENT') === true, 'ALL replaces a parent notice')
ok(supersedesAnnouncement('ALL', 'TEACHER') === true, 'ALL replaces a teacher notice')
ok(supersedesAnnouncement('STUDENT', 'ALL') === false, 'a parent notice does NOT replace an ALL notice')
ok(supersedesAnnouncement('TEACHER', 'ALL') === false, 'a teacher notice does NOT replace an ALL notice')
ok(supersedesAnnouncement('STUDENT', 'TEACHER') === false, 'a parent notice does NOT replace a teacher notice')
ok(supersedesAnnouncement('STUDENT', 'STUDENT') === true, 'a parent notice replaces a parent notice')
ok(supersedesAnnouncement('TEACHER', 'TEACHERS') === true, 'plural target spellings are handled')
ok(supersedesAnnouncement('STUDENTS', 'STUDENT') === true, 'singular and plural match')

/* --- manual take-down ------------------------------------------------ */
// Two different audiences, so both legitimately coexist and either can be
// taken down individually. (Same-audience sends now replace, tested above.)
reset()
const one = saveAnnouncement({ subject: 'One', body: '', target: 'STUDENT' })
saveAnnouncement({ subject: 'Two', body: '', target: 'TEACHER' })
ok(getAnnouncements().length === 2, 'two announcements for different audiences coexist')
removeAnnouncement(one.id)
ok(getAnnouncements().length === 1, 'removing one takes it down immediately')
ok(getAnnouncements()[0].subject === 'Two', 'the correct one was removed')
clearAnnouncements()
ok(getAnnouncements().length === 0, 'clearing removes them all')

/* --- removal is independent of dismissal ---------------------------- */
reset()
const keep = saveAnnouncement({ subject: 'Keep', body: '', target: 'ALL' })
store.set(DISMISSED, JSON.stringify([keep.id]))
ok(visibleAnnouncements(student).length === 0, 'a dismissed announcement is hidden for that reader')
ok(getAnnouncements().length === 1, 'but it still exists until it expires or is removed')

/* --- targeting still works ------------------------------------------ */
reset()
saveAnnouncement({ subject: 'Teachers only', body: '', target: 'TEACHER' })
ok(visibleAnnouncements({ role: 'student' }).length === 0, 'a teacher announcement is hidden from students')
ok(visibleAnnouncements({ role: 'teacher' }).length === 1, 'a teacher announcement shows for teachers')

/* --- countdown wording ----------------------------------------------- */
const base = Date.now()
const item = { createdAt: new Date(base).toISOString(), expiresAt: new Date(base + (2 * DAY)).toISOString() }
ok(/2 days/.test(announcementCountdownLabel(item, base)), 'countdown reads "2 days" when just sent')
ok(/hours?/.test(announcementCountdownLabel(item, base + (2 * DAY) - (3 * HOUR))), 'countdown switches to hours near the end')
ok(announcementCountdownLabel(item, base + (3 * DAY)) === 'disappearing now', 'an expired item reads "disappearing now"')
ok(!/-/.test(announcementCountdownLabel(item, base + (9 * DAY))), 'the countdown never goes negative')

/* --- helpers are pure and safe --------------------------------------- */
ok(announcementExpiry(null) === 0, 'expiry of null is 0, not a crash')
ok(isAnnouncementExpired(null) === true, 'a null item counts as expired')
assert.doesNotThrow(() => getAnnouncements())
ok(true, 'reading never throws')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
