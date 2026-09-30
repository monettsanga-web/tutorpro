/**
 * Notification emails must be written in ONE language — the recipient's.
 *
 * THE BUG THIS LOCKS OUT
 * ----------------------
 * Every booking email was built once, in English AND Chinese, and that
 * same body went to everyone. A parent in the Philippines booking an
 * English lesson received a message half of which was in Chinese.
 *
 * The edge functions are Deno TypeScript and cannot be imported by Node,
 * so the language tables are lifted out of the source and evaluated. That
 * is deliberate: checking the real tables catches a missing translation,
 * where a string search would not.
 */
import { readFileSync } from 'node:fs'
import { transformSync } from 'rolldown/experimental'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

const booking = read('supabase/functions/booking-notification/index.ts')
const messaging = read('supabase/functions/message-notification/index.ts')
/* Was src/AutoTranslate.jsx. That component machine-translated the whole
   site by IP, which competed with the real /kr/, /cn/ and /tw/ pages in
   search; it was replaced by one that only detects the country. The
   country -> language table moved with it, and the emails must still match
   it exactly. */
const autoTranslate = read('src/VisitorCountry.jsx')

/** Lift `const NAME... = { ... }` out of TypeScript source and evaluate it. */
function extractObject(source, name) {
  const start = source.indexOf(`const ${name}`)
  if (start < 0) throw new Error(`${name} not found`)
  const open = source.indexOf('{', source.indexOf('=', start))
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) {
        const literal = source.slice(open, index + 1)
        return new Function(`return (${literal})`)()
      }
    }
  }
  throw new Error(`${name} is unbalanced`)
}

/* ================================================================== */
/* 1. The country → language table matches the website's               */
/* ================================================================== */
const siteLanguages = extractObject(autoTranslate, 'countryLanguages')
const bookingCountries = extractObject(booking, 'COUNTRY_LANGUAGES')
const messageCountries = extractObject(messaging, 'COUNTRY_LANGUAGES')

ok(Object.keys(siteLanguages).length > 20, `the website maps a useful number of countries (${Object.keys(siteLanguages).length})`)
ok(JSON.stringify(bookingCountries) === JSON.stringify(siteLanguages), 'booking emails use exactly the website\'s country → language table')
ok(JSON.stringify(messageCountries) === JSON.stringify(siteLanguages), 'message emails use exactly the same table')
ok(siteLanguages.PH === 'en', 'a visitor from the Philippines is English')
ok(siteLanguages.CN === 'zh-CN' && siteLanguages.TW === 'zh-TW', 'Chinese is only for Chinese-speaking countries')
ok(siteLanguages.KR === 'ko', 'Korea is Korean')

/* ================================================================== */
/* 2. Every language is complete                                        */
/* ================================================================== */
const bookingCopy = extractObject(booking, 'COPY')
const messageCopy = extractObject(messaging, 'COPY')
const EVENTS = ['requested', 'confirmed', 'cancelled', 'restored', 'updated']

ok(Object.keys(bookingCopy).includes('en'), 'booking copy has English')
ok(Object.keys(bookingCopy).length >= 10, `booking copy covers the site's languages (${Object.keys(bookingCopy).length})`)

const missingLanguages = Object.values(siteLanguages).filter((language) => !bookingCopy[language])
ok(missingLanguages.length === 0, `every language the site can show has booking copy (missing: ${missingLanguages.join(', ') || 'none'})`)
const missingMessageLanguages = Object.values(siteLanguages).filter((language) => !messageCopy[language])
ok(missingMessageLanguages.length === 0, `and message copy (missing: ${missingMessageLanguages.join(', ') || 'none'})`)

const incomplete = Object.entries(bookingCopy).filter(([, copy]) => {
  const hasEvents = EVENTS.every((event) => typeof copy.events?.[event] === 'string' && copy.events[event].length > 0)
  const hasLabels = ['student', 'teacher', 'when', 'lesson', 'minutes', 'open', 'reminder', 'yourTime', 'schoolTime']
    .every((key) => typeof copy[key] === 'string' && copy[key].length > 0)
  return !(hasEvents && hasLabels)
}).map(([language]) => language)
ok(incomplete.length === 0, `no language is half-translated (incomplete: ${incomplete.join(', ') || 'none'})`)

const messageIncomplete = Object.entries(messageCopy).filter(([, copy]) => (
  typeof copy.newMessage !== 'string'
  || typeof copy.greeting !== 'function'
  || typeof copy.sentYouAMessage !== 'function'
  || typeof copy.subject !== 'function'
  || typeof copy.readAndReply !== 'string'
  || typeof copy.replyInside !== 'string'
)).map(([language]) => language)
ok(messageIncomplete.length === 0, `message copy is complete in every language (incomplete: ${messageIncomplete.join(', ') || 'none'})`)

