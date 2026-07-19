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

export function createBookingCalendar(booking, { teacherName = '', learnerName = '' } = {}) {
  const title = `TutorPro English: ${booking.focus || 'English lesson'}`
  const details = [
    learnerName ? `Student: ${learnerName}` : '',
    teacherName ? `Teacher: ${teacherName}` : '',
    `Lesson length: ${booking.duration || 25} minutes`,
    booking.classroomId ? `Private classroom ID: ${booking.classroomId}` : '',
    booking.slotComment ? `Lesson comment: ${booking.slotComment}` : '',
    `Open TutorPro English: ${calendarOrigin}`,
  ].filter(Boolean).join('\n')
  const createdAt = new Date(booking.createdAt || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TutorPro English//Lesson Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@tutorpro.site`,
    `DTSTAMP:${createdAt}`,
    `DTSTART:${utcCalendarDate(booking.date, booking.time)}`,
    `DTEND:${endTime(booking)}`,
    `SUMMARY:${escapeCalendarText(title)}`,
    `DESCRIPTION:${escapeCalendarText(details)}`,
    `LOCATION:${escapeCalendarText('TutorPro English Private Online Classroom')}`,
    `STATUS:${['confirmed', 'ongoing', 'completed'].includes(booking.status) ? 'CONFIRMED' : booking.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:TutorPro English lesson begins in 30 minutes',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    'DESCRIPTION:TutorPro English lesson begins in 10 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

export function downloadBookingCalendar(booking, names = {}) {
  const content = createBookingCalendar(booking, names)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `TutorPro-English-${booking.date}-${booking.time.replace(':', '')}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
