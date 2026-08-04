/**
 * Classroom attendance tracking.
 *
 * Records when each participant joined and left a lesson, so parents can see
 * that a class genuinely happened and for how long, and admins can spot
 * no-shows and late arrivals without relying on memory.
 *
 * Attendance is stored on the booking record (the same place the classroom
 * recap and recordings live), so it syncs through the existing Supabase
 * booking sync with no new tables or migrations.
 */

/** Punctuality bands, measured against the scheduled start time. */
const LATE_THRESHOLD_MINUTES = 5
const VERY_LATE_THRESHOLD_MINUTES = 15

/** Build an ISO timestamp for the scheduled start of a booking. */
export function scheduledStart(booking) {
  if (!booking?.date || !booking?.time) return null
  const value = new Date(`${booking.date}T${booking.time}:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

/**
 * Classify how punctual a join was.
 * Returns { id, label, tone, minutesLate }.
 */
export function punctuality(booking, joinedAt) {
  const start = scheduledStart(booking)
  if (!start || !joinedAt) return { id: 'unknown', label: 'Not recorded', tone: 'grey', minutesLate: 0 }
  const joined = new Date(joinedAt)
  if (Number.isNaN(joined.getTime())) return { id: 'unknown', label: 'Not recorded', tone: 'grey', minutesLate: 0 }

  const minutesLate = Math.round((joined.getTime() - start.getTime()) / 60000)
  if (minutesLate <= 0) return { id: 'early', label: 'On time', tone: 'green', minutesLate: 0 }
  if (minutesLate <= LATE_THRESHOLD_MINUTES) return { id: 'ontime', label: 'On time', tone: 'green', minutesLate }
  if (minutesLate <= VERY_LATE_THRESHOLD_MINUTES) return { id: 'late', label: `${minutesLate} min late`, tone: 'orange', minutesLate }
  return { id: 'very-late', label: `${minutesLate} min late`, tone: 'pink', minutesLate }
}

/**
 * Merge a join event into the existing attendance record.
 * Called when a participant enters the classroom. Never overwrites an earlier
 * join time, so a reconnect does not reset the record.
 */
export function recordJoin(attendance, role, { name = '', at = new Date().toISOString() } = {}) {
  const current = attendance && typeof attendance === 'object' ? { ...attendance } : {}
  const key = role === 'teacher' ? 'teacher' : 'student'
  const existing = current[key] || {}
  current[key] = {
    ...existing,
    name: name || existing.name || '',
    joinedAt: existing.joinedAt || at,
    // A reconnect counts as a rejoin, useful for spotting unstable connections.
    rejoinCount: existing.joinedAt ? (existing.rejoinCount || 0) + 1 : 0,
    lastSeenAt: at,
  }
  return current
}

/** Merge a leave event, computing the total time present. */
export function recordLeave(attendance, role, { at = new Date().toISOString() } = {}) {
  const current = attendance && typeof attendance === 'object' ? { ...attendance } : {}
  const key = role === 'teacher' ? 'teacher' : 'student'
  const existing = current[key]
  if (!existing?.joinedAt) return current
  const joined = new Date(existing.joinedAt).getTime()
  const left = new Date(at).getTime()
  const seconds = Number.isFinite(joined) && Number.isFinite(left) && left > joined
    ? Math.round((left - joined) / 1000)
    : existing.presentSeconds || 0
  current[key] = { ...existing, leftAt: at, lastSeenAt: at, presentSeconds: seconds }
  return current
}

/** Human duration such as "24 min" or "1h 05m". */
export function formatPresence(seconds) {
  const total = Math.max(0, Math.round(seconds || 0))
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

/**
 * Overall attendance status for a booking, for dashboards and reports.
 * Returns { id, label, tone } describing the lesson as a whole.
 */
export function attendanceSummary(booking) {
  const attendance = booking?.attendance
  const teacher = attendance?.teacher
  const student = attendance?.student

  if (!teacher?.joinedAt && !student?.joinedAt) {
    return { id: 'none', label: 'No attendance recorded', tone: 'grey', teacher: null, student: null }
  }
  if (teacher?.joinedAt && !student?.joinedAt) {
    return { id: 'student-absent', label: 'Student did not join', tone: 'pink', teacher, student: null }
  }
  if (!teacher?.joinedAt && student?.joinedAt) {
    return { id: 'teacher-absent', label: 'Teacher did not join', tone: 'pink', teacher: null, student }
  }

  const studentPunctuality = punctuality(booking, student.joinedAt)
  if (studentPunctuality.id === 'very-late' || studentPunctuality.id === 'late') {
    return { id: 'late', label: `Attended · ${studentPunctuality.label}`, tone: 'orange', teacher, student }
  }
  return { id: 'attended', label: 'Both attended', tone: 'green', teacher, student }
}
