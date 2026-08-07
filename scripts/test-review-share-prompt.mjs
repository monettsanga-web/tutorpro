/**
 * After a parent rates a class, offer the public review link — legally.
 *
 * THE PROBLEM
 * -----------
 * Parents were struggling to leave Trustpilot reviews. The link is fine; the
 * barrier is structural. Trustpilot requires every reviewer to create an
 * account and confirm an email before they can post, which it introduced
 * deliberately to fight fake reviews. On a phone that is a wall, and for the
 * families who registered with WeChat or WhatsApp there may be no email
 * address at all.
 *
 * THE RULE THAT MUST NOT BE BROKEN
 * --------------------------------
 * The share prompt has to appear for EVERY rating, whatever the score.
 * Inviting only the happy customers is "cherry picking", which Trustpilot
 * names as illegal and which gets a profile publicly flagged with its
 * TrustScore hidden. Under the FTC rule in force since October 2024, review
 * manipulation carries civil penalties per violation.
 *
 * Nor may we offer any incentive: Trustpilot forbids all of them, including
 * discounts and loyalty points.
 *
 * Run: node scripts/test-review-share-prompt.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const read = (rel) => readFileSync(resolve(repo, rel), 'utf8')

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const dash = read('src/Dashboards.jsx')
const css = read('src/dashboard.css')

// Isolate the rating dialog so other parts of the file cannot mask a problem.
const start = dash.indexOf('function RatingDialog(')
const dialog = dash.slice(start, dash.indexOf('export function FeedbackDialog'))
check('The rating dialog was located', start > -1 && dialog.length > 500)

/* --- 1. No cherry picking: the prompt is score-blind --- */
{
  // The single most important assertion in this file. If the share step were
  // ever gated on the score, that is the illegal pattern.
  const gated = /if\s*\(\s*rating\s*[><=]=?\s*\d/.test(dialog)
    || /rating\s*>=\s*4/.test(dialog)
    || /score\s*>=\s*4[\s\S]{0,120}trustpilot/i.test(dialog)
  check('The share prompt is NOT gated on the star rating', !gated)

  check('The thank-you step is shown for any successful rating',
    /setDone\(true\)/.test(dialog) && !/rating\s*>[\s\S]{0,40}setDone\(true\)/.test(dialog))
  check('It renders purely on "done", not on the score', /if \(done\) \{/.test(dialog))
  check('The reason cherry picking is avoided is written down',
    /cherry picking/i.test(dialog) && /illegal/i.test(dialog))
}

/* --- 2. Neutral wording: never ask for stars --- */
{
  const banned = [
    /leave us (a )?5[- ]star/i,
    /give us five stars/i,
    /please rate us 5/i,
    /if you (are happy|liked)[^.]{0,40}review/i,
  ]
  banned.forEach((pattern, index) => {
    check(`No star-begging language (pattern ${index + 1})`, !pattern.test(dialog))
  })
  check('It asks for an honest experience instead',
    /honest/i.test(dialog) || /share it publicly/i.test(dialog))
  check('No incentive is offered anywhere in the dialog',
    !/discount|voucher|free lesson|reward|gift|credit/i.test(dialog))
}

/* --- 3. It removes the real friction --- */
{
  check('The parent can copy the words they already wrote',
    /Copy my review/.test(dialog) && /clipboard\?\.writeText\(shareText\)/.test(dialog))
  check('The copy box only appears when they wrote something',
    /\{shareText && \(/.test(dialog))
  check('A clipboard failure cannot crash the dialog',
    /writeText\(shareText\)\.catch\(\(\) => \{\}\)/.test(dialog))
  check('The sign-in requirement is explained honestly, not hidden',
    /asks you to sign in with an email first/i.test(dialog))
  check('It makes clear the email rule is Trustpilot\'s, not ours',
    /their rule, not ours/i.test(dialog))
}

/* --- 4. Declining is easy and guilt-free --- */
{
  check('There is a clear way to decline', /No thanks, I am done/.test(dialog))
  check('Declining still closes cleanly', /const finish = \(\) => onSaved\(\)/.test(dialog))
  check('The parent is told their review is already saved either way',
    /already saved/i.test(dialog))
  check('Closing the dialog does not lose the rating',
    /onMouseDown=\{\(event\) => event\.target === event\.currentTarget && finish\(\)\}/.test(dialog))
}

/* --- 5. The rating itself still behaves --- */
{
  check('The rating is stored before the thank-you appears',
    dialog.indexOf('rateCompletedBooking') < dialog.indexOf('setDone(true)'))
  check('The upload is still confirmed before claiming success',
    /await withTimeout\(\s*syncBookingNow\(saved\)/.test(dialog))
  check('A failed upload does NOT show the share prompt',
    /setError\(`\$\{ratingError\.message\}/.test(dialog)
      && dialog.indexOf('setDone(true)') < dialog.indexOf('catch (ratingError)'))
  check('Double submission is still prevented', /if \(saving\) return/.test(dialog))
}

/* --- 6. The link is the correct one --- */
{
  check('It points at the evaluate URL, which is the one that works',
    /trustpilot\.com\/evaluate\/tutorpro\.site/.test(dialog))
  check('It opens in a new tab so the dashboard is not lost',
    /target="_blank"/.test(dialog) && /rel="noopener noreferrer"/.test(dialog))
}

/* --- 7. It is styled and readable --- */
{
  check('The thank-you step is styled', /\.rating-thanks \{/.test(css))
  check('The copy box is styled', /\.rating-thanks__copy/.test(css))
  check('The share button is styled', /\.rating-thanks__share/.test(css))
  check('The explanatory note is de-emphasised, not hidden',
    /\.rating-thanks__note[\s\S]{0,200}font-size: 0\.83rem/.test(css))
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
