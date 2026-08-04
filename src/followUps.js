/**
 * Follow-up engine — the messages that turn a free trial into a paying family.
 *
 * Works out, from bookings and account records the platform already has, which
 * families are due a message right now and what that message should say.
 *
 * Design decisions:
 *  - Every send is recorded so nobody is ever messaged twice for the same
 *    reason. Being pestered is worse than being forgotten.
 *  - Nothing sends silently in the background. The admin sees the queue and
 *    approves it, so you always know what went out in your name.
 *  - Copy is warm and specific, never pushy. These are parents, not leads.
 */

import { getBookings } from './bookings.js'
import { getAccounts } from './auth.js'

const SENT_LOG_KEY = 'tutorpro_followups_sent_v1'
const SNOOZE_KEY = 'tutorpro_followups_snoozed_v1'

const HOUR = 3600000
const DAY = 24 * HOUR

/**
 * The follow-up types, in priority order. `when` decides whether a family
 * qualifies right now; `build` writes the actual message.
 */
export const FOLLOW_UP_TYPES = [
  {
    id: 'trial-reminder',
    label: 'Trial reminder',
    tone: 'urgent',
    blurb: 'Sent the day before a free class so the family actually turns up.',
    // Only within 48h of the lesson, and not in the past.
    when: ({ nextTrial, now }) => {
      if (!nextTrial || !nextTrial.startsAt) return false
      const until = nextTrial.startsAt - now
      return until > 0 && until <= 2 * DAY && ['pending', 'confirmed'].includes(nextTrial.status)
    },
    build: ({ parentName, learnerName, nextTrial }) => ({
      subject: `${learnerName}'s free English class is coming up`,
      body: `Hi ${parentName},

Just a quick reminder that ${learnerName}'s free class with TutorPro is on ${nextTrial.label}.

A few things that help it go smoothly:
• Join a couple of minutes early so we can check the camera and microphone
• Somewhere quiet with headphones if possible
• Nothing to prepare — the teacher takes care of everything

You can join straight from your dashboard at tutorpro.site. If the time no longer works, just reply and we will happily move it.

See you soon,
TutorPro Online English`,
    }),
  },
  {
    id: 'post-trial',
    label: 'After the free class',
    tone: 'hot',
    blurb: 'Sent 1–7 days after an attended free class where the family has not paid yet.',
    when: ({ lastAttendedTrial, hasPaid, now }) => {
      if (hasPaid || !lastAttendedTrial?.endedAt) return false
      const since = now - lastAttendedTrial.endedAt
      return since >= 12 * HOUR && since <= 7 * DAY
    },
    build: ({ parentName, learnerName, teacherName }) => ({
      subject: `How did ${learnerName} find the class?`,
      body: `Hi ${parentName},

Thank you for joining us for ${learnerName}'s first class${teacherName ? ` with ${teacherName}` : ''}. We hope it was a good experience.

If you would like to carry on, lessons are $10 each weekly, or $8 each on a monthly plan. There is no registration fee, no materials fee, and no lock-in contract — you can stop whenever you like.

• 12-hour cancellation returns the credit in full
• 14-day refund on any unused credits
• Same teacher every week if you want continuity

You can book the next class from your dashboard at tutorpro.site.

If it was not the right fit, that is completely fine too — I would genuinely appreciate knowing why, so we can do better.

Warm regards,
TutorPro Online English`,
    }),
  },
  {
    id: 'trial-no-show',
    label: 'Missed the free class',
    tone: 'warm',
    blurb: 'Sent after a booked free class the family did not attend.',
    when: ({ missedTrial, hasPaid, now }) => {
      if (hasPaid || !missedTrial?.endedAt) return false
      const since = now - missedTrial.endedAt
      return since >= 6 * HOUR && since <= 21 * DAY
    },
    build: ({ parentName, learnerName }) => ({
      subject: `Shall we find another time for ${learnerName}?`,
      body: `Hi ${parentName},

We missed you at ${learnerName}'s free class — no problem at all, these things happen.

The free class is still available whenever you are ready, and it takes about a minute to pick a new time from your dashboard at tutorpro.site.

If the timing is the difficult part, let me know roughly when suits you and we will find a teacher who fits around your week.

Warm regards,
TutorPro Online English`,
    }),
  },
  {
    id: 'never-booked',
    label: 'Registered, never booked',
    tone: 'cool',
    blurb: 'Sent 2–30 days after registering when no class was ever booked.',
    when: ({ trials, allBookings, createdAt, now }) => {
      if (trials.length || allBookings.length || !createdAt) return false
      const since = now - createdAt
      return since >= 2 * DAY && since <= 30 * DAY
    },
    build: ({ parentName, learnerName }) => ({
      subject: `${learnerName}'s free class is still waiting`,
      body: `Hi ${parentName},

You registered with TutorPro but have not booked ${learnerName}'s free class yet — I wanted to check whether anything was getting in the way.

The most common reason is the timetable looking confusing across time zones. Your dashboard now shows every available slot in your own local time, so what you see is what you get.

The first class is genuinely free, with no card required. It is 25 minutes, one-to-one, and the teacher will tell you honestly where ${learnerName} is at.

Book any time at tutorpro.site — or just reply and tell me which days suit you, and I will arrange it for you.

Warm regards,
TutorPro Online English`,
    }),
  },
  {
    id: 'win-back',
    label: 'Win back a quiet family',
    tone: 'cool',
    blurb: 'Sent to paying families with no lesson in the last 30 days.',
    when: ({ hasPaid, lastLessonAt, now }) => {
      if (!hasPaid || !lastLessonAt) return false
      const since = now - lastLessonAt
      return since >= 30 * DAY && since <= 120 * DAY
    },
    build: ({ parentName, learnerName }) => ({
      subject: `We have missed ${learnerName}`,
      body: `Hi ${parentName},

It has been a little while since ${learnerName}'s last class and I wanted to check in.

If life simply got busy, everything is exactly where you left it — same teacher, same progress notes, same materials. You can pick a time from your dashboard at tutorpro.site whenever you are ready.

If something was not working, I would really like to hear about it. Just reply to this message and it comes straight to us.

Warm regards,
TutorPro Online English`,
    }),
  },
]

