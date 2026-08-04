/**
 * Funnel analytics — where families drop off between arriving and paying.
 *
 * Everything here is derived from data the platform ALREADY records:
 * accounts, bookings (with isTrialClass / trialEnrolled / status) and payment
 * transactions. Nothing new is collected about anyone, and no third-party
 * tracker is involved.
 *
 * The five stages:
 *   1. Registered      — created a family account
 *   2. Trial booked    — reserved their free first class
 *   3. Trial attended  — the free class actually happened
 *   4. Paid            — a verified payment exists
 *   5. Retained        — completed 3+ paid lessons (they stayed)
 */

import { accountChannel } from './attribution.js'

export const FUNNEL_STAGES = [
  { id: 'registered', label: 'Registered', hint: 'Created a family account' },
  { id: 'trialBooked', label: 'Trial booked', hint: 'Reserved their free first class' },
  { id: 'trialAttended', label: 'Trial attended', hint: 'The free class actually happened' },
  { id: 'paid', label: 'Paid', hint: 'A verified payment was recorded' },
  { id: 'retained', label: 'Retained', hint: 'Completed 3 or more paid lessons' },
]

const RETENTION_LESSON_THRESHOLD = 3

function paymentsFor(account) {
  if (Array.isArray(account?.paymentTransactions) && account.paymentTransactions.length) return account.paymentTransactions
  return account?.latestPayment ? [account.latestPayment] : []
}

function paymentTotal(account) {
  return paymentsFor(account).reduce((sum, transaction) => sum + (Number(transaction?.amount) || 0), 0)
}

/**
 * Work out which stages one family has reached.
 * Stages are cumulative: reaching "paid" implies every earlier stage, even if
 * a record is missing (an admin may have taken payment before a trial).
 */
export function familyJourney(account, bookings = []) {
  const own = bookings.filter((booking) => booking.studentId === account.id)
  const trials = own.filter((booking) => booking.isTrialClass)
  const paidLessons = own.filter((booking) => !booking.isTrialClass && booking.status === 'completed')
  const payments = paymentsFor(account)
  const revenue = paymentTotal(account)

  const stages = {
    registered: true,
    trialBooked: trials.length > 0,
    trialAttended: trials.some((booking) => booking.status === 'completed'),
    paid: payments.length > 0 || revenue > 0 || trials.some((booking) => booking.trialEnrolled),
    retained: paidLessons.length >= RETENTION_LESSON_THRESHOLD,
  }

  // Make the funnel monotonic so percentages can never exceed 100%.
  if (stages.retained) stages.paid = true
  if (stages.paid) stages.trialAttended = stages.trialAttended || trials.length > 0
  if (stages.trialAttended) stages.trialBooked = true

  const trialNoShow = trials.some((booking) => booking.status === 'absent')
  const awaitingTrial = trials.some((booking) => ['pending', 'confirmed'].includes(booking.status))

  return {
    account,
    stages,
    channel: accountChannel(account),
    country: account.registrationCountry || '',
    createdAt: account.createdAt || '',
    trialCount: trials.length,
    paidLessonCount: paidLessons.length,
    revenue,
    trialNoShow,
    awaitingTrial,
    // Families who tried and never paid are the single most valuable list
    // in the whole dashboard: they already met a teacher.
    stalledAfterTrial: stages.trialAttended && !stages.paid,
  }
}

function pct(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 1000) / 10
}

/**
 * Build the whole funnel from accounts + bookings.
 * `sinceDays` limits it to recent registrations (null = all time).
 */
