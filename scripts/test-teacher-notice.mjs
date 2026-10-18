/**
 * Pins the 24-hour application notice: the window, the once-rule and the
 * owner's exact wording. If somebody edits the greeting, this fails loudly
 * instead of letting a truncated checklist reach a new applicant.
 */
import {
  APPLICATION_NOTICE_HOURS,
  TEACHER_APPLICATION_NOTICE,
  applicationNoticeAgeInHours,
  noticeSegments,
  shouldShowApplicationNotice,
} from '../src/teacherApplicationNotice.js'

let pass = 0
let fail = 0
const ok = (condition, label) => {
  if (condition) { pass += 1; console.log(`  ok  ${label}`) }
  else { fail += 1; console.log(`FAIL  ${label}`) }
}

const NOW = Date.parse('2026-10-17T12:00:00Z')
const hoursAgo = (hours) => new Date(NOW - hours * 3600000).toISOString()
const account = (noticeAt) => ({ id: 'teacher-1', teacher: noticeAt ? { applicationNoticeAt: noticeAt } : {} })

ok(APPLICATION_NOTICE_HOURS === 24, 'the notice window is 24 hours')
ok(shouldShowApplicationNotice(account(hoursAgo(1)), [], NOW), 'a teacher who applied an hour ago sees the notice')
ok(shouldShowApplicationNotice(account(hoursAgo(23.5)), [], NOW), 'still visible just inside the window')
ok(!shouldShowApplicationNotice(account(hoursAgo(25)), [], NOW), 'deleted after 24 hours')
ok(!shouldShowApplicationNotice(account(hoursAgo(1)), ['teacher-1'], NOW), 'dismissing it once means never again')
ok(!shouldShowApplicationNotice(account(null), [], NOW), 'no application stamp, no notice')
ok(!shouldShowApplicationNotice(account('not-a-date'), [], NOW), 'a broken stamp shows nothing')
ok(!shouldShowApplicationNotice(account(new Date(NOW + 3600000).toISOString()), [], NOW), 'a future stamp shows nothing')
ok(applicationNoticeAgeInHours('not-a-date', NOW) === null, 'unusable dates report a null age')

ok(TEACHER_APPLICATION_NOTICE.includes('TutorPro English Philippines!'), 'the greeting names the school')
ok(TEACHER_APPLICATION_NOTICE.includes('Profile Picture'), 'the checklist asks for the profile picture')
ok(TEACHER_APPLICATION_NOTICE.includes('Video Introduction'), 'the checklist asks for the introduction video link')
ok(TEACHER_APPLICATION_NOTICE.includes('Sample Class Video (if available)'), 'the checklist asks for the optional sample class link')
ok(TEACHER_APPLICATION_NOTICE.includes('Do not upload the video files themselves.'), 'the links-not-files reminder is verbatim')
ok(TEACHER_APPLICATION_NOTICE.endsWith('Best of luck!'), 'the closing line is intact')

const segments = noticeSegments()
ok(segments[0].strong === false && segments[0].text.startsWith('Hello!'), 'the notice opens with the plain greeting')
ok(segments.some((segment) => segment.strong && segment.text === 'TutorPro English Philippines!'), 'the school name renders bold')
ok(segments.some((segment) => segment.strong && segment.text === 'Important Reminder:'), 'the reminder label renders bold')
ok(segments.every((segment) => !segment.text.includes('**')), 'no markdown markers survive into the rendered runs')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