/* ================================================================== */
/* 3. No email mixes two languages                                      */
/* ================================================================== */
const CJK = /[\u4e00-\u9fff]/
const HANGUL = /[\uac00-\ud7af]/
const KANA = /[\u3040-\u30ff]/
const THAI = /[\u0e00-\u0e7f]/
const ARABIC = /[\u0600-\u06ff]/

function scriptsIn(text) {
  return {
    cjk: CJK.test(text), hangul: HANGUL.test(text), kana: KANA.test(text), thai: THAI.test(text), arabic: ARABIC.test(text),
  }
}

const latinOnly = ['en', 'tl', 'es', 'pt', 'fr', 'de', 'vi', 'pl']
latinOnly.forEach((language) => {
  const text = JSON.stringify(bookingCopy[language])
  const scripts = scriptsIn(text)
  ok(!scripts.cjk && !scripts.hangul && !scripts.kana && !scripts.thai && !scripts.arabic,
    `the ${language} booking email contains no other writing system`)
})

ok(!scriptsIn(JSON.stringify(bookingCopy.en)).cjk, 'an English booking email has no Chinese in it — the reported bug')
ok(!scriptsIn(JSON.stringify(messageCopy.en)).cjk, 'an English message email has no Chinese in it either')
ok(scriptsIn(JSON.stringify(bookingCopy['zh-CN'])).cjk, 'a Chinese recipient still gets Chinese')
ok(scriptsIn(JSON.stringify(bookingCopy.ko)).hangul, 'a Korean recipient gets Korean')
ok(scriptsIn(JSON.stringify(bookingCopy.ja)).kana, 'a Japanese recipient gets Japanese')
ok(scriptsIn(JSON.stringify(bookingCopy.th)).thai, 'a Thai recipient gets Thai')
ok(scriptsIn(JSON.stringify(bookingCopy.ar)).arabic, 'an Arabic recipient gets Arabic')
ok(bookingCopy.ar.rtl === true && messageCopy.ar.rtl === true, 'Arabic is marked right-to-left so the layout is not backwards')

/* Korean copy must not be padded out with Chinese characters, and so on. */
ok(!scriptsIn(JSON.stringify(bookingCopy.ko)).cjk, 'the Korean email is not part Chinese')
ok(!scriptsIn(JSON.stringify(bookingCopy.th)).cjk, 'the Thai email is not part Chinese')

/* ================================================================== */
/* 4. The source no longer builds one body for everybody                */
/* ================================================================== */
ok(!/\$\{label\.en\} · \$\{label\.zh\}/.test(booking), 'the bilingual header line is gone')
ok(booking.includes('languageForProfile'), 'the language is chosen per profile')
ok(booking.includes('timeZoneForProfile'), 'so is the timezone')
ok(/recipients\.map\(async \(\{ email, profile \}\)/.test(booking), 'each recipient gets their own email, not a shared one')
ok(booking.includes("preferredLanguage"), 'the language the site last showed them is preferred')
ok(booking.includes('registrationCountry'), 'with the IP country from sign-up as the fallback')
ok(/return 'en'/.test(booking), 'and English as the last resort')
ok(booking.includes('reply_to'), 'replies go somewhere a person reads, since notifications@ has no inbox')
ok(!/您有一条新消息/.test(messaging.replace(/'zh-CN':[\s\S]*?\},\n  'zh-TW'/, '')), 'the hardcoded Chinese line in message emails is now only inside the Chinese copy')

/* The lesson time must be shown on the reader's clock, not always Manila. */
ok(booking.includes('timeZone: options.timeZone'), 'the date is formatted in the recipient\'s timezone')
ok(!/timeZone: 'Asia\/Manila', weekday/.test(booking), 'it is no longer hardcoded to Manila for everyone')
ok(booking.includes('COUNTRY_TIME_ZONES'), 'a country gives a sensible zone when none is saved')
ok(/return COUNTRY_TIME_ZONES\[country\] \|\| 'Asia\/Manila'/.test(booking), 'and Manila remains the final fallback')

/* ================================================================== */
/* 5. The browser records what the server needs                         */
/* ================================================================== */
const app = read('src/App.jsx')
const locale = read('src/profileLocale.js')
ok(app.includes('localeChangesFor'), 'the site saves the visitor\'s language and timezone onto their profile')
ok(app.includes("addEventListener('tutorpro:language-change'"), 'and updates it when they switch language')
ok(locale.includes('return Object.keys(changes).length ? changes : null'), 'writing nothing when nothing changed, to spare the free-tier budget')