export function buildFunnel({ accounts = [], bookings = [], sinceDays = null } = {}) {
  const families = accounts.filter((account) => {
    const role = String(account.role || 'student').toLowerCase()
    return role === 'student' || role === 'parent'
  })

  const cutoff = sinceDays ? Date.now() - sinceDays * 86400000 : null
  const inWindow = families.filter((account) => {
    if (!cutoff) return true
    const created = new Date(account.createdAt || 0).getTime()
    return Number.isFinite(created) && created >= cutoff
  })

  const journeys = inWindow.map((account) => familyJourney(account, bookings))

  const counts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: journeys.filter((journey) => journey.stages[stage.id]).length,
  }))

  const top = counts[0]?.count || 0
  const steps = counts.map((stage, index) => {
    const previous = index === 0 ? stage.count : counts[index - 1].count
    return {
      ...stage,
      // Share of everyone who entered the funnel.
      shareOfTotal: pct(stage.count, top),
      // Share of the people who reached the PREVIOUS stage — this is the
      // number that tells you where the leak is.
      conversionFromPrevious: index === 0 ? 100 : pct(stage.count, previous),
      droppedHere: Math.max(0, previous - stage.count),
    }
  })

  // The worst step, ignoring the entry stage.
  const leak = steps.slice(1).reduce((worst, step) => (
    !worst || step.conversionFromPrevious < worst.conversionFromPrevious ? step : worst
  ), null)

  const revenue = journeys.reduce((sum, journey) => sum + journey.revenue, 0)
  const payingFamilies = journeys.filter((journey) => journey.stages.paid).length

  return {
    steps,
    journeys,
    leak,
    totals: {
      families: journeys.length,
      payingFamilies,
      revenue,
      revenuePerFamily: journeys.length ? Math.round((revenue / journeys.length) * 100) / 100 : 0,
      revenuePerPayingFamily: payingFamilies ? Math.round((revenue / payingFamilies) * 100) / 100 : 0,
      trialToPaid: pct(payingFamilies, journeys.filter((journey) => journey.stages.trialAttended).length),
    },
  }
}

/** Break the funnel down by acquisition channel, best performer first. */
export function funnelByChannel(journeys = []) {
  const groups = new Map()
  journeys.forEach((journey) => {
    const key = journey.channel || 'direct'
    if (!groups.has(key)) {
      groups.set(key, { channel: key, families: 0, trials: 0, paid: 0, retained: 0, revenue: 0 })
    }
    const group = groups.get(key)
    group.families += 1
    if (journey.stages.trialAttended) group.trials += 1
    if (journey.stages.paid) group.paid += 1
    if (journey.stages.retained) group.retained += 1
    group.revenue += journey.revenue
  })
  return [...groups.values()]
    .map((group) => ({
      ...group,
      conversion: pct(group.paid, group.families),
      revenuePerFamily: group.families ? Math.round((group.revenue / group.families) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.paid - a.paid || b.families - a.families)
}

/**
 * Families worth contacting today, most valuable first.
 * These are warm leads the platform can identify but currently never surfaces.
 */
export function actionableFamilies(journeys = []) {
  const stalled = journeys.filter((journey) => journey.stalledAfterTrial)
  const noShows = journeys.filter((journey) => journey.trialNoShow && !journey.stages.paid)
  const neverBooked = journeys.filter((journey) => !journey.stages.trialBooked)
  const bookedNotYetTaught = journeys.filter((journey) => journey.awaitingTrial && !journey.stages.trialAttended)

  return {
    stalled,          // Met a teacher, never paid — highest intent
    noShows,          // Booked a trial and did not attend
    neverBooked,      // Registered but never even booked
    bookedNotYetTaught, // Trial upcoming — remind them so they show up
  }
}

/** New families per week for the last N weeks, for a simple trend bar chart. */
export function registrationTrend(journeys = [], weeks = 8) {
  const buckets = []
  const now = new Date()
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const end = new Date(now.getTime() - index * 7 * 86400000)
    const start = new Date(end.getTime() - 7 * 86400000)
    buckets.push({
      label: end.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
      start,
      end,
      families: 0,
      paid: 0,
    })
  }
  journeys.forEach((journey) => {
    const created = new Date(journey.createdAt || 0).getTime()
    if (!Number.isFinite(created)) return
    const bucket = buckets.find((entry) => created >= entry.start.getTime() && created < entry.end.getTime())
    if (!bucket) return
    bucket.families += 1
    if (journey.stages.paid) bucket.paid += 1
  })
  return buckets
}
