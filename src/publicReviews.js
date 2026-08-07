/**
 * Real parent reviews, published on the homepage as they arrive.
 *
 * HOW A REVIEW REACHES THE HOMEPAGE
 * ---------------------------------
 *  1. A lesson is marked completed by the teacher.
 *  2. The parent rates it in RatingDialog -> rateCompletedBooking() writes
 *     `studentRating: { score, comment, createdAt }` onto the booking.
 *  3. The booking syncs to Supabase.
 *  4. This module calls get_public_reviews(), which returns only reviews that
 *     are safe to publish, and the homepage renders them.
 *
 * WHY A DATABASE FUNCTION AND NOT A NORMAL QUERY
 * ----------------------------------------------
 * Bookings are protected by row-level security: only the parent, the teacher
 * or an admin can read one. A logged-out visitor therefore cannot query them
 * at all — correctly, since a booking contains a child's name, a schedule and
 * an account id. get_public_reviews() is a security-definer function that
 * returns ONLY the score, the comment, the month, the teacher's first name and
 * the parent's name as they entered it. Nothing else ever leaves the
 * database.
 *
 * WHAT IS DELIBERATELY NOT PUBLISHED
 * ----------------------------------
 *  * Ratings below 4 stars — those are for the admin to act on privately.
 *  * Scores with no written comment, or a comment under 15 characters.
 *  * Anything an admin has hidden.
 *  * Any child's name, email address, booking id or account id.
 *
 * HONESTY RULE
 * ------------
 * Nothing here invents, edits or pads a review. If there are no reviews yet,
 * the homepage shows the four genuine 2021 Facebook recommendations and
 * nothing more. It must never look busier than the truth.
 */

import { isSupabaseConfigured, supabase } from './supabaseClient.js'

// v2: rows cached before teacher_id existed have no teacher attached, so a
// teacher profile would filter them all out and look empty. A new key retires
// them rather than showing a stale, wrong page.
const CACHE_KEY = 'tutorpro_public_reviews_v2'

/** How long a cached copy stays fresh. Reviews are not time-critical. */
const CACHE_TTL_MS = 10 * 60 * 1000

/** A review must say something to be worth publishing. */
export const MIN_COMMENT_LENGTH = 15

/** Only genuinely positive ratings go on the marketing page. */
export const MIN_PUBLISHED_SCORE = 4

const listeners = new Set()
let cached = null

function readCache() {
  if (cached) return cached
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.reviews)) return null
    cached = parsed
    return parsed
  } catch {
    return null
  }
}

function writeCache(reviews) {
  cached = { reviews, savedAt: Date.now() }
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  } catch {
    /* A full or blocked localStorage must never break the homepage. */
  }
}

/**
 * Shape one row from the database into what the homepage renders.
 * Defensive throughout: a malformed row is dropped, never rendered broken.
 */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null
  const score = Number(row.score)
  const comment = String(row.comment || '').trim()
  if (!Number.isFinite(score) || score < MIN_PUBLISHED_SCORE || score > 5) return null
  if (comment.length < MIN_COMMENT_LENGTH) return null
  return {
    id: String(row.review_id || comment.slice(0, 24)),
    score: Math.round(score),
    quote: comment,
    name: String(row.reviewer || 'TutorPro parent').trim() || 'TutorPro parent',
    teacherId: String(row.teacher_id || ''),
    teacherName: String(row.teacher_name || '').trim(),
    date: row.created_at || null,
    source: 'Verified TutorPro lesson',
    verified: true,
  }
}

/**
 * Fetch the reviews that are safe to show publicly.
 * Never throws: the homepage falls back to whatever it already had.
 */
export async function fetchPublicReviews() {
  if (!isSupabaseConfigured || !supabase) return []
  try {
    const { data, error } = await supabase.rpc('get_public_reviews')
    if (error) {
      // The SQL has probably not been run yet. That is not a crash — the
      // homepage simply shows the existing Facebook recommendations.
      return []
    }
    const reviews = (Array.isArray(data) ? data : [])
      .map(normalizeRow)
      .filter(Boolean)
    writeCache(reviews)
    listeners.forEach((listener) => {
      try { listener(reviews) } catch { /* one bad listener must not stop the rest */ }
    })
    return reviews
  } catch {
    return []
  }
}

/** Whatever we already know, available instantly with no network wait. */
export function cachedPublicReviews() {
  const entry = readCache()
  if (!entry) return []
  return Array.isArray(entry.reviews) ? entry.reviews : []
}

/** Is the cached copy old enough to be worth refreshing? */
export function cacheIsStale() {
  const entry = readCache()
  if (!entry) return true
  return Date.now() - Number(entry.savedAt || 0) > CACHE_TTL_MS
}

export function subscribeToPublicReviews(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/**
 * Combine real parent reviews with the historical Facebook recommendations.
 *
 * Newest first, real platform reviews ahead of the 2021 imports. Both keep
 * their true source label so a reader can tell them apart — presenting an
 * old Facebook comment as a fresh platform review would be dishonest.
 */
export function mergeReviews(platformReviews, legacyReviews, limit = 6) {
  const platform = (Array.isArray(platformReviews) ? platformReviews : [])
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  const legacy = (Array.isArray(legacyReviews) ? legacyReviews : [])
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  return [...platform, ...legacy].slice(0, limit)
}

/**
 * The average of the reviews actually on display.
 *
 * IMPORTANT: this is the average of PUBLISHED reviews (4 and 5 star only), so
 * it must never be labelled as the average of all lessons. The UI says
 * "from N published reviews" for exactly this reason. Claiming an overall
 * rating derived only from positive reviews would be misleading, and an
 * aggregateRating on an Organization is also ineligible for Google rich
 * results and risks a manual action.
 */
export function publishedAverage(reviews) {
  const scored = (Array.isArray(reviews) ? reviews : []).filter((review) => Number(review.score) > 0)
  if (!scored.length) return null
  const total = scored.reduce((sum, review) => sum + Number(review.score), 0)
  return Math.round((total / scored.length) * 10) / 10
}

/**
 * The published reviews for one teacher, newest first.
 *
 * The public teacher profile previously read from local storage, so a visitor
 * who was not logged in saw an empty review list on every teacher — the data
 * simply was not on their device. These come from the same vetted database
 * function as the homepage, so they work for anyone.
 */
export function reviewsForTeacher(reviews, teacherId) {
  if (!teacherId) return []
  return (Array.isArray(reviews) ? reviews : [])
    .filter((review) => String(review.teacherId || '') === String(teacherId))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}
