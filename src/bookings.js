import { getAccountById, repairStudentForBooking, updateTeacherProfile } from './auth.js'
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
  if (typeof window !== 'undefined') window.queueMicrotask(() => window.dispatchEvent(new Event('tutorpro:data-change')))
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
  let studentAccount = getAccountById(details.studentId)
  let learners = studentAccount?.children?.length ? studentAccount.children : studentAccount?.child ? [studentAccount.child] : []
  let learner = details.learnerId ? learners.find((item) => item.id === details.learnerId) : null
  if (!learner && details.learnerName) {
    learner = learners.find((item) => item.name?.trim().toLowerCase() === details.learnerName.trim().toLowerCase())
  }
  if (!learner && learners.length === 1) learner = learners[0]

  const needsRepair = studentAccount && (studentAccount.role !== 'student' || !learner || studentAccount.status === 'approved')
  if (needsRepair && details.learnerProfile) {
    const repaired = repairStudentForBooking(details.studentId, details.learnerProfile)
    studentAccount = repaired.account
    learner = repaired.learner
  }
  if (!studentAccount || studentAccount.role !== 'student' || studentAccount.status !== 'active' || !learner) {
    throw new Error(studentAccount?.status === 'suspended'
      ? 'This family account is suspended. Contact the administrator before booking.'
      : 'The student profile could not be verified. Log out, log in again, and retry the booking.')
  }
  if (learner.accessStatus === 'suspended') throw new Error(`${learner.name}’s student profile is suspended. Contact the TutorPro English administrator before booking.`)
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
    classroomId: `TP-${details.date.replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    classroomToken: crypto.randomUUID(),
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
  const classroomDetails = changes.status === 'confirmed' && !bookings[index].classroomId
    ? {
        classroomId: `TP-${bookings[index].date.replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        classroomToken: crypto.randomUUID(),
      }
    : {}
  bookings[index] = { ...bookings[index], ...classroomDetails, ...changes, updatedAt: new Date().toISOString() }
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

export function getBookingById(bookingId) {
  return readBookings().find((booking) => booking.id === bookingId) || null
}

export function getClassroomAccess(bookingId, account, now = new Date()) {
  let booking = getBookingById(bookingId)
  if (!booking) return { allowed: false, reason: 'Classroom booking not found.' }
  if (['confirmed', 'completed'].includes(booking.status) && (!booking.classroomId || !booking.classroomToken)) {
    booking = updateBooking(booking.id, {
      classroomId: `TP-${booking.date.replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      classroomToken: crypto.randomUUID(),
    })
  }
  if (!account) return { allowed: false, reason: 'Log in to access this classroom.', booking }
  const authorized = account.role === 'admin'
    || (account.role === 'teacher' && booking.teacherId === account.id)
    || (account.role === 'student' && booking.studentId === account.id)
  if (!authorized) return { allowed: false, reason: 'This private classroom belongs to another booking.', booking }
  if (account.role === 'student' && account.status !== 'active') return { allowed: false, reason: 'This student account is not active.', booking }
  if (account.role === 'student') {
    const classroomLearner = account.children?.find((learner) => learner.id === booking.learnerId) || account.child
    if (classroomLearner?.accessStatus === 'suspended') return { allowed: false, reason: 'This student profile is suspended and cannot enter the classroom.', booking }
  }
  if (account.role === 'teacher' && account.status !== 'approved') return { allowed: false, reason: 'This teacher account is not approved for live classes.', booking }
  if (!['confirmed', 'completed'].includes(booking.status)) {
    return { allowed: false, reason: 'The lesson must be confirmed before the classroom opens.', booking }
  }

  const startsAt = new Date(`${booking.date}T${booking.time}:00`)
  if (Number.isNaN(startsAt.getTime())) return { allowed: false, reason: 'The classroom schedule is invalid.', booking }
  const earlyMinutes = account.role === 'teacher' ? 30 : 10
  const opensAt = new Date(startsAt.getTime() - (earlyMinutes * 60 * 1000))
  const closesAt = new Date(startsAt.getTime() + ((Number(booking.duration) + 60) * 60 * 1000))
  if (account.role !== 'admin' && now < opensAt) {
    return { allowed: false, reason: `This classroom opens ${earlyMinutes} minutes before the lesson.`, booking, startsAt, opensAt, closesAt }
  }
  if (account.role !== 'admin' && now > closesAt) {
    return { allowed: false, reason: 'This classroom session has closed.', booking, startsAt, opensAt, closesAt }
  }
  return { allowed: true, booking, startsAt, opensAt, closesAt }
}

export function removeStudentBookingData(accountId, learnerId, includeLegacyPrimary = false) {
  const bookings = readBookings()
  const remaining = bookings.filter((booking) => {
    if (booking.studentId !== accountId) return true
    if (!learnerId) return false
    if (!booking.learnerId) return !includeLegacyPrimary
    return booking.learnerId !== learnerId
  })
  const removed = bookings.length - remaining.length
  if (removed) writeBookings(remaining)
  return removed
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
