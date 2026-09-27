/**
 * Per-student discounts, set by an administrator.
 *
 * WHY THIS FILE HAS NO IMPORTS
 * ----------------------------
 * It is loaded by BOTH the browser (to show a parent their price) and the
 * Vercel serverless function (to decide what the card is actually charged).
 * Those two numbers must be produced by the same code, or a parent sees one
 * figure and is billed another — the single most damaging bug this codebase
 * could ship. Keeping the file dependency-free is what lets both sides share
 * it. scripts/test-discounts.mjs asserts they agree.
 *
 * WHERE THE DISCOUNT LIVES
 * ------------------------
 * On the student's own Supabase profile, under `profile_data.discount`. The
 * server reads it from there at checkout — never from the request body, which
 * a parent could edit. The browser copy is only for display.
 *
 *   discount: {
 *     percent: 20,                          // 1-90
 *     reason: 'Sibling of an existing family',
 *     expiresAt: '2026-12-31T00:00:00.000Z' // optional, '' means no expiry
 *     grantedAt, grantedBy                  // for the audit trail
 *   }
 */

/**
 * The most an administrator may take off.
 *
 * Not 100, for a concrete reason: PayPal rejects an order of $0.00, so a
 * full discount would produce a checkout that simply fails with a confusing
 * error. Free lessons already have a proper route — Admin → Payments → add
 * credits manually — which records why and does not involve a card at all.
 */
export const MAX_DISCOUNT_PERCENT = 90

/** Clamp anything to a whole percentage the rest of the system can trust. */
export function normalizeDiscountPercent(value) {
  const numeric = Math.round(Number(value))
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return Math.min(numeric, MAX_DISCOUNT_PERCENT)
}

/**
 * Has this discount passed its end date?
 *
 * An absent or empty expiry means it never expires. An UNPARSEABLE expiry is
 * treated as expired: a corrupted date should fail closed and charge the
 * normal price, rather than silently granting money off forever.
 */
export function isDiscountExpired(discount, now = Date.now()) {
  const raw = discount?.expiresAt
  if (!raw) return false
  const at = Date.parse(raw)
  if (!Number.isFinite(at)) return true
  return at <= now
}

/** The whole discount record, normalised, or null when none applies. */
export function activeDiscount(profileData, now = Date.now()) {
  const discount = profileData?.discount
  if (!discount || typeof discount !== 'object') return null
  const percent = normalizeDiscountPercent(discount.percent)
  if (!percent) return null
  if (isDiscountExpired(discount, now)) return null
  return {
    percent,
    reason: String(discount.reason || '').slice(0, 120),
    expiresAt: discount.expiresAt || '',
    grantedAt: discount.grantedAt || '',
    grantedBy: discount.grantedBy || '',
  }
}

/** Just the percentage, 0 when nothing applies. */
export function activeDiscountPercent(profileData, now = Date.now()) {
  return activeDiscount(profileData, now)?.percent || 0
}

/**
 * Apply a percentage to an amount, rounded to whole cents.
 *
 * Both sides must round identically or the capture check rejects the payment,
 * so the rounding is pinned here rather than left to each caller.
 */
export function applyDiscount(amount, percent) {
  const base = Number(amount)
  if (!Number.isFinite(base) || base <= 0) return 0
  const pct = normalizeDiscountPercent(percent)
  if (!pct) return Math.round(base * 100) / 100
  return Math.round(base * (100 - pct)) / 100
}

/** How much money comes off, for showing a parent what they saved. */
export function discountSaving(amount, percent) {
  const base = Number(amount)
  if (!Number.isFinite(base) || base <= 0) return 0
  return Math.round((base - applyDiscount(base, percent)) * 100) / 100
}

/**
 * Validate what an administrator typed, before it is saved.
 * Returns { valid, percent, error } so the form can explain itself.
 */
