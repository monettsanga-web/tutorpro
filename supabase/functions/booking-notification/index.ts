import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Booking notification emails, written in the RECIPIENT'S OWN LANGUAGE.
 *
 * WHAT WAS WRONG
 * --------------
 * Every email was built once, in English AND Chinese, and that same body
 * was sent to everybody. A parent in the Philippines booking an English
 * lesson received a message half of which was in Chinese. It looked like
 * the site had sent them somebody else's mail.
 *
 * HOW THE LANGUAGE IS CHOSEN
 * --------------------------
 * Per recipient, in this order:
 *   1. `profile_data.preferredLanguage` — what the site last showed them,
 *      which is itself set from their IP address by AutoTranslate.
 *   2. The language of `profile_data.registrationCountry` — the country
 *      estimated from their IP when they signed up.
 *   3. English.
 *
 * The same source decides the timezone, so the lesson time is printed on
 * the clock the reader actually uses rather than always in Manila time.
 *
 * Nothing here is bilingual. One recipient, one language.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* Mirrors countryLanguages in src/AutoTranslate.jsx.
   scripts/test-booking-email-language.mjs fails if the two ever drift. */
const COUNTRY_LANGUAGES: Record<string, string> = {
  PH: 'en', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
  PL: 'pl',
}

/* Only used when a profile has no saved timezone: enough to put the reader
   on the right clock rather than defaulting everyone to Manila. */
const COUNTRY_TIME_ZONES: Record<string, string> = {
  PH: 'Asia/Manila', KR: 'Asia/Seoul', CN: 'Asia/Shanghai', TW: 'Asia/Taipei', HK: 'Asia/Hong_Kong',
  MO: 'Asia/Macau', JP: 'Asia/Tokyo', SG: 'Asia/Singapore', MY: 'Asia/Kuala_Lumpur', ID: 'Asia/Jakarta',
  VN: 'Asia/Ho_Chi_Minh', TH: 'Asia/Bangkok', IN: 'Asia/Kolkata', AE: 'Asia/Dubai', SA: 'Asia/Riyadh',
  QA: 'Asia/Qatar', EG: 'Africa/Cairo', PL: 'Europe/Warsaw', DE: 'Europe/Berlin', AT: 'Europe/Vienna',
  FR: 'Europe/Paris', ES: 'Europe/Madrid', PT: 'Europe/Lisbon', IT: 'Europe/Rome', NL: 'Europe/Amsterdam',
  GB: 'Europe/London', IE: 'Europe/Dublin', US: 'America/New_York', CA: 'America/Toronto',
  MX: 'America/Mexico_City', BR: 'America/Sao_Paulo', AR: 'America/Argentina/Buenos_Aires',
  CL: 'America/Santiago', CO: 'America/Bogota', PE: 'America/Lima', AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland', ZA: 'Africa/Johannesburg',
}

type Copy = {
  locale: string
  rtl?: boolean
  events: Record<string, string>
  student: string
  teacher: string
  when: string
  lesson: string
  minutes: string
  open: string
  reminder: string
  yourTime: string
  schoolTime: string
}

/* Short, factual strings only. Nothing here makes a claim or a promise, so
   there is nothing that can be mistranslated into something untrue. */