const { localeChangesFor, currentLocaleSnapshot } = await import('../src/profileLocale.js')
const snapshot = currentLocaleSnapshot({ language: 'ko', timeZone: 'Asia/Seoul' })
ok(JSON.stringify(localeChangesFor({ id: 'a' }, snapshot)) === '{"preferredLanguage":"ko","timeZone":"Asia/Seoul"}', 'a new visitor has both recorded')
ok(localeChangesFor({ id: 'a', preferredLanguage: 'ko', timeZone: 'Asia/Seoul' }, snapshot) === null, 'an unchanged profile is not written again')
ok(JSON.stringify(localeChangesFor({ id: 'a', preferredLanguage: 'ko', timeZone: 'Asia/Manila' }, snapshot)) === '{"timeZone":"Asia/Seoul"}', 'only what changed is written')
ok(localeChangesFor(null, snapshot) === null, 'a signed-out visitor writes nothing')
ok(localeChangesFor({ id: 'a' }, currentLocaleSnapshot({ language: 'not a language', timeZone: 'nonsense' })) === null, 'junk is never saved')
ok(JSON.stringify(localeChangesFor({ id: 'a' }, currentLocaleSnapshot({ language: 'zh-TW', timeZone: '' }))) === '{"preferredLanguage":"zh-TW"}', 'a regional language tag is accepted')

/* ================================================================== */
/* 6. Render the real emails and read them                             */
/* ================================================================== */
/* The edge function is Deno TypeScript. Transpiling it and running the
   real buildEmail is the only way to be sure the ASSEMBLED email is in one
   language — the tables could be perfect and the template still wrong. */
function loadEdgeExports(source, names) {
  const withoutImport = source.replace(/^import .*$/m, '')
  const serveAt = withoutImport.indexOf('Deno.serve(')
  let body = withoutImport
  if (serveAt >= 0) {
    let depth = 0
    let end = -1
    for (let index = withoutImport.indexOf('(', serveAt); index < withoutImport.length; index += 1) {
      if (withoutImport[index] === '(') depth += 1
      else if (withoutImport[index] === ')') {
        depth -= 1
        if (depth === 0) { end = index + 1; break }
      }
    }
    body = withoutImport.slice(0, serveAt) + withoutImport.slice(end)
  }
  const js = transformSync('edge.ts', body, { lang: 'ts' }).code
    // `export` is meaningless inside a Function body; the declarations
    // themselves are what we want.
    .replace(/^export\s+/gm, '')
  return new Function(`${js}\nreturn { ${names.join(', ')} }`)()
}

const edge = loadEdgeExports(booking, ['buildEmail', 'languageForProfile', 'timeZoneForProfile'])
const START = new Date('2026-10-07T16:00:00+08:00')
const render = (language, timeZone) => edge.buildEmail({
  language, timeZone, event: 'confirmed', start: START,
  studentName: 'Ana', teacherName: 'Teacher M', focus: 'Reading comprehension', duration: 25,
})

const english = render('en', 'Asia/Manila')
ok(!CJK.test(english.html), 'the rendered ENGLISH email contains no Chinese anywhere — the exact bug reported')
ok(!CJK.test(english.subject), 'and neither does its subject line')
ok(/Lesson confirmed/.test(english.subject), `the subject is in English (${english.subject})`)
ok(/4:00\s?PM/.test(english.html), 'it shows the lesson time')
ok(/Manila time/.test(english.html), 'and says which clock that is')

const korean = render('ko', 'Asia/Seoul')
ok(HANGUL.test(korean.html), 'a Korean parent gets Korean')
ok(!CJK.test(korean.html), 'with no Chinese mixed in')
ok(/수업이 확정되었습니다/.test(korean.subject), `the Korean subject is Korean (${korean.subject})`)
ok(/5:00/.test(korean.html), 'and the Manila 4pm lesson is shown as 5pm on their own clock')
ok(!/Manila time/.test(korean.html) && !/마닐라 시간/.test(korean.html), 'they are not told Manila time, because it is not their time')

const chinese = render('zh-CN', 'Asia/Shanghai')
ok(CJK.test(chinese.html), 'a Chinese parent still gets Chinese')
ok(!HANGUL.test(chinese.html), 'and no Korean')

const arabic = render('ar', 'Asia/Dubai')
ok(/dir="rtl"/.test(arabic.html), 'the Arabic email is laid out right to left')
ok(ARABIC.test(arabic.html), 'and is written in Arabic')

const unknown = render('xx-YY', 'Asia/Manila')
ok(unknown.subject === english.subject, 'an unknown language falls back to English rather than failing')

/* The choice of language, from a real-looking profile. */
/* IP FIRST, as instructed. This ordering is the difference between a
   correct email and the reported fault: someone who once clicked Chinese
   in the language picker must not be sent Chinese for ever. */
