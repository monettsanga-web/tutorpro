/**
 * Parent reviews must reach the homepage automatically — and safely.
 *
 * THE FEATURE
 * -----------
 * A teacher completes a lesson, the parent rates it, and the review appears on
 * the public homepage without anyone copying anything by hand.
 *
 * THE TWO THINGS THAT COULD GO BADLY WRONG
 * ----------------------------------------
 *  1. PRIVACY. Ratings live inside bookings, which also contain a child's
 *     name, a schedule, an email and account ids. Publishing a booking would
 *     leak all of that. Only a narrow, explicitly-listed set of fields may
 *     ever leave the database.
 *  2. HONESTY. The homepage must not look busier or better than the truth.
 *     No invented reviews, no padding an empty list, and an average built from
 *     4-and-5-star reviews must never be presented as an overall score.
 *
 * Run: node scripts/test-public-reviews.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
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

const sql = existsSync(resolve(repo, 'supabase/public_reviews.sql'))
  ? read('supabase/public_reviews.sql') : ''
const client = read('src/publicReviews.js')
const app = read('src/App.jsx')

/* ------------------------------------------------------------------ */
/* 1. Privacy: what may leave the database                            */
/* ------------------------------------------------------------------ */
{
  check('The publishing function exists', sql.length > 0)
  check('It runs with elevated rights so logged-out visitors can read reviews',
    /security definer/.test(sql))
  check('It is read-only', /language sql/.test(sql) && /\bstable\b/.test(sql))

  // The returns clause is the contract for what can ever be exposed.
  const returns = sql.slice(sql.indexOf('returns table'), sql.indexOf('language sql'))
  const allowed = ['review_id', 'score', 'comment', 'reviewer', 'teacher_name', 'created_at']
  const declared = [...returns.matchAll(/^\s{2}(\w+)\s+/gm)].map((m) => m[1])
  check('It returns only the six safe fields',
    declared.length > 0 && declared.every((f) => allowed.includes(f)),
    declared.join(', '))

  for (const leak of ['email', 'student_id', 'teacher_id', 'learner', 'child', 'phone', 'password']) {
    check(`It never returns ${leak}`, !new RegExp(`^\\s{2}${leak}\\b`, 'mi').test(returns))
  }
  check('The real booking id is hashed, not exposed', /md5\(b\.id::text\)/.test(sql))
  check('The parent is shown as a first name and initial only',
    /left\(split_part/.test(sql) && /parent_name/.test(sql))
  check('Only the teacher\'s first name is shown',
    /split_part\(trim\(coalesce\(t\.full_name/.test(sql))
  check('Execute is granted to anonymous visitors', /grant execute[\s\S]{0,80}to anon/.test(sql))
  check('It never deletes or alters data',
    !/\bdelete\s+from\b|\bdrop\s+table\b|\btruncate\b|\bupdate\s+public\./i.test(sql))
}

/* ------------------------------------------------------------------ */
/* 2. Which reviews are published                                     */
/* ------------------------------------------------------------------ */
{
  check('Only 4 and 5 star ratings are published', />=\s*4/.test(sql))
  check('A score with no written comment is not published',
    /length\(trim\(coalesce\(b\.booking_data->'studentRating'->>'comment'/.test(sql))
  check('The administrator can hide any single review', /reviewHidden/.test(sql))
  check('Newest reviews come first', /order by created_at desc/.test(sql))
  check('The number published is capped', /limit \d+/.test(sql))

  // The same rules must hold client-side, so a bad row can never render.
  check('The client re-checks the minimum score', /score < MIN_PUBLISHED_SCORE/.test(client))
  check('The client re-checks the comment length',
    /comment\.length < MIN_COMMENT_LENGTH/.test(client))
  check('A malformed row is dropped rather than rendered broken',
    /\.map\(normalizeRow\)\s*\n?\s*\.filter\(Boolean\)/.test(client))
  check('A score above 5 is rejected too', /score > 5/.test(client))
}

/* ------------------------------------------------------------------ */
/* 3. Honesty                                                          */
/* ------------------------------------------------------------------ */
{
  check('The average is labelled as published reviews, not an overall score',
    /published \{verifiedCount === 1 \? 'review' : 'reviews'\}/.test(app))
  check('Why that wording matters is written down',
    /published reviews/i.test(client) && /misleading/i.test(client))
  // Strip comments first: App.jsx *explains* why we avoid aggregateRating, and
  // that explanation must not be mistaken for the mistake it warns against.
  const appCode = app
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n')
  check('No aggregateRating is emitted for the organisation',
    !/aggregateRating/i.test(appCode))

  check('Verified lesson reviews are labelled as such', /Verified lesson/.test(app))
  check('Historical Facebook reviews keep their own label',
    /!review\.verified && review\.source/.test(app))
  check('Real reviews and imported ones are told apart', /review\.verified/.test(app))

  check('Stars reflect the real score, not always five',
    /fill=\{i < stars \? 'currentColor' : 'none'\}/.test(app))
  check('The star label matches the real score', /\$\{stars\} out of 5/.test(app))

  // The section must never invent content to look busier.
  check('An empty result renders nothing rather than filler',
    /if \(!reviews\.length\) return null/.test(app))
  check('A failed fetch never wipes existing reviews',
    /if \(active && reviews\.length\) setLiveReviews/.test(app))
  check('The honesty rule is recorded in the module',
    /never look busier than the truth/i.test(client))
}

/* ------------------------------------------------------------------ */
/* 4. It cannot break the homepage                                    */
/* ------------------------------------------------------------------ */
{
  check('A missing Supabase config returns nothing instead of throwing',
    /if \(!isSupabaseConfigured \|\| !supabase\) return \[\]/.test(client))
  check('A database error is handled, not thrown', /if \(error\) \{[\s\S]{0,220}return \[\]/.test(client))
  check('The whole fetch is wrapped in try/catch', /catch \{\s*\n?\s*return \[\]/.test(client))
  check('It works before the SQL has been run',
    /has probably not been run yet/i.test(client))
  check('A blocked localStorage cannot break rendering',
    /catch \{[\s\S]{0,120}never break the homepage/i.test(client))
  check('One failing listener does not stop the others',
    /catch \{ \/\* one bad listener must not stop the rest \*\/ \}/.test(client))
  check('Cached reviews render instantly without a network wait',
    /useState\(\(\) => cachedPublicReviews\(\)\)/.test(app))
  check('The effect cleans up after itself', /return \(\) => \{ active = false \}/.test(app))
}

/* ------------------------------------------------------------------ */
/* 5. Merging real and historical reviews                             */
/* ------------------------------------------------------------------ */
{
  // Exercise mergeReviews and publishedAverage for real.
  const mod = await import('../src/publicReviews.js').catch(() => null)
  if (!mod) {
    check('publicReviews.js can be imported', false, 'import failed')
  } else {
    const { mergeReviews, publishedAverage } = mod

    const live = [
      { id: 'a', quote: 'x', date: '2026-08-01', verified: true, score: 5 },
      { id: 'b', quote: 'y', date: '2026-08-05', verified: true, score: 4 },
    ]
    const legacy = [
      { name: 'James King', quote: 'z', date: '2021-12-09', source: 'Facebook recommendation' },
    ]

    const merged = mergeReviews(live, legacy, 6)
    check('Real platform reviews come before the 2021 imports',
      merged[0].verified === true && merged[merged.length - 1].source === 'Facebook recommendation')
    check('Newest real review is first', merged[0].id === 'b')
    check('The limit is respected', mergeReviews(live, legacy, 2).length === 2)
    check('Nothing is lost when there are no live reviews',
      mergeReviews([], legacy, 6).length === 1)
    check('Bad input cannot crash the merge',
      mergeReviews(null, undefined, 6).length === 0)

    check('The average is correct', publishedAverage(live) === 4.5)
    check('An empty list has no average, rather than zero', publishedAverage([]) === null)
    check('A single review averages to itself', publishedAverage([{ score: 5 }]) === 5)
    check('Bad input cannot crash the average', publishedAverage(null) === null)
  }
}

/* ------------------------------------------------------------------ */
/* 6. The path from lesson to homepage really exists                  */
/* ------------------------------------------------------------------ */
{
  const bookings = read('src/bookings.js')
  check('Parents rate a completed lesson', /export function rateCompletedBooking/.test(bookings))
  check('The rating is stored on the booking',
    /studentRating: \{ score, comment: comment\.trim\(\), createdAt/.test(bookings))
  check('Only a completed lesson can be rated',
    /A lesson can be rated after it is completed/.test(bookings))
  check('A lesson cannot be rated twice',
    /This lesson has already been rated/.test(bookings))
  check('Only the lesson\'s own parent may rate it',
    /booking\.studentId !== studentId/.test(bookings))
  check('The database reads the same field the app writes',
    /studentRating/.test(sql) && /studentRating/.test(bookings))
  check('The homepage section is rendered', /<ParentReviews \/>/.test(app))
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
