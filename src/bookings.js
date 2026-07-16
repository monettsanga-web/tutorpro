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
  const conflict = bookings.some((booking) => (
    booking.teacherId === details.teacherId
    && booking.date === details.date
    && booking.time === details.time
    && !['cancelled', 'declined'].includes(booking.status)
  ))
  if (conflict) throw new Error('That lesson time has just been taken. Please choose another time.')

  const booking = {
    id: crypto.randomUUID(),
    studentId: details.studentId,
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
  bookings[index] = { ...bookings[index], ...changes, updatedAt: new Date().toISOString() }
  writeBookings(bookings)
  return bookings[index]
}

export function cancelBooking(bookingId) {
  return updateBooking(bookingId, { status: 'cancelled' })
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
