/**
 * The review carousel: moving, live, and safe to show a stranger.
 *
 * TWO THINGS THIS FEATURE HAD TO GET RIGHT
 * ----------------------------------------
 *  1. LIVE ON TEACHER PROFILES. The public teacher profile previously read
 *     reviews from getBookings(), which reads local storage. A visitor who is
 *     not logged in has no bookings on their device, so EVERY teacher showed
 *     "No published reviews yet" no matter how many reviews existed. Reviews
 *     must come from the shared database function instead.
 *
 *  2. AUTO-ADVANCE MUST BE POLITE. A carousel that keeps moving while someone
 *     is reading is hostile. It has to pause on hover and focus, stop for good
 *     once the visitor takes control, respect reduced-motion, and never run
 *     when everything already fits.
 *
 * Run: node scripts/test-review-carousel.mjs
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

const carousel = read('src/ReviewCarousel.jsx')
const app = read('src/App.jsx')
const client = read('src/publicReviews.js')
const sql = read('supabase/public_reviews.sql')
const css = read('src/styles.css')

/* --- 1. Teacher profiles read from the database, not local storage --- */
{
  const profile = app.slice(app.indexOf('function PublicTeacherProfileDetail'),
    app.indexOf('function TeacherShowcase'))

  check('The teacher profile no longer reads reviews from local bookings',
    !/getBookings\(\{ teacherId: teacher\.id \}\)[\s\S]{0,120}studentRating/.test(profile))
  check('It fetches published reviews instead', /fetchPublicReviews\(\)/.test(profile))
  check('It filters to this teacher only', /reviewsForTeacher\(publishedReviews, teacher\.id\)/.test(profile))
  check('It shows cached reviews instantly', /useState\(\(\) => cachedPublicReviews\(\)\)/.test(profile))
  check('A failed fetch never wipes what is on screen',
    /if \(active && fetched\.length\) setPublishedReviews/.test(profile))
  check('The effect cleans up', /return \(\) => \{ active = false \}/.test(profile))
  check('The reason the old code failed is recorded',
    /every\s*\n?\s*\* teacher profile showed "No published reviews yet"|no bookings on their device/i.test(profile))
}

