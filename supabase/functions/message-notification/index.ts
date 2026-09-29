/**
 * Email alert for a direct message.
 *
 * WHAT IT DOES
 * ------------
 * When you message a parent or a teacher, they get an email telling them a
 * message is waiting, with a button back to the site. The message text is
 * included so they can read it without logging in, but replying happens in
 * the dashboard so the whole thread stays in one place.
 *
 * WHY THE MESSAGE ID, NOT THE MESSAGE TEXT
 * ----------------------------------------
 * The caller sends only a message id. The function then reads that row itself
 * using the service key. If the body were passed in from the browser, anyone
 * could call this endpoint and have TutorPro email arbitrary text to any
 * address — a spam relay wearing your domain. Reading the row server-side
 * means the email can only ever contain a message that was genuinely saved,
 * addressed to the person who genuinely receives it.
 *
 * IT ALSO CANNOT DOUBLE-SEND
 * --------------------------
 * `emailed_at` is stamped after a successful send and checked first, so a
 * retry, a double click or a duplicated Realtime event cannot email the same
 * message twice.
 *
 * DEPLOY
 * ------
 *   supabase functions deploy message-notification
 * Requires the same RESEND_API_KEY secret the booking emails already use.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] || character)
}

/** Keep the preview readable and stop a huge paste bloating the email. */
function preview(value = '', limit = 600) {
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
const COUNTRY_LANGUAGES: Record<string, string> = {
  PH: 'en', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
  PL: 'pl',
}

type MessageCopy = {
  rtl?: boolean
  newMessage: string
  greeting: (name: string) => string
  sentYouAMessage: (sender: string) => string
  readAndReply: string
  replyInside: string
  subject: (sender: string) => string
}

const COPY: Record<string, MessageCopy> = {
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
function languageForProfile(profile: Record<string, any> | undefined) {
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL')
      || 'TutorPro English <notifications@tutorpro.site>'
    if (!resendKey) throw new Error('RESEND_API_KEY is not configured')

    // The caller must be a real signed-in user.
    const authorization = request.headers.get('Authorization') || ''
    if (!authorization) return json({ error: 'Authentication required' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Invalid session' }, 401)

    const { messageId } = await request.json()
    if (!messageId) throw new Error('messageId is required')

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data: message, error: messageError } = await adminClient
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, emailed_at, created_at')
      .eq('id', messageId)
      .single()
    if (messageError || !message) throw new Error('Message could not be loaded')

    // Only the person who wrote it may trigger its notification.
    if (message.sender_id !== user.id) return json({ error: 'Not your message' }, 403)

    // Already emailed: succeed quietly rather than sending a duplicate.
    if (message.emailed_at) return json({ delivered: false, reason: 'Already notified' })

    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, email, login_id, parent_name, full_name, role, profile_data')
      .in('id', [message.sender_id, message.recipient_id])

    const sender = profiles?.find((profile) => profile.id === message.sender_id)
    const recipient = profiles?.find((profile) => profile.id === message.recipient_id)

    const recipientEmail = [recipient?.email, recipient?.login_id]
      .find((value) => typeof value === 'string' && value.includes('@'))
    if (!recipientEmail) return json({ delivered: false, reason: 'Recipient has no email address' })

    const senderName = sender?.full_name || sender?.parent_name || 'TutorPro English'
    const recipientName = recipient?.parent_name || recipient?.full_name || 'there'
    /* One recipient, one language. This email used to be English with a
       Chinese line underneath for everybody, so a family in Manila received
       half a message they could not read. */
    const copy = COPY[languageForProfile(recipient)] || COPY.en
    const direction = copy.rtl ? 'rtl' : 'ltr'
    const align = copy.rtl ? 'right' : 'left'

    const html = `
      <div dir="${direction}" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#321568;text-align:${align}">
        <div style="padding:24px;border-radius:20px 20px 0 0;background:linear-gradient(120deg,#321568,#7048df);color:white">
          <h1 style="margin:0;font-size:26px">TutorPro English</h1>
          <p style="margin:7px 0 0;color:#dff7a6">${escapeHtml(copy.newMessage)}</p>
        </div>
        <div style="padding:24px;border:1px solid #e5deef;border-top:0;border-radius:0 0 20px 20px">
          <p style="margin-top:0">${escapeHtml(copy.greeting(recipientName))}</p>
          <p>${copy.sentYouAMessage(`<b>${escapeHtml(senderName)}</b>`)}</p>
          <blockquote style="margin:18px 0;padding:14px 18px;border-left:4px solid #ff4f87;background:#faf7ff;border-radius:0 10px 10px 0;white-space:pre-wrap">${escapeHtml(preview(message.body))}</blockquote>
          <p style="margin:22px 0">
            <a href="https://www.tutorpro.site" style="padding:12px 18px;border-radius:10px;background:#ff4f87;color:white;text-decoration:none;font-weight:bold">${escapeHtml(copy.readAndReply)}</a>
          </p>
          <p style="font-size:13px;color:#756985">${escapeHtml(copy.replyInside)}</p>
        </div>
      </div>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        // The sender's name in the subject is what makes this feel personal
        // rather than automated, and it survives a notification list.
        subject: `${copy.subject(senderName)} — TutorPro English`,
        reply_to: sender?.email || undefined,
        html,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Email provider rejected the message: ${detail}`)
    }

    // Stamp only after a confirmed send, so a failure can be retried.
    await adminClient
      .from('direct_messages')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', message.id)

    return json({ delivered: true, to: recipientEmail })
  } catch (error) {
    return json({ delivered: false, error: String((error as Error).message || error) }, 400)
  }
})
