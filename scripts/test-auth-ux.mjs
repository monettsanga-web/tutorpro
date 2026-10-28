/* Guards for the professional Sign Up / Log In experience (owner spec):
   real /signup and /login URLs, header Log In + prominent Sign Up pair on
   desktop AND mobile, Remember me, sanitised login returns, role
   immutability, and no second auth system anywhere. */
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
let pass = 0; let fail = 0
const ok = (cond, label) => { if (cond) { pass += 1 } else { fail += 1; console.log(`FAIL  ${label}`) } }

const vercel = JSON.parse(read('vercel.json'))
const app = read('src/App.jsx')
const modal = read('src/AuthModal.jsx')
const auth = read('src/auth.js')
const cloud = read('src/cloudProfiles.js')
const css = read('src/styles.css')
const modalJsx = read('src/AuthModal.jsx')
const registerApi = read('api/auth/register.js')

/* 1 - real URLs that serve the one existing app (no duplicate auth pages) */
const rewrites = vercel.rewrites || []
ok(rewrites.some((r) => r.source === '/signup' && r.destination === '/index.html'), '/signup rewrites to the app')
ok(rewrites.some((r) => r.source === '/login' && r.destination === '/index.html'), '/login rewrites to the app')
ok(/path === '\/signup' \|\| path === '\/login'/.test(app), 'boot opens the auth modal on /signup and /login')
ok(/setAuthMode\(path === '\/signup' \? 'register' : 'login'\)/.test(app), 'each deep link opens its own view')
ok(!/signup\.html|login\.html/.test(app + JSON.stringify(vercel)), 'no second, static auth page was introduced')

/* 2 - header pair, desktop */
ok(/<a className="header-portal-link" href="\/login"/.test(app) && />Log In<\/a>/.test(app), 'desktop header shows a Log In link')
ok(/<a className="button button--primary button--small" href="\/signup"/.test(app) && />Sign Up <ArrowUpRight/.test(app), 'desktop header shows a prominent brand-coloured Sign Up button')
ok(/onTeacherAccess\}>Teacher portal</.test(app) && /onAdminAccess\}>Admin portal</.test(app), 'teacher and admin portal links kept')
ok(/currentAccount \? \(\s*<button className="button button--primary button--small" onClick=\{onBook\}>My dashboard/.test(app), 'signed-in header keeps My dashboard + profile menu')

/* 3 - header pair, mobile */
ok(/mobile-portal-button--primary" href="\/signup"/.test(app) && /Sign Up — free first class<\/a>/.test(app), 'mobile menu Sign Up is first and prominent')
ok(/mobile-portal-button" href="\/login"/.test(app), 'mobile menu Log In right below it')
ok(/mobile-guest-action-bar[\s\S]{0,400}?>Log In</.test(app) && /Mobile quick registration'\)\}>Sign Up</.test(app), 'mobile guest action bar says Log In / Sign Up')

/* 4 - the sign-up form itself (full name, email, password, confirm, consent) */
ok(/name="parentName"/.test(modal) && /name="email"/.test(modal) && /name="password"/.test(modal) && /name="confirmPassword"/.test(modal), 'sign-up collects full name, email, password and confirm password')
ok(/name="terms" checked=\{form.terms\}/.test(modal), 'privacy consent checkbox present')
ok(/Already have an account\?/.test(modal), 'sign-up links to Log In')
ok(/form.confirmPassword !== form.password\) nextErrors.confirmPassword = 'Passwords do not match.'/.test(modal), 'password confirmation validated')
ok(/New to TutorPro Online English\?/.test(modal), 'login links to Sign Up')
ok(/switchView\('reset-request'\)}>Forgot password\?/.test(modal), 'login offers Forgot password')
ok(/type=\{showPassword \? 'text' : 'password'\}/.test(modal), 'password show/hide toggle')
ok(/setIsSubmitting\(true\)/.test(modal), 'login shows a loading state while submitting')

/* 5 - remember me, wired for real */
ok(/className="remember-row"[\s\S]{0,120}name="remember"/.test(modal), 'login form has a Remember me checkbox')
ok(/loginAccount\(form\.email, form\.password, \{ remember \}\)/.test(modal), 'the checkbox reaches loginAccount')
ok(/function writeSessionId\(accountId, remember = true\)/.test(auth) && /if \(!remember\) \{\s*try \{\s*if \(typeof sessionStorage !== 'undefined'\) sessionStorage.setItem\(SESSION_KEY, accountId\)\s*localStorage.removeItem\(SESSION_KEY\)/.test(auth), 'unchecked Remember me keeps the session tab-only')

/* 6 - security */
ok(/writeSessionId\(account\.id, remember\)\s*\/\/ Same sanitiser[\s\S]{0,200}return publicAccount\(account\)/.test(auth), 'the cloud login path returns the sanitised account (no hash/salt in state)')
ok(/throw new Error\('That password is not correct/.test(auth), 'wrong passwords are rejected with a friendly message')
ok(/An account with this login already exists/.test(auth), 'duplicate registrations are rejected')
const payload = cloud.slice(cloud.indexOf('export async function updateCloudProfile'), cloud.indexOf('export async function deleteCloudProfile'))
ok(!/role: account\.role/.test(payload), 'profile updates can never rewrite the role column (no self-escalation)')
ok(/role: 'student',/.test(auth), 'registerAccount still hard-codes the student role')
ok(/requestedRole/.test(registerApi) && /admin above all/.test(registerApi), 'the register API still refuses any role but student/pending teacher')
ok(!/export function registrationSnapshot|export function adoptCloudAccount/.test(auth), 'dead one-tap helpers stay removed')

/* 7 - homepage CTA untouched */
ok(/Book a free first class <ArrowRight/.test(app), 'Book a free first class remains the homepage CTA')

/* 8 - the mobile continue button must stay readable (owner, 2026-10-28:
   'the continue button font is white, its not visible'). The sticky fade
   belongs to a wrapper div, never to the button's own background. */
ok(/\.auth-shell--student-register \.auth-sticky-bar,\n\s*\.auth-shell--student-register \.auth-form__actions \{[\s\S]{0,400}?background: linear-gradient/.test(css), 'the mobile sticky-bar fade sits on a wrapper, not on the submit button')
ok(!/\.auth-shell--student-register \.auth-submit,\n\s*\.auth-shell--student-register \.auth-form__actions \{/.test(css), 'no rule paints the submit button cream over its coral face')
ok(/<div className="auth-sticky-bar">/.test(modalJsx), 'step 1 wraps its submit button in the sticky bar')
ok(/\.button--primary \{\n\s*background: linear-gradient/.test(css), 'the primary face is still the brand gradient with white text')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
