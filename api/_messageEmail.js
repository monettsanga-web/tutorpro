/**
 * The wording of every support-message email, in the recipient's own language.
 *
 * Ported from supabase/functions/message-notification/index.ts so the same
 * copy can be sent from a Vercel route that deploys with every push. The
 * deployed Supabase version is still the ORIGINAL bilingual template, which
 * puts Chinese under the English in every message:
 *
 *     New Message Notification · 消息通知
 *     尊敬的 Teacher M, TutorPro 客服已回复您的在线咨询…
 *
 * A teacher in Manila received half a message they could not read. One
 * language per recipient now, chosen from their own profile.
 */
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] || character)
}

/** Keep the preview readable and stop a huge paste bloating the email. */
export function preview(value = '', limit = 600) {
  const text = String(value).trim()
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

/* ------------------------------------------------------------------
 * Which language this person reads.
 *
 * Taken from their profile, which the site fills in from their IP
 * address: `preferredLanguage` is whatever the website last showed them,
 * and `registrationCountry` is the country estimated when they signed up.
 * Falls back to English rather than guessing.
 *
 * Mirrors countryLanguages in src/AutoTranslate.jsx — kept in step by
 * scripts/test-booking-email-language.mjs.
 * ---------------------------------------------------------------- */
const COUNTRY_LANGUAGES = {
  PH: 'en', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
  PL: 'pl',
}


export const COPY = {
  en: {
    newMessage: 'New message',
    greeting: (name) => `Hello ${name},`,
    sentYouAMessage: (sender) => `${sender} sent you a message on TutorPro English:`,
    readAndReply: 'Read and reply',
    replyInside: 'Reply inside TutorPro English so the whole conversation stays in one place.',
    subject: (sender) => `${sender} sent you a message`,
  },
  tl: {
    newMessage: 'Bagong mensahe',
    greeting: (name) => `Kumusta ${name},`,
    sentYouAMessage: (sender) => `Nagpadala si ${sender} ng mensahe sa TutorPro English:`,
    readAndReply: 'Basahin at sagutin',
    replyInside: 'Sumagot sa loob ng TutorPro English para manatili sa isang lugar ang buong usapan.',
    subject: (sender) => `Nagpadala si ${sender} ng mensahe`,
  },
  ko: {
    newMessage: '새 메시지',
    greeting: (name) => `${name}님, 안녕하세요.`,
    sentYouAMessage: (sender) => `${sender}님이 TutorPro English에서 메시지를 보냈습니다:`,
    readAndReply: '읽고 답장하기',
    replyInside: '대화 내용이 한곳에 남도록 TutorPro English 안에서 답장해 주세요.',
    subject: (sender) => `${sender}님이 메시지를 보냈습니다`,
  },
  'zh-CN': {
    newMessage: '您有一条新消息',
    greeting: (name) => `${name}，您好：`,
    sentYouAMessage: (sender) => `${sender} 在 TutorPro English 上给您发送了一条消息：`,
    readAndReply: '查看并回复',
    replyInside: '请在 TutorPro English 网站内回复，以便完整保存对话记录。',
    subject: (sender) => `${sender} 给您发送了一条消息`,
  },
  'zh-TW': {
    newMessage: '您有一則新訊息',
    greeting: (name) => `${name}，您好：`,
    sentYouAMessage: (sender) => `${sender} 在 TutorPro English 上傳送了一則訊息給您：`,
    readAndReply: '查看並回覆',
    replyInside: '請在 TutorPro English 網站內回覆，以便完整保存對話記錄。',
    subject: (sender) => `${sender} 傳送了一則訊息給您`,
  },
  ja: {
    newMessage: '新しいメッセージ',
    greeting: (name) => `${name} 様`,
    sentYouAMessage: (sender) => `${sender} さんが TutorPro English でメッセージを送信しました:`,
    readAndReply: '読んで返信する',
    replyInside: '会話がひとつにまとまるよう、TutorPro English 内でご返信ください。',
    subject: (sender) => `${sender} さんからメッセージが届きました`,
  },
  es: {
    newMessage: 'Nuevo mensaje',
    greeting: (name) => `Hola ${name}:`,
    sentYouAMessage: (sender) => `${sender} le ha enviado un mensaje en TutorPro English:`,
    readAndReply: 'Leer y responder',
    replyInside: 'Responda dentro de TutorPro English para que toda la conversación quede en un solo lugar.',
    subject: (sender) => `${sender} le ha enviado un mensaje`,
  },
  pt: {
    newMessage: 'Nova mensagem',
    greeting: (name) => `Olá ${name},`,
    sentYouAMessage: (sender) => `${sender} enviou-lhe uma mensagem no TutorPro English:`,
    readAndReply: 'Ler e responder',
    replyInside: 'Responda dentro do TutorPro English para que toda a conversa fique num só lugar.',
    subject: (sender) => `${sender} enviou-lhe uma mensagem`,
  },
  fr: {
    newMessage: 'Nouveau message',
    greeting: (name) => `Bonjour ${name},`,
    sentYouAMessage: (sender) => `${sender} vous a envoyé un message sur TutorPro English :`,
    readAndReply: 'Lire et répondre',
    replyInside: 'Répondez dans TutorPro English pour que toute la conversation reste au même endroit.',
    subject: (sender) => `${sender} vous a envoyé un message`,
  },
  de: {
    newMessage: 'Neue Nachricht',
    greeting: (name) => `Hallo ${name},`,
    sentYouAMessage: (sender) => `${sender} hat Ihnen auf TutorPro English eine Nachricht geschickt:`,
    readAndReply: 'Lesen und antworten',
    replyInside: 'Antworten Sie in TutorPro English, damit das gesamte Gespräch an einem Ort bleibt.',
    subject: (sender) => `${sender} hat Ihnen eine Nachricht geschickt`,
  },
  vi: {
    newMessage: 'Tin nhắn mới',
    greeting: (name) => `Xin chào ${name},`,
    sentYouAMessage: (sender) => `${sender} đã gửi cho bạn một tin nhắn trên TutorPro English:`,
    readAndReply: 'Đọc và trả lời',
    replyInside: 'Hãy trả lời trong TutorPro English để toàn bộ cuộc trò chuyện được lưu ở một nơi.',
    subject: (sender) => `${sender} đã gửi cho bạn một tin nhắn`,
  },
  th: {
    newMessage: 'ข้อความใหม่',
    greeting: (name) => `สวัสดีคุณ ${name}`,
    sentYouAMessage: (sender) => `${sender} ส่งข้อความถึงคุณใน TutorPro English:`,
    readAndReply: 'อ่านและตอบกลับ',
    replyInside: 'กรุณาตอบกลับภายใน TutorPro English เพื่อให้บทสนทนาทั้งหมดอยู่ในที่เดียวกัน',
    subject: (sender) => `${sender} ส่งข้อความถึงคุณ`,
  },
  pl: {
    newMessage: 'Nowa wiadomość',
    greeting: (name) => `Dzień dobry, ${name},`,
    sentYouAMessage: (sender) => `${sender} wysłał(a) Ci wiadomość w TutorPro English:`,
    readAndReply: 'Przeczytaj i odpowiedz',
    replyInside: 'Odpowiedz w TutorPro English, aby cała rozmowa pozostała w jednym miejscu.',
    subject: (sender) => `${sender} wysłał(a) Ci wiadomość`,
  },
  ar: {
    rtl: true,
    newMessage: 'رسالة جديدة',
    greeting: (name) => `مرحبًا ${name}،`,
    sentYouAMessage: (sender) => `أرسل لك ${sender} رسالة على TutorPro English:`,
    readAndReply: 'اقرأ ورد',
    replyInside: 'يرجى الرد داخل TutorPro English ليبقى الحوار كاملًا في مكان واحد.',
    subject: (sender) => `أرسل لك ${sender} رسالة`,
  },
}

/* IP first, a hand-picked language last: see the booking function for why. */
export function languageForProfile(profile) {
  const data = profile?.profile_data || {}
  const fromIp = String(data.ipLanguage || '').trim()
  if (fromIp && COPY[fromIp]) return fromIp
  const country = String(data.registrationCountry || '').toUpperCase()
  const fromCountry = COUNTRY_LANGUAGES[country]
  if (fromCountry && COPY[fromCountry]) return fromCountry
  const picked = String(data.preferredLanguage || '').trim()
  if (picked && COPY[picked]) return picked
  return 'en'
}

