/**
 * The wording of every booking email, in the recipient's own language.
 *
 * A direct port of supabase/functions/booking-notification/index.ts, minus
 * the Deno HTTP handler, so the same copy can be sent from a Vercel route
 * that deploys with every push. The Supabase original stays where it is for
 * anyone still running it; scripts/test-booking-email-language.mjs fails if
 * the two drift apart.
 *
 * One language per email. The bilingual English-plus-Chinese template this
 * replaced put both in every message, which is how a Philippine parent came
 * to receive Chinese in a booking confirmation.
 */
export const EMAIL_TEMPLATE_VERSION = 'single-language-2026-09'

/* Mirrors countryLanguages in src/AutoTranslate.jsx.
   scripts/test-booking-email-language.mjs fails if the two ever drift. */
const COUNTRY_LANGUAGES = {
  PH: 'en', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
  PL: 'pl',
}

/* Only used when a profile has no saved timezone: enough to put the reader
   on the right clock rather than defaulting everyone to Manila. */
const COUNTRY_TIME_ZONES = {
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


/* Short, factual strings only. Nothing here makes a claim or a promise, so
   there is nothing that can be mistranslated into something untrue. */
const COPY = {
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

function calendarDate(value) {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Which language this person reads. IP FIRST, by instruction.
 *
 *   1. `ipLanguage`     — worked out from the IP address on their last visit.
 *   2. `registrationCountry` — the IP country captured when they signed up.
 *   3. `preferredLanguage`   — a language they chose by hand in the picker.
 *   4. English.
 *
 * The hand-picked language is deliberately LAST. Someone who once clicked
 * Chinese to see what it looked like would otherwise receive Chinese
 * emails forever, which is exactly the complaint this function exists to
 * answer. Fails closed to English rather than sending a language the
 * reader cannot understand.
 */
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

/** Their own clock if we know it, otherwise our teaching base. */
export function timeZoneForProfile(profile) {
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

function offsetLabel(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(date)
    return parts.find((part) => part.type === 'timeZoneName')?.value || ''
  } catch {
    return ''
  }
}

export function createCalendar(booking, studentName, teacherName) {
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
export function buildEmail(options) {
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
