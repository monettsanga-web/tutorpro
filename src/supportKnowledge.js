export const SUPPORT_TOPICS = [
  { id: 'booking', label: 'Booking' },
  { id: 'payment', label: 'Payment' },
  { id: 'classroom', label: 'Classroom' },
  { id: 'china', label: 'China/VooV' },
  { id: 'password', label: 'Password' },
  { id: 'referral', label: 'Referral' },
  { id: 'teacher', label: 'Teacher help' },
]

const answers = {
  booking: {
    title: 'Booking help',
    body: 'To book a class, log in to the student dashboard, open “Book a class”, choose an approved teacher, select available times, then submit the booking request. If you have 0 booking credits, please complete payment or ask admin to verify your QR payment first.',
    escalate: 'If your preferred time is unavailable, send your student name, teacher name, and preferred date/time to admin support.',
  },
  payment: {
    title: 'Payment and credits',
    body: 'PayPal payments are verified by the server before booking credits are added. For GCash, AUB PayMate, WeChat Pay, or manual QR payments, send the receipt to admin support. Admin will verify it and add credits to the student account.',
    escalate: 'If credits do not appear after payment, send the payment method, amount, receipt/reference number, and parent login email.',
  },
  classroom: {
    title: 'Classroom connection help',
    body: 'Use Chrome or Microsoft Edge, allow camera and microphone, and enter from the exact booked lesson. If video does not connect, click Retry, enable low-bandwidth mode, and keep both teacher and student inside the same booked classroom.',
    escalate: 'If the classroom still fails, send the booking time, room ID, device/browser, and screenshot of the error.',
  },
  china: {
    title: 'China / VooV connection help',
    body: 'For China students, TutorPro recommends Chrome or Edge and the VooV/Tencent backup link. Facebook/Messenger may not work in China, so use website chat. If browser video fails, open the VooV backup link from the classroom or teacher profile.',
    escalate: 'Ask admin or the teacher to confirm the VooV link is saved in Teacher Dashboard → Classroom.',
  },
  password: {
    title: 'Password reset',
    body: 'For email-based accounts, open Student Login or Teacher Login and click “Forgot password?”. Enter the registered email and follow the reset link. WeChat or WhatsApp-only logins need admin support because there is no email inbox for the reset link.',
    escalate: 'If the email does not arrive, check spam/junk and ask admin to confirm your login email.',
  },
  referral: {
    title: 'Referral rewards',
    body: 'Each parent and teacher has a referral code/link in the dashboard. When a referred parent registers and purchases their first package, both families can receive a free lesson credit automatically through the verified payment flow.',
    escalate: 'If a referral was not credited, send the referrer code and the new parent account email.',
  },
  teacher: {
    title: 'Teacher support',
    body: 'Teachers can manage bookings, availability, classroom links, feedback, homework, referrals, and support from the teacher dashboard. Website chat opens directly from the teacher account and does not require re-entering email.',
    escalate: 'For payout, booking, or classroom concerns, send the booking ID/time and student name to admin support.',
  },
}

function detectTopic(question = '') {
  const text = question.toLowerCase()
  if (/book|schedule|slot|reserve|calendar|available/.test(text)) return 'booking'
  if (/pay|payment|paypal|gcash|aub|wechat|qr|credit|package|receipt/.test(text)) return 'payment'
  if (/classroom|camera|microphone|video|audio|screen|share|connect|room/.test(text)) return 'classroom'
  if (/china|chinese|voov|tencent|wechat|中国|腾讯/.test(text)) return 'china'
  if (/password|login|reset|forgot|sign in/.test(text)) return 'password'
  if (/referral|refer|ambassador|reward|free lesson|invite/.test(text)) return 'referral'
  if (/teacher|payout|feedback|availability/.test(text)) return 'teacher'
  return 'booking'
}

export function getSupportAnswer(topicOrQuestion = '') {
  const topic = answers[topicOrQuestion] ? topicOrQuestion : detectTopic(topicOrQuestion)
  return { id: topic, ...answers[topic] }
}

export function composeEscalationMessage(answer, question = '') {
  const intro = question ? `I asked the AI assistant: “${question}”\n\n` : ''
  return `${intro}${answer.title}\n${answer.body}\n\nI still need help. ${answer.escalate}`
}