/* ------------------------------------------------------------------ */
/* Send log — so nobody is ever messaged twice for the same reason      */
/* ------------------------------------------------------------------ */

function readLog(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

function writeLog(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Non-critical. */ }
}

function logKey(accountId, typeId) {
  return `${accountId}::${typeId}`
}

/** Record that a follow-up was sent, so it is never queued again. */
export function markFollowUpSent(accountId, typeId, meta = {}) {
  const log = readLog(SENT_LOG_KEY)
  log[logKey(accountId, typeId)] = { sentAt: new Date().toISOString(), ...meta }
  writeLog(SENT_LOG_KEY, log)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutorpro:data-change'))
}

export function followUpSentAt(accountId, typeId) {
  return readLog(SENT_LOG_KEY)[logKey(accountId, typeId)]?.sentAt || ''
}

/** Hide a suggestion without sending it. */
export function snoozeFollowUp(accountId, typeId) {
  const log = readLog(SNOOZE_KEY)
  log[logKey(accountId, typeId)] = new Date().toISOString()
  writeLog(SNOOZE_KEY, log)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutorpro:data-change'))
}

function isSnoozed(accountId, typeId) {
  return Boolean(readLog(SNOOZE_KEY)[logKey(accountId, typeId)])
}

export function followUpHistory() {
  return Object.entries(readLog(SENT_LOG_KEY))
    .map(([key, value]) => {
      const [accountId, typeId] = key.split('::')
      return { accountId, typeId, ...value }
    })
    .sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0))
}

/* ------------------------------------------------------------------ */
/* Building the queue                                                   */
/* ------------------------------------------------------------------ */

function bookingStart(booking) {
  if (!booking?.date) return 0
  const time = booking.time || '00:00'
  const parsed = new Date(`${booking.date}T${time}:00+08:00`).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function bookingEnd(booking) {
  const start = bookingStart(booking)
  return start ? start + (Number(booking.duration) || 25) * 60000 : 0
}

function friendlyWhen(booking) {
  const start = bookingStart(booking)
  if (!start) return 'the scheduled time'
  return new Date(start).toLocaleString('en', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  })
}