ok(edge.languageForProfile({ profile_data: { ipLanguage: 'ko' } }) === 'ko', 'the language from their IP address decides')
ok(edge.languageForProfile({ profile_data: { ipLanguage: 'en', preferredLanguage: 'zh-CN' } }) === 'en',
  'a Philippine visitor who once clicked Chinese in the picker still gets ENGLISH — the reported bug')
ok(edge.languageForProfile({ profile_data: { registrationCountry: 'PH', preferredLanguage: 'zh-CN' } }) === 'en',
  'and the same when only the sign-up country is known')
ok(edge.languageForProfile({ profile_data: { registrationCountry: 'KR' } }) === 'ko', 'their IP country decides when no live IP language is stored')
ok(edge.languageForProfile({ profile_data: { ipLanguage: 'ko', registrationCountry: 'PH' } }) === 'ko', 'where they are now beats where they signed up')
ok(edge.languageForProfile({ profile_data: { preferredLanguage: 'ko' } }) === 'ko', 'a hand-picked language is still used when nothing else is known')
ok(edge.languageForProfile({ profile_data: { registrationCountry: 'PH' } }) === 'en', 'a Philippine IP means English')
ok(edge.languageForProfile({ profile_data: { registrationCountry: 'XX' } }) === 'en', 'an unknown country means English')
ok(edge.languageForProfile({ profile_data: {} }) === 'en', 'no information means English')
ok(edge.languageForProfile(undefined) === 'en', 'a missing profile means English')
ok(edge.languageForProfile({ profile_data: { ipLanguage: 'klingon', registrationCountry: 'KR' } }) === 'ko', 'an unsupported stored language falls through to the country')

ok(edge.timeZoneForProfile({ profile_data: { timeZone: 'Europe/Warsaw' } }) === 'Europe/Warsaw', 'their saved timezone is used')
ok(edge.timeZoneForProfile({ profile_data: { registrationCountry: 'KR' } }) === 'Asia/Seoul', 'or one derived from their country')
ok(edge.timeZoneForProfile({ profile_data: { timeZone: 'Moon/Base' } }) === 'Asia/Manila', 'a corrupted zone falls back instead of throwing')
ok(edge.timeZoneForProfile(undefined) === 'Asia/Manila', 'and an unknown person gets our teaching base')

/* ================================================================== */
/* 7. The site can tell whether the fix is actually deployed           */
/* ================================================================== */
const notifications = read('src/bookingNotifications.js')
const dashboards = read('src/Dashboards.jsx')

ok(booking.includes("EMAIL_TEMPLATE_VERSION = 'single-language-2026-09'"), 'the function states which version it is')
ok(/if \(payload\?\.ping\)/.test(booking), 'and answers a version check without sending anything')
ok(notifications.includes("EXPECTED_EMAIL_TEMPLATE_VERSION = 'single-language-2026-09'"), 'the website knows which version it expects')
const expected = notifications.match(/EXPECTED_EMAIL_TEMPLATE_VERSION = '([^']+)'/)?.[1]
const deployedVersion = booking.match(/EMAIL_TEMPLATE_VERSION = '([^']+)'/)?.[1]
ok(expected === deployedVersion, `the two version markers agree (${expected} / ${deployedVersion})`)
ok(dashboards.includes('runEmailTemplateCheck'), 'the admin dashboard can run the check')
ok(dashboards.includes('Still sending the old English + Chinese email'), 'and says plainly when the old template is still live')
ok(/booking-notification/.test(dashboards), 'naming the function to redeploy')

const { pingBookingEmailTemplate } = await import('../src/bookingNotifications.js')
ok(typeof pingBookingEmailTemplate === 'function', 'the check is exported for the dashboard')
const offline = await pingBookingEmailTemplate()
ok(offline.upToDate === false, 'with no database connection the check does not claim everything is fine')
ok(typeof offline.reason === 'string' && offline.reason.length > 10, 'and explains why it could not tell')

/* ================================================================== */
/* 8. The browser separates the IP language from a hand-picked one      */
/* ================================================================== */
const { languageForCountry } = await import('../src/profileLocale.js')
ok(languageForCountry('PH') === 'en', 'a Philippine IP maps to English')
ok(languageForCountry('kr') === 'ko', 'lower case country codes still work')
ok(languageForCountry('XX') === '', 'an unknown country maps to nothing rather than guessing')
const mixed = currentLocaleSnapshot({ language: 'zh-CN', country: 'PH', timeZone: 'Asia/Manila' })
ok(mixed.ipLanguage === 'en' && mixed.preferredLanguage === 'zh-CN', 'the two are recorded separately, never merged')
const bothChanges = localeChangesFor({ id: 'a' }, mixed)
ok(bothChanges.ipLanguage === 'en', 'the IP language is saved for the email to use')
ok(bothChanges.preferredLanguage === 'zh-CN', 'and the picker choice is still kept for the website')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
