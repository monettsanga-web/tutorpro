const CAMPAIGN_LOG_KEY = 'tutorpro_marketing_campaigns_v1'

export const MARKETING_TEMPLATES = [
  {
    id: 'booking-reminder',
    name: 'Booking reminder',
    audience: 'STUDENT',
    subject: 'Your TutorPro English class is coming up',
    body: `Hello TutorPro family,\n\nThis is a friendly reminder to check your upcoming class schedule in your student dashboard. Please enter the classroom a few minutes early and test your camera and microphone.\n\nIf you need help, reply through the website support chat.\n\nSee you in class!\nTutorPro English PH`,
  },
  {
    id: 'payment-reminder',
    name: 'Payment / credits reminder',
    audience: 'STUDENT',
    subject: 'Reminder: Add booking credits for your next TutorPro English class',
    body: `Hello TutorPro family,\n\nYour student dashboard uses booking credits to reserve class times. If your credits are low, please choose a weekly or monthly package in the dashboard before booking the next class.\n\nFor GCash, AUB PayMate or WeChat QR payments, send your receipt to admin support for verification.\n\nThank you,\nTutorPro English PH`,
  },
  {
    id: 'homework-reminder',
    name: 'Homework reminder',
    audience: 'STUDENT',
    subject: 'TutorPro English homework reminder',
    body: `Hello TutorPro learner,\n\nPlease check your Homework section in the student dashboard. Completing homework helps you earn rewards and helps your teacher prepare the best next lesson for you.\n\nKeep going — every practice step builds confidence!\nTutorPro English PH`,
  },
  {
    id: 'teacher-feedback',
    name: 'Teacher feedback reminder',
    audience: 'TEACHER',
    subject: 'Reminder: Complete class feedback in TutorPro English',
    body: `Hello Teacher,\n\nPlease open your Teacher Dashboard and check the Smart Feedback Queue for completed classes that still need remarks. Parent feedback is one of the most important parts of the TutorPro learning experience.\n\nThank you for supporting our learners,\nTutorPro English PH`,
  },
  {
    id: 'referral-campaign',
    name: 'Referral campaign',
    audience: 'STUDENT',
    subject: 'Invite a friend and earn a free TutorPro English lesson',
    body: `Hello TutorPro family,\n\nYour referral link is available inside your student dashboard. When a referred family registers and purchases their first package, both families can receive a free 25-minute lesson credit.\n\nOpen your dashboard and visit the Referrals section to copy your code, QR, or poster.\n\nHappy learning,\nTutorPro English PH`,
  },
  {
    id: 'holiday-campaign',
    name: 'Holiday campaign',
    audience: 'ALL',
    subject: 'TutorPro English holiday learning update',
    body: `Hello TutorPro community,\n\nWe hope your family is doing well. Holiday periods are a great time to keep English confidence growing through short, consistent practice.\n\nPlease check your dashboard for bookings, homework, rewards and announcements.\n\nWarm regards,\nTutorPro English PH`,
  },
  {
    id: 'reactivation',
    name: 'Reactivation message',
    audience: 'STUDENT',
    subject: 'We miss seeing you in TutorPro English class',
    body: `Hello TutorPro family,\n\nWe noticed you have not booked a class recently. A short 25-minute lesson can help your child restart momentum and rebuild confidence.\n\nLog in to your dashboard to book a new class or contact support if you need help.\n\nWe would love to see you again soon,\nTutorPro English PH`,
  },
  {
    id: 'achievement',
    name: 'Achievement celebration',
    audience: 'STUDENT',
    subject: 'Congratulations on your TutorPro English progress',
    body: `Hello TutorPro learner,\n\nCongratulations on your learning progress! Keep checking your Rewards, Homework and AI Report sections to see your growth.\n\nYour effort matters, and we are proud of every step you take.\n\nKeep shining,\nTutorPro English PH`,
  },
]

export function readCampaignLog() {
  try { return JSON.parse(localStorage.getItem(CAMPAIGN_LOG_KEY) || '[]') } catch { return [] }
}

export function saveCampaignLog(entry) {
  const rows = readCampaignLog()
  const next = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry }, ...rows].slice(0, 100)
  localStorage.setItem(CAMPAIGN_LOG_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('tutorpro:marketing-change'))
  return next
}

export function campaignStats(rows = readCampaignLog()) {
  return {
    total: rows.length,
    student: rows.filter((row) => row.target === 'STUDENT').length,
    teacher: rows.filter((row) => row.target === 'TEACHER').length,
    all: rows.filter((row) => row.target === 'ALL').length,
  }
}
