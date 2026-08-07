/**
 * "My teachers" — where a parent sees who teaches their child, and rates them.
 *
 * WHY THIS EXISTS
 * ---------------
 * Rating a lesson was possible before, but only as a small "Rate class" button
 * hidden inside one row of the lesson list. A parent had to already be looking
 * at the right completed lesson to find it. There was no place to see the
 * teacher as a person — their photo, experience, or what they specialise in —
 * and no way to answer "who actually teaches my child, and what do I think of
 * them?"
 *
 * This gives each teacher a proper card: photo, credentials, how many lessons
 * they have taught this family, the parent's own past reviews, and one obvious
 * button to rate a lesson that has not been rated yet.
 *
 * HONESTY RULES BUILT IN
 * ----------------------
 *  - Only lessons that actually happened (status 'completed') can be rated,
 *    and only once each. Both are enforced again in rateCompletedBooking().
 *  - The average shown is this family's own average for that teacher, labelled
 *    as such. It is never presented as the teacher's global score.
 *  - A teacher with no completed lessons yet is shown honestly as "no lessons
 *    completed yet" rather than being hidden or padded.
 */

import { useMemo, useState } from 'react'
import {
  Award,
  BadgeCheck,
  CalendarDays,
  GraduationCap,
  Languages,
  MessageSquareText,
  Sparkles,
  Star,
} from 'lucide-react'
import { getAccountById } from './auth.js'
import { getBookings } from './bookings.js'
import { ProfilePhoto } from './ProfileMedia.jsx'

const formatMonth = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

/** Read-only row of stars. `size` keeps it usable in cards and in lists. */
function StarRow({ score = 0, size = 15, label }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(score) || 0)))
  return (
    <span className="ptr-stars" role="img" aria-label={label || `${filled} out of 5`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <Star
          key={index}
          size={size}
          fill={index < filled ? 'currentColor' : 'none'}
          className={index < filled ? 'is-filled' : 'is-empty'}
        />
      ))}
    </span>
  )
}

/**
 * Group this family's bookings by teacher.
 *
 * Everything shown is derived from real bookings — no teacher appears here
 * unless this parent has actually booked them.
 */
function useMyTeachers(studentId, version) {
  return useMemo(() => {
    // `version` is read here on purpose. getBookings() reads localStorage,
    // which React cannot observe, so the caller bumps this counter after a
    // rating is saved to force a fresh read. Without it the card would keep
    // showing the review the parent just replaced.
    void version
    const mine = getBookings({ studentId })
    const byTeacher = new Map()

    mine.forEach((booking) => {
      if (!booking.teacherId) return
      if (!byTeacher.has(booking.teacherId)) {
        byTeacher.set(booking.teacherId, { teacherId: booking.teacherId, bookings: [] })
      }
      byTeacher.get(booking.teacherId).bookings.push(booking)
    })

    return [...byTeacher.values()].map((entry) => {
      const account = getAccountById(entry.teacherId)
      const profile = account?.teacher || {}
      const completed = entry.bookings.filter((booking) => booking.status === 'completed')
      const rated = completed.filter((booking) => booking.studentRating?.score)
      const awaiting = completed
        .filter((booking) => !booking.studentRating?.score)
        .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))

      const myAverage = rated.length
        ? Math.round((rated.reduce((sum, booking) => sum + Number(booking.studentRating.score), 0) / rated.length) * 10) / 10
        : null

      return {
        teacherId: entry.teacherId,
        name: account?.fullName || entry.bookings[0]?.teacherName || 'Your teacher',
        specialization: profile.specialization || '',
        experience: Number(profile.experience || 0),
        languages: profile.languages || '',
        education: profile.education || '',
        bio: profile.bio || '',
        completedCount: completed.length,
        upcomingCount: entry.bookings.filter((booking) => ['pending', 'confirmed'].includes(booking.status)).length,
        awaiting,
        myAverage,
        myReviews: rated
          .slice()
          .sort((a, b) => String(b.studentRating.createdAt || '').localeCompare(String(a.studentRating.createdAt || ''))),
      }
    })
      // Teachers with a lesson waiting to be rated come first: that is the one
      // thing this screen is asking the parent to do.
      .sort((a, b) => (b.awaiting.length - a.awaiting.length) || (b.completedCount - a.completedCount))
  }, [studentId, version])
}

