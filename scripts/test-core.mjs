import { readFile, readdir } from 'node:fs/promises'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}

const auth = await import('../src/auth.js')
const bookings = await import('../src/bookings.js')
const schedule = await import('../src/schedule.js')
const translation = await import('../src/chatTranslation.js')
const calendar = await import('../src/bookingCalendar.js')

storage.set('tutorpro_accounts_v2', JSON.stringify([{
  id: 'legacy-family',
  role: 'parent',
  status: 'approved',
  parentName: 'Legacy Parent',
  email: 'legacy@example.com',
  child: { name: 'Legacy Learner', year: 'Year 4', curriculum: 'Cambridge', goal: 'Reading' },
}, {
  id: 'teacher-monett', role: 'teacher', status: 'approved', systemProfile: true, fullName: 'Monett Sanga', teacher: { availabilitySlots: [] },
}]))

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

const recordedInterviewSql = await readFile(new URL('../supabase/teacher_interview_recordings.sql', import.meta.url), 'utf8')
assert(recordedInterviewSql.includes("'teacher-interview-recordings'") && recordedInterviewSql.includes('Admins read private interview recordings') && recordedInterviewSql.includes('complete_teacher_interview_session'), 'Private recorded-interview storage and administrator access SQL is incomplete.')
const bookingSyncSql = await readFile(new URL('../supabase/bookings_sync.sql', import.meta.url), 'utf8')
assert(bookingSyncSql.includes('public.classroom_signals') && bookingSyncSql.includes('Classroom participants send signals') && bookingSyncSql.includes('prune_expired_classroom_signals') && bookingSyncSql.includes("'ongoing'") && bookingSyncSql.includes("'absent'"), 'Durable classroom signaling or separated booking statuses SQL is incomplete.')
const interviewerVoiceFiles = await readdir(new URL('../public/assets/interviewer-voice/', import.meta.url))
assert(interviewerVoiceFiles.filter((file) => file.endsWith('.wav')).length === 16, 'The complete masculine AI interviewer voice library is missing.')

auth.initializePlatform()
assert(!auth.getAccounts('teacher').some((account) => account.id === 'teacher-monett' || account.fullName === 'Monett Sanga'), 'The removed sample teacher profile was recreated.')
const migratedFamily = auth.getAccountById('legacy-family')
assert(migratedFamily.role === 'student' && migratedFamily.status === 'active' && migratedFamily.child.id && migratedFamily.child.accessStatus === 'active', 'Legacy student migration failed.')

storage.set('tutorpro_accounts_v1', JSON.stringify([{
  id: 'older-v1-family',
  parentName: 'Older Parent',
  email: 'older@example.com',
  child: { name: 'Older Learner', year: 'Year 2', curriculum: 'Oxford', goal: 'Reading' },
}]))
assert(auth.getAccounts('student').some((account) => account.id === 'older-v1-family'), 'A legacy student registration was hidden when current accounts already existed.')

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
assert(family.children.length === 1 && family.child.accessStatus === 'active', 'Student registration failed.')
assert(auth.getAccounts('student').some((account) => account.id === family.id), 'New student registration did not appear in the administrator data source.')

family = auth.addStudentLearner(family.id, { name: 'Jamie', year: 'Year 7', curriculum: 'Oxford', goal: 'Writing and grammar', frequency: '1–2 weekly' })
family = auth.addStudentLearner(family.id, { name: 'Taylor', year: 'Year 3', curriculum: 'Cambridge', goal: 'Reading comprehension', frequency: '1–2 weekly' })
assert(family.children.length === 3, 'Multi-student family profiles failed.')
family = auth.updateLocalAccount(family.id, { cloudProfile: true, cloudSyncPending: false, lastCloudSyncedAt: undefined })
auth.initializePlatform()
family = auth.getAccountById(family.id)
assert(family.cloudSyncPending, 'Existing multi-student profiles were not queued for cloud repair.')
family = auth.updateLocalAccount(family.id, { cloudSyncPending: true })
auth.mergeCloudAccounts([{ ...family, children: [family.children[0]], child: family.children[0], cloudSyncPending: false, cloudProfile: true }])
family = auth.getAccountById(family.id)
assert(family.children.length === 3, 'A stale cloud profile removed an additional locally pending student.')
family = auth.updateLocalAccount(family.id, { cloudSyncPending: false })
await rejects(
  () => auth.addStudentLearner(family.id, { name: 'Fourth', year: 'Year 2', curriculum: 'Oxford', goal: 'Reading comprehension' }),
  'The three-student account limit failed.',
)

