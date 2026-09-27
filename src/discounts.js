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
