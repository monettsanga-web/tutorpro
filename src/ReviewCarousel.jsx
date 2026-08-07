/**
 * A moving carousel of real parent reviews.
 *
 * WHERE IT IS USED
 * ----------------
 *  - The homepage "What families say" section, showing every published review.
 *  - Each public teacher profile, showing only that teacher's reviews.
 *
 * WHY A CAROUSEL AND NOT A GRID
 * -----------------------------
 * A grid can only show as many reviews as fit on screen, and on a phone that
 * is one. A carousel shows them all in the same space and signals movement,
 * which is what makes a review section feel alive rather than static.
 *
 * ACCESSIBILITY AND RESTRAINT
 * ---------------------------
 * Auto-advance is a hazard if it is done carelessly: it steals attention, and
 * it is actively hostile to someone reading slowly. So it:
 *   - pauses on hover, on keyboard focus, and while the tab is hidden;
 *   - stops permanently the moment a visitor takes manual control;
 *   - never runs for a visitor who has asked for reduced motion;
 *   - never runs when everything already fits on screen.
 *
 * It is also a real, scrollable list underneath, so it works with a trackpad,
 * a touch swipe, arrow keys and a screen reader even if the timer never runs.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { BadgeCheck, ChevronLeft, ChevronRight, Star } from 'lucide-react'

const AUTOPLAY_MS = 5200

function ReviewStars({ score }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(score) || 0)))
  return (
    <div className="parent-review__stars" role="img" aria-label={`${filled} out of 5`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <Star key={index} size={16} fill={index < filled ? 'currentColor' : 'none'} />
      ))}
    </div>
  )
}

export default function ReviewCarousel({ reviews = [], showTeacherName = true, className = '' }) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  // Once a visitor drives it themselves, the timer never starts again.
  const [userTookOver, setUserTookOver] = useState(false)
  const [canScroll, setCanScroll] = useState(false)

  /** Scroll one card into view. Native scrolling keeps swipe and a11y intact. */
  const goTo = useCallback((target, smooth = true) => {
    const track = trackRef.current
    if (!track) return
    const cards = track.querySelectorAll('.parent-review')
    if (!cards.length) return
    const clamped = Math.max(0, Math.min(cards.length - 1, target))
    const card = cards[clamped]
    if (!card) return
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: smooth ? 'smooth' : 'auto' })
    setIndex(clamped)
  }, [])

  const step = useCallback((delta) => {
    setUserTookOver(true)
    goTo(index + delta)
  }, [goTo, index])

  // Only offer controls when the content actually overflows. Arrows on a
  // single review that already fits would be a lie about there being more.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    const measure = () => setCanScroll(track.scrollWidth > track.clientWidth + 8)
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(track)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [reviews.length])

  // Keep the dots honest when the visitor swipes or scrolls by hand.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const cards = [...track.querySelectorAll('.parent-review')]
        if (!cards.length) return
        const left = track.scrollLeft + track.offsetLeft
        let nearest = 0
        let best = Infinity
        cards.forEach((card, position) => {
          const distance = Math.abs(card.offsetLeft - left)
          if (distance < best) { best = distance; nearest = position }
        })
        setIndex(nearest)
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reviews.length])

  // Auto-advance, with every restraint listed at the top of this file.
  useEffect(() => {
    if (userTookOver || paused || !canScroll) return undefined
    if (reviews.length < 2) return undefined
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    const timer = window.setInterval(() => {
      if (document.hidden) return
      const track = trackRef.current
      if (!track) return
      const cards = track.querySelectorAll('.parent-review')
      const next = index + 1 >= cards.length ? 0 : index + 1
      goTo(next)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [index, paused, userTookOver, canScroll, reviews.length, goTo])

  if (!reviews.length) return null

  return (
    <div
      className={`review-carousel ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="review-carousel__track"
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Parent reviews"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
          if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
        }}
      >
        {reviews.map((review, position) => {
          const stars = Number(review.score) || 5
          return (
            <figure
              className="parent-review"
              key={review.id || `${review.name}-${review.date}-${position}`}
              aria-roledescription="slide"
              aria-label={`Review ${position + 1} of ${reviews.length}`}
            >
              <ReviewStars score={stars} />
              <blockquote>{review.quote}</blockquote>
              {/* The byline is the PARENT who wrote the review. The teacher is
                  mentioned only as context, and never on the teacher's own
                  page where it would just repeat. Making the author ambiguous
                  is how a review stops being trustworthy. */}
              <figcaption>
                <strong className="parent-review__author">{review.name}</strong>
                <small>
                  {review.verified && (
                    <span className="parent-review__verified">
                      <BadgeCheck size={12} aria-hidden="true" /> Verified parent
                    </span>
                  )}
                  {review.verified && showTeacherName && review.teacherName
                    ? ` · on a class with ${review.teacherName}`
                    : ''}
                  {!review.verified && review.source}
                  {review.date ? ` · ${new Date(review.date).toLocaleDateString('en', { month: 'long', year: 'numeric' })}` : ''}
                </small>
              </figcaption>
            </figure>
          )
        })}
      </div>

      {canScroll && (
        <div className="review-carousel__controls">
          <button
            type="button"
            className="review-carousel__arrow"
            onClick={() => step(-1)}
            disabled={index === 0}
            aria-label="Previous review"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="review-carousel__dots" role="tablist" aria-label="Choose a review">
            {reviews.map((review, position) => (
              <button
                type="button"
                key={review.id || position}
                role="tab"
                aria-selected={position === index}
                aria-label={`Review ${position + 1}`}
                className={position === index ? 'is-active' : ''}
                onClick={() => { setUserTookOver(true); goTo(position) }}
              />
            ))}
          </div>

          <button
            type="button"
            className="review-carousel__arrow"
            onClick={() => step(1)}
            disabled={index >= reviews.length - 1}
            aria-label="Next review"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