const COPY: Record<string, Copy> = {
  en: {
    locale: 'en',
    events: { requested: 'New lesson request', confirmed: 'Lesson confirmed', cancelled: 'Lesson cancelled', restored: 'Lesson restored', updated: 'Lesson updated' },
    student: 'Student', teacher: 'Teacher', when: 'Date and time', lesson: 'Lesson', minutes: 'minutes',
    open: 'Open TutorPro English',
    reminder: 'The attached calendar event includes reminders 30 minutes and 10 minutes before class.',
    yourTime: 'your time', schoolTime: 'Manila time',
  },
  tl: {
    locale: 'en',
    events: { requested: 'Bagong kahilingan sa klase', confirmed: 'Kumpirmado ang klase', cancelled: 'Kanselado ang klase', restored: 'Naibalik ang klase', updated: 'Na-update ang klase' },
    student: 'Mag-aaral', teacher: 'Guro', when: 'Petsa at oras', lesson: 'Klase', minutes: 'minuto',
    open: 'Buksan ang TutorPro English',
    reminder: 'May kalakip na calendar event na magpapaalala 30 minuto at 10 minuto bago ang klase.',
    yourTime: 'inyong oras', schoolTime: 'oras sa Manila',
  },
  ko: {
    locale: 'ko',
    events: { requested: '새 수업 신청', confirmed: '수업이 확정되었습니다', cancelled: '수업이 취소되었습니다', restored: '수업이 복구되었습니다', updated: '수업이 변경되었습니다' },
    student: '학생', teacher: '선생님', when: '날짜 및 시간', lesson: '수업', minutes: '분',
    open: 'TutorPro English 열기',
    reminder: '첨부된 일정에는 수업 30분 전과 10분 전 알림이 포함되어 있습니다.',
    yourTime: '현지 시간', schoolTime: '마닐라 시간',
  },
  'zh-CN': {
    locale: 'zh-CN',
    events: { requested: '新的课程预约申请', confirmed: '课程预约已确认', cancelled: '课程预约已取消', restored: '课程预约已恢复', updated: '课程预约已更新' },
    student: '学生', teacher: '老师', when: '日期和时间', lesson: '课程', minutes: '分钟',
    open: '打开 TutorPro English',
    reminder: '附件中的日历事件将在上课前30分钟和10分钟提醒您。',
    yourTime: '您的当地时间', schoolTime: '马尼拉时间',
  },
  'zh-TW': {
    locale: 'zh-TW',
    events: { requested: '新的課程預約申請', confirmed: '課程預約已確認', cancelled: '課程預約已取消', restored: '課程預約已恢復', updated: '課程預約已更新' },
    student: '學生', teacher: '老師', when: '日期與時間', lesson: '課程', minutes: '分鐘',
    open: '開啟 TutorPro English',
    reminder: '附件中的行事曆活動會在上課前30分鐘與10分鐘提醒您。',
    yourTime: '您的當地時間', schoolTime: '馬尼拉時間',
  },
  ja: {
    locale: 'ja',
    events: { requested: '新しいレッスンの申し込み', confirmed: 'レッスンが確定しました', cancelled: 'レッスンがキャンセルされました', restored: 'レッスンが復元されました', updated: 'レッスンが更新されました' },
    student: '生徒', teacher: '講師', when: '日時', lesson: 'レッスン', minutes: '分',
    open: 'TutorPro English を開く',
    reminder: '添付のカレンダー予定には、開始30分前と10分前のリマインダーが含まれます。',
    yourTime: '現地時間', schoolTime: 'マニラ時間',
  },
  es: {
    locale: 'es',
    events: { requested: 'Nueva solicitud de clase', confirmed: 'Clase confirmada', cancelled: 'Clase cancelada', restored: 'Clase restablecida', updated: 'Clase actualizada' },
    student: 'Estudiante', teacher: 'Profesor', when: 'Fecha y hora', lesson: 'Clase', minutes: 'minutos',
    open: 'Abrir TutorPro English',
    reminder: 'El evento de calendario adjunto incluye recordatorios 30 y 10 minutos antes de la clase.',
    yourTime: 'su hora local', schoolTime: 'hora de Manila',
  },
  pt: {
    locale: 'pt',
    events: { requested: 'Novo pedido de aula', confirmed: 'Aula confirmada', cancelled: 'Aula cancelada', restored: 'Aula restaurada', updated: 'Aula atualizada' },
    student: 'Aluno', teacher: 'Professor', when: 'Data e hora', lesson: 'Aula', minutes: 'minutos',
    open: 'Abrir TutorPro English',
    reminder: 'O evento de calendário anexado inclui lembretes 30 e 10 minutos antes da aula.',
    yourTime: 'sua hora local', schoolTime: 'hora de Manila',
  },
  fr: {
    locale: 'fr',
    events: { requested: 'Nouvelle demande de cours', confirmed: 'Cours confirmé', cancelled: 'Cours annulé', restored: 'Cours rétabli', updated: 'Cours mis à jour' },
    student: 'Élève', teacher: 'Professeur', when: 'Date et heure', lesson: 'Cours', minutes: 'minutes',
    open: 'Ouvrir TutorPro English',
    reminder: 'L\'événement de calendrier joint comprend des rappels 30 et 10 minutes avant le cours.',
    yourTime: 'votre heure locale', schoolTime: 'heure de Manille',
  },
  de: {
    locale: 'de',
    events: { requested: 'Neue Unterrichtsanfrage', confirmed: 'Unterricht bestätigt', cancelled: 'Unterricht abgesagt', restored: 'Unterricht wiederhergestellt', updated: 'Unterricht aktualisiert' },
    student: 'Schüler', teacher: 'Lehrkraft', when: 'Datum und Uhrzeit', lesson: 'Unterricht', minutes: 'Minuten',
    open: 'TutorPro English öffnen',
    reminder: 'Der angehängte Kalendereintrag erinnert 30 und 10 Minuten vor dem Unterricht.',
    yourTime: 'Ihre Ortszeit', schoolTime: 'Manila-Zeit',
  },
  vi: {
    locale: 'vi',
    events: { requested: 'Yêu cầu buổi học mới', confirmed: 'Buổi học đã được xác nhận', cancelled: 'Buổi học đã bị hủy', restored: 'Buổi học đã được khôi phục', updated: 'Buổi học đã được cập nhật' },
    student: 'Học viên', teacher: 'Giáo viên', when: 'Ngày và giờ', lesson: 'Buổi học', minutes: 'phút',
    open: 'Mở TutorPro English',
    reminder: 'Sự kiện lịch đính kèm có nhắc nhở trước buổi học 30 phút và 10 phút.',
    yourTime: 'giờ địa phương của bạn', schoolTime: 'giờ Manila',
  },
  th: {
    locale: 'th',
    events: { requested: 'คำขอเรียนใหม่', confirmed: 'ยืนยันคลาสเรียนแล้ว', cancelled: 'ยกเลิกคลาสเรียนแล้ว', restored: 'กู้คืนคลาสเรียนแล้ว', updated: 'อัปเดตคลาสเรียนแล้ว' },
    student: 'นักเรียน', teacher: 'ครูผู้สอน', when: 'วันและเวลา', lesson: 'คลาสเรียน', minutes: 'นาที',
    open: 'เปิด TutorPro English',
    reminder: 'กิจกรรมในปฏิทินที่แนบมาจะเตือน 30 นาที และ 10 นาทีก่อนเริ่มเรียน',
    yourTime: 'เวลาท้องถิ่นของคุณ', schoolTime: 'เวลามะนิลา',
  },
  pl: {
    locale: 'pl',
    events: { requested: 'Nowa prośba o lekcję', confirmed: 'Lekcja potwierdzona', cancelled: 'Lekcja odwołana', restored: 'Lekcja przywrócona', updated: 'Lekcja zaktualizowana' },
    student: 'Uczeń', teacher: 'Nauczyciel', when: 'Data i godzina', lesson: 'Lekcja', minutes: 'minut',
    open: 'Otwórz TutorPro English',
    reminder: 'Załączone wydarzenie w kalendarzu przypomni 30 i 10 minut przed lekcją.',
    yourTime: 'czas lokalny', schoolTime: 'czas w Manili',
  },
  ar: {
    locale: 'ar',
    rtl: true,
    events: { requested: 'طلب درس جديد', confirmed: 'تم تأكيد الدرس', cancelled: 'تم إلغاء الدرس', restored: 'تمت استعادة الدرس', updated: 'تم تحديث الدرس' },
    student: 'الطالب', teacher: 'المعلم', when: 'التاريخ والوقت', lesson: 'الدرس', minutes: 'دقيقة',
    open: 'افتح TutorPro English',
    reminder: 'يتضمن حدث التقويم المرفق تذكيرين قبل الدرس بـ 30 دقيقة و10 دقائق.',
    yourTime: 'توقيتك المحلي', schoolTime: 'توقيت مانيلا',
  },
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character)
}

