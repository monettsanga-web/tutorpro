/**
 * The sign-up options must map to something Supabase will actually accept.
 *
 * THE FAULT THIS LOCKS OUT
 * ------------------------
 * Two of the five buttons on the registration modal used Supabase providers
 * that are switched off on this project, so they could never create an
 * account:
 *
 *   WhatsApp -> supabase.auth.signUp({ phone })   -> 400 phone_provider_disabled
 *   WeChat   -> supabase.auth.signInAnonymously() -> 422 anonymous_provider_disabled
 *
 * Both now become an ordinary email sign-up against a handle-derived address,
 * which is enabled and auto-confirmed. This file checks the mapping is
 * stable and that the two dead calls never come back.
 *
 * The end-to-end proof — filling the real form and logging back in for all
 * five options — is scripts/verify-registration.mjs.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = (file) => readFileSync(join(root, file), 'utf8')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

/* Load the two helpers without pulling in the Supabase client. */
const source = read('src/cloudProfiles.js')
const slice = source.slice(source.indexOf('const HANDLE_DOMAIN'), source.indexOf('/** Supabase speaks to developers'))
const { cloudLoginEmail, cloudLoginCandidates } = await import(
  'data:text/javascript;base64,' + Buffer.from(slice.replace(/^export /gm, 'export ')).toString('base64')
)

/* ================================================================== */
/* 1. Handles become addresses, deterministically                      */
/* ================================================================== */
ok(cloudLoginEmail('gmail', 'Maria@Gmail.com') === 'maria@gmail.com', 'an email address is used as it is, lower-cased')
ok(cloudLoginEmail('yahoo', ' ana@yahoo.com ') === 'ana@yahoo.com', 'surrounding spaces are trimmed')
ok(cloudLoginEmail('wechat', 'MariaSantos') === 'wechat.mariasantos@accounts.tutorpro.site', 'a WeChat ID becomes a wechat. address')
ok(
  cloudLoginEmail('wechat', 'mariasantos') === cloudLoginEmail('wechat', 'MariaSantos'),
  'the same WeChat ID always resolves to the same account, whatever the capitals',
)
ok(
  cloudLoginEmail('whatsapp', '+63 917 123 4567') === 'whatsapp.639171234567@accounts.tutorpro.site',
  'a WhatsApp number drops spaces, brackets and the plus',
)
ok(
  cloudLoginEmail('whatsapp', '(0917) 123-4567') !== cloudLoginEmail('whatsapp', '+63 917 123 4567'),
  'two genuinely different numbers do not collide',
)
ok(
  cloudLoginEmail('whatsapp', '+63-917-123-4567') === cloudLoginEmail('whatsapp', '+63 (917) 123 4567'),
  'the same number typed two ways is one account',
)

/* ================================================================== */
/* 2. Logging in finds the same address from what the parent types     */
/* ================================================================== */
const only = (value) => cloudLoginCandidates(value)[0]
ok(only('maria@gmail.com') === 'maria@gmail.com', 'an email at the login box is looked up as an email')
ok(only('+63 917 123 4567') === cloudLoginEmail('whatsapp', '+63 917 123 4567'), 'a phone number finds the WhatsApp account')
ok(only('mariasantos') === cloudLoginEmail('wechat', 'mariasantos'), 'a handle finds the WeChat account')
ok(cloudLoginCandidates('   ').length === 0, 'an empty box asks for nothing')
/* The three shapes must not overlap: a WeChat ID has to start with a letter
   (see validLoginId in auth.js), a number cannot, and an email has an @. */
ok(!only('09171234567').includes('wechat.'), 'a number is never mistaken for a WeChat ID')
ok(!only('mariasantos').includes('whatsapp.'), 'a handle is never mistaken for a number')

/* ================================================================== */
/* 3. The two dead calls are gone for good                             */
/* ================================================================== */
const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1 ')
ok(!/signInAnonymously/.test(code), 'nothing calls signInAnonymously — it is disabled on this project')
ok(!/signUp\(\{\s*phone/.test(code), 'nothing signs up with a phone number — that is disabled too')
ok(!/signInWithPassword\(\{\s*phone/.test(code), 'and nothing logs in with one')
ok(/signUp\(\{ email/.test(code), 'every registration is an email sign-up')

/* ================================================================== */
/* 4. Parents get sentences, not stack traces                          */
/* ================================================================== */
ok(/friendlyAuthMessage/.test(source), 'Supabase errors are translated before a parent sees them')
ok(
  /already registered[\s\S]{0,400}log in instead/i.test(source),
  'registering twice says "log in instead" rather than "Shared registration failed: User already registered"',
)
ok(/phone_provider_disabled|anonymous_provider_disabled/.test(source), 'the old provider errors are still handled, in case one is re-enabled and fails')
ok(/rate limit/i.test(source), 'a rate limit is explained as "wait a minute", not as an outage')

/* ================================================================== */
/* 5. The form still offers all five, and still validates them         */
/* ================================================================== */
const auth = read('src/auth.js')
for (const provider of ['gmail', 'yahoo', 'wechat', 'whatsapp']) {
  ok(auth.includes(`'${provider}'`), `${provider} is still a recognised sign-up option — none were removed`)
}

/* ================================================================== */
/* 6. Student registration stays parent-first and responsive           */
/* ================================================================== */
const modal = read('src/AuthModal.jsx')
const styles = read('src/styles.css')
const registrationStart = modal.indexOf("{view === 'register' && (")
const loginStart = modal.indexOf("{view === 'login' && (", registrationStart)
const registrationView = modal.slice(registrationStart, loginStart)
ok(registrationStart >= 0 && loginStart > registrationStart, 'the student registration view is clearly separated from login')
ok(!/teacher registration|onTeacherAccess/i.test(registrationView), 'student registration has no teacher-registration link or action')
ok(/Create a parent account/.test(registrationView), 'the account step clearly identifies this as a parent account')
ok(/aria-valuenow=\{registerStep\}/.test(registrationView), 'the two-step student registration progress is accessible')
const responsiveStyles = styles.slice(styles.indexOf('Student registration — responsive, parent-first layout'))
ok(/@media \(min-width: 561px\) and \(max-width: 1024px\)/.test(responsiveStyles), 'a dedicated tablet registration layout is defined')
ok(/@media \(max-width: 560px\)/.test(responsiveStyles) && /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/.test(responsiveStyles), 'the phone layout has a compact two-column provider picker')
ok(/height: min\(860px, calc\(100dvh - 40px\)\)/.test(responsiveStyles), 'desktop registration stays within the available viewport height')
ok(/body:has\(\.auth-shell--student-register\) \.support-widget/.test(responsiveStyles) && /body:has\(\.auth-shell--student-register\) \.china-mobile-student-prompt/.test(responsiveStyles), 'floating support and locale prompts stay out of the registration overlay')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
