import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL') || 'TutorPro English <notifications@tutorpro.site>'
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
    const emails = [...new Set([student?.email || student?.login_id, teacher?.email || teacher?.login_id].filter((email) => typeof email === 'string' && email.includes('@')))]
    if (!emails.length) return new Response(JSON.stringify({ delivered: false, reason: 'No participant emails' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const eventLabels: Record<string, { en: string; zh: string }> = {
      requested: { en: 'New lesson request', zh: '新的课程预约申请' },
      confirmed: { en: 'Lesson confirmed', zh: '课程预约已确认' },
      cancelled: { en: 'Lesson cancelled', zh: '课程预约已取消' },
      restored: { en: 'Lesson restored', zh: '课程预约已恢复' },
      updated: { en: 'Lesson updated', zh: '课程预约已更新' },
    }
    const label = eventLabels[event]
    const start = new Date(`${booking.date}T${booking.time}:00+08:00`)
    const formattedDate = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(start)
    const calendar = createCalendar(booking, studentName, teacherName)
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#321568">
        <div style="padding:24px;border-radius:20px 20px 0 0;background:linear-gradient(120deg,#321568,#7048df);color:white">
          <h1 style="margin:0;font-size:26px">TutorPro English</h1><p style="margin:7px 0 0;color:#dff7a6">${label.en} · ${label.zh}</p>
        </div>
        <div style="padding:24px;border:1px solid #e5deef;border-top:0;border-radius:0 0 20px 20px">
          <h2 style="margin-top:0;color:#321568">${label.en}</h2><h3 style="color:#7048df">${label.zh}</h3>
          <p><b>Student:</b> ${escapeHtml(studentName)}</p><p><b>Teacher:</b> ${escapeHtml(teacherName)}</p>
          <p><b>Date and time:</b> ${escapeHtml(formattedDate)} (UTC+8)</p><p><b>Lesson:</b> ${escapeHtml(booking.focus || 'English lesson')} · ${Number(booking.duration || 25)} minutes</p>
          <p style="margin:22px 0"><a href="https://www.tutorpro.site" style="padding:12px 18px;border-radius:10px;background:#ff4f87;color:white;text-decoration:none;font-weight:bold">Open TutorPro English</a></p>
          <p style="font-size:13px;color:#756985">The attached calendar event includes reminders 30 minutes and 10 minutes before class.<br/>附件中的日历事件将在上课前30分钟和10分钟提醒您。</p>
        </div>
      </div>`

    const results = await Promise.all(emails.map(async (email) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: [email], subject: `TutorPro English — ${label.en}`, html, attachments: [{ filename: `TutorPro-English-${booking.date}.ics`, content: toBase64(calendar) }] }),
      })
      if (!response.ok) throw new Error(`Email delivery failed: ${await response.text()}`)
      return response.json()
    }))

    return new Response(JSON.stringify({ delivered: true, recipients: results.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