/* --- 2. The database exposes the teacher id, and nothing new that is private --- */
{
  const returns = sql.slice(sql.indexOf('returns table'), sql.indexOf('language sql'))
  const declared = [...returns.matchAll(/^\s{2}(\w+)\s+/gm)].map((m) => m[1])
  const allowed = ['review_id', 'score', 'comment', 'reviewer', 'teacher_id', 'teacher_name', 'created_at']
  check('Only the seven safe fields are returned',
    declared.length > 0 && declared.every((f) => allowed.includes(f)), declared.join(', '))
  check('teacher_id is exposed so a profile can filter', declared.includes('teacher_id'))
  check('It is noted that the teacher id was already public',
    /Already public: get_public_teachers/.test(sql))
  for (const leak of ['email', 'student_id', 'learner', 'child', 'phone']) {
    check(`Still never returns ${leak}`, !new RegExp(`^\\s{2}${leak}\\b`, 'mi').test(returns))
  }
  check('Still only 4 and 5 star reviews', />=\s*4/.test(sql))
  check('Still requires a written comment', /length\(trim\(coalesce/.test(sql))
  check('The cap was raised so per-teacher lists are not starved', /limit 60/.test(sql))
}

/* --- 3. reviewsForTeacher behaves --- */
{
  const mod = await import('../src/publicReviews.js')
  const { reviewsForTeacher } = mod
  const data = [
    { id: '1', teacherId: 'A', date: '2026-08-01' },
    { id: '2', teacherId: 'B', date: '2026-08-05' },
    { id: '3', teacherId: 'A', date: '2026-08-09' },
    { id: '4', teacherId: '', date: '2026-08-02' },
  ]
  const forA = reviewsForTeacher(data, 'A')
  check('Only that teacher\'s reviews are returned', forA.length === 2 && forA.every((r) => r.teacherId === 'A'))
  check('Newest first', forA[0].id === '3')
  check('Another teacher\'s reviews never leak in', !forA.some((r) => r.teacherId === 'B'))
  check('An unknown teacher gets nothing', reviewsForTeacher(data, 'ZZZ').length === 0)
  check('A missing id returns nothing rather than everything', reviewsForTeacher(data, '').length === 0)
  check('Bad input cannot crash it', reviewsForTeacher(null, 'A').length === 0)
}

/* --- 4. Auto-advance is polite --- */
{
  check('It pauses on hover', /onMouseEnter=\{\(\) => setPaused\(true\)\}/.test(carousel))
  check('It pauses on keyboard focus', /onFocusCapture=\{\(\) => setPaused\(true\)\}/.test(carousel))
  check('It stops for good once the visitor takes control', /setUserTookOver\(true\)/.test(carousel))
  check('Taking over blocks the timer', /if \(userTookOver \|\| paused \|\| !canScroll\) return undefined/.test(carousel))
  check('It respects reduced-motion', /prefers-reduced-motion/.test(carousel))
  check('It does not run in a hidden tab', /if \(document\.hidden\) return/.test(carousel))
  check('It does not run with a single review', /reviews\.length < 2/.test(carousel))
  check('It does not run when nothing overflows', /setCanScroll\(track\.scrollWidth > track\.clientWidth/.test(carousel))
  check('The timer is always cleared', /return \(\) => window\.clearInterval\(timer\)/.test(carousel))
}

/* --- 5. It is a real list, not a hijacked one --- */
{
  check('Arrow keys work', /event\.key === 'ArrowRight'/.test(carousel) && /event\.key === 'ArrowLeft'/.test(carousel))
  check('It uses native scrolling so swipe works', /scroll-snap-type: x mandatory/.test(css))
  check('The track is focusable', /tabIndex=\{0\}/.test(carousel))
  check('It is announced as a carousel', /aria-roledescription="carousel"/.test(carousel))
  check('Each card is announced as a slide', /aria-roledescription="slide"/.test(carousel))
  check('Slides say which of how many', /Review \$\{position \+ 1\} of \$\{reviews\.length\}/.test(carousel))
  check('Dots report the selected one', /aria-selected=\{position === index\}/.test(carousel))
  check('Arrows are labelled', /aria-label="Previous review"/.test(carousel) && /aria-label="Next review"/.test(carousel))
  check('Stars have a real label', /aria-label=\{`\$\{filled\} out of 5`\}/.test(carousel))
  check('Focus is visible for keyboard users', /\.review-carousel__track:focus-visible/.test(css))
  check('Dots follow a manual swipe', /track\.addEventListener\('scroll', onScroll/.test(carousel))
}

/* --- 6. Controls tell the truth --- */
{
  check('Controls are hidden when nothing overflows', /\{canScroll && \(/.test(carousel))
  check('The previous arrow disables at the start', /disabled=\{index === 0\}/.test(carousel))
  check('The next arrow disables at the end', /disabled=\{index >= reviews\.length - 1\}/.test(carousel))
  check('Nothing renders with no reviews', /if \(!reviews\.length\) return null/.test(carousel))
}

/* --- 7. Honesty carried over from the static version --- */
{
  check('Stars show the real score', /fill=\{index < filled \? 'currentColor' : 'none'\}/.test(carousel))
  check('Verified lessons are still labelled', /Verified lesson/.test(carousel))
  check('Imported Facebook reviews keep their own label', /!review\.verified && review\.source/.test(carousel))
  check('The teacher name can be suppressed on their own page',
    /showTeacherName = true/.test(carousel) && /showTeacherName=\{false\}/.test(app))
  check('The homepage still uses the carousel', /<ReviewCarousel reviews=\{reviews\} \/>/.test(app))
  check('The average is still labelled as published reviews',
    /published \{verifiedCount === 1 \? 'review' : 'reviews'\}/.test(app))
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