const learner = family.children[0]

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
  interview: {
    completedAt: new Date().toISOString(),
    overallRecommendation: 'Consider / Second Interview',
    englishProficiency: { band: 'Good', justification: 'Clear written responses.' },
    liveDemo: { band: 'Good', prompt: 'Teach much and many.', justification: 'Clear example.' },
    strengths: ['Clear communication'], concerns: [], availability: 'Weekday evenings', suggestedNextStep: 'Human interview.', source: 'test',
    transcript: Array.from({ length: 14 }, (_, index) => ({ stage: `Stage ${index + 1}`, question: `Question ${index + 1}`, answer: 'A complete interview answer for the test applicant.' })),
  },
})
assert(auth.getAccounts('teacher').some((account) => account.id === teacher.id && account.status === 'pending'), 'New teacher registration did not appear as pending for the administrator.')
assert(teacher.teacher.interview?.transcript?.length === 14, 'Required teacher interview was not stored with the application.')
teacher = auth.updateAccount(teacher.id, { status: 'approved' })

const future = new Date()
future.setDate(future.getDate() + 14)
future.setHours(12, 0, 0, 0)
const date = schedule.formatDateKey(future)
const time = '16:00'
const slot = schedule.makeSlotKey(schedule.weekdayIndex(future), time)
teacher = auth.updateTeacherProfile(teacher.id, { availabilitySlots: [slot] })

family = auth.updateLearnerAccess(family.id, learner.id, 'suspended')
await rejects(
  () => bookings.createBooking({ studentId: family.id, learnerId: learner.id, learnerName: learner.name, learnerProfile: learner, teacherId: teacher.id, date, time, duration: 25, focus: 'Speaking' }),
  'A suspended student profile was allowed to book.',
)
family = auth.updateLearnerAccess(family.id, learner.id, 'active')

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
const stableClassroom = bookings.getStableClassroomCredentials(booking)
assert(booking.classroomId === stableClassroom.classroomId && booking.classroomToken === stableClassroom.classroomToken, 'Booking classroom credentials are not deterministic across devices.')
assert(booking.teacherName === teacher.fullName && booking.learnerName === learner.name, 'Booking participant names were not saved for cross-device display.')
const calendarInvite = calendar.createBookingCalendar({ ...booking, status: 'confirmed' }, { teacherName: teacher.fullName, learnerName: learner.name })
assert(calendarInvite.includes('BEGIN:VCALENDAR') && calendarInvite.includes('TRIGGER:-PT30M') && calendarInvite.includes('TRIGGER:-PT10M') && calendarInvite.includes('STATUS:CONFIRMED'), 'Phone calendar reminders were not generated correctly.')
const studentRoom = bookings.getBookings({ studentId: family.id }).find((item) => item.id === booking.id)
const teacherRoom = bookings.getBookings({ teacherId: teacher.id }).find((item) => item.id === booking.id)
assert(studentRoom.classroomId === teacherRoom.classroomId && studentRoom.classroomToken === teacherRoom.classroomToken, 'Teacher and student did not receive the same classroom credentials.')
await rejects(
  () => bookings.createBooking({ studentId: family.id, learnerId: learner.id, teacherId: teacher.id, date, time, duration: 25, focus: 'Reading' }),
  'Overlapping bookings were accepted.',
)

