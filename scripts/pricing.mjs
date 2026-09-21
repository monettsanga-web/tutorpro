/**
 * The published prices, in ONE place.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The rates were previously typed by hand into eleven page generators. When
 * the prices changed, every one of them had to be found and edited, and any
 * that were missed would keep advertising a price the checkout no longer
 * honoured — a parent reading one number and being charged another.
 *
 * Generators now import these constants, so a price change is a one-line
 * edit here. `scripts/test-pricing.mjs` additionally asserts that these match
 * `api/_paypal.js`, which is what actually takes the money.
 *
 * CURRENT RATES (confirmed by the owner)
 *   $8 per 25-minute lesson   — 1 to 3 lessons per week
 *   $7 per 25-minute lesson   — 4 or more lessons per week
 *   50-minute lessons cost exactly double the 25-minute rate
 */

export const STANDARD = 8
export const PACKAGE = 7
export const PACKAGE_MIN = 4
export const LONG_MULTIPLIER = 2

export const STANDARD_50 = STANDARD * LONG_MULTIPLIER  // $16
export const PACKAGE_50 = PACKAGE * LONG_MULTIPLIER    // $14

/** "$8" — the headline "from" price used in titles and meta descriptions. */
export const FROM = `$${PACKAGE}`

/** One sentence covering the whole structure, for body copy. */
export const SENTENCE =
  `$${STANDARD} per 25-minute lesson for 1–3 lessons a week, or $${PACKAGE} per lesson `
  + `when your child takes ${PACKAGE_MIN} or more a week. 50-minute lessons are double.`

/** Short form for tight spaces such as cards and tables. */
export const SHORT = `From $${PACKAGE} per lesson`

/** The answer to "how much does it cost", reused in FAQ blocks. */
export const FAQ_ANSWER =
  `Lessons are $${STANDARD} each for 1–3 lessons a week, dropping to $${PACKAGE} each when your child `
  + `takes ${PACKAGE_MIN} or more a week. A 50-minute lesson is exactly double a 25-minute one, so `
  + `$${STANDARD_50} or $${PACKAGE_50}. There are no registration fees, materials fees or platform fees, `
  + `and the first class is free.`
