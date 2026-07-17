import { getAccountById, updateTeacherProfile } from './auth.js'
import { lessonSlotKeys, timeToMinutes } from './schedule.js'

const BOOKINGS_KEY = 'tutorpro_bookings_v1'

function readBookings() {
  try {
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]')
    return Array.isArray(bookings) ? bookings : []
  } catch {
    return []
  }
}

function writeBookings(bookings) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings))
}

export function getBookings(filters = {}) {
  return readBookings()
    .filter((booking) => !filters.studentId || booking.studentId === filters.studentId)
    .filter((booking) => !filters.teacherId || booking.teacherId === filters.teacherId)
    .filter((booking) => !filters.status || booking.status === filters.status)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
}

export function createBooking(details) {
  const bookings = readBookings()
  const teacher = getAccountById(details.teacherId)
  if (!teacher || teacher.role !== 'teacher' || teacher.status !== 'approved') {
    throw new Error('This teacher is not currently available for bookings.')
  }
  const studentAccount = getAccountById(details.studentId)
  const learner = details.learnerId
    ? studentAccount?.children?.find((item) => item.id === details.learnerId)
    : studentAccount?.child
  if (!studentAccount || studentAccount.role !== 'student' || studentAccount.status !== 'active' || !learner) {
    throw new Error('Choose an active and valid student profile before booking.')
  }
  if (learner.paymentStatus !== 'paid') throw new Error(`${learner.name} is currently unpaid. An administrator must mark the student as paid before booking.`)
  if (![25, 50].includes(Number(details.duration))) throw new Error('Choose a valid 25 or 50-minute lesson.')
  if (!details.focus?.trim()) throw new Error('Choose a lesson focus before booking.')
  const lessonDate = new Date(`${details.date}T${details.time}:00`)
  if (!details.date || !details.time || Number.isNaN(lessonDate.getTime()) || lessonDate <= new Date()) {
    throw new Error('Choose a future lesson date and time.')
  }

  const startMinutes = timeToMinutes(details.time)
  if (startMinutes % 30 !== 0 || startMinutes < 0 || startMinutes >= 1440) {
    throw new Error('Lessons must start on a 30-minute calendar slot.')
  }

  const requiredSlots = lessonSlotKeys(details.date, details.time, details.duration)
  const availableSlots = new Set(teacher.teacher?.availabilitySlots || [])
  if (!requiredSlots.every((slot) => availableSlots.has(slot))) {
    throw new Error('This time is outside the teacher’s available schedule.')
  }

  const requestedEnd = startMinutes + (Math.ceil(Number(details.duration) / 30) * 30)
  const conflict = bookings.some((booking) => {
    if (booking.date !== details.date || ['cancelled', 'declined'].includes(booking.status)) return false
    const sameTeacher = booking.teacherId === details.teacherId
    const bookedLearnerId = booking.learnerId || studentAccount.child?.id
    const sameLearner = booking.studentId === details.studentId && bookedLearnerId === learner.id
    if (!sameTeacher && !sameLearner) return false
    const bookingStart = timeToMinutes(booking.time)
    const bookingEnd = bookingStart + (Math.ceil(Number(booking.duration) / 30) * 30)
    return startMinutes < bookingEnd && requestedEnd > bookingStart
  })
  if (conflict) throw new Error('That time conflicts with an existing teacher or student lesson. Please choose another available slot.')

  const booking = {
    id: crypto.randomUUID(),
    studentId: details.studentId,
    learnerId: learner.id,
    teacherId: details.teacherId,
    date: details.date,
    time: details.time,
    duration: Number(details.duration),
    focus: details.focus,
    note: details.note?.trim() || '',
    teacherNote: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  bookings.push(booking)
  writeBookings(bookings)
  return booking
}

export function updateBooking(bookingId, changes) {
  const bookings = readBookings()
  const index = bookings.findIndex((booking) => booking.id === bookingId)
  if (index < 0) throw new Error('Booking not found.')
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'declined']
  if (changes.status && !validStatuses.includes(changes.status)) throw new Error('Invalid booking status.')
  bookings[index] = { ...bookings[index], ...changes, updatedAt: new Date().toISOString() }
  writeBookings(bookings)
  return bookings[index]
}

export function cancelBooking(bookingId) {
  return updateBooking(bookingId, { status: 'cancelled' })
}

export function rateCompletedBooking(bookingId, studentId, rating, comment = '') {
  const booking = readBookings().find((item) => item.id === bookingId)
  if (!booking || booking.studentId !== studentId) throw new Error('This lesson does not belong to the student account.')
  if (booking.status !== 'completed') throw new Error('A lesson can be rated after it is completed.')
  if (booking.studentRating) throw new Error('This lesson has already been rated.')
  const score = Number(rating)
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error('Choose a rating from one to five stars.')
  if (comment.trim().length > 500) throw new Error('Keep the rating comment under 500 characters.')

  const updated = updateBooking(bookingId, {
    studentRating: { score, comment: comment.trim(), createdAt: new Date().toISOString() },
  })
  const teacherRatings = readBookings()
    .filter((item) => item.teacherId === booking.teacherId && item.studentRating?.score)
    .map((item) => item.studentRating.score)
  if (teacherRatings.length) {
    const average = Math.round((teacherRatings.reduce((sum, value) => sum + value, 0) / teacherRatings.length) * 10) / 10
    updateTeacherProfile(booking.teacherId, { rating: average, ratingCount: teacherRatings.length })
  }
  return updated
}

export function saveTeacherFeedback(bookingId, teacherId, feedback) {
  const booking = readBookings().find((item) => item.id === bookingId)
  if (!booking || booking.teacherId !== teacherId) throw new Error('This lesson is not assigned to the teacher account.')
  if (!['confirmed', 'completed'].includes(booking.status)) throw new Error('Confirm the lesson before adding post-class feedback.')
  if (!feedback.summary?.trim()) throw new Error('Add a short class summary before saving feedback.')
  if (feedback.summary.trim().length > 1000) throw new Error('Keep the class summary under 1,000 characters.')
  return updateBooking(bookingId, {
    status: 'completed',
    teacherFeedback: {
      summary: feedback.summary.trim(),
      strength: feedback.strength?.trim() || '',
      nextStep: feedback.nextStep?.trim() || '',
      homework: feedback.homework?.trim() || '',
      createdAt: new Date().toISOString(),
    },
  })
}

export function getBookingStats() {
  const bookings = readBookings()
  return {
    total: bookings.length,
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
    cancelled: bookings.filter((booking) => ['cancelled', 'declined'].includes(booking.status)).length,
  }
}
