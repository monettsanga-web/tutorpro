import { useMemo, useState } from 'react'
import { Copy, MessageSquareText, Star, Users } from 'lucide-react'
import { getAccountById } from './auth.js'
import { getBookings } from './bookings.js'

/**
 * Admin view of every parent rating already collected by the platform.
 *
 * Parents rate completed lessons through RatingDialog (rateCompletedBooking),
 * but until now those scores and comments were only visible one booking at a
 * time. This panel gathers them so an administrator can:
 *   - see the real average rating and review count
 *   - find quotable comments to use as website testimonials
 *   - copy a ready-made review request to send to happy parents
 *
 * IMPORTANT: nothing here invents or edits a review. Every quote shown is
 * exactly what a parent wrote. Only publish quotes with the parent's consent.
 */
export default function AdminReviewsPanel() {
  const [copied, setCopied] = useState('')

  const reviews = useMemo(() => getBookings()
    .filter((booking) => booking.studentRating?.score)
    .map((booking) => {
      const student = getAccountById(booking.studentId)
      const learner = student?.children?.find((item) => item.id === booking.learnerId) || student?.child
      const teacher = getAccountById(booking.teacherId)
      return {
        id: booking.id,
        score: Number(booking.studentRating.score),
        comment: (booking.studentRating.comment || '').trim(),
        createdAt: booking.studentRating.createdAt,
        parentName: student?.parentName || 'Parent',
        parentEmail: student?.loginId || student?.email || '',
        learnerName: learner?.name || booking.learnerName || 'Student',
        country: student?.registrationCountry || '',
        teacherName: teacher?.fullName || booking.teacherName || 'Teacher',
      }
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [])

  const withComment = reviews.filter((review) => review.comment.length > 0)
  const total = reviews.length
  const average = total
    ? Math.round((reviews.reduce((sum, review) => sum + review.score, 0) / total) * 10) / 10
    : 0
  const promoters = reviews.filter((review) => review.score >= 4)

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key)
      window.setTimeout(() => setCopied(''), 2500)
    }).catch(() => {})
  }

  const reviewRequest = (review) => `Hi ${review.parentName.split(' ')[0]},

Thank you for rating ${review.learnerName}'s recent lesson ${review.score} out of 5 — that means a lot to our team.

If you have a moment, would you consider leaving a short public review? It genuinely helps other parents decide whether TutorPro is right for their child.

Trustpilot: https://www.trustpilot.com/evaluate/tutorpro.site

It only takes a minute, and you can write as little or as much as you like.

Thank you again,
TutorPro Online English`

  const bulkEmails = promoters
    .filter((review) => review.parentEmail)
    .map((review) => review.parentEmail)
    .filter((email, index, list) => list.indexOf(email) === index)
    .join(', ')

  return (
    <div className="portal-view">
      <div className="portal-page-heading">
        <div>
          <span className="portal-kicker">Reputation</span>
          <h1>Parent reviews</h1>
          <p>Every rating parents have left after a completed lesson. Use these to find real testimonials and to invite happy families to review you publicly.</p>
        </div>
      </div>

      <div className="portal-stat-grid">
        <article>
          <span className="stat-icon stat-icon--gold"><Star size={21} /></span>
          <div><small>Average rating</small><strong>{average || '—'}</strong><em>{total ? `from ${total} rating${total === 1 ? '' : 's'}` : 'No ratings yet'}</em></div>
        </article>
        <article>
          <span className="stat-icon stat-icon--pink"><MessageSquareText size={21} /></span>
          <div><small>Written comments</small><strong>{withComment.length}</strong><em>Quotable testimonials</em></div>
        </article>
        <article>
          <span className="stat-icon stat-icon--green"><Users size={21} /></span>
          <div><small>Happy parents (4★+)</small><strong>{promoters.length}</strong><em>Ask these for a public review</em></div>
        </article>
      </div>

      {total === 0 ? (
        <section className="portal-card review-empty-card">
          <h2>No parent ratings yet</h2>
          <p>Ratings appear here automatically once parents rate a completed lesson from their dashboard. To start collecting them:</p>
          <ol>
            <li>Make sure lessons are marked <strong>completed</strong> after class — parents can only rate completed lessons.</li>
            <li>Message parents after a good lesson and ask them to tap <strong>Rate class</strong> in their dashboard.</li>
            <li>Once you have 4★ and 5★ ratings here, invite those parents to review you publicly on Trustpilot.</li>
          </ol>
        </section>
      ) : (
        <>
          {promoters.length > 0 && bulkEmails && (
            <section className="portal-card review-invite-card">
              <div>
                <h2>Invite happy parents to review you publicly</h2>
                <p>{promoters.length} parent{promoters.length === 1 ? ' has' : 's have'} rated a lesson 4★ or higher. These are the families most likely to leave a positive public review.</p>
              </div>
              <button className="portal-primary-button" onClick={() => copy(bulkEmails, 'emails')}>
                <Copy size={15} /> {copied === 'emails' ? 'Emails copied' : 'Copy their email addresses'}
              </button>
            </section>
          )}

          <section className="portal-card">
            <div className="portal-card__heading portal-card__heading--small">
              <div><span className="portal-kicker">All ratings</span><h2>What parents actually wrote</h2></div>
            </div>
            <div className="review-list">
              {reviews.map((review) => (
                <article className="review-row" key={review.id}>
                  <div className="review-row__score">
                    <strong>{review.score}★</strong>
                    <small>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</small>
                  </div>
                  <div className="review-row__body">
                    <b>{review.parentName}{review.country ? ` · ${review.country}` : ''}</b>
                    <small>{review.learnerName} · with {review.teacherName}</small>
                    {review.comment
                      ? <p>“{review.comment}”</p>
                      : <p className="review-row__nocomment">No written comment — rating only.</p>}
                  </div>
                  <div className="review-row__actions">
                    {review.comment && (
                      <button type="button" onClick={() => copy(`“${review.comment}” — ${review.parentName.split(' ')[0]}${review.country ? `, ${review.country}` : ''}`, `q-${review.id}`)}>
                        <Copy size={13} /> {copied === `q-${review.id}` ? 'Copied' : 'Copy quote'}
                      </button>
                    )}
                    {review.score >= 4 && (
                      <button type="button" onClick={() => copy(reviewRequest(review), `r-${review.id}`)}>
                        <MessageSquareText size={13} /> {copied === `r-${review.id}` ? 'Copied' : 'Copy review request'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="portal-card review-guidance-card">
        <h2>Before publishing a quote on the website</h2>
        <ul>
          <li><strong>Ask permission.</strong> Message the parent and confirm they are happy for their words to appear publicly.</li>
          <li><strong>Use a first name and country only</strong> — for example “Maria, Philippines”. Never publish a full name, email or a child’s full name.</li>
          <li><strong>Do not edit the meaning.</strong> Fixing a typo is fine; rewriting a review is not.</li>
          <li><strong>Never write reviews yourself.</strong> Fabricated testimonials breach Google and Trustpilot policy and can get the site penalised.</li>
        </ul>
      </section>
    </div>
  )
}