const rawAccounts = JSON.parse(storage.get('tutorpro_accounts_v2'))
const rawFamily = rawAccounts.find((account) => account.id === family.id)
rawFamily.role = 'parent'
rawFamily.status = 'approved'
rawFamily.children[0] = { ...rawFamily.children[0], id: undefined }
rawFamily.child = { ...rawFamily.children[0] }
storage.set('tutorpro_accounts_v2', JSON.stringify(rawAccounts))

const recoveryDateValue = new Date(future)
recoveryDateValue.setDate(recoveryDateValue.getDate() + 7)
const recoveryBooking = bookings.createBooking({ studentId: family.id, learnerId: 'stale-learner-id', learnerName: learner.name, learnerProfile: learner, teacherId: teacher.id, date: schedule.formatDateKey(recoveryDateValue), time, duration: 25, focus: 'Reading' })
const repairedFamily = auth.getAccountById(family.id)
const repairedLearner = repairedFamily.children.find((item) => item.name === learner.name)
assert(repairedFamily.role === 'student' && repairedFamily.status === 'active', 'The family account was not repaired during booking.')
assert(repairedLearner?.id === recoveryBooking.learnerId, 'A recoverable stale learner reference blocked booking.')

const confirmedBooking = bookings.updateBooking(booking.id, { status: 'confirmed' })
assert(confirmedBooking.classroomId && confirmedBooking.classroomToken, 'Unique classroom credentials were not generated.')
const staleClassroomBookings = JSON.parse(storage.get('tutorpro_bookings_v1'))
const staleClassroomBooking = staleClassroomBookings.find((item) => item.id === booking.id)
staleClassroomBooking.classroomToken = 'different-hidden-token-on-another-device'
storage.set('tutorpro_bookings_v1', JSON.stringify(staleClassroomBookings))
const classTime = new Date(`${date}T${time}:00`)
assert(bookings.getClassroomAccess(booking.id, family, classTime).allowed, 'The booked student could not access the classroom at class time.')
const repairedClassroom = bookings.getBookings().find((item) => item.id === booking.id)
assert(repairedClassroom.classroomId === stableClassroom.classroomId && repairedClassroom.classroomToken === stableClassroom.classroomToken, 'A stale hidden classroom token was not repaired consistently across devices.')
assert(!bookings.getClassroomAccess(booking.id, { id: 'another-family', role: 'student' }, classTime).allowed, 'An unrelated student accessed a private classroom.')
let managedBooking = bookings.updateBooking(booking.id, { slotComment: 'Practise the reading passage before class.', slotCommentAuthor: 'teacher' })
assert(managedBooking.slotComment.includes('reading passage'), 'Booking-slot comments were not saved beside the learner.')
managedBooking = bookings.updateBooking(booking.id, { status: 'ongoing', classStartedAt: new Date().toISOString() })
assert(managedBooking.status === 'ongoing' && bookings.getClassroomAccess(booking.id, family, classTime).allowed, 'An ongoing class was not kept available in the private classroom.')
managedBooking = bookings.updateBooking(booking.id, { status: 'absent' })
assert(managedBooking.status === 'absent' && !bookings.getClassroomAccess(booking.id, family, classTime).allowed, 'Absent-class separation failed.')
managedBooking = bookings.updateBooking(booking.id, { status: 'cancelled' })
assert(managedBooking.status === 'cancelled', 'Booking cancellation failed.')
managedBooking = bookings.updateBooking(booking.id, { status: 'confirmed' })
assert(managedBooking.status === 'confirmed', 'Undo booking cancellation failed.')
const feedbackResult = bookings.saveTeacherFeedback(booking.id, teacher.id, { summary: 'A focused and successful speaking lesson.', strength: 'Clear answers', nextStep: 'Longer sentences', practiceWords: ['because', 'adventure'], grammarFocus: ['Verb tenses', 'Sentence structure'] })
assert(feedbackResult.teacherFeedback.practiceWords.length === 2 && feedbackResult.teacherFeedback.grammarFocus.includes('Verb tenses'), 'Vocabulary and grammar practice selections were not saved in feedback.')
bookings.rateCompletedBooking(booking.id, family.id, 5, 'Excellent class')
await rejects(() => bookings.rateCompletedBooking(booking.id, family.id, 4, 'Duplicate'), 'A duplicate lesson rating was accepted.')

