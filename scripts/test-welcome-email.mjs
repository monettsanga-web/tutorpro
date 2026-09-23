/**
 * Welcome email — deliverability and safety checks on the function source.
 *
 * WHY CHECK THE SOURCE RATHER THAN SEND MAIL
 * ------------------------------------------
 * Actually sending would need live Resend credentials and would post real
 * mail to a real inbox on every test run. The properties that decide whether
 * a message lands in the inbox or the spam folder are all visible in the
 * source, so they are asserted directly.
 *
 * The domain itself already authenticates (SPF, DKIM and DMARC verified on
 * tutorpro.site). These checks cover the message-level signals on top of it,
 * plus the rules that stop this becoming an open mail relay or sending a
 * parent the same welcome twice.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const src = readFileSync(new URL('../supabase/functions/welcome-email/index.ts', import.meta.url), 'utf8')

/* --- deliverability: the things that decide inbox vs spam ------------ */
console.log('--- staying out of spam ---')
ok(/text:\s*textBody\(/.test(src), 'sends a plain-text part alongside the HTML')
ok(/html:\s*htmlBody\(/.test(src), 'sends an HTML part')
ok(src.includes('List-Unsubscribe'), 'sets a List-Unsubscribe header')
ok(src.includes('List-Unsubscribe-Post'), 'supports one-click unsubscribe, which Gmail and Yahoo expect')
ok(/reply_to:/.test(src), 'sets Reply-To, so replies reach a real mailbox')
// tutorpro.site has NO MX record, so mail sent from it cannot receive replies.
// Reply-To must therefore point at an address that actually exists.
ok(src.includes('sejongenglish@yahoo.com'), 'Reply-To is the monitored support address')
ok(/notifications@tutorpro\.site/.test(src), 'sends from the DKIM-verified subdomain')

// Unsubscribe instructions must appear in BOTH parts, not just the header.
const textPart = src.slice(src.indexOf('function textBody'), src.indexOf('function htmlBody'))
const htmlPart = src.slice(src.indexOf('function htmlBody'), src.indexOf('Deno.serve'))
ok(/UNSUBSCRIBE/i.test(textPart), 'the plain-text part explains how to unsubscribe')
ok(/UNSUBSCRIBE/i.test(htmlPart), 'the HTML part explains how to unsubscribe')
ok(/receiving this because/i.test(textPart), 'the text part says why they received it')
ok(/receiving this because/i.test(htmlPart), 'the HTML part says why they received it')
ok(/5274092/.test(textPart) && /5274092/.test(htmlPart), 'both parts identify the registered business')

/* --- spam-trigger language ------------------------------------------- */
console.log('\n--- no spam-trigger patterns ---')
const body = textPart + htmlPart
ok(!/!{2,}/.test(body), 'no stacked exclamation marks')
// Shouting means capitalised WORDS in the prose. Template placeholders like
// ${WHATSAPP} are variable names, not text the parent reads, and UNSUBSCRIBE
// is the conventional wording filters expect, so both are excluded.
const prose = body
  .replace(/\$\{[^}]*\}/g, '')        // template placeholders
  .replace(/\bUNSUBSCRIBE\b/g, '')     // expected unsubscribe wording
const shouted = [...new Set(prose.match(/\b[A-Z]{5,}\b/g) || [])]
ok(shouted.length === 0, `no shouting in all caps (${shouted.join(', ') || 'none'})`)
ok(!/act now|limited time|hurry|expires soon|risk.?free|100% free|click here now/i.test(body), 'no urgency or hype phrases')
ok(!/bit\.ly|tinyurl|goo\.gl/i.test(body), 'no link shorteners, which are heavily filtered')
ok(!/<img[^>]*width=["']?1["']?/i.test(body), 'no tracking pixel')
// A subject that describes the contents rather than baiting a click.
const subject = (src.match(/subject:\s*'([^']+)'/) || [])[1] || ''
ok(subject.length > 0 && subject.length <= 78, `subject is a sensible length (${subject.length} chars)`)
ok(!/!/.test(subject), 'the subject has no exclamation mark')
ok(!/^(RE:|FW:)/i.test(subject), 'the subject does not fake a reply')
ok(/tutorpro/i.test(subject), 'the subject names the brand so it is recognisable')

/* --- it must not become an open mail relay ---------------------------- */
console.log('\n--- security ---')
ok(/Authentication required/.test(src), 'rejects unauthenticated callers')
ok(/auth\.getUser\(\)/.test(src), 'verifies the caller with Supabase auth')
ok(/profile\.role !== 'student'/.test(src), 'only parent accounts receive the welcome')
// The recipient comes from the verified profile, never from the request body,
// so a caller cannot direct mail at an arbitrary address.
ok(!/body\s*\.\s*to|payload\.to\b/.test(src), 'the recipient is never taken from the request body')
ok(/profile\.email \|\| auth\.user\.email/.test(src), 'the recipient comes from the verified profile')

/* --- one welcome per account, ever ------------------------------------ */
console.log('\n--- send exactly once ---')
ok(/welcomeEmailSentAt/.test(src), 'records when the welcome was sent')
ok(/if \(data\.welcomeEmailSentAt\) return/.test(src), 'refuses to send a second time')
// The stamp must be written AFTER the send, or a transient Resend failure
// would permanently mark the parent as welcomed without them receiving it.
ok(src.indexOf('welcomeEmailSentAt: new Date()') > src.indexOf('api.resend.com'),
  'the sent stamp is written only after a confirmed send')
ok(/no_email_address/.test(src), 'accounts with no email are skipped quietly, not treated as errors')

/* --- registration must never break because of email ------------------- */
console.log('\n--- registration safety ---')
const auth = readFileSync(new URL('../src/auth.js', import.meta.url), 'utf8')
ok(/sendWelcomeEmail\(\)/.test(auth), 'registration triggers the welcome email')
ok(!/await sendWelcomeEmail\(\)/.test(auth), 'it is NOT awaited, so a slow send cannot delay sign-up')
const helper = auth.slice(auth.indexOf('async function sendWelcomeEmail'), auth.indexOf('export async function registerTeacher'))
ok(/try \{/.test(helper) && /catch/.test(helper), 'every failure is caught, so email can never break registration')

/* --- the copy is honest ----------------------------------------------- */
console.log('\n--- honest copy ---')
ok(/no card details are needed/i.test(body), 'states no card is required, matching the real policy')
ok(/no obligation/i.test(body), 'states there is no obligation to continue')
ok(!/guarantee|best online school|number one|#1/i.test(body), 'makes no unsupported superiority claims')
ok(!/\b\d{1,3}% of (parents|children|students)\b/i.test(body), 'quotes no invented statistics')

assert.ok(src.includes('Deno.serve'), 'the function has an entry point')
ok(true, 'the function has a valid entry point')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
