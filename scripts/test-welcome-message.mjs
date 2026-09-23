/**
 * Welcome-card rules — pure unit checks.
 *
 * The rule that matters most: an established family must NEVER be shown a
 * "thanks for joining us" message. Missing it for a genuinely new parent is a
 * small loss; showing it to someone who has been booking lessons for a year
 * reads as the site having forgotten them, which is worse.
 */
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const {
  WELCOME_VISIBLE_DAYS, accountAgeInDays, readDismissed, rememberDismissed,
  shouldShowWelcome, welcomeEnquiry,
} = await import('../src/welcomeMessage.js')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
const agedAccount = (days, id = 'a1') => ({ id, createdAt: new Date(now - (days * DAY)).toISOString() })

/* --- the window ----------------------------------------------------- */
ok(WELCOME_VISIBLE_DAYS === 14, 'the welcome shows for 14 days')
ok(shouldShowWelcome(agedAccount(0), [], now), 'a brand-new account sees it')
ok(shouldShowWelcome(agedAccount(1), [], now), 'a 1-day-old account sees it')
ok(shouldShowWelcome(agedAccount(13.9), [], now), 'still visible just before day 14')
ok(!shouldShowWelcome(agedAccount(14.1), [], now), 'gone just after day 14')
ok(!shouldShowWelcome(agedAccount(365), [], now), 'a one-year-old account never sees it')

/* --- the dangerous edge cases ---------------------------------------- */
ok(!shouldShowWelcome({ id: 'a1' }, [], now), 'an account with NO createdAt is treated as established, not new')
ok(!shouldShowWelcome({ id: 'a1', createdAt: 'not-a-date' }, [], now), 'an unparseable date does not show the welcome')
ok(!shouldShowWelcome({ id: 'a1', createdAt: '' }, [], now), 'an empty date does not show the welcome')
// A wrong device clock can put createdAt in the future.
ok(!shouldShowWelcome({ id: 'a1', createdAt: new Date(now + (5 * DAY)).toISOString() }, [], now),
  'a future-dated account does not show the welcome')
ok(!shouldShowWelcome(null, [], now), 'a null account does not throw')
ok(!shouldShowWelcome({}, [], now), 'an account with no id does not show the welcome')

/* --- dismissal is per account and remembered -------------------------- */
ok(!shouldShowWelcome(agedAccount(1, 'a1'), ['a1'], now), 'a dismissed account stops seeing it')
ok(shouldShowWelcome(agedAccount(1, 'a2'), ['a1'], now), 'dismissing one account does not hide it for another')

store.clear()
ok(readDismissed().length === 0, 'nothing is dismissed to begin with')
rememberDismissed('a1')
ok(readDismissed().includes('a1'), 'dismissal is stored')
rememberDismissed('a1')
ok(readDismissed().filter((id) => id === 'a1').length === 1, 'dismissing twice stores one entry, not two')
rememberDismissed('a2')
ok(readDismissed().length === 2, 'a second account is stored alongside the first')

// The list must not grow without bound on a shared device.
store.clear()
for (let i = 0; i < 80; i += 1) rememberDismissed(`acct-${i}`)
ok(readDismissed().length === 50, `the dismissed list is capped (${readDismissed().length})`)
ok(readDismissed().includes('acct-79'), 'the most recent dismissal is kept when capping')

store.set('tutorpro_welcome_dismissed_v1', 'not json at all')
ok(readDismissed().length === 0, 'corrupt storage reads as empty rather than throwing')
store.set('tutorpro_welcome_dismissed_v1', '{"not":"an array"}')
ok(readDismissed().length === 0, 'a non-array value reads as empty')

/* --- age helper ------------------------------------------------------- */
ok(Math.round(accountAgeInDays(new Date(now - (3 * DAY)).toISOString(), now)) === 3, 'age in days is correct')
ok(accountAgeInDays('rubbish') === null, 'an unparseable date returns null, not NaN')
ok(accountAgeInDays(null) === null, 'a null date returns null')

/* --- the prefilled enquiry -------------------------------------------- */
const msg = welcomeEnquiry({ parentName: 'Maria Santos', childName: 'Ana' })
ok(msg.includes('Maria Santos'), 'the parent name travels with the message')
ok(msg.includes('Ana'), "the child's name travels with the message")
ok(msg.includes('free first class'), 'the message references the free first class')
ok(!msg.includes('undefined'), 'no "undefined" leaks into the message')

const bare = welcomeEnquiry()
ok(!bare.includes('Parent:'), 'a missing parent name is omitted rather than left blank')
ok(!bare.includes('Student:'), 'a missing child name is omitted')
ok(bare.length > 30, 'the message still reads properly with no names')
ok(!welcomeEnquiry({ parentName: '   ' }).includes('Parent:'), 'a whitespace-only name is treated as missing')

assert.doesNotThrow(() => welcomeEnquiry({ parentName: null, childName: undefined }))
ok(true, 'null and undefined names do not throw')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