let removableFamily = await auth.registerAccount({ parentName: 'Remove Parent', email: 'remove@example.com', password: 'Remove123', childName: 'Keep', year: 'Year 3', curriculum: 'Cambridge', goal: 'Reading', frequency: '1–2 weekly' })
removableFamily = auth.addStudentLearner(removableFamily.id, { name: 'Remove Me', year: 'Year 6', curriculum: 'Oxford', goal: 'Grammar', frequency: '1–2 weekly' })
let removableLearner = removableFamily.children[1]
const removalDate = new Date(future)
removalDate.setDate(removalDate.getDate() + 21)
bookings.createBooking({ studentId: removableFamily.id, learnerId: removableLearner.id, learnerName: removableLearner.name, learnerProfile: removableLearner, teacherId: teacher.id, date: schedule.formatDateKey(removalDate), time, duration: 25, focus: 'Grammar' })
bookings.removeStudentBookingData(removableFamily.id, removableLearner.id)
auth.removeStudentLearner(removableFamily.id, removableLearner.id)
assert(auth.getAccountById(removableFamily.id).children.length === 1, 'Removing an additional student profile failed.')
assert(!bookings.getBookings({ studentId: removableFamily.id }).some((item) => item.learnerId === removableLearner.id), 'Removed student bookings were not cleaned up.')
assert(auth.removeStudentAccount(removableFamily.id) && !auth.getAccountById(removableFamily.id), 'Removing the final family registration failed.')
assert(auth.removeStudentAccount('older-v1-family') && !auth.getAccountById('older-v1-family'), 'Removed legacy registration reappeared in the administrator data source.')

const removableTeacher = await auth.createTeacherByAdmin({ fullName: 'Temporary Teacher', email: 'temporary-teacher@example.com', password: 'Teacher123', specialization: 'Cambridge', bio: 'Temporary teacher profile for deletion testing.' })
assert(await auth.removeTeacherAccount(removableTeacher.id) && !auth.getAccountById(removableTeacher.id), 'Administrator teacher profile deletion failed.')

const loggedIn = await auth.loginAccount('family@example.com', 'Family123')
assert(loggedIn.id === family.id, 'Login failed.')
assert(bookings.getBookingStats().completed === 1, 'Booking statistics are incorrect.')
assert(await translation.translateChatText('good job', 'tl') === 'magaling', 'Classroom chat translation fallback failed.')

if (typeof BroadcastChannel !== 'undefined') {
  globalThis.window = { BroadcastChannel }
  const { createClassroomTransport } = await import('../src/classroomTransport.js')
  let receivedLocalSignal = false
  const firstTransport = createClassroomTransport({ bookingId: booking.id, roomId: stableClassroom.classroomId, token: stableClassroom.classroomToken, participantId: 'teacher-transport-test', onMessage() {}, onStatus() {} })
  const secondTransport = createClassroomTransport({ bookingId: booking.id, roomId: stableClassroom.classroomId, token: stableClassroom.classroomToken, participantId: 'student-transport-test', onMessage(message) { if (message.type === 'join-request') receivedLocalSignal = true }, onStatus() {} })
  firstTransport.send({ type: 'join-request' })
  await new Promise((resolve) => setTimeout(resolve, 150))
  firstTransport.close()
  secondTransport.close()
  delete globalThis.window
  assert(receivedLocalSignal, 'Same-room classroom signaling failed between browser contexts.')
}

console.log('TutorPro English core flows: PASS')
