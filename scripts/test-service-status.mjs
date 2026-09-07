/**
 * A Supabase 402 service restriction must be recognised and explained
 * plainly - above all it must say that no data has been lost.
 */
import {
  isServiceRestriction, restrictionQuota, serviceRestrictionMessage, describeSupabaseError,
} from '../src/serviceStatus.js'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

/* --- real shapes Supabase returns ------------------------------------ */
ok(isServiceRestriction({ status: 402, message: 'Service restricted: exceeded_egress_quota' }),
  'recognises a 402 with exceeded_egress_quota')
ok(isServiceRestriction({ message: 'exceeded_cached_egress_quota' }),
  'recognises a cached-egress restriction even without a status')
ok(isServiceRestriction({ status: 402, message: 'project restricted under fair use policy' }),
  'recognises a bare 402 that mentions a restriction')
ok(isServiceRestriction({ code: 'exceeded_db_size_quota' }),
  'recognises a database-size restriction')
ok(isServiceRestriction({ message: 'overdue_payment' }),
  'recognises an overdue payment restriction')

/* --- must NOT fire for ordinary errors -------------------------------- */
ok(!isServiceRestriction(null), 'no false positive on a null error')
ok(!isServiceRestriction({ message: 'Failed to fetch' }),
  'no false positive on a network failure')
ok(!isServiceRestriction({ code: '42501', message: 'row-level security policy' }),
  'no false positive on a permissions error')
ok(!isServiceRestriction({ status: 404, message: 'Not found' }),
  'no false positive on a 404')
ok(!isServiceRestriction({ status: 500, message: 'Internal error' }),
  'no false positive on a server error')
ok(!isServiceRestriction({ message: 'invoice total 402 dollars' }),
  'no false positive when 402 merely appears in text')

/* --- the wording is the point ----------------------------------------- */
const msg = serviceRestrictionMessage({ status: 402, message: 'exceeded_egress_quota' })
ok(/nothing has been lost/i.test(msg), 'the message states plainly that nothing has been lost')
ok(/safe and still stored/i.test(msg), 'the message reassures that data is still stored')
ok(/returns automatically/i.test(msg), 'the message says access returns by itself')
ok(/data transfer/i.test(msg), 'the message names the specific limit that was reached')
ok(/sejongenglish@yahoo\.com/.test(msg), 'the message gives a contact address')
ok(!/402|quota_|exceeded_/.test(msg), 'the message contains no raw error codes')

ok(restrictionQuota({ message: 'exceeded_egress_quota' }) === 'monthly data transfer',
  'the egress quota is named in plain English')
ok(restrictionQuota({ message: 'exceeded_db_size_quota' }) === 'database size',
  'the database quota is named in plain English')
ok(restrictionQuota({ message: 'Failed to fetch' }) === '',
  'an unrelated error names no quota')

/* --- describeSupabaseError passes ordinary errors through ------------- */
ok(describeSupabaseError({ message: 'Invalid login credentials' }) === 'Invalid login credentials',
  'an ordinary error keeps its own message')
ok(/nothing has been lost/i.test(describeSupabaseError({ status: 402, message: 'exceeded_egress_quota' })),
  'a restriction is replaced with the friendly explanation')
ok(describeSupabaseError(null, 'fallback text') === 'fallback text',
  'a missing error falls back to the supplied text')


/* ------------------------------------------------------------------ */
/* Contact fallback: only offer a human when the failure is OUR fault  */
/* ------------------------------------------------------------------ */
const { shouldOfferContactFallback, signUpFailureMessage } = await import('../src/serviceStatus.js')

console.log('\n-- fallback SHOULD appear (platform failed) --')
const shouldFire = [
  ['Shared registration failed: Failed to fetch', 'the exact error registration throws when Supabase is down'],
  [{ status: 402, message: 'exceeded_egress_quota' }, 'a free-plan service restriction'],
  ['Shared profile could not be loaded: timeout', 'a profile load timeout'],
  ['NetworkError when attempting to fetch resource.', 'a browser network error'],
  [{ status: 503, message: 'Service Unavailable' }, 'a 503 from the server'],
  [{ status: 500, message: 'Internal Server Error' }, 'a 500 from the server'],
  ['fetch failed', 'a bare fetch failure'],
]
shouldFire.forEach(([err, why]) => ok(shouldOfferContactFallback(err), `offers contact for ${why}`))

console.log('\n-- fallback MUST NOT appear (the person can fix it) --')
const shouldNotFire = [
  ['An account with this login already exists. Try logging in instead.', 'a duplicate account'],
  ['Complete the parent and student profile before creating the account.', 'an incomplete profile'],
  ['Passwords must contain at least eight characters and one number.', 'a weak password'],
  ['That password is not correct. Please try again.', 'a wrong password'],
  ['Enter a valid login for the selected provider.', 'an invalid login'],
  ['Choose a school year.', 'a missing field'],
  ['User already registered', 'the Supabase duplicate-user message'],
  ['Password should be at least 6 characters', 'the Supabase weak-password message'],
  ['This registration is waiting for email activation.', 'an unconfirmed email'],
  [null, 'no error at all'],
  ['', 'an empty message'],
]
shouldNotFire.forEach(([err, why]) => ok(!shouldOfferContactFallback(err), `stays hidden for ${why}`))

console.log('\n-- the wording apologises and reassures --')
const signUpMsg = signUpFailureMessage(new Error('Shared registration failed: Failed to fetch'))
ok(/sorry/i.test(signUpMsg), 'the sign-up failure message apologises')
ok(/not with anything you typed/i.test(signUpMsg), 'it makes clear the person did nothing wrong')
ok(/by hand/i.test(signUpMsg), 'it promises a human will finish the job')
const restrictedMsg = signUpFailureMessage({ status: 402, message: 'exceeded_egress_quota' })
ok(/nothing you entered was charged or lost/i.test(restrictedMsg), 'the restricted variant confirms nothing was lost or charged')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
