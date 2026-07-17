const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}

const auth = await import('../src/auth.js')
const bookings = await import('../src/bookings.js')
const payments = await import('../src/payments.js')
const schedule = await import('../src/schedule.js')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function rejects(callback, message) {
  let rejected = false
  try {
    await callback()
  } catch {
    rejected = true
  }
  assert(rejected, message)
}

auth.initializePlatform()
assert(auth.getApprovedTeachers().length === 1, 'The approved seed teacher was not created.')

await rejects(
  () => auth.registerAccount({ parentName: 'Parent', email: 'bad@example.com', password: 'short' }),
  'Weak account credentials were accepted.',
)

let family = await auth.registerAccount({
  parentName: 'Test Parent',
  email: 'family@example.com',
  authProvider: 'email',
  password: 'Family123',
  childName: 'Alex',
  year: 'Year 5',
  curriculum: 'Cambridge',
  goal: 'Speaking with confidence',
  frequency: '1–2 weekly',
})
assert(family.children.length === 1 && family.child.paymentStatus === 'unpaid', 'Student registration failed.')

family = auth.addStudentLearner(family.id, { name: 'Jamie', year: 'Year 7', curriculum: 'Oxford', goal: 'Writing and grammar', frequency: '1–2 weekly' })
family = auth.addStudentLearner(family.id, { name: 'Taylor', year: 'Year 3', curriculum: 'Cambridge', goal: 'Reading comprehension', frequency: '1–2 weekly' })
assert(family.children.length === 3, 'Multi-student family profiles failed.')
await rejects(
  () => auth.addStudentLearner(family.id, { name: 'Fourth', year: 'Year 2', curriculum: 'Oxford', goal: 'Reading comprehension' }),
  'The three-student account limit failed.',
)

const learner = family.children[0]
family = auth.updateLearnerPayment(family.id, learner.id, 'paid')
assert(family.child.paymentStatus === 'paid', 'Student payment status did not update.')

let teacher = await auth.registerTeacher({
  fullName: 'Test Teacher',
  email: 'teacher@example.com',
  authProvider: 'email',
  password: 'Teacher123',
  specialization: 'Both Curricula',
  bio: 'An experienced English teacher who supports confident and curious learners.',
  education: 'Bachelor of Education',
  experience: 5,
  languages: 'English',
  credentials: [],
})
teacher = auth.updateAccount(teacher.id, { status: 'approved' })

const future = new Date()
future.setDate(future.getDate() + 14)
future.setHours(12, 0, 0, 0)
const date = schedule.formatDateKey(future)
const time = '16:00'
const slot = schedule.makeSlotKey(schedule.weekdayIndex(future), time)
teacher = auth.updateTeacherProfile(teacher.id, { availabilitySlots: [slot] })

const booking = bookings.createBooking({
  studentId: family.id,
  learnerId: learner.id,
  teacherId: teacher.id,
  date,
  time,
  duration: 25,
  focus: 'Speaking with confidence',
})
assert(booking.status === 'pending', 'Booking creation failed.')
await rejects(
  () => bookings.createBooking({ studentId: family.id, learnerId: learner.id, teacherId: teacher.id, date, time, duration: 25, focus: 'Reading' }),
  'Overlapping bookings were accepted.',
)

bookings.updateBooking(booking.id, { status: 'confirmed' })
bookings.saveTeacherFeedback(booking.id, teacher.id, { summary: 'A focused and successful speaking lesson.', strength: 'Clear answers', nextStep: 'Longer sentences' })
bookings.rateCompletedBooking(booking.id, family.id, 5, 'Excellent class')
await rejects(() => bookings.rateCompletedBooking(booking.id, family.id, 4, 'Duplicate'), 'A duplicate lesson rating was accepted.')

const payment = payments.recordPayment({
  accountId: family.id,
  learnerId: learner.id,
  provider: 'paypal',
  transactionId: 'TEST-PAYPAL-001',
  amount: 32,
  currency: 'USD',
  plan: 'Growth pack',
  status: 'completed',
})
assert(payment.amount === 32 && payments.getPayments({ learnerId: learner.id }).length === 1, 'Payment recording failed.')
await rejects(
  () => payments.recordPayment({ accountId: family.id, learnerId: learner.id, provider: 'paypal', transactionId: '', amount: -1, plan: 'Invalid', status: 'completed' }),
  'An invalid payment was accepted.',
)

const loggedIn = await auth.loginAccount('family@example.com', 'Family123')
assert(loggedIn.id === family.id, 'Login failed.')
assert(bookings.getBookingStats().completed === 1, 'Booking statistics are incorrect.')

console.log('TutorPro English core flows: PASS')