function escapeIcs(value = '') {
  return String(value).replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;')
}

function calendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/** Fails closed to English rather than sending somebody a language they cannot read. */
export function languageForProfile(profile: Record<string, any> | undefined) {
  const data = profile?.profile_data || {}
  const preferred = String(data.preferredLanguage || '').trim()
  if (preferred && COPY[preferred]) return preferred
  const country = String(data.registrationCountry || '').toUpperCase()
  const fromCountry = COUNTRY_LANGUAGES[country]
  if (fromCountry && COPY[fromCountry]) return fromCountry
  return 'en'
}

/** Their own clock if we know it, otherwise our teaching base. */
export function timeZoneForProfile(profile: Record<string, any> | undefined) {
  const data = profile?.profile_data || {}
  const saved = String(data.timeZone || '')
  if (saved.includes('/')) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: saved })
      return saved
    } catch {
      // A corrupted value must not stop the email going out.
    }
  }
  const country = String(data.registrationCountry || '').toUpperCase()
  return COUNTRY_TIME_ZONES[country] || 'Asia/Manila'
}

function offsetLabel(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(date)
    return parts.find((part) => part.type === 'timeZoneName')?.value || ''
  } catch {
    return ''
  }
}

function createCalendar(booking: Record<string, any>, studentName: string, teacherName: string) {
  const start = new Date(`${booking.date}T${booking.time}:00+08:00`)
  const end = new Date(start.getTime() + (Number(booking.duration || 25) * 60000))
  const description = [
    `Student: ${studentName}`,
    `Teacher: ${teacherName}`,
    `Focus: ${booking.focus || 'English lesson'}`,
    booking.classroomId ? `Classroom ID: ${booking.classroomId}` : '',
    'Open TutorPro English: https://www.tutorpro.site',
  ].filter(Boolean).join('\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TutorPro English//Lesson Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${booking.id}@tutorpro.site`, `DTSTAMP:${calendarDate(new Date())}`, `DTSTART:${calendarDate(start)}`, `DTEND:${calendarDate(end)}`,
    `SUMMARY:${escapeIcs(`TutorPro English: ${booking.focus || 'English lesson'}`)}`, `DESCRIPTION:${escapeIcs(description)}`, 'LOCATION:TutorPro English Private Online Classroom',
    `STATUS:${booking.status === 'confirmed' ? 'CONFIRMED' : booking.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:TutorPro English lesson begins in 30 minutes', 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:TutorPro English lesson begins in 10 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}

/** One email, one language. */
export function buildEmail(options: {
  language: string
  timeZone: string
  event: string
  start: Date
  studentName: string
  teacherName: string
  focus: string
  duration: number
}) {
  const copy = COPY[options.language] || COPY.en
  const heading = copy.events[options.event] || copy.events.updated
  const when = new Intl.DateTimeFormat(copy.locale, {
    timeZone: options.timeZone,
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(options.start)
  const offset = offsetLabel(options.start, options.timeZone)
  const zoneNote = options.timeZone === 'Asia/Manila'
    ? `${copy.schoolTime}${offset ? ` · ${offset}` : ''}`
    : `${copy.yourTime}${offset ? ` · ${offset}` : ''}`
  const direction = copy.rtl ? 'rtl' : 'ltr'
  const align = copy.rtl ? 'right' : 'left'
  const html = `
      <div dir="${direction}" style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#321568;text-align:${align}">
        <div style="padding:24px;border-radius:20px 20px 0 0;background:linear-gradient(120deg,#321568,#7048df);color:white">
          <h1 style="margin:0;font-size:26px">TutorPro English</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5deef;border-top:0;border-radius:0 0 20px 20px">
          <h2 style="margin-top:0;color:#321568">${escapeHtml(heading)}</h2>
          <p><b>${escapeHtml(copy.student)}:</b> ${escapeHtml(options.studentName)}</p>
          <p><b>${escapeHtml(copy.teacher)}:</b> ${escapeHtml(options.teacherName)}</p>
          <p><b>${escapeHtml(copy.when)}:</b> ${escapeHtml(when)} <span style="color:#756985">(${escapeHtml(zoneNote)})</span></p>
          <p><b>${escapeHtml(copy.lesson)}:</b> ${escapeHtml(options.focus)} · ${options.duration} ${escapeHtml(copy.minutes)}</p>
          <p style="margin:22px 0"><a href="https://www.tutorpro.site" style="padding:12px 18px;border-radius:10px;background:#ff4f87;color:white;text-decoration:none;font-weight:bold">${escapeHtml(copy.open)}</a></p>
          <p style="font-size:13px;color:#756985">${escapeHtml(copy.reminder)}</p>
        </div>
      </div>`
  return { subject: `TutorPro English — ${heading}`, html }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL') || 'TutorPro English <notifications@tutorpro.site>'
    const replyTo = Deno.env.get('BOOKING_REPLY_TO') || 'sejongenglish@yahoo.com'
    if (!resendKey) throw new Error('RESEND_API_KEY is not configured')

    const authorization = request.headers.get('Authorization') || ''
    if (!authorization) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { bookingId, event = 'updated' } = await request.json()
    if (!bookingId || !['requested', 'confirmed', 'cancelled', 'restored', 'updated'].includes(event)) throw new Error('Invalid booking notification request')

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { data: row, error: bookingError } = await adminClient.from('bookings').select('*').eq('id', bookingId).single()
    if (bookingError || !row) throw new Error('Booking could not be loaded')
    const booking = { ...(row.booking_data || {}), id: row.id, studentId: row.student_id, teacherId: row.teacher_id, status: row.status }
    const { data: adminMember } = await adminClient.from('admin_members').select('user_id').eq('user_id', user.id).maybeSingle()
    if (user.id !== booking.studentId && user.id !== booking.teacherId && !adminMember) {
      return new Response(JSON.stringify({ error: 'Not authorized for this booking' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: profiles } = await adminClient.from('profiles').select('id,email,login_id,parent_name,full_name,profile_data').in('id', [booking.studentId, booking.teacherId])
    const student = profiles?.find((profile) => profile.id === booking.studentId)
    const teacher = profiles?.find((profile) => profile.id === booking.teacherId)
    const learner = student?.profile_data?.children?.find((child: any) => child.id === booking.learnerId) || student?.profile_data?.child
    const studentName = learner?.name || booking.learnerName || 'Student'
    const teacherName = teacher?.full_name || teacher?.profile_data?.fullName || booking.teacherName || 'TutorPro Teacher'

    /* Each participant is emailed separately, in their own language and on
       their own clock. Two recipients now mean two different messages. */
    const recipients: { email: string; profile: Record<string, any> | undefined }[] = []
    const seen = new Set<string>()
    for (const profile of [student, teacher]) {
      const email = profile?.email || profile?.login_id
      if (typeof email !== 'string' || !email.includes('@') || seen.has(email)) continue
      seen.add(email)
      recipients.push({ email, profile })
    }
    if (!recipients.length) return new Response(JSON.stringify({ delivered: false, reason: 'No participant emails' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const start = new Date(`${booking.date}T${booking.time}:00+08:00`)
    const calendar = createCalendar(booking, studentName, teacherName)

    const results = await Promise.all(recipients.map(async ({ email, profile }) => {
      const language = languageForProfile(profile)
      const { subject, html } = buildEmail({
        language,
        timeZone: timeZoneForProfile(profile),
        event,
        start,
        studentName,
        teacherName,
        focus: booking.focus || 'English lesson',
        duration: Number(booking.duration || 25),
      })
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          // notifications@tutorpro.site has no inbox, so replies must go
          // somewhere a person actually reads.
          reply_to: replyTo,
          subject,
          html,
          attachments: [{ filename: `TutorPro-English-${booking.date}.ics`, content: toBase64(calendar) }],
        }),
      })
      if (!response.ok) throw new Error(`Email delivery failed: ${await response.text()}`)
      return { email, language }
    }))

    return new Response(JSON.stringify({ delivered: true, recipients: results.length, languages: results.map((result) => result.language) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}
