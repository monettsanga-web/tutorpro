import React from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

const shared = new Map()
globalThis.localStorage = {
  getItem: (key) => shared.get(key) ?? null,
  setItem: (key, value) => shared.set(key, String(value)),
  removeItem: (key) => shared.delete(key),
}
globalThis.sessionStorage = globalThis.localStorage

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { StudentDashboard, TeacherDashboard, AdminDashboard, AdminTeacherProfile, AdminStudentProfile, AdminTeacherBookingGroups, BookingSlotDialog, FeedbackDialog, ScheduleCalendar, SupportInbox } = await vite.ssrLoadModule('/src/Dashboards.jsx')
  const { default: PortalAccess } = await vite.ssrLoadModule('/src/PortalAccess.jsx')
  const { default: TeacherAIInterview } = await vite.ssrLoadModule('/src/TeacherAIInterview.jsx')
  const { default: SupportChatWidget } = await vite.ssrLoadModule('/src/SupportChatWidget.jsx')
  const { default: PremiumMotion } = await vite.ssrLoadModule('/src/PremiumMotion.jsx')
  const { default: AuthProviderPicker } = await vite.ssrLoadModule('/src/AuthProviderPicker.jsx')
  const { default: LetterBubbleAdventure } = await vite.ssrLoadModule('/src/LetterBubbleAdventure.jsx')
  const { default: OnlineClassroom } = await vite.ssrLoadModule('/src/OnlineClassroom.jsx')
  const callbacks = { onAccountChange() {}, onHome() {}, onLogout() {} }

  const incompleteStudent = {
    id: 'student-incomplete', role: 'student', status: 'active', parentName: 'Parent', email: 'parent@example.com', children: [], child: null,
  }
  const incompleteTeacher = {
    id: 'teacher-incomplete', role: 'teacher', status: 'pending', fullName: '', email: 'teacher@example.com', teacher: null,
  }
  const administrator = {
    id: 'admin-test', role: 'admin', status: 'active', fullName: 'Administrator', email: 'admin@example.com',
  }

  const studentHtml = renderToString(React.createElement(StudentDashboard, { account: incompleteStudent, ...callbacks }))
  const teacherHtml = renderToString(React.createElement(TeacherDashboard, { account: incompleteTeacher, ...callbacks }))
  const teacherBookingsHtml = renderToString(React.createElement(TeacherDashboard, { account: incompleteTeacher, initialSection: 'bookings', ...callbacks }))
  const adminHtml = renderToString(React.createElement(AdminDashboard, { account: administrator, onHome() {}, onLogout() {} }))
  const adminTeacherHtml = renderToString(React.createElement(AdminTeacherProfile, { teacher: incompleteTeacher, onBack() {}, onStatusChange() {}, onRemove() {}, processing: false, error: '' }))
  const recordedAdminTeacherHtml = renderToString(React.createElement(AdminTeacherProfile, { teacher: { ...incompleteTeacher, teacher: { specialization: 'Both Curricula', interview: { recordingSessionId: '00000000-0000-0000-0000-000000000123', recordingCount: 14, recordingStatus: 'securely-uploaded', overallRecommendation: 'Consider / Second Interview', transcript: [] } } }, onBack() {}, onStatusChange() {}, onRemove() {}, processing: false, error: '' }))
  const adminStudentHtml = renderToString(React.createElement(AdminStudentProfile, { account: incompleteStudent, learnerId: '', onBack() {}, onStatusChange() {}, onGoalChange() {}, onRemove() {}, processing: false, error: '' }))
  const adminLoginHtml = renderToString(React.createElement(PortalAccess, { mode: 'admin', onClose() {}, onAuthenticated() {}, onEnterPortal() {} }))
  const teacherLoginHtml = renderToString(React.createElement(PortalAccess, { mode: 'teacher', onClose() {}, onAuthenticated() {}, onEnterPortal() {} }))
  const teacherInterviewHtml = renderToString(React.createElement(TeacherAIInterview, { applicant: { fullName: 'Applicant Teacher', specialization: 'Both Curricula', experience: 3 }, onBack() {}, onComplete() {} }))
  const premiumMotionHtml = renderToString(React.createElement(PremiumMotion))
  const letterGameHtml = renderToString(React.createElement(LetterBubbleAdventure, { onBack() {}, onEarn() {} }))
  const bookingDialogHtml = renderToString(React.createElement(BookingSlotDialog, {
    booking: { id: 'booking-test', studentId: 'student-test', learnerId: 'learner-test', learnerName: 'Alex', teacherId: 'teacher-test', teacherName: 'Teacher Test', date: '2027-06-01', time: '16:00', duration: 25, focus: 'Speaking', status: 'confirmed', note: 'Please practise reading.', slotComment: '' },
    account: { id: 'teacher-test', role: 'teacher', fullName: 'Teacher Test' },
    onClose() {}, onChanged() {},
  }))
  const feedbackDialogHtml = renderToString(React.createElement(FeedbackDialog, { booking: { id: 'feedback-test', studentId: 'student-test', learnerId: 'learner-test', learnerName: 'Alex', teacherId: 'teacher-test', status: 'confirmed' }, teacherId: 'teacher-test', onClose() {}, onSaved() {} }))
  const weekDate = new Date()
  weekDate.setDate(weekDate.getDate() - ((weekDate.getDay() + 6) % 7))
  const calendarDate = `${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, '0')}-${String(weekDate.getDate()).padStart(2, '0')}`
  const recordedBooking = { id: 'booking-filter-test', studentId: 'student-test', learnerId: 'learner-test', learnerName: 'Alex', teacherId: 'teacher-test', teacherName: 'Teacher Test', date: calendarDate, time: '16:00', duration: 25, focus: 'Speaking', status: 'confirmed' }
  const teacherCalendarHtml = renderToString(React.createElement(ScheduleCalendar, { weekOffset: 0, onWeekOffset() {}, bookings: [recordedBooking], onBookingOpen() {}, onBookingFeedback() {} }))
  const adminTeacherBookingsHtml = renderToString(React.createElement(AdminTeacherBookingGroups, { bookings: [recordedBooking], teachers: [{ id: 'teacher-test', fullName: 'Teacher Test', status: 'approved', teacher: { specialization: 'Cambridge', experience: 5 } }], onStatusChange() {}, onOpenTeacher() {}, onEnterClassroom() {}, onManageBooking() {} }))
  const supportInboxHtml = renderToString(React.createElement(SupportInbox, { onUnreadChange() {} }))
  sessionStorage.setItem('tutorpro_visitor_country', 'CN')
  const chineseProviderHtml = renderToString(React.createElement(AuthProviderPicker, { value: 'email', onSelect() {} }))
  const chineseSupportHtml = renderToString(React.createElement(SupportChatWidget))
  localStorage.setItem('tutorpro_support_thread_v1', JSON.stringify({ conversationId: '00000000-0000-0000-0000-000000000001', accessToken: 'test-token' }))
  const embeddedSupportHtml = renderToString(React.createElement(SupportChatWidget, { embedded: true }))
  localStorage.removeItem('tutorpro_support_thread_v1')
  sessionStorage.removeItem('tutorpro_visitor_country')

  if (!studentHtml.includes('Finish this student registration')) throw new Error('Incomplete student recovery view failed to render.')
  if (!teacherHtml.includes('Good day')) throw new Error('Incomplete teacher dashboard failed to render.')
  if (!teacherBookingsHtml.includes('Choose which bookings to show') || !teacherBookingsHtml.includes('Ongoing') || !teacherBookingsHtml.includes('Absent') || !teacherBookingsHtml.includes('Cancelled') || !teacherBookingsHtml.includes('Calendar view')) throw new Error('Teacher booking status separation failed to render.')
  if (!adminHtml.includes('TutorPro English command centre')) throw new Error('Administrator dashboard failed to render.')
  if (!adminTeacherHtml.includes('About the teacher') || !adminTeacherHtml.includes('New Teacher') || !adminTeacherHtml.includes('Delete profile') || !adminTeacherHtml.includes('AI teacher interview')) throw new Error('Administrator teacher profile and interview controls failed to render.')
  if (!recordedAdminTeacherHtml.includes('Private applicant audio') || !recordedAdminTeacherHtml.includes('Recorded answers') || !recordedAdminTeacherHtml.includes('recordings')) throw new Error('Administrator private recorded-answer review failed to render.')
  if (!adminStudentHtml.includes('Parent and login details') || !adminStudentHtml.includes('Incomplete student profile') || !adminStudentHtml.includes('Main Learning Goal') || !adminStudentHtml.includes('Only administrators can edit')) throw new Error('Administrator student profile controls failed to render.')
  if (!adminLoginHtml.includes('Administrator login') || adminLoginHtml.includes('Create the admin account')) throw new Error('Admin Portal did not default to login on a new device.')
  if (!teacherLoginHtml.includes('Teacher login')) throw new Error('Teacher Portal did not default to login.')
  if (!teacherInterviewHtml.includes('TutorPro English Hiring Assistant') || !teacherInterviewHtml.includes('Required recorded first-round interview') || !teacherInterviewHtml.includes('Enter recorded interview') || !teacherInterviewHtml.includes('tutorpro-live-male-interviewer.webp') || !teacherInterviewHtml.includes('tutorpro-live-male-interviewer-speaking-1.webp') || !teacherInterviewHtml.includes('tutorpro-live-male-interviewer-speaking-2.webp') || !teacherInterviewHtml.includes('English AI interviewer · Online') || !teacherInterviewHtml.includes('Microphone required')) throw new Error('Live recorded AI teacher interview, masculine voice and animated talking interviewer failed to render.')
  if (!premiumMotionHtml.includes('premium-scroll-progress') || !premiumMotionHtml.includes('premium-pointer-glow')) throw new Error('Premium motion layer failed to render.')
  if (!letterGameHtml.includes('Alphabet Bubble Adventure') || !letterGameHtml.includes('Find this letter') || !letterGameHtml.includes('letter-round-count') || !letterGameHtml.includes('of 26')) throw new Error('Interactive A–Z letter game failed to render.')
  if (!bookingDialogHtml.includes('booking-comment-editor') || !bookingDialogHtml.includes('Alex') || !bookingDialogHtml.includes('Save comment') || !bookingDialogHtml.includes('Cancel booking') || !bookingDialogHtml.includes('Parent booking note') || !bookingDialogHtml.includes('Add calendar reminder')) throw new Error('Responsive booking comment, calendar and cancellation controls failed to render.')
  if (!feedbackDialogHtml.includes('Words or phrases to practise') || !feedbackDialogHtml.includes('Grammar to practise') || !feedbackDialogHtml.includes('Verb tenses') || !feedbackDialogHtml.includes('Sentence structure')) throw new Error('Vocabulary and grammar feedback selectors failed to render.')
  if (!teacherCalendarHtml.includes('schedule-feedback-target') || !teacherCalendarHtml.includes('Write feedback') || !teacherCalendarHtml.includes('Alex')) throw new Error('Teacher calendar hover feedback control failed to render.')
  if (!adminTeacherBookingsHtml.includes('Teacher booking profile') || !adminTeacherBookingsHtml.includes('All teachers') || !adminTeacherBookingsHtml.includes('Pending') || !adminTeacherBookingsHtml.includes('Confirmed') || !adminTeacherBookingsHtml.includes('Ongoing') || !adminTeacherBookingsHtml.includes('Completed') || !adminTeacherBookingsHtml.includes('Absent') || !adminTeacherBookingsHtml.includes('Cancelled') || !adminTeacherBookingsHtml.includes('Declined') || !adminTeacherBookingsHtml.includes('Open profile')) throw new Error('Administrator teacher-grouped booking filters failed to render.')
  if (!chineseProviderHtml.includes('中国家长注册提示') || !chineseProviderHtml.includes('其他邮箱 / Other email') || !chineseProviderHtml.includes('请不要使用 Gmail')) throw new Error('Chinese parent email guidance failed to render.')
  if (!chineseSupportHtml.includes('联系管理员') || !chineseSupportHtml.includes('中文家长咨询')) throw new Error('Chinese parent support launcher failed to render.')
  if (!embeddedSupportHtml.includes('support-widget--embedded') || !embeddedSupportHtml.includes('TutorPro 中文家长客服') || !embeddedSupportHtml.includes('support-file-button') || !embeddedSupportHtml.includes('image/png')) throw new Error('Embedded parent-dashboard support chat and attachment control failed to render.')
  if (!supportInboxHtml.includes('Parent support inbox') || !supportInboxHtml.includes('Live inbox')) throw new Error('Administrator support inbox failed to render.')
  const testAccounts = [
    { id: 'teacher-test', role: 'teacher', status: 'approved', fullName: 'Teacher Test', email: 'teacher@example.com', teacher: {} },
    { id: 'student-test', role: 'student', status: 'active', parentName: 'Parent', email: 'parent@example.com', children: [{ id: 'learner-test', name: 'Alex' }], child: { id: 'learner-test', name: 'Alex' } }
  ]
  shared.set('tutorpro_accounts_v2', JSON.stringify(testAccounts))
  const now = new Date()
  const activeDateStr = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const activeTimeStr = [String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0')].join(':')
  const classroomBooking = { id: 'booking-classroom-test', studentId: 'student-test', learnerId: 'learner-test', learnerName: 'Alex', teacherId: 'teacher-test', teacherName: 'Teacher Test', date: activeDateStr, time: activeTimeStr, duration: 25, focus: 'Speaking', status: 'ongoing' }
  shared.set('tutorpro_bookings_v1', JSON.stringify([recordedBooking, classroomBooking]))
  const teacherClassroomHtml = renderToString(React.createElement(OnlineClassroom, { booking: classroomBooking, account: testAccounts[0], onExit() {} }))
  const studentClassroomHtml = renderToString(React.createElement(OnlineClassroom, { booking: classroomBooking, account: testAccounts[1], onExit() {} }))

  if (!teacherClassroomHtml.includes('TutorPro English Classroom')) throw new Error('Teacher classroom prejoin view failed to render.')
  if (!studentClassroomHtml.includes('TutorPro English Classroom')) throw new Error('Student classroom prejoin view failed to render.')
  process.stdout.write('Student, Teacher and Admin dashboard rendering: PASS\n')
} finally {
  await vite.close()
}
