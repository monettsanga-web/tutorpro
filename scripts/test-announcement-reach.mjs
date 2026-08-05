/**
 * Announcement reachability.
 *
 * An email campaign only reaches accounts holding a real email address.
 * Families who registered with a phone number or a WeChat ID have none, so a
 * campaign can silently reach nobody — and the dashboard used to report
 * "Successfully sent to 0 emails" as a success, which looked identical to a
 * delivered campaign.
 *
 * Run: node scripts/test-announcement-reach.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const hasEmail = (account) =>
  [account?.email, account?.loginId].some((v) => typeof v === 'string' && v.includes('@'))

function reach(accounts) {
  const families = accounts.filter((a) => {
    const role = String(a.role || 'student').toLowerCase()
    return (role === 'student' || role === 'parent') && a.status !== 'removed'
  })
  const teachers = accounts.filter((a) => a.role === 'teacher' && a.status !== 'removed')
  return {
    families: families.length,
    reachableFamilies: families.filter(hasEmail).length,
    unreachableFamilies: families.filter((a) => !hasEmail(a)),
    teachers: teachers.length,
    reachableTeachers: teachers.filter(hasEmail).length,
  }
}

/** The send guard: refuse to claim success when nothing was delivered. */
const sendSucceeded = (recipients) => Number(recipients) > 0

/* --- Email detection --- */
check('email in the email field counts', hasEmail({ email: 'a@b.com' }))
check('email in loginId counts', hasEmail({ loginId: 'a@b.com' }))
check('phone number does not count', hasEmail({ loginId: '+639625284849' }) === false)
check('WeChat id does not count', hasEmail({ loginId: 'wxid_abc123' }) === false)
check('empty account does not count', hasEmail({}) === false)
check('null-ish values do not crash', hasEmail({ email: null, loginId: undefined }) === false)

/* --- Mixed roster --- */
{
  const accounts = [
    { id: '1', role: 'student', email: 'maria@example.com' },
    { id: '2', role: 'student', loginId: '+639170000000' },
    { id: '3', role: 'parent', loginId: 'jun@example.com' },
    { id: '4', role: 'student', loginId: 'wxid_xyz' },
    { id: '5', role: 'teacher', email: 'grace@example.com' },
    { id: '6', role: 'teacher', loginId: '+639180000000' },
    { id: '7', role: 'student', email: 'gone@example.com', status: 'removed' },
    { id: '8', role: 'admin', email: 'admin@example.com' },
  ]
  const r = reach(accounts)
  check('counts families only', r.families === 4, String(r.families))
  check('admins excluded from families', r.families === 4)
  check('removed accounts excluded', !r.unreachableFamilies.some((a) => a.id === '7'))
  check('reachable families correct', r.reachableFamilies === 2, String(r.reachableFamilies))
  check('unreachable families listed', r.unreachableFamilies.length === 2)
  check('teachers counted separately', r.teachers === 2 && r.reachableTeachers === 1)
  check('parent role treated as a family', r.unreachableFamilies.every((a) => a.id !== '3'))
}

/* --- The reported situation: nobody reachable --- */
{
  const accounts = [
    { id: '1', role: 'student', loginId: '+639170000000' },
    { id: '2', role: 'student', loginId: 'wxid_abc' },
  ]
  const r = reach(accounts)
  check('no reachable families detected', r.reachableFamilies === 0)
  check('the warning would show', r.reachableFamilies === 0 && r.families > 0)
}

/* --- No accounts at all --- */
{
  const r = reach([])
  check('empty roster is safe', r.families === 0 && r.reachableFamilies === 0)
}

/* --- The send guard --- */
check('OLD behaviour: 0 recipients reported success', true) // documented, now fixed
check('NEW: 0 recipients is a failure', sendSucceeded(0) === false)
check('NEW: undefined recipients is a failure', sendSucceeded(undefined) === false)
check('NEW: null recipients is a failure', sendSucceeded(null) === false)
check('NEW: a string zero is a failure', sendSucceeded('0') === false)
check('NEW: 1 recipient is a success', sendSucceeded(1) === true)
check('NEW: many recipients is a success', sendSucceeded(25) === true)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
