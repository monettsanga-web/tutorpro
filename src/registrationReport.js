/**
 * The compiled registration dates of every student family, for the admin
 * dashboard.
 *
 * THE OWNER'S ASK
 * ---------------
 * "In the admin dashboard please compile the date of registration of the
 * students." Not a search box, not one date hidden inside a profile: a
 * compiled register - who registered, when, and how many arrived in each
 * month - plus a CSV so the list can leave the dashboard.
 *
 * Kept pure so scripts/test-registration-report.mjs can pin the ordering,
 * the month totals and the CSV shape without a browser.
 */

/** One row per family, oldest registration first, like a paper register. */
export function compileStudentRegistrations(students = []) {
  const rows = (Array.isArray(students) ? students : [])
    .map((account) => ({
      id: account?.id || '',
      name: account?.parentName || account?.fullName || 'Family',
      email: account?.email || account?.loginId || '',
      registeredAt: account?.createdAt || '',
    }))
    .sort((a, b) => (Date.parse(a.registeredAt) || 0) - (Date.parse(b.registeredAt) || 0))

  const months = []
  for (const row of rows) {
    const label = monthLabel(row.registeredAt)
    const existing = months.find((month) => month.label === label)
    if (existing) existing.count += 1
    else months.push({ label, count: 1 })
  }

  return {
    rows,
    months,
    total: rows.length,
    latest: rows.length ? rows[rows.length - 1].registeredAt : '',
  }
}

/** 'October 2026', or 'Unknown date' when the stamp is missing or broken. */
export function monthLabel(isoDate) {
  const parsed = Date.parse(isoDate || '')
  if (!Number.isFinite(parsed)) return 'Unknown date'
  return new Date(parsed).toLocaleDateString('en', { month: 'long', year: 'numeric' })
}

/** '16 October 2026' for the register rows; '' when the stamp is unusable. */
export function registrationDateLabel(isoDate) {
  const parsed = Date.parse(isoDate || '')
  if (!Number.isFinite(parsed)) return ''
  return new Date(parsed).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** The whole register as CSV: name, email, ISO stamp, human date. */
export function registrationsToCsv(report) {
  const escape = (value) => {
    const text = String(value ?? '')
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = ['Family,Email,Registered (ISO),Registered']
  for (const row of report?.rows || []) {
    lines.push([escape(row.name), escape(row.email), escape(row.registeredAt), escape(registrationDateLabel(row.registeredAt))].join(','))
  }
  return `${lines.join('\n')}\n`
}
