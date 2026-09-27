import { formatViewerTime, timezoneDescription, toViewerTime, viewerDateKey, visitorTimeZone } from './timezone.js'

const calendarOrigin = 'https://www.tutorpro.site'

function escapeCalendarText(value = '') {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function utcCalendarDate(date, time, offset = '+08:00') {
  const value = new Date(`${date}T${time}:00${offset}`)
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function endTime(booking) {
  const start = new Date(`${booking.date}T${booking.time}:00+08:00`)
  return new Date(start.getTime() + (Number(booking.duration || 25) * 60 * 1000))
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Lesson times are stored in Manila time. The .ics event itself is written in
 * absolute UTC, so every phone and calendar app places it at the right moment
 * automatically, wherever the family is. The description additionally spells
 * out the start time in the viewer's own timezone (detected from their IP
 * address) so the reminder reads correctly at a glance.
 */
export function createBookingCalendar(booking, { teacherName = '', learnerName = '', timeZone = visitorTimeZone() } = {}) {
  const title = `TutorPro Online English: ${booking.focus || 'English lesson'}`
  const localStart = formatViewerTime(booking.time, booking.date, timeZone)
  const localDate = new Date(`${viewerDateKey(booking.date, booking.time, timeZone)}T12:00:00Z`)
  const localDay = Number.isNaN(localDate.getTime()) ? '' : localDate.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const details = [
    learnerName ? `Student: ${learnerName}` : '',
    teacherName ? `Teacher: ${teacherName}` : '',
    `Starts: ${localDay}${localDay ? ', ' : ''}${localStart} — your time, ${timezoneDescription(timeZone, booking.date)}`,
    `Manila time (our teaching base): ${booking.date} ${booking.time}`,
    `Lesson length: ${booking.duration || 25} minutes`,
    booking.classroomId ? `Private classroom ID: ${booking.classroomId}` : '',
    booking.slotComment ? `Lesson comment: ${booking.slotComment}` : '',
    `Open TutorPro Online English: ${calendarOrigin}`,
  ].filter(Boolean).join('\n')
  const createdAt = new Date(booking.createdAt || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TutorPro Online English//Lesson Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@tutorpro.site`,
    `DTSTAMP:${createdAt}`,
    `DTSTART:${utcCalendarDate(booking.date, booking.time)}`,
    `DTEND:${endTime(booking)}`,
    `SUMMARY:${escapeCalendarText(title)}`,
    `DESCRIPTION:${escapeCalendarText(details)}`,
    `LOCATION:${escapeCalendarText('TutorPro Online English Private Online Classroom')}`,
    `STATUS:${['confirmed', 'ongoing', 'completed'].includes(booking.status) ? 'CONFIRMED' : booking.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:TutorPro Online English lesson begins in 30 minutes',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    'DESCRIPTION:TutorPro Online English lesson begins in 10 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

export function downloadBookingCalendar(booking, names = {}) {
  const timeZone = names.timeZone || visitorTimeZone()
  const content = createBookingCalendar(booking, { ...names, timeZone })
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  // Name the file with the family's own date and time, not Manila's.
  const localDay = viewerDateKey(booking.date, booking.time, timeZone)
  const localTime = toViewerTime(booking.time, booking.date, timeZone).time
  link.download = `TutorPro-English-${localDay}-${String(localTime).replace(':', '')}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