export function validateDiscountInput({ percent, expiresAt } = {}) {
  const raw = Number(percent)
  if (!Number.isFinite(raw) || Number.isNaN(raw)) {
    return { valid: false, percent: 0, error: 'Enter a discount between 1 and 90.' }
  }
  if (raw <= 0) {
    return { valid: false, percent: 0, error: 'A discount must be at least 1%. To remove one, use Remove discount.' }
  }
  if (raw > MAX_DISCOUNT_PERCENT) {
    return {
      valid: false,
      percent: 0,
      error: `The most you can take off is ${MAX_DISCOUNT_PERCENT}%. PayPal rejects a $0.00 payment, so for a free lesson add credits manually instead.`,
    }
  }
  if (expiresAt) {
    const at = Date.parse(expiresAt)
    if (!Number.isFinite(at)) return { valid: false, percent: 0, error: 'That end date could not be read.' }
    if (at <= Date.now()) return { valid: false, percent: 0, error: 'That end date is already in the past.' }
  }
  return { valid: true, percent: normalizeDiscountPercent(raw), error: '' }
}

/** One line describing a discount, for the admin list and the audit trail. */
export function describeDiscount(discount) {
  const active = activeDiscount({ discount })
  if (!active) {
    const percent = normalizeDiscountPercent(discount?.percent)
    if (percent && isDiscountExpired(discount)) return `${percent}% — expired`
    return 'No discount'
  }
  const parts = [`${active.percent}% off`]
  if (active.reason) parts.push(active.reason)
  if (active.expiresAt) {
    const at = Date.parse(active.expiresAt)
    if (Number.isFinite(at)) parts.push(`until ${new Date(at).toISOString().slice(0, 10)}`)
  }
  return parts.join(' · ')
}

/* ==================================================================
 * Per-student pricing set by an administrator
 * ==================================================================
 *
 * The percentage discount above takes a slice off the standard price. This
 * section lets an administrator instead name the exact price a particular
 * family pays per lesson, which is what you want for a long-standing
 * customer, a staff child, or a family on a negotiated rate.
 *
 * ONE AUTHORITY, THREE MODES
 * --------------------------
 * Two independent systems both altering the price would eventually disagree,
 * and the disagreement would show up as a parent being charged something
 * other than what they were quoted. So there is a single `pricing.mode`:
 *
 *   'standard'  the published $8 / $7
 *   'percent'   a percentage off the published price
 *   'fixed'     an explicit price per lesson, replacing the published rate
 *
 * `fixed` and `percent` are deliberately exclusive. Stacking a percentage on
 * top of an already-negotiated rate is the kind of thing that looks harmless
 * and then produces a $2 lesson nobody intended.
 *
 * Legacy `discount: { percent }` records written before this existed are
 * still honoured, so nothing set earlier silently reverts to full price.
 */

/** Sensible per-lesson prices for the admin to pick from, in USD. */
export const RATE_PRESETS = [8, 7, 6, 5, 4, 3]

/** Hard bounds. A $0 lesson cannot be charged; PayPal rejects it. */
export const MIN_SESSION_RATE = 1
export const MAX_SESSION_RATE = 100

export const PRICING_MODES = ['standard', 'percent', 'fixed']

/** Clamp a typed rate to something chargeable, or 0 when unusable. */
export function normalizeRate(value) {
  const numeric = Math.round(Number(value) * 100) / 100
  if (!Number.isFinite(numeric) || numeric < MIN_SESSION_RATE) return 0
  return Math.min(numeric, MAX_SESSION_RATE)
}

/**
 * The pricing arrangement on a student's profile, or null for standard.
 *
 * Falls back to the older `discount` field so arrangements made before fixed
 * rates existed keep working. Anything malformed or expired returns null,
 * which means the family pays the published price — failing closed.
 */
export function studentPricing(profileData, now = Date.now()) {
  const pricing = profileData?.pricing
  if (pricing && typeof pricing === 'object' && PRICING_MODES.includes(pricing.mode)) {
    if (pricing.mode === 'standard') return null
    if (isDiscountExpired(pricing, now)) return null

    if (pricing.mode === 'fixed') {
      const standard = normalizeRate(pricing.standardRate)
      const pkg = normalizeRate(pricing.packageRate) || standard
      // A fixed arrangement with no usable rate is meaningless, so it is
      // ignored rather than charging an accidental $0.
      if (!standard) return null
      return {
        mode: 'fixed',
        standardRate: standard,
        packageRate: pkg,
        percent: 0,
        reason: String(pricing.reason || '').slice(0, 120),
        expiresAt: pricing.expiresAt || '',
      }
    }

    const percent = normalizeDiscountPercent(pricing.percent)
    if (!percent) return null
    return {
      mode: 'percent',
      percent,
      reason: String(pricing.reason || '').slice(0, 120),
      expiresAt: pricing.expiresAt || '',
    }
  }

  // Legacy: a plain percentage discount written before modes existed.
  const legacy = activeDiscount(profileData, now)
  if (legacy) return { mode: 'percent', percent: legacy.percent, reason: legacy.reason, expiresAt: legacy.expiresAt }
  return null
}