export default function ParentTeacherReviews({ account, mediaVersion = 0, version = 0, onRateBooking }) {
  const teachers = useMyTeachers(account.id, version)
  const [expanded, setExpanded] = useState('')

  const totalAwaiting = teachers.reduce((sum, teacher) => sum + teacher.awaiting.length, 0)
  const totalReviews = teachers.reduce((sum, teacher) => sum + teacher.myReviews.length, 0)

  if (!teachers.length) {
    return (
      <div className="portal-view">
        <div className="portal-page-heading">
          <div>
            <span className="portal-kicker">My teachers</span>
            <h1>Rate your teachers</h1>
            <p>After your child’s first class you can leave a review here.</p>
          </div>
        </div>
        <section className="portal-card ptr-empty">
          <span className="ptr-empty__icon"><Sparkles size={26} /></span>
          <strong>No teachers yet</strong>
          <span>Once you book a class, your teacher will appear here with their profile.</span>
        </section>
      </div>
    )
  }

  return (
    <div className="portal-view">
      <div className="portal-page-heading">
        <div>
          <span className="portal-kicker">My teachers</span>
          <h1>Rate your teachers</h1>
          <p>Your honest feedback helps your teacher improve and helps other families choose well.</p>
        </div>
      </div>

      {totalAwaiting > 0 && (
        <section className="ptr-prompt">
          <span className="ptr-prompt__icon"><Star size={20} fill="currentColor" /></span>
          <div>
            <strong>{totalAwaiting} {totalAwaiting === 1 ? 'class is' : 'classes are'} waiting for your review</strong>
            <span>It takes about thirty seconds and your teacher reads every word.</span>
          </div>
        </section>
      )}

      <div className="ptr-grid">
        {teachers.map((teacher) => {
          const isOpen = expanded === teacher.teacherId
          const nextToRate = teacher.awaiting[0]
          return (
            <article
              key={teacher.teacherId}
              className={`ptr-card${teacher.awaiting.length ? ' ptr-card--awaiting' : ''}`}
            >
              <header className="ptr-card__head">
                <div className="ptr-card__avatar">
                  <ProfilePhoto
                    accountId={teacher.teacherId}
                    name={teacher.name}
                    refreshKey={mediaVersion}
                    className="ptr-card__photo"
                  />
                  <span className="ptr-card__verified" title="Qualifications reviewed by TutorPro">
                    <BadgeCheck size={15} />
                  </span>
                </div>
                <div className="ptr-card__identity">
                  <h2>{teacher.name}</h2>
                  {teacher.specialization && <p>{teacher.specialization}</p>}
                  {teacher.myAverage !== null ? (
                    <div className="ptr-card__score">
                      <StarRow score={teacher.myAverage} label={`You rated ${teacher.myAverage} out of 5`} />
                      <strong>{teacher.myAverage.toFixed(1)}</strong>
                      {/* Deliberately "your rating", never the teacher's global score. */}
                      <small>your rating · {teacher.myReviews.length} {teacher.myReviews.length === 1 ? 'review' : 'reviews'}</small>
                    </div>
                  ) : (
                    <div className="ptr-card__score ptr-card__score--none">
                      <StarRow score={0} label="Not rated yet" />
                      <small>Not rated yet</small>
                    </div>
                  )}
                </div>
              </header>

              <dl className="ptr-card__facts">
                <div>
                  <dt><CalendarDays size={13} /> Classes together</dt>
                  <dd>{teacher.completedCount || 'None yet'}</dd>
                </div>
                {teacher.experience > 0 && (
                  <div>
                    <dt><Award size={13} /> Experience</dt>
                    <dd>{teacher.experience} {teacher.experience === 1 ? 'year' : 'years'}</dd>
                  </div>
                )}
                {teacher.languages && (
                  <div>
                    <dt><Languages size={13} /> Languages</dt>
                    <dd>{teacher.languages}</dd>
                  </div>
                )}
                {teacher.education && (
                  <div>
                    <dt><GraduationCap size={13} /> Education</dt>
                    <dd>{teacher.education}</dd>
                  </div>
                )}
              </dl>

              {nextToRate ? (
                <div className="ptr-card__cta">
                  <button
                    type="button"
                    className="ptr-rate-button"
                    onClick={() => onRateBooking(nextToRate)}
                  >
                    <Star size={16} fill="currentColor" /> Rate your class
                  </button>
                  <small>
                    {new Date(`${nextToRate.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {teacher.awaiting.length > 1 ? ` · ${teacher.awaiting.length - 1} more waiting` : ''}
                  </small>
                </div>
              ) : teacher.completedCount ? (
                <div className="ptr-card__cta ptr-card__cta--done">
                  <BadgeCheck size={16} /> All classes reviewed. Thank you.
                </div>
              ) : (
                <div className="ptr-card__cta ptr-card__cta--waiting">
                  <CalendarDays size={16} /> You can review after the first class
                </div>
              )}

              {teacher.myReviews.length > 0 && (
                <div className="ptr-card__reviews">
                  <button
                    type="button"
                    className="ptr-card__toggle"
                    onClick={() => setExpanded(isOpen ? '' : teacher.teacherId)}
                    aria-expanded={isOpen}
                  >
                    <MessageSquareText size={14} />
                    {isOpen ? 'Hide my reviews' : `See my ${teacher.myReviews.length} ${teacher.myReviews.length === 1 ? 'review' : 'reviews'}`}
                  </button>
                  {isOpen && (
                    <ul className="ptr-review-list">
                      {teacher.myReviews.map((booking) => (
                        <li key={booking.id}>
                          <StarRow score={booking.studentRating.score} size={13} />
                          {booking.studentRating.comment
                            ? <p>{booking.studentRating.comment}</p>
                            : <p className="ptr-review-list__silent">Rated without a comment.</p>}
                          <small>{formatMonth(booking.studentRating.createdAt)}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {totalReviews > 0 && (
        <p className="ptr-footnote">
          You have written {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}. Reviews of four stars
          or more that include a comment may appear on the TutorPro website, shown as your first name and
          last initial.
        </p>
      )}
    </div>
  )
}
