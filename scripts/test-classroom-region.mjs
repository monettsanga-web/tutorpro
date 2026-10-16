/**
 * The classroom region gate.
 *
 * The classroom relit globally on 2026-10-16 with one exclusion: mainland
 * China, whose national network cannot hold a real-time media session. The
 * gate is a runtime courtesy hint from the visitor's IP country - never a
 * ban on accounts, bookings or payments - and it has to agree everywhere:
 * the student card, the teacher card, the three dashboard mounts and the
 * join handler all read classroomEntryState().
 *
 * Runs in plain Node: sessionStorage is stubbed before the module loads,
 * exactly as src/visitorLocale.js reads it in the browser.
 */
let pass = 0
let fail = 0
const ok = (condition, label) => {
  if (condition) { pass += 1; console.log(`  ok  ${label}`) }
  else { fail += 1; console.log(`FAIL  ${label}`) }
}

function withCountry(country) {
  globalThis.sessionStorage = {
    getItem: (key) => (key === 'tutorpro_visitor_country' ? country : null),
    setItem: () => {},
  }
}

withCountry('')
let feature = await import('../src/classroomFeature.js')
ok(feature.CLASSROOM_ENABLED === true, 'the classroom master switch is on (global relight)')
ok(feature.classroomRegionNotice() === null, 'a visitor with no country hint may enter the classroom')
let entry = feature.classroomEntryState()
ok(entry.enabled === true, 'entry state is enabled for the rest of the world')

withCountry('ph')
feature = await import('../src/classroomFeature.js?v=ph')
ok(feature.classroomRegionNotice() === null, 'a Philippine visitor may enter the classroom')

withCountry('CN')
feature = await import('../src/classroomFeature.js?v=cn')
const notice = feature.classroomRegionNotice()
ok(typeof notice === 'string' && /mainland China/i.test(notice), `a mainland China visitor gets the plain explanation (${String(notice).slice(0, 48)}…)`)
entry = feature.classroomEntryState()
ok(entry.enabled === false && entry.label === feature.CLASSROOM_REGION_LABEL, 'the China entry state disables the button and carries the region label')
ok(entry.note === notice, 'the entry note is the same notice the mount guard reads')
ok(feature.CLASSROOM_BLOCKED_COUNTRIES.join() === 'CN', 'mainland China is the only excluded country')

withCountry('us')
feature = await import('../src/classroomFeature.js?v=us')
ok(feature.classroomRegionNotice() === null, 'a US visitor may enter the classroom')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