/**
 * What this family actually pays.
 *
 * `base` carries the published figures so this file stays free of imports
 * and can be shared byte-for-byte between the browser and the server:
 *   { standard, package, packageMin, credits, fullTotal }
 *
 * Returns the per-lesson rate, the payable total, and how it was reached, so
 * the checkout can explain itself rather than just showing a mystery number.
 */
export function resolveStudentPrice(profileData, base, now = Date.now()) {
  const credits = Math.max(0, Math.round(Number(base?.credits) || 0))
  const fullTotal = Math.round((Number(base?.fullTotal) || 0) * 100) / 100
  const sessions = Number(base?.sessions) || 0
  const packageMin = Number(base?.packageMin) || 4
  const standardRate = Number(base?.standard) || 0
  const plan = studentPricing(profileData, now)

  const asResult = (rate, total, mode, extra = {}) => ({
    mode,
    rate: Math.round(rate * 100) / 100,
    total: Math.round(total * 100) / 100,
    fullTotal,
    saving: Math.round((fullTotal - total) * 100) / 100,
    ...extra,
  })

  if (!plan) {
    const rate = credits ? fullTotal / credits : standardRate
    return asResult(rate, fullTotal, 'standard', { percent: 0, reason: '' })
  }

  if (plan.mode === 'fixed') {
    const rate = sessions >= packageMin ? plan.packageRate : plan.standardRate
    return asResult(rate, rate * credits, 'fixed', { percent: 0, reason: plan.reason })
  }

  const total = applyDiscount(fullTotal, plan.percent)
  const rate = credits ? Math.round((total / credits) * 100) / 100 : 0
  return asResult(rate, total, 'percent', { percent: plan.percent, reason: plan.reason })
}

/** Validate what an administrator typed on the fixed-rate form. */
export function validateRateInput({ standardRate, packageRate, expiresAt } = {}) {
  const standard = normalizeRate(standardRate)
  if (!standard) {
    return { valid: false, error: `Enter a price per lesson between $${MIN_SESSION_RATE} and $${MAX_SESSION_RATE}.` }
  }
  const pkg = packageRate === '' || packageRate === undefined || packageRate === null
    ? standard
    : normalizeRate(packageRate)
  if (!pkg) {
    return { valid: false, error: `The package price must be between $${MIN_SESSION_RATE} and $${MAX_SESSION_RATE}.` }
  }
  if (pkg > standard) {
    return {
      valid: false,
      error: 'The package price is higher than the single-lesson price, so booking more lessons would cost more each. Check the two figures.',
    }
  }
  if (expiresAt) {
    const at = Date.parse(expiresAt)
    if (!Number.isFinite(at)) return { valid: false, error: 'That end date could not be read.' }
    if (at <= Date.now()) return { valid: false, error: 'That end date is already in the past.' }
  }
  return { valid: true, standardRate: standard, packageRate: pkg, error: '' }
}

/** One line describing an arrangement, for the admin list. */
export function describeStudentPricing(profileData) {
  const plan = studentPricing(profileData)
  if (!plan) return 'Standard pricing'
  const parts = []
  if (plan.mode === 'fixed') {
    parts.push(plan.packageRate !== plan.standardRate
      ? `$${plan.standardRate} per lesson, $${plan.packageRate} on 4+ a week`
      : `$${plan.standardRate} per lesson`)
  } else {
    parts.push(`${plan.percent}% off`)
  }
  if (plan.reason) parts.push(plan.reason)
  if (plan.expiresAt) {
    const at = Date.parse(plan.expiresAt)
    if (Number.isFinite(at)) parts.push(`until ${new Date(at).toISOString().slice(0, 10)}`)
  }
  return parts.join(' · ')
}
