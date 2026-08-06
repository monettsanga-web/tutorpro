/**
 * Feedback must be confirmed uploaded before the teacher is told it saved.
 *
 * Reported symptom: feedback written on one laptop never appeared in the
 * calendar on another.
 *
 * Cause: saving wrote to local storage and then called the cloud sync as
 * fire-and-forget. A failed upload dispatched a 'tutorpro:cloud-error' event
 * that nothing in the app listened for, so the dialog closed and the teacher
 * believed the feedback was shared. It existed on one device and nowhere else,
 * permanently, with no indication anything had gone wrong.
 *
 * Run: node scripts/test-feedback-upload.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const withTimeout = (promise, ms, message) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
])

/** Old behaviour: save locally, fire the upload, close regardless. */
function oldSubmit({ upload }) {
  const state = { savedLocally: false, dialogClosed: false, errorShown: '', uploaded: false }
  state.savedLocally = true
  upload().then(() => { state.uploaded = true }).catch(() => { /* nobody listens */ })
  state.dialogClosed = true
  return state
}

/** New behaviour: wait for the upload, report the truth. */
async function newSubmit({ upload, cloudEnabled = true, timeoutMs = 50 }) {
  const state = { savedLocally: false, dialogClosed: false, errorShown: '', uploaded: false }
  state.savedLocally = true
  if (cloudEnabled) {
    try {
      await withTimeout(upload(), timeoutMs, 'The shared database did not confirm the feedback in time.')
      state.uploaded = true
    } catch (error) {
      state.errorShown = `${error.message} It is saved on this device, but other devices will not see it until this succeeds.`
      return state
    }
  }
  state.dialogClosed = true
  return state
}

const ok = () => Promise.resolve({ id: 'b1' })
const fails = () => Promise.reject(new Error('Network request failed'))
const hangs = () => new Promise(() => {})

/* --- The reported failure --- */
{
  const s = oldSubmit({ upload: fails })
  check('OLD: dialog closes even though upload failed', s.dialogClosed === true)
  check('OLD: teacher is never told', s.errorShown === '')
  check('OLD: feedback exists only locally', s.uploaded === false)
}

/* --- The fix --- */
{
  const s = await newSubmit({ upload: fails })
  check('NEW: dialog stays open on failure', s.dialogClosed === false)
  check('NEW: teacher is told clearly', s.errorShown.includes('other devices will not see it'))
  check('NEW: local copy is still kept', s.savedLocally === true)
}

/* --- A hung upload must not trap the teacher forever --- */
{
  const started = Date.now()
  const s = await newSubmit({ upload: hangs, timeoutMs: 50 })
  check('NEW: a hung upload times out', s.errorShown.includes('did not confirm'))
  check('NEW: it times out promptly', Date.now() - started < 500, `${Date.now() - started}ms`)
}

/* --- The happy path must be unaffected --- */
{
  const s = await newSubmit({ upload: ok })
  check('successful upload closes the dialog', s.dialogClosed === true)
  check('successful upload reports no error', s.errorShown === '')
  check('successful upload is marked shared', s.uploaded === true)
}

/* --- Offline-only installs must still work --- */
{
  const s = await newSubmit({ upload: fails, cloudEnabled: false })
  check('no cloud configured: still saves and closes', s.dialogClosed === true && s.savedLocally === true)
  check('no cloud configured: no misleading error', s.errorShown === '')
}

/* --- Retrying after a failure must succeed --- */
{
  let attempt = 0
  const flaky = () => { attempt += 1; return attempt === 1 ? Promise.reject(new Error('Network request failed')) : Promise.resolve({}) }
  const first = await newSubmit({ upload: flaky })
  check('first attempt fails visibly', first.errorShown !== '')
  const second = await newSubmit({ upload: flaky })
  check('retry succeeds and closes', second.dialogClosed === true && second.errorShown === '')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