function firstName(value) {
  const name = String(value || '').trim()
  if (!name) return 'there'
  return name.split(/\s+/)[0]
}

/** Everything a message template needs about one family. */
function familyContext(account, bookings, now) {
  const own = bookings.filter((booking) => booking.studentId === account.id)
  const trials = own.filter((booking) => booking.isTrialClass)
  const paidLessons = own.filter((booking) => !booking.isTrialClass)

  const attendedTrials = trials
    .filter((booking) => booking.status === 'completed')
    .sort((a, b) => bookingEnd(b) - bookingEnd(a))
  const missedTrials = trials
    .filter((booking) => booking.status === 'absent')
    .sort((a, b) => bookingEnd(b) - bookingEnd(a))
  const upcomingTrials = trials
    .filter((booking) => ['pending', 'confirmed'].includes(booking.status) && bookingStart(booking) > now)
    .sort((a, b) => bookingStart(a) - bookingStart(b))

  const payments = Array.isArray(account.paymentTransactions) ? account.paymentTransactions : []
  const hasPaid = payments.length > 0
    || Number(account.latestPayment?.amount) > 0
    || trials.some((booking) => booking.trialEnrolled)
    || paidLessons.some((booking) => booking.status === 'completed')

  const completedLessons = own
    .filter((booking) => booking.status === 'completed')
    .sort((a, b) => bookingEnd(b) - bookingEnd(a))

  const learner = account.children?.[0] || account.child || null
  const nextTrial = upcomingTrials[0]

  return {
    account,
    now,
    createdAt: account.createdAt ? new Date(account.createdAt).getTime() : 0,
    parentName: firstName(account.parentName || account.fullName),
    learnerName: learner?.name || 'your child',
    teacherName: attendedTrials[0]?.teacherName || '',
    email: account.email || account.loginId || '',
    trials,
    allBookings: paidLessons,
    hasPaid,
    lastLessonAt: completedLessons[0] ? bookingEnd(completedLessons[0]) : 0,
    lastAttendedTrial: attendedTrials[0] ? { ...attendedTrials[0], endedAt: bookingEnd(attendedTrials[0]) } : null,
    missedTrial: missedTrials[0] ? { ...missedTrials[0], endedAt: bookingEnd(missedTrials[0]) } : null,
    nextTrial: nextTrial
      ? { ...nextTrial, startsAt: bookingStart(nextTrial), label: friendlyWhen(nextTrial) }
      : null,
  }
}

/**
 * Everyone due a follow-up right now.
 * At most ONE suggestion per family — the highest-priority one — so a single
 * parent never receives three emails on the same morning.
 */
export function buildFollowUpQueue({ accounts, bookings, now = Date.now() } = {}) {
  const allAccounts = accounts || getAccounts()
  const allBookings = bookings || getBookings()

  const families = allAccounts.filter((account) => {
    const role = String(account.role || 'student').toLowerCase()
    return (role === 'student' || role === 'parent') && account.status !== 'removed'
  })

  const queue = []
  families.forEach((account) => {
    const context = familyContext(account, allBookings, now)
    const match = FOLLOW_UP_TYPES.find((type) => {
      if (followUpSentAt(account.id, type.id)) return false
      if (isSnoozed(account.id, type.id)) return false
      try { return type.when(context) } catch { return false }
    })
    if (!match) return
    const message = match.build(context)
    queue.push({
      id: `${account.id}::${match.id}`,
      accountId: account.id,
      type: match,
      account,
      email: context.email,
      parentName: context.parentName,
      learnerName: context.learnerName,
      subject: message.subject,
      body: message.body,
    })
  })

  const order = FOLLOW_UP_TYPES.map((type) => type.id)
  return queue.sort((a, b) => order.indexOf(a.type.id) - order.indexOf(b.type.id))
}

/** Counts per type, for the dashboard summary row. */
export function followUpSummary(queue = []) {
  return FOLLOW_UP_TYPES.map((type) => ({
    ...type,
    count: queue.filter((item) => item.type.id === type.id).length,
  }))
}
