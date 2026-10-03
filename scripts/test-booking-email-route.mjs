/**
 * Booking emails are sent from this repository, and they are never bilingual.
 *
 * WHAT WENT WRONG
 * ---------------
 * The wording of every booking email lived only in a Supabase Edge
 * Function, which has to be redeployed by hand from the dashboard. It never
 * was. So a fix written months ago sat in the repository while parents kept
 * receiving the original template, which hardcodes Chinese beside the
 * English on every line:
 *
 *     <p>${label.en} · ${label.zh}</p>
 *     ...附件中的日历事件将在上课前30分钟和10分钟提醒您。
 *
 * Nothing the website sent could change that, because the Chinese was
 * inside the deployed function. Confirmed by pinging the live function with
 * a real signed-in session: it answered `400 Invalid booking notification
 * request`, which only the old version does — the new one answers with its
 * version string.
 *
 * The email now comes from /api/notify/booking, which deploys with every
 * push like the rest of the site.
 *
 * These checks cover the two ways that can still go wrong: the copy drifting
 * out of step with the Supabase original, and a language leaking characters
 * from another one.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = (file) => readFileSync(join(root, file), 'utf8')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const mod = await import(join(root, 'api/_bookingEmail.js'))
const { EMAIL_TEMPLATE_VERSION, buildEmail, createCalendar, languageForProfile, timeZoneForProfile } = mod

const CJK = /[\u4e00-\u9fff\u3400-\u4dbf]/
const HANGUL = /[\uac00-\ud7af]/
const ARABIC = /[\u0600-\u06ff]/
const CYRILLIC = /[\u0400-\u04ff]/

const sample = (language, timeZone = 'Asia/Manila') => buildEmail({
  language, timeZone, event: 'confirmed',
  start: new Date('2026-10-10T09:00:00+08:00'),
  studentName: 'Juan Santos', teacherName: 'Teacher M',
  focus: 'Reading comprehension', duration: 25,
})

/* ================================================================== */
/* 1. An English email contains only English                           */
/* ================================================================== */
const english = sample('en')
ok(!CJK.test(english.subject + english.html), 'an English email contains no Chinese characters — the whole point of this change')
ok(!HANGUL.test(english.subject + english.html), 'nor Korean')
ok(!ARABIC.test(english.subject + english.html) && !CYRILLIC.test(english.subject + english.html), 'nor any other script')
ok(/Lesson confirmed/.test(english.subject), `the subject reads naturally: "${english.subject}"`)
ok(/Student|Teacher/.test(english.html), 'and the body is filled in')

/* ================================================================== */
/* 2. Every language is single-language                                */
/* ================================================================== */
const SCRIPTS = { 'zh-CN': CJK, 'zh-TW': CJK, ja: CJK, ko: HANGUL, ar: ARABIC }
const LATIN_ONLY = ['en', 'tl', 'es', 'fr', 'de', 'pt', 'pl', 'vi']
for (const language of LATIN_ONLY) {
  const mail = sample(language)
  const text = mail.subject + mail.html
  ok(!CJK.test(text) && !HANGUL.test(text) && !ARABIC.test(text), `${language}: no characters from another script`)
}
for (const [language, script] of Object.entries(SCRIPTS)) {
  const mail = sample(language)
  ok(script.test(mail.subject + mail.html), `${language}: written in its own script`)
}
/* The failure that started all this: two languages in one message. */
const chinese = sample('zh-CN')
ok(!/Lesson confirmed/.test(chinese.subject), 'a Chinese email does not also carry the English heading')

/* ================================================================== */
/* 3. The reader's own language and clock are used                     */
/* ================================================================== */
ok(languageForProfile({ profile_data: { ipLanguage: 'ko' } }) === 'ko', 'the IP language wins')
ok(languageForProfile({ profile_data: { registrationCountry: 'KR' } }) === 'ko', 'then the country they registered from')
ok(languageForProfile({ profile_data: {} }) === 'en', 'English when nothing is known')
ok(languageForProfile(null) === 'en', 'and for a missing profile')
ok(timeZoneForProfile({ profile_data: { timeZone: 'Europe/Warsaw' } }) === 'Europe/Warsaw', 'the saved timezone is used')
ok(timeZoneForProfile({ profile_data: {} }) === 'Asia/Manila', 'Manila is the fallback, since lessons are stored in Manila time')
const seoul = sample('ko', 'Asia/Seoul')
ok(/10:00|오전 10/.test(seoul.html), 'a 09:00 Manila lesson is shown as 10:00 to a reader in Seoul')

/* ================================================================== */
/* 4. The calendar invitation is still attached                        */
/* ================================================================== */
/* buildEmail returns only subject and html. An earlier draft of the route
   looked for mail.calendar, which does not exist, and silently sent every
   email without its .ics. */
const calendar = createCalendar({ id: 'b1', date: '2026-10-10', time: '09:00', duration: 25, focus: 'Reading' }, 'Juan', 'Teacher M')
ok(calendar.includes('BEGIN:VCALENDAR') && calendar.includes('END:VCALENDAR'), 'a calendar invitation is produced')
ok(/BEGIN:VALARM/.test(calendar), 'with reminders before the lesson')
const route = read('api/notify/booking.js')
ok(/createCalendar\(/.test(route), 'and the route actually builds it')
ok(!/mail\.calendar/.test(route), 'rather than reading a property buildEmail never returns')

/* ================================================================== */
/* 5. The two copies of the wording stay in step                       */
/* ================================================================== */
const deno = read('supabase/functions/booking-notification/index.ts')
const ported = read('api/_bookingEmail.js')
const languagesIn = (text) => {
  const block = text.slice(text.indexOf('const COPY'), text.indexOf('function escapeHtml'))
  return [...block.matchAll(/^\s{2}'?([a-z]{2}(?:-[A-Z]{2})?)'?:\s*\{/gm)].map((m) => m[1]).sort()
}
ok(
  JSON.stringify(languagesIn(deno)) === JSON.stringify(languagesIn(ported)),
  `both copies cover the same languages (${languagesIn(ported).join(', ')})`,
)
ok(
  new RegExp(`EMAIL_TEMPLATE_VERSION = '${EMAIL_TEMPLATE_VERSION}'`).test(deno),
  `both declare the same version (${EMAIL_TEMPLATE_VERSION})`,
)

/* ================================================================== */
/* 6. The route behaves safely before the key is set                   */
/* ================================================================== */
ok(/RESEND_API_KEY/.test(route), 'the route reads the Resend key from the environment')
ok(/501/.test(route), 'and answers 501 when it is missing, so the browser can fall back')
ok(/requireAdmin|auth\.getUser\(token\)/.test(route), 'the caller is identified before anything is sent')
ok(/Not authorized for this booking/.test(route), 'and only the two people in the lesson, or an admin, can trigger it')
ok(/reply_to/.test(route), 'replies go to a mailbox that exists — tutorpro.site has no MX record')

const browser = read('src/bookingNotifications.js')
ok(/\/api\/notify\/booking/.test(browser), 'the website calls the new route')
ok(
  browser.indexOf('/api/notify/booking') < browser.indexOf("functions.invoke('booking-notification'"),
  'and tries it BEFORE the old Supabase function',
)
ok(/direct\.handled/.test(browser), 'the Supabase fallback runs only when the new route sent nothing, so nobody gets two emails')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
