import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Ban,
  Bell,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  Film,
  Flame,
  Gamepad2,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  UserRound,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import {
  addStudentLearner,
  createTeacherByAdmin,
  getAccountById,
  getAccounts,
  getApprovedTeachers,
  mergeCloudAccounts,
  removeStudentAccount,
  removeStudentLearner,
  updateAccount,
  updateLearnerAccess,
  updateLocalAccount,
  updateStudentProfile,
  updateTeacherProfile,
} from './auth.js'
import { createBooking, getBookings, getBookingStats, mergeCloudBookings, rateCompletedBooking, removeStudentBookingData, saveTeacherFeedback, syncBookingNow, updateBooking } from './bookings.js'
import { ProfilePhoto, IntroVideo } from './ProfileMedia.jsx'
import OnlineClassroom from './OnlineClassroom.jsx'
import RoleErrorBoundary from './RoleErrorBoundary.jsx'
import { deleteProfileMediaOwner, saveProfileMedia } from './media.js'
import { fetchCloudBookings, subscribeToCloudBookings } from './cloudBookings.js'
import { cloudSyncEnabled, fetchCloudProfiles, subscribeToCloudProfiles, updateCloudProfile, verifyCloudAdmin } from './cloudProfiles.js'
import { formatDateKey, HALF_HOUR_TIMES, makeSlotKey, minutesToTime, timeToMinutes, weekDates } from './schedule.js'

const StudentGames = lazy(() => import('./StudentGames.jsx'))
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`
const today = () => formatDateKey(new Date())
const displayName = (account) => account.parentName || account.fullName || 'TutorPro English user'
const initials = (name = '') => name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()

function withTimeout(promise, milliseconds, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => window.setTimeout(() => reject(new Error(message)), milliseconds)),
  ])
}

function formatLessonDate(date, time, includeYear = false) {
  if (!date) return 'Date to be confirmed'
  const value = new Date(`${date}T${time || '00:00'}`)
  return value.toLocaleDateString('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  })
}

function formatTime(time) {
  if (!time) return ''
  return new Date(`2026-01-01T${time}`).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
}

function StatusBadge({ status }) {
  return <span className={`portal-status portal-status--${status}`}>{status}</span>
}

function EmptyState({ icon: Icon = CalendarDays, title, text, action, actionLabel }) {
  return (
    <div className="portal-empty">
      <span><Icon size={25} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <button className="portal-text-button" onClick={action}>{actionLabel} <ArrowRight size={15} /></button>}
    </div>
  )
}

function ScheduleCalendar({
  weekOffset,
  onWeekOffset,
  availabilitySlots = [],
  bookings = [],
  editable = false,
  onPaint,
  selectedLesson,
  onSelect,
  duration = 25,
}) {
  const dates = weekDates(weekOffset)
  const available = new Set(availabilitySlots)
  const dragState = useRef(null)
  const scrollRef = useRef(null)
  const activeBookings = bookings.filter((booking) => !['cancelled', 'declined'].includes(booking.status))
  const occupied = new Map()

  activeBookings.forEach((booking) => {
    const start = timeToMinutes(booking.time)
    const count = Math.ceil(Number(booking.duration) / 30)
    for (let index = 0; index < count; index += 1) {
      occupied.set(`${booking.date}-${minutesToTime(start + (index * 30))}`, { booking, isStart: index === 0 })
    }
  })

  useEffect(() => {
    const finishDrag = () => { dragState.current = null }
    document.addEventListener('pointerup', finishDrag)
    document.addEventListener('pointercancel', finishDrag)
    if (scrollRef.current) scrollRef.current.scrollTop = 7.5 * 62
    return () => {
      document.removeEventListener('pointerup', finishDrag)
      document.removeEventListener('pointercancel', finishDrag)
    }
  }, [])

  const weekStart = dates[0]
  const weekEnd = dates[6]
  const rangeLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const applyPaint = (slotKey, shouldAdd) => {
    if (!editable || !onPaint) return
    onPaint(slotKey, shouldAdd)
  }

  const startPaint = (event, slotKey, isBooked) => {
    if (!editable || isBooked || event.button !== 0) return
    event.preventDefault()
    const shouldAdd = !available.has(slotKey)
    dragState.current = { shouldAdd }
    applyPaint(slotKey, shouldAdd)
  }

  const continuePaint = (slotKey, isBooked) => {
    if (!editable || isBooked || !dragState.current) return
    applyPaint(slotKey, dragState.current.shouldAdd)
  }

  const canSelect = (dayIndex, dateKey, time) => {
    if (!onSelect) return false
    const start = timeToMinutes(time)
    const count = Math.ceil(Number(duration) / 30)
    const now = new Date()
    if (new Date(`${dateKey}T${time}:00`) <= now) return false
    for (let index = 0; index < count; index += 1) {
      const slotTime = minutesToTime(start + (index * 30))
      if ((start + (index * 30)) >= 1440) return false
      if (!available.has(makeSlotKey(dayIndex, slotTime))) return false
      if (occupied.has(`${dateKey}-${slotTime}`)) return false
    }
    return true
  }

  const selectedCells = new Set()
  if (selectedLesson?.date && selectedLesson?.time) {
    const start = timeToMinutes(selectedLesson.time)
    const count = Math.ceil(Number(selectedLesson.duration || duration) / 30)
    for (let index = 0; index < count; index += 1) {
      selectedCells.add(`${selectedLesson.date}-${minutesToTime(start + (index * 30))}`)
    }
  }

  return (
    <div className="schedule-calendar">
      <div className="schedule-toolbar">
        <div className="schedule-toolbar__arrows">
          <button onClick={() => onWeekOffset(weekOffset - 1)} aria-label="Previous week"><ChevronLeft size={19} /></button>
          <button onClick={() => onWeekOffset(weekOffset + 1)} aria-label="Next week"><ChevronRight size={19} /></button>
        </div>
        <strong>{rangeLabel}</strong>
        <button className="schedule-today" onClick={() => onWeekOffset(0)}>Today</button>
        <div className="schedule-view-tabs"><span className="active">Week</span><span>30 min slots</span></div>
      </div>
      <div className="schedule-scroll" ref={scrollRef}>
        <div className="schedule-days">
          <div className="schedule-time-heading">UTC+8</div>
          {dates.map((date) => {
            const dateKey = formatDateKey(date)
            const current = dateKey === today()
            return <div className={`schedule-day-heading ${current ? 'current' : ''}`} key={dateKey}><span>{date.toLocaleDateString('en', { weekday: 'short' })}</span><strong>{date.getDate()}</strong></div>
          })}
        </div>
        <div className={`schedule-body ${editable ? 'schedule-body--editable' : ''}`}>
          {HALF_HOUR_TIMES.map((time) => (
            <div className="schedule-row" key={time}>
              <div className={`schedule-time ${time.endsWith(':30') ? 'half' : ''}`}>{time}</div>
              {dates.map((date, dayIndex) => {
                const dateKey = formatDateKey(date)
                const slotKey = makeSlotKey(dayIndex, time)
                const bookingCell = occupied.get(`${dateKey}-${time}`)
                const isAvailable = available.has(slotKey)
                const selectable = canSelect(dayIndex, dateKey, time)
                const isSelected = selectedCells.has(`${dateKey}-${time}`)
                const isPast = new Date(`${dateKey}T${time}:00`) <= new Date()
                const student = bookingCell ? getAccountById(bookingCell.booking.studentId) : null
                const bookedLearner = student?.children?.find((item) => item.id === bookingCell?.booking.learnerId) || student?.child
                const classes = [
                  'schedule-cell',
                  isAvailable ? 'available' : 'unavailable',
                  bookingCell ? 'booked' : '',
                  bookingCell?.isStart ? 'booking-start' : '',
                  selectable ? 'selectable' : '',
                  isSelected ? 'selected' : '',
                  isPast && !editable ? 'past' : '',
                ].filter(Boolean).join(' ')
                return (
                  <button
                    type="button"
                    className={classes}
                    key={`${dateKey}-${time}`}
                    aria-label={`${date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })} ${time}${isAvailable ? ', available' : ', unavailable'}`}
                    aria-pressed={editable ? isAvailable : isSelected}
                    disabled={!editable && !selectable && !isSelected}
                    onPointerDown={(event) => startPaint(event, slotKey, Boolean(bookingCell))}
                    onPointerEnter={() => continuePaint(slotKey, Boolean(bookingCell))}
                    onClick={(event) => {
                      if (editable && event.detail === 0 && !bookingCell) applyPaint(slotKey, !isAvailable)
                      if (!editable && selectable) onSelect({ date: dateKey, time })
                    }}
                  >
                    {bookingCell?.isStart && <span><strong>{bookedLearner?.name || 'Booked lesson'}</strong><small>{bookingCell.booking.focus}</small></span>}
                    {!editable && selectable && !bookingCell && <i>Available</i>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="schedule-legend">
        <span><i className="legend-dot legend-dot--available" />Available</span>
        <span><i className="legend-dot legend-dot--selected" />Selected</span>
        <span><i className="legend-dot legend-dot--booked" />Booked</span>
        <span><i className="legend-dot legend-dot--unavailable" />Unavailable</span>
      </div>
    </div>
  )
}

function PortalShell({ account, role, active, onActive, onHome, onLogout, navItems, children, adminPreview = false, mediaVersion = 0 }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const roleLabels = { student: 'Student space', teacher: 'Teacher studio', admin: 'Admin control' }

  const chooseNav = (id) => {
    onActive(id)
    setMobileOpen(false)
  }

  return (
    <div className={`portal portal--${role}`}>
      {adminPreview && (
        <div className="admin-preview-pill">
          <span><ShieldCheck size={17} /></span>
          <div><strong>Administrator access</strong><small>Viewing {displayName(account)}’s {role} dashboard</small></div>
          <button onClick={onHome}>Return to admin</button>
        </div>
      )}
      <aside className={`portal-sidebar ${mobileOpen ? 'portal-sidebar--open' : ''}`}>
        <div className="portal-brand">
          <img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="TutorPro English panda mascot" />
          <div><strong>Tutor<span>Pro</span> English</strong><small>{roleLabels[role]}</small></div>
        </div>
        <nav className="portal-nav" aria-label={`${roleLabels[role]} navigation`}>
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button className={active === id ? 'active' : ''} key={id} onClick={() => chooseNav(id)}>
              <Icon size={19} /><span>{label}</span>{badge > 0 && <i>{badge}</i>}
            </button>
          ))}
        </nav>
        <div className="portal-sidebar__foot">
          <button onClick={onHome}><Home size={18} /> {adminPreview ? 'Return to admin' : 'Website home'}</button>
          {!adminPreview && <button onClick={onLogout}><LogOut size={18} /> Log out</button>}
          <div className="portal-mini-user">
            <ProfilePhoto accountId={account.id} name={displayName(account)} refreshKey={mediaVersion} className="portal-avatar-media" />
            <div><strong>{displayName(account)}</strong><small>{account.loginId || account.email}</small></div>
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="portal-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <div className="portal-main">
        <header className="portal-topbar">
          <button className="portal-menu" onClick={() => setMobileOpen(true)} aria-label="Open dashboard navigation"><Menu size={22} /></button>
          <div><span>{roleLabels[role]}</span><strong>{navItems.find((item) => item.id === active)?.label}</strong></div>
          <div className="portal-topbar__actions">
            <button aria-label="Notifications"><Bell size={19} /><i /></button>
            <button className="portal-user-chip" onClick={() => onActive('profile')}>
              <ProfilePhoto accountId={account.id} name={displayName(account)} refreshKey={mediaVersion} className="portal-avatar-media" />
              <div><strong>{displayName(account).split(' ')[0]}</strong><small>{role}</small></div>
            </button>
          </div>
        </header>
        <main className="portal-content">{children}</main>
      </div>
    </div>
  )
}

function BookingCard({ booking, showStudent = false, showTeacher = false, actions, onEnterClassroom }) {
  const student = getAccountById(booking.studentId)
  const teacher = getAccountById(booking.teacherId)
  const learner = student?.children?.find((item) => item.id === booking.learnerId) || student?.child
  const person = showStudent ? learner?.name : showTeacher ? teacher?.fullName : ''
  const classroom = teacher?.teacher?.classroom || {}
  const meetingPlatform = classroom.platform === 'voov' ? 'VooV' : 'Zoom'
  const meetingLink = classroom.platform === 'voov' ? classroom.voovLink : classroom.zoomLink

  return (
    <article className="lesson-card">
      <div className="lesson-card__date">
        <strong>{new Date(`${booking.date}T00:00`).getDate()}</strong>
        <span>{new Date(`${booking.date}T00:00`).toLocaleDateString('en', { month: 'short' })}</span>
      </div>
      <div className="lesson-card__main">
        <div className="lesson-card__top"><StatusBadge status={booking.status} /><span>{booking.duration} min</span></div>
        <h3>{booking.focus}</h3>
        <p>{person && <strong>{person} · </strong>}{formatLessonDate(booking.date, booking.time)} at {formatTime(booking.time)}</p>
        {booking.status === 'confirmed' && <div className="lesson-classroom-actions">{onEnterClassroom && <button className="tutorpro-classroom-link" onClick={() => onEnterClassroom(booking)}><Video size={14} /> Enter private classroom <ShieldCheck size={11} /></button>}{meetingLink ? <a className="private-class-link" href={meetingLink} target="_blank" rel="noopener noreferrer"><Video size={13} /> {meetingPlatform} fallback</a> : <span className="meeting-link-pending"><Clock3 size={12} /> External meeting link not configured</span>}</div>}
        {booking.teacherNote && <small>Lesson note: {booking.teacherNote}</small>}
        {booking.teacherFeedback && <div className="lesson-feedback-preview"><strong><MessageSquareText size={12} /> Teacher feedback</strong><span>{booking.teacherFeedback.summary}</span>{booking.teacherFeedback.nextStep && <small>Next: {booking.teacherFeedback.nextStep}</small>}</div>}
        {booking.studentRating && <div className="lesson-rating-preview"><Star size={12} fill="currentColor" /> {booking.studentRating.score}/5 {booking.studentRating.comment && <span>“{booking.studentRating.comment}”</span>}</div>}
      </div>
      {actions && <div className="lesson-card__actions">{actions}</div>}
    </article>
  )
}

function BookLessonPanel({ account, learner: learnerProp, onBooked, adminBooking = false }) {
  const teachers = getApprovedTeachers()
  const learner = learnerProp || account.child
  const [form, setForm] = useState({ teacherId: account.preferredTeacherId || '', date: '', time: '', duration: '25', focus: learner.goal, note: '' })
  const [weekOffset, setWeekOffset] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const selectedTeacherId = teachers.some((teacher) => teacher.id === form.teacherId) ? form.teacherId : teachers[0]?.id || ''
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId)
  const teacherBookings = selectedTeacherId ? getBookings({ teacherId: selectedTeacherId }) : []

  const update = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(['teacherId', 'duration'].includes(name) ? { date: '', time: '' } : {}),
    }))
    setError('')
    setSuccess(false)
  }

  const selectSlot = ({ date, time }) => {
    setForm((current) => ({ ...current, date, time }))
    setError('')
    setSuccess(false)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!selectedTeacherId || !form.date || !form.time || !form.focus) {
      setError('Choose an available time on the calendar to continue.')
      return
    }
    try {
      let booking = createBooking({ ...form, teacherId: selectedTeacherId, studentId: account.id, learnerId: learner.id, learnerName: learner.name, learnerProfile: learner })
      if (adminBooking) booking = updateBooking(booking.id, { status: 'confirmed' })
      if (cloudSyncEnabled()) await withTimeout(syncBookingNow(booking), 10000, 'The shared booking database did not respond in time.')
      setSuccess(true)
      setForm((current) => ({ ...current, date: '', time: '', note: '' }))
      onBooked()
    } catch (bookingError) {
      setError(bookingError.message)
    }
  }

  if (account.status === 'suspended') {
    return (
      <div className="portal-view">
        <div className="portal-page-heading"><div><span className="portal-kicker">Family account access</span><h1>Account suspended</h1><p>All student profiles in this family account are temporarily paused.</p></div></div>
        <section className="student-suspended-card"><span><Ban size={30} /></span><div><small>Family account · Suspended</small><h2>{learner.name} cannot book while this account is suspended.</h2><p>Contact the TutorPro English administrator to restore access.</p>{adminBooking && <button className="portal-primary-button" onClick={() => { updateAccount(account.id, { status: 'active' }); onBooked() }}>Restore family account <UserCheck size={16} /></button>}</div></section>
      </div>
    )
  }

  if (learner.accessStatus === 'suspended') {
    return (
      <div className="portal-view">
        <div className="portal-page-heading"><div><span className="portal-kicker">Student access</span><h1>Profile suspended</h1><p>This learner cannot schedule or enter new classes while suspended.</p></div></div>
        <section className="student-suspended-card"><span><Ban size={30} /></span><div><small>Student status · Suspended</small><h2>{learner.name}’s learning profile is paused.</h2><p>Please contact the TutorPro English administrator to restore booking and classroom access.</p>{adminBooking && <button className="portal-primary-button" onClick={() => { updateLearnerAccess(account.id, learner.id, 'active'); onBooked() }}>Restore {learner.name} <UserCheck size={16} /></button>}</div></section>
      </div>
    )
  }



  return (
    <div className="portal-view">
      <div className="portal-page-heading">
        <div><span className="portal-kicker">Live availability</span><h1>Book a class</h1><p>Only teacher-approved times can be selected. Every row is a 30-minute calendar slot.</p></div>
      </div>
      <section className="portal-card booking-calendar-card">
        <div className="booking-controls">
          <label><span>Teacher</span><select name="teacherId" value={selectedTeacherId} onChange={update}>{teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.fullName} · {teacher.teacher.specialization}</option>)}</select></label>
          <label><span>Lesson focus</span><select name="focus" value={form.focus} onChange={update}><option>Speaking with confidence</option><option>Reading comprehension</option><option>Writing and grammar</option><option>Schoolwork and exam support</option><option>Build an all-round foundation</option></select></label>
          <fieldset className="compact-duration"><legend>Lesson length</legend><div>{['25', '50'].map((duration) => <label className={form.duration === duration ? 'selected' : ''} key={duration}><input type="radio" name="duration" value={duration} checked={form.duration === duration} onChange={update} /><span>{duration} min</span></label>)}</div></fieldset>
        </div>

        {success && <div className="portal-success"><CheckCircle2 size={18} /><div><strong>{adminBooking ? 'Lesson booked and confirmed!' : 'Lesson requested!'}</strong><span>{adminBooking ? 'The student and teacher calendars are now reserved.' : 'The selected slot is now reserved while confirmation is pending.'}</span></div></div>}
        {error && <div className="portal-error" role="alert">{error}</div>}

        {teachers.length && selectedTeacher ? (
          <ScheduleCalendar
            weekOffset={weekOffset}
            onWeekOffset={setWeekOffset}
            availabilitySlots={selectedTeacher.teacher.availabilitySlots || []}
            bookings={teacherBookings}
            duration={Number(form.duration)}
            selectedLesson={form}
            onSelect={selectSlot}
          />
        ) : (
          <EmptyState icon={Users} title="Teachers are being prepared" text="An administrator needs to approve a teacher before new lessons can be requested." />
        )}

        <form className="booking-confirm-bar" onSubmit={submit}>
          <div className={form.date && form.time ? 'selected' : ''}>
            <span className="portal-card__icon"><Clock3 size={21} /></span>
            <div><small>{form.date && form.time ? 'Selected lesson' : 'Choose an available slot'}</small><strong>{form.date && form.time ? `${formatLessonDate(form.date, form.time, true)} at ${formatTime(form.time)}` : 'No time selected yet'}</strong><em>{form.duration} min lesson · {form.duration === '50' ? 'uses 2 calendar slots' : 'uses 1 calendar slot'}</em></div>
          </div>
          <label><span>Note <i>optional</i></span><input name="note" value={form.note} onChange={update} placeholder="Note for the teacher" /></label>
          <button className="portal-primary-button" type="submit" disabled={!form.date || !form.time}>{adminBooking ? 'Book and confirm' : 'Request lesson'} <ArrowRight size={17} /></button>
        </form>
      </section>
    </div>
  )
}

function RatingDialog({ booking, studentId, onClose, onSaved }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const teacher = getAccountById(booking.teacherId)

  const submit = (event) => {
    event.preventDefault()
    try {
      rateCompletedBooking(booking.id, studentId, rating, comment)
      onSaved()
    } catch (ratingError) {
      setError(ratingError.message)
    }
  }

  return (
    <div className="portal-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="portal-dialog rating-dialog" role="dialog" aria-modal="true" aria-labelledby="rating-title">
        <button className="portal-dialog__close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <span className="rating-dialog__icon"><Star size={29} fill="currentColor" /></span>
        <span className="portal-kicker">Class complete</span>
        <h2 id="rating-title">How was the lesson with {teacher?.fullName || 'your teacher'}?</h2>
        <p>Your rating helps families choose the right teacher and helps TutorPro English keep every class excellent.</p>
        {error && <div className="portal-error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <div className="rating-stars" role="group" aria-label="Lesson rating">{[1, 2, 3, 4, 5].map((score) => <button type="button" className={score <= rating ? 'active' : ''} onClick={() => setRating(score)} key={score} aria-label={`${score} star${score > 1 ? 's' : ''}`}><Star size={30} fill={score <= rating ? 'currentColor' : 'none'} /></button>)}</div>
          <label><span>Share a short comment <i>optional</i></span><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What did your child enjoy or learn?" /></label>
          <button className="portal-primary-button" type="submit" disabled={!rating}>Submit class rating <ArrowRight size={16} /></button>
        </form>
      </section>
    </div>
  )
}

function FeedbackDialog({ booking, teacherId, onClose, onSaved }) {
  const student = getAccountById(booking.studentId)
  const learner = student?.children?.find((item) => item.id === booking.learnerId) || student?.child
  const existing = booking.teacherFeedback || {}
  const [form, setForm] = useState({ summary: existing.summary || '', strength: existing.strength || '', nextStep: existing.nextStep || '', homework: existing.homework || '' })
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    try {
      saveTeacherFeedback(booking.id, teacherId, form)
      onSaved(booking.status !== 'completed')
    } catch (feedbackError) {
      setError(feedbackError.message)
    }
  }

  return (
    <div className="portal-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="portal-dialog feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <button className="portal-dialog__close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="portal-dialog__heading"><span><MessageSquareText size={23} /></span><div><small>Post-class feedback</small><h2 id="feedback-title">Feedback for {learner?.name || 'the student'}</h2><p>Parents will see this feedback in the completed lesson and student dashboard.</p></div></div>
        {error && <div className="portal-error" role="alert">{error}</div>}
        <form className="feedback-form" onSubmit={submit}>
          <label><span>Class summary *</span><textarea autoFocus value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="What did you cover and how did the student participate?" /></label>
          <div><label><span>Strength shown</span><input value={form.strength} onChange={(event) => setForm((current) => ({ ...current, strength: event.target.value }))} placeholder="e.g. Clear spoken answers" /></label><label><span>Next learning step</span><input value={form.nextStep} onChange={(event) => setForm((current) => ({ ...current, nextStep: event.target.value }))} placeholder="e.g. Use richer vocabulary" /></label></div>
          <label><span>Optional homework</span><input value={form.homework} onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))} placeholder="A short practice task for next class" /></label>
          <div className="portal-dialog__actions"><button type="button" className="portal-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="portal-primary-button">Save feedback & complete class <Check size={16} /></button></div>
        </form>
      </section>
    </div>
  )
}

function AddStudentDialog({ account, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', year: '', curriculum: 'Cambridge', goal: 'Speaking with confidence', frequency: '1–2 weekly' })
  const [error, setError] = useState('')

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  const submit = (event) => {
    event.preventDefault()
    if (form.name.trim().length < 2 || !form.year) {
      setError('Add the student name and school year.')
      return
    }
    try {
      const updated = addStudentLearner(account.id, form)
      onAdded(updated, updated.children[updated.children.length - 1].id)
    } catch (addError) {
      setError(addError.message)
    }
  }

  return (
    <div className="portal-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="portal-dialog add-student-dialog" role="dialog" aria-modal="true" aria-labelledby="add-student-title">
        <button className="portal-dialog__close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="portal-dialog__heading"><span><GraduationCap size={23} /></span><div><small>Family learning profile</small><h2 id="add-student-title">Add another student</h2><p>One parent account can manage up to three individual learners, schedules and progress profiles.</p></div></div>
        {error && <div className="portal-error" role="alert">{error}</div>}
        <form className="admin-teacher-form" onSubmit={submit}>
          <div className="admin-teacher-form__row"><label><span>Student name</span><input autoFocus name="name" value={form.name} onChange={update} placeholder="First name" /></label><label><span>School year</span><select name="year" value={form.year} onChange={update}><option value="">Choose year</option>{Array.from({ length: 11 }, (_, index) => <option key={index}>Year {index + 1}</option>)}</select></label></div>
          <div className="admin-teacher-form__row"><label><span>Curriculum</span><select name="curriculum" value={form.curriculum} onChange={update}><option>Cambridge</option><option>Oxford</option><option>Not sure yet</option></select></label><label><span>Lesson rhythm</span><select name="frequency" value={form.frequency} onChange={update}><option>1–2 weekly</option><option>4–5 weekly</option><option>Not sure</option></select></label></div>
          <label><span>Main learning goal</span><select name="goal" value={form.goal} onChange={update}><option>Speaking with confidence</option><option>Reading comprehension</option><option>Writing and grammar</option><option>Schoolwork and exam support</option><option>Build an all-round foundation</option></select></label>
          <div className="portal-dialog__actions"><button type="button" className="portal-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="portal-primary-button"><Plus size={16} /> Add student profile</button></div>
        </form>
      </section>
    </div>
  )
}

export function StudentDashboard({ account: initialAccount, onAccountChange, onHome, onLogout, adminPreview = false, initialLearnerId = '' }) {
  const [active, setActive] = useState('overview')
  const [account, setAccount] = useState(initialAccount)
  const [activeLearnerId, setActiveLearnerId] = useState(initialLearnerId || initialAccount.children?.[0]?.id || initialAccount.child?.id || '')
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [bookingVersion, setBookingVersion] = useState(0)
  const [lessonsWeek, setLessonsWeek] = useState(0)
  const [mediaVersion, setMediaVersion] = useState(0)
  const [mediaError, setMediaError] = useState('')
  const [ratingBooking, setRatingBooking] = useState(null)
  const [classroomBooking, setClassroomBooking] = useState(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const learners = (account.children?.length ? account.children : [account.child]).filter(Boolean)
  const hasLearnerProfile = learners.length > 0
  const learner = learners.find((item) => item.id === activeLearnerId) || learners[0] || {
    id: 'profile-setup',
    name: 'New Student',
    year: 'Not selected',
    curriculum: 'Not selected',
    goal: 'Speaking with confidence',
    frequency: '1–2 weekly',
    accessStatus: 'active',
    progress: 0,
    streak: 0,
    lessonsCompleted: 0,
    achievements: [],
  }
  const [profile, setProfile] = useState({ goal: learner.goal, frequency: learner.frequency })
  const allBookings = getBookings({ studentId: account.id })
  const bookings = hasLearnerProfile
    ? allBookings.filter((booking) => booking.learnerId ? booking.learnerId === learner.id : learner.id === learners[0]?.id)
    : []
  const upcoming = bookings.find((booking) => booking.date >= today() && ['pending', 'confirmed'].includes(booking.status))
  const completed = bookings.filter((booking) => booking.status === 'completed').length
  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length
  const studentSyncCallbacks = useRef({ onAccountChange, onLogout })
  void bookingVersion

  useEffect(() => {
    studentSyncCallbacks.current = { onAccountChange, onLogout }
  }, [onAccountChange, onLogout])

  useEffect(() => {
    const synchronize = () => {
      const latest = getAccountById(initialAccount.id)
      if (!latest) {
        studentSyncCallbacks.current.onLogout()
        return
      }
      const currentStillExists = latest.children?.some((item) => item.id === activeLearnerId)
      setAccount(latest)
      studentSyncCallbacks.current.onAccountChange(latest)
      if (!currentStillExists && latest.children?.[0]) {
        const nextLearner = latest.children[0]
        setActiveLearnerId(nextLearner.id)
        setProfile({ goal: nextLearner.goal, frequency: nextLearner.frequency })
      }
    }
    window.addEventListener('storage', synchronize)
    window.addEventListener('tutorpro:data-change', synchronize)
    window.addEventListener('focus', synchronize)
    const interval = window.setInterval(synchronize, 3000)
    return () => {
      window.removeEventListener('storage', synchronize)
      window.removeEventListener('tutorpro:data-change', synchronize)
      window.removeEventListener('focus', synchronize)
      window.clearInterval(interval)
    }
  }, [initialAccount.id, activeLearnerId])

  useEffect(() => {
    if (!cloudSyncEnabled()) return undefined
    let active = true
    const synchronizeCloud = async () => {
      try {
        const [profiles, sharedBookings] = await Promise.all([fetchCloudProfiles(), fetchCloudBookings()])
        if (active) {
          mergeCloudAccounts(profiles)
          mergeCloudBookings(sharedBookings)
        }
      } catch {
        // The local profile remains usable while cloud connectivity recovers.
      }
    }
    synchronizeCloud()
    const unsubscribeProfiles = subscribeToCloudProfiles(synchronizeCloud)
    const unsubscribeBookings = subscribeToCloudBookings(synchronizeCloud)
    const interval = window.setInterval(synchronizeCloud, 5000)
    return () => {
      active = false
      unsubscribeProfiles()
      unsubscribeBookings()
      window.clearInterval(interval)
    }
  }, [])

  const chooseLearner = (learnerId) => {
    const nextLearner = learners.find((item) => item.id === learnerId)
    if (!nextLearner) return
    setActiveLearnerId(learnerId)
    setProfile({ goal: nextLearner.goal, frequency: nextLearner.frequency })
    setMediaError('')
  }

  const finishAddingStudent = (updatedAccount, learnerId) => {
    const nextLearner = updatedAccount.children.find((item) => item.id === learnerId)
    setAccount(updatedAccount)
    onAccountChange(updatedAccount)
    setShowAddStudent(false)
    setActiveLearnerId(learnerId)
    if (nextLearner) setProfile({ goal: nextLearner.goal, frequency: nextLearner.frequency })
  }

  const uploadStudentPhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMediaError('')
    try {
      await saveProfileMedia(`${account.id}-${learner.id}`, 'avatar', file)
      setMediaVersion((value) => value + 1)
    } catch (uploadError) {
      setMediaError(uploadError.message)
    }
    event.target.value = ''
  }

  const saveProfile = () => {
    const updated = updateStudentProfile(account.id, profile, learner.id)
    setAccount(updated)
    onAccountChange(updated)
    setProfileSaved(true)
    window.setTimeout(() => setProfileSaved(false), 2200)
  }

  const cancel = (bookingId) => {
    updateBooking(bookingId, { status: 'cancelled' })
    setBookingVersion((value) => value + 1)
  }

  const earnGameStars = (stars) => {
    const latestAccount = getAccountById(account.id)
    const latestLearner = latestAccount.children.find((item) => item.id === learner.id) || latestAccount.child
    const nextTotal = (latestLearner.gameStars || 0) + stars
    const achievements = nextTotal >= 10 ? [...new Set([...(latestLearner.achievements || []), 'Game champion'])] : latestLearner.achievements
    const updated = updateStudentProfile(account.id, { gameStars: nextTotal, achievements }, learner.id)
    setAccount(updated)
    onAccountChange(updated)
  }

  const nav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'book', label: 'Book a class', icon: CalendarPlus },
    { id: 'lessons', label: 'My lessons', icon: CalendarDays, badge: pendingCount },
    { id: 'games', label: 'English games', icon: Gamepad2 },
    { id: 'profile', label: 'My profile', icon: UserRound },
  ]

  if (!hasLearnerProfile) {
    return (
      <PortalShell account={account} role="student" active="profile" onActive={() => {}} onHome={onHome} onLogout={onLogout} navItems={[{ id: 'profile', label: 'Profile setup', icon: UserRound }]} adminPreview={adminPreview}>
        <div className="portal-view incomplete-profile-view"><section className="portal-card incomplete-profile-card"><span><GraduationCap size={31} /></span><small>Profile setup required</small><h1>Finish this student registration</h1><p>The account is connected, but its learner details are incomplete. Add the student name, school year, curriculum and learning goal to open the dashboard.</p><button className="portal-primary-button" onClick={() => setShowAddStudent(true)}><Plus size={17} /> Add student profile</button></section>{showAddStudent && <AddStudentDialog account={account} onClose={() => setShowAddStudent(false)} onAdded={finishAddingStudent} />}</div>
      </PortalShell>
    )
  }

  if (classroomBooking) return <OnlineClassroom booking={classroomBooking} account={account} onExit={() => setClassroomBooking(null)} />

  return (
    <PortalShell account={account} role="student" active={active} onActive={setActive} onHome={onHome} onLogout={onLogout} navItems={nav} adminPreview={adminPreview} mediaVersion={mediaVersion}>
      <div className="family-student-switcher">
        <div><span>Learning as</span>{learners.map((item) => <button className={item.id === learner.id ? 'active' : ''} key={item.id} onClick={() => chooseLearner(item.id)}><ProfilePhoto accountId={`${account.id}-${item.id}`} name={item.name} refreshKey={mediaVersion} className="learner-tab-photo" /><span>{item.name}<small className={account.status === 'suspended' || item.accessStatus === 'suspended' ? 'access-mini access-mini--suspended' : 'access-mini access-mini--active'}>{account.status === 'suspended' || item.accessStatus === 'suspended' ? 'suspended' : 'active'}</small></span></button>)}</div>
        {learners.length < 3 && <button className="add-student-button" onClick={() => setShowAddStudent(true)}><Plus size={15} /> Add student <small>{learners.length}/3</small></button>}
      </div>
      {active === 'overview' && (
        <div className="portal-view">
          <section className="student-welcome">
            <div>
              <span className="portal-kicker">Welcome back, {account.parentName.split(' ')[0]}</span>
              <h1>{learner.name} is building something brilliant.</h1>
              <p>Every lesson is another step toward confident, clear English.</p>
              <button className="portal-primary-button" onClick={() => setActive('book')}>Book the next class <ArrowRight size={17} /></button>
            </div>
            <div className="student-welcome__profile">
              <div className="progress-ring" style={{ '--progress': `${learner.progress || 18}%` }}><span><strong>{learner.progress || 18}%</strong><small>term goal</small></span></div>
              <div><span>Current pathway</span><strong>{learner.curriculum} · {learner.year}</strong><small>{learner.level || 'Building foundations'}</small></div>
            </div>
            <img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="TutorPro English panda mascot" />
          </section>

          <div className="portal-stat-grid">
            <article><span className="stat-icon stat-icon--orange"><BookOpen size={21} /></span><div><small>Lessons completed</small><strong>{learner.lessonsCompleted || completed}</strong><em>Keep going!</em></div></article>
            <article><span className="stat-icon stat-icon--blue"><TrendingUp size={21} /></span><div><small>Learning progress</small><strong>{learner.progress || 18}%</strong><em>On the rise</em></div></article>
            <article><span className="stat-icon stat-icon--gold"><Flame size={21} /></span><div><small>Learning streak</small><strong>{learner.streak || 0} days</strong><em>Personal best</em></div></article>
            <article><span className="stat-icon stat-icon--green"><Gamepad2 size={21} /></span><div><small>Game stars</small><strong>{learner.gameStars || 0}</strong><em>Learn through play</em></div></article>
          </div>

          <div className="student-overview-grid">
            <section className="portal-card">
              <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Coming up</span><h2>Next lesson</h2></div><button className="portal-text-button" onClick={() => setActive('lessons')}>All lessons <ChevronRight size={15} /></button></div>
              {upcoming ? <BookingCard booking={upcoming} showTeacher onEnterClassroom={setClassroomBooking} /> : <EmptyState title="No lesson booked yet" text="Choose a time that works for your family and start with a focused first class." action={() => setActive('book')} actionLabel="Book a class" />}
            </section>
            <section className="portal-card learning-focus-card">
              <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Personalised path</span><h2>Learning focus</h2></div><span className="portal-card__icon"><Sparkles size={21} /></span></div>
              <div className="focus-visual"><span><TargetIcon /></span><div><small>Main goal</small><strong>{learner.goal}</strong></div></div>
              <div className="focus-progress"><div><span>Foundation</span><strong>{learner.progress || 18}%</strong></div><i><span style={{ width: `${learner.progress || 18}%` }} /></i></div>
              <p>Your next lessons will balance curriculum skills with this personal goal.</p>
            </section>
          </div>
        </div>
      )}

      {active === 'book' && <BookLessonPanel account={account} learner={learner} onBooked={() => { const refreshed = getAccountById(account.id); if (refreshed) { setAccount(refreshed); onAccountChange(refreshed) } setBookingVersion((value) => value + 1) }} />}

      {active === 'lessons' && (
        <div className="portal-view">
          <div className="portal-page-heading"><div><span className="portal-kicker">Your schedule</span><h1>My lessons</h1><p>A 24-hour weekly calendar with every lesson placed in its 30-minute time slot.</p></div><button className="portal-primary-button" onClick={() => setActive('book')}><CalendarPlus size={17} /> Book a class</button></div>
          <section className="portal-card student-schedule-card">
            <ScheduleCalendar weekOffset={lessonsWeek} onWeekOffset={setLessonsWeek} bookings={bookings} />
          </section>
          <section className="portal-card lessons-list-card schedule-list-below">
            <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">All requests</span><h2>Lesson details</h2></div></div>
            {bookings.length ? bookings.map((booking) => <BookingCard key={booking.id} booking={booking} showTeacher onEnterClassroom={setClassroomBooking} actions={['pending', 'confirmed'].includes(booking.status) ? <button className="portal-danger-link" onClick={() => cancel(booking.id)}>Cancel</button> : booking.status === 'completed' && !booking.studentRating ? <button className="rate-class-button" onClick={() => setRatingBooking(booking)}><Star size={14} /> Rate class</button> : booking.studentRating ? <span className="rated-class-label"><Star size={13} fill="currentColor" /> {booking.studentRating.score}/5</span> : null} />) : <EmptyState title="Your lesson list is ready" text="Once you request a class, all updates will appear here." action={() => setActive('book')} actionLabel="Book the first class" />}
          </section>
        </div>
      )}

      {active === 'games' && <Suspense fallback={<div className="game-loading"><i /><strong>Launching 3D English Game Zone…</strong><span>Preparing the world for {learner.name}</span></div>}><StudentGames key={learner.id} learner={learner} onEarnStars={earnGameStars} /></Suspense>}

      {active === 'profile' && (
        <div className="portal-view">
          <section className="student-profile-hero">
            <div className="student-profile-photo-wrap"><ProfilePhoto accountId={`${account.id}-${learner.id}`} name={learner.name} refreshKey={mediaVersion} className="student-profile-photo" /><label title="Upload display photo"><Camera size={16} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadStudentPhoto} /></label></div>
            <div><span className="portal-kicker">Student profile</span><h1>{learner.name}</h1><p>{learner.year} · {learner.curriculum} English</p><div className="profile-tags"><span><Star size={13} /> {learner.level || 'Building foundations'}</span><span><Flame size={13} /> {learner.streak || 0} day streak</span><span className={learner.accessStatus === 'suspended' ? 'profile-access-suspended' : 'profile-access-active'}>{learner.accessStatus === 'suspended' ? <Ban size={13} /> : <ShieldCheck size={13} />} {learner.accessStatus}</span></div></div>
            <div className="profile-score"><strong>{learner.progress || 18}%</strong><span>Term progress</span></div>
          </section>
          {mediaError && <div className="portal-error" role="alert">{mediaError}</div>}
          {(account.status === 'suspended' || learner.accessStatus === 'suspended') && <div className="student-profile-suspension"><Ban size={20} /><div><strong>{account.status === 'suspended' ? 'This family account is suspended' : 'This student profile is suspended'}</strong><span>Booking, classroom entry and new lesson activity are paused. Contact the administrator for assistance.</span></div></div>}
          <div className="profile-layout">
            <section className="portal-card profile-edit-card">
              <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Learning preferences</span><h2>Shape the learning path</h2></div>{profileSaved && <span className="saved-label"><Check size={14} /> Saved</span>}</div>
              <label><span>Main learning goal</span><select value={profile.goal} onChange={(event) => setProfile((value) => ({ ...value, goal: event.target.value }))}><option>Speaking with confidence</option><option>Reading comprehension</option><option>Writing and grammar</option><option>Schoolwork and exam support</option><option>Build an all-round foundation</option></select></label>
              <label><span>Preferred lesson rhythm</span><select value={profile.frequency} onChange={(event) => setProfile((value) => ({ ...value, frequency: event.target.value }))}><option>1–2 weekly</option><option>4–5 weekly</option><option>Not sure</option></select></label>
              <div className="profile-info-row"><div><span>Parent / guardian</span><strong>{account.parentName}</strong></div><div><span>Account login</span><strong>{account.loginId || account.email}</strong></div></div>
              <button className="portal-primary-button" onClick={saveProfile}>Save profile changes</button>
            </section>
            <section className="portal-card achievements-card">
              <span className="portal-kicker">Proud moments</span><h2>Achievements</h2>
              <div className="achievement-list"><div><span>🌱</span><div><strong>First step</strong><small>Profile completed</small></div></div><div className={completed ? '' : 'locked'}><span>📚</span><div><strong>Lesson learner</strong><small>Complete a lesson</small></div></div><div className={(learner.streak || 0) >= 3 ? '' : 'locked'}><span>🔥</span><div><strong>On a roll</strong><small>Reach a 3-day streak</small></div></div></div>
            </section>
          </div>
        </div>
      )}
      {ratingBooking && <RatingDialog booking={ratingBooking} studentId={account.id} onClose={() => setRatingBooking(null)} onSaved={() => { setRatingBooking(null); setBookingVersion((value) => value + 1) }} />}
      {showAddStudent && <AddStudentDialog account={account} onClose={() => setShowAddStudent(false)} onAdded={finishAddingStudent} />}
    </PortalShell>
  )
}

function TargetIcon() {
  return <TrendingUp size={25} />
}

export function TeacherDashboard({ account: initialAccount, onAccountChange, onHome, onLogout, adminPreview = false }) {
  const [active, setActive] = useState('overview')
  const [account, setAccount] = useState(() => {
    const source = initialAccount.teacher || {}
    return {
      ...initialAccount,
      fullName: initialAccount.fullName || initialAccount.displayName || 'New Teacher',
      teacher: {
        specialization: 'Both Curricula',
        bio: 'Complete your teaching profile to help families learn more about you.',
        education: 'To be updated',
        experience: 0,
        languages: 'English',
        lessonsCompleted: 0,
        rating: 0,
        ...source,
        credentials: Array.isArray(source.credentials) ? source.credentials : [],
        availabilitySlots: Array.isArray(source.availabilitySlots) ? source.availabilitySlots : [],
        classroom: { platform: 'zoom', zoomLink: '', voovLink: '', ...(source.classroom || {}) },
      },
    }
  })
  const [version, setVersion] = useState(0)
  const [availabilitySlots, setAvailabilitySlots] = useState(account.teacher.availabilitySlots || [])
  const [scheduleWeek, setScheduleWeek] = useState(0)
  const [saved, setSaved] = useState(false)
  const [mediaVersion, setMediaVersion] = useState(0)
  const [mediaError, setMediaError] = useState('')
  const [feedbackBooking, setFeedbackBooking] = useState(null)
  const [classroomBooking, setClassroomBooking] = useState(null)
  const [classroom, setClassroom] = useState(account.teacher.classroom || { platform: 'zoom', zoomLink: '', voovLink: '' })
  const [classroomSaved, setClassroomSaved] = useState(false)
  const [classroomError, setClassroomError] = useState('')
  const bookings = getBookings({ teacherId: account.id })
  const pending = bookings.filter((booking) => booking.status === 'pending').length
  const teacherSyncCallbacks = useRef({ onAccountChange, onLogout })
  void version

  useEffect(() => {
    teacherSyncCallbacks.current = { onAccountChange, onLogout }
  }, [onAccountChange, onLogout])

  useEffect(() => {
    const synchronize = () => {
      const latest = getAccountById(initialAccount.id)
      if (!latest) {
        teacherSyncCallbacks.current.onLogout()
        return
      }
      setAccount(latest)
      setVersion((value) => value + 1)
      teacherSyncCallbacks.current.onAccountChange(latest)
    }
    window.addEventListener('storage', synchronize)
    window.addEventListener('tutorpro:data-change', synchronize)
    window.addEventListener('focus', synchronize)
    const interval = window.setInterval(synchronize, 3000)
    return () => {
      window.removeEventListener('storage', synchronize)
      window.removeEventListener('tutorpro:data-change', synchronize)
      window.removeEventListener('focus', synchronize)
      window.clearInterval(interval)
    }
  }, [initialAccount.id])

  useEffect(() => {
    if (!cloudSyncEnabled()) return undefined
    let active = true
    const synchronizeCloud = async () => {
      try {
        const [profiles, sharedBookings] = await Promise.all([fetchCloudProfiles(), fetchCloudBookings()])
        if (active) {
          mergeCloudAccounts(profiles)
          mergeCloudBookings(sharedBookings)
        }
      } catch {
        // The teacher dashboard keeps its offline copy until cloud access returns.
      }
    }
    synchronizeCloud()
    const unsubscribeProfiles = subscribeToCloudProfiles(synchronizeCloud)
    const unsubscribeBookings = subscribeToCloudBookings(synchronizeCloud)
    const interval = window.setInterval(synchronizeCloud, 5000)
    return () => {
      active = false
      unsubscribeProfiles()
      unsubscribeBookings()
      window.clearInterval(interval)
    }
  }, [])

  const refresh = () => setVersion((value) => value + 1)

  const uploadTeacherMedia = async (event, kind) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMediaError('')
    try {
      await saveProfileMedia(account.id, kind, file)
      setMediaVersion((value) => value + 1)
    } catch (uploadError) {
      setMediaError(uploadError.message)
    }
    event.target.value = ''
  }

  const recordCompletedLesson = (booking) => {
    const student = getAccountById(booking.studentId)
    const lessonLearner = student?.children?.find((item) => item.id === booking.learnerId) || student?.child
    if (lessonLearner) {
      updateStudentProfile(student.id, {
        lessonsCompleted: (lessonLearner.lessonsCompleted || 0) + 1,
        progress: Math.min(100, (lessonLearner.progress || 0) + 8),
        streak: (lessonLearner.streak || 0) + 1,
        achievements: [...new Set([...(lessonLearner.achievements || []), 'Lesson learner'])],
      }, lessonLearner.id)
    }
    const latestTeacher = getAccountById(account.id)
    const updated = updateTeacherProfile(account.id, { lessonsCompleted: (latestTeacher.teacher.lessonsCompleted || 0) + 1 })
    setAccount(updated)
    onAccountChange(updated)
  }

  const changeStatus = (bookingId, status) => {
    const previous = bookings.find((booking) => booking.id === bookingId)
    const booking = updateBooking(bookingId, { status })
    if (status === 'completed' && previous?.status !== 'completed') recordCompletedLesson(booking)
    refresh()
  }

  const finishFeedback = (wasNewCompletion) => {
    if (wasNewCompletion && feedbackBooking) recordCompletedLesson(feedbackBooking)
    setFeedbackBooking(null)
    refresh()
  }

  const paintAvailability = (slotKey, shouldAdd) => {
    setAvailabilitySlots((current) => {
      const next = new Set(current)
      if (shouldAdd) next.add(slotKey)
      else next.delete(slotKey)
      return [...next]
    })
    setSaved(false)
  }

  const saveAvailability = () => {
    const updated = updateTeacherProfile(account.id, { availabilitySlots })
    setAccount(updated)
    onAccountChange(updated)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const saveClassroom = () => {
    const links = [classroom.zoomLink, classroom.voovLink].filter(Boolean)
    if (links.some((link) => !/^https:\/\//i.test(link))) {
      setClassroomError('Meeting links must start with https:// so students can open them safely.')
      return
    }
    const activeLink = classroom.platform === 'zoom' ? classroom.zoomLink : classroom.voovLink
    if (!activeLink) {
      setClassroomError(`Add the ${classroom.platform === 'zoom' ? 'Zoom' : 'VooV'} meeting link before selecting it as the classroom platform.`)
      return
    }
    const updated = updateTeacherProfile(account.id, { classroom })
    setAccount(updated)
    onAccountChange(updated)
    setClassroomError('')
    setClassroomSaved(true)
    window.setTimeout(() => setClassroomSaved(false), 2200)
  }

  const nav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: ClipboardCheck, badge: pending },
    { id: 'classroom', label: 'Classroom', icon: Video },
    { id: 'schedule', label: 'Availability', icon: CalendarDays },
    { id: 'profile', label: 'My profile', icon: UserRound },
  ]

  if (classroomBooking) return <OnlineClassroom booking={classroomBooking} account={account} onExit={() => setClassroomBooking(null)} />

  return (
    <PortalShell account={account} role="teacher" active={active} onActive={setActive} onHome={onHome} onLogout={onLogout} navItems={nav} adminPreview={adminPreview} mediaVersion={mediaVersion}>
      {account.status !== 'approved' && <div className={`approval-banner approval-banner--${account.status}`}><ShieldCheck size={21} /><div><strong>{account.status === 'pending' ? 'Profile under review' : `Account ${account.status}`}</strong><span>{account.status === 'pending' ? 'An administrator will review your profile and credentials before students can book you.' : 'Contact the TutorPro English administrator if you need help.'}</span></div></div>}

      {active === 'overview' && (
        <div className="portal-view">
          <div className="portal-page-heading"><div><span className="portal-kicker">Teacher studio</span><h1>Good day, {account.fullName.split(' ')[0]}.</h1><p>Keep every learner, booking and teaching hour in view.</p></div><button className="portal-primary-button" onClick={() => setActive('schedule')}><CalendarDays size={17} /> Update availability</button></div>
          <div className="portal-stat-grid portal-stat-grid--three">
            <article><span className="stat-icon stat-icon--orange"><ClipboardCheck size={21} /></span><div><small>Pending requests</small><strong>{pending}</strong><em>Needs attention</em></div></article>
            <article><span className="stat-icon stat-icon--blue"><Video size={21} /></span><div><small>Lessons completed</small><strong>{account.teacher.lessonsCompleted || 0}</strong><em>All time</em></div></article>
            <article><span className="stat-icon stat-icon--gold"><Star size={21} /></span><div><small>Teacher rating</small><strong>{account.teacher.rating ? `${account.teacher.rating}.0` : 'New'}</strong><em>Student feedback</em></div></article>
          </div>
          <div className="teacher-overview-grid">
            <section className="portal-card">
              <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Action centre</span><h2>Booking requests</h2></div><button className="portal-text-button" onClick={() => setActive('bookings')}>View all <ChevronRight size={15} /></button></div>
              {bookings.filter((booking) => booking.status === 'pending').slice(0, 3).map((booking) => <BookingCard key={booking.id} booking={booking} showStudent actions={<><button className="lesson-action lesson-action--accept" onClick={() => changeStatus(booking.id, 'confirmed')}><Check size={15} /></button><button className="lesson-action lesson-action--decline" onClick={() => changeStatus(booking.id, 'declined')}><X size={15} /></button></>} />)}
              {!pending && <EmptyState icon={ClipboardCheck} title="You’re all caught up" text="New lesson requests will appear here for your review." />}
            </section>
            <section className="portal-card teacher-profile-snapshot">
              <div className="teacher-profile-snapshot__avatar"><ProfilePhoto accountId={account.id} name={account.fullName} refreshKey={mediaVersion} className="teacher-snapshot-photo" /><span className="teacher-snapshot-verified"><ShieldCheck size={16} /></span></div>
              <StatusBadge status={account.status} />
              <h2>{account.fullName}</h2><p>{account.teacher.specialization}</p>
              <dl><div><dt>Experience</dt><dd>{account.teacher.experience} years</dd></div><div><dt>Languages</dt><dd>{account.teacher.languages}</dd></div><div><dt>Education</dt><dd>{account.teacher.education}</dd></div></dl>
              <button className="portal-secondary-button" onClick={() => setActive('profile')}>View full profile</button>
            </section>
          </div>
        </div>
      )}

      {active === 'bookings' && (
        <div className="portal-view">
          <div className="portal-page-heading"><div><span className="portal-kicker">Lesson management</span><h1>Bookings</h1><p>Confirm requests and keep lesson statuses up to date.</p></div></div>
          <section className="portal-card lessons-list-card">
            {bookings.length ? bookings.map((booking) => {
              let actions = null
              if (booking.status === 'pending') actions = <><button className="lesson-action lesson-action--wide lesson-action--accept" onClick={() => changeStatus(booking.id, 'confirmed')}>Accept</button><button className="lesson-action lesson-action--wide lesson-action--decline" onClick={() => changeStatus(booking.id, 'declined')}>Decline</button></>
              if (booking.status === 'confirmed') actions = <button className="lesson-action lesson-action--wide lesson-action--complete" onClick={() => setFeedbackBooking(booking)}><MessageSquareText size={13} /> Complete & feedback</button>
              if (booking.status === 'completed') actions = <button className="lesson-action lesson-action--wide lesson-action--feedback" onClick={() => setFeedbackBooking(booking)}><MessageSquareText size={13} /> {booking.teacherFeedback ? 'Edit feedback' : 'Add feedback'}</button>
              return <BookingCard key={booking.id} booking={booking} showStudent onEnterClassroom={setClassroomBooking} actions={actions} />
            }) : <EmptyState title="No bookings yet" text="Approved teachers will see student requests here." />}
          </section>
        </div>
      )}

      {active === 'classroom' && (
        <div className="portal-view">
          <div className="portal-page-heading"><div><span className="portal-kicker">Private virtual classroom</span><h1>Class platform</h1><p>Choose Zoom or VooV and add the private link students will use for confirmed lessons.</p></div>{classroomSaved && <span className="saved-label"><Check size={14} /> Classroom saved</span>}</div>
          {classroomError && <div className="portal-error" role="alert">{classroomError}</div>}
          <div className="classroom-layout">
            <section className="portal-card classroom-settings">
              <div className="platform-choice">
                <button className={classroom.platform === 'zoom' ? 'active' : ''} onClick={() => { setClassroom((current) => ({ ...current, platform: 'zoom' })); setClassroomError('') }}><span className="platform-logo platform-logo--zoom">Z</span><div><strong>Zoom</strong><small>Use Zoom for upcoming classes</small></div><i>{classroom.platform === 'zoom' && <Check size={14} />}</i></button>
                <button className={classroom.platform === 'voov' ? 'active' : ''} onClick={() => { setClassroom((current) => ({ ...current, platform: 'voov' })); setClassroomError('') }}><span className="platform-logo platform-logo--voov">V</span><div><strong>VooV Meeting</strong><small>Use VooV for upcoming classes</small></div><i>{classroom.platform === 'voov' && <Check size={14} />}</i></button>
              </div>
              <div className="classroom-link-fields">
                <label><span>Zoom meeting link</span><div><Video size={17} /><input type="url" value={classroom.zoomLink || ''} onChange={(event) => setClassroom((current) => ({ ...current, zoomLink: event.target.value }))} placeholder="https://zoom.us/j/…" /></div></label>
                <label><span>VooV meeting link</span><div><Video size={17} /><input type="url" value={classroom.voovLink || ''} onChange={(event) => setClassroom((current) => ({ ...current, voovLink: event.target.value }))} placeholder="https://voovmeeting.com/…" /></div></label>
              </div>
              <button className="portal-primary-button" onClick={saveClassroom}><ShieldCheck size={16} /> Save private classroom</button>
            </section>
            <aside className="classroom-privacy-card"><span><ShieldCheck size={27} /></span><h2>Private by design</h2><p>Every confirmed booking receives a different classroom ID and secret token. Only its teacher, student and administrator can enter during the scheduled window.</p><ul><li><Check size={14} /> Unique room for every booking</li><li><Check size={14} /> Camera, microphone and screen sharing</li><li><Check size={14} /> Live annotation and lesson files</li></ul></aside>
          </div>
          <section className="portal-card classroom-launch-list"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Booked classrooms</span><h2>Launch an upcoming class</h2></div></div>{bookings.filter((booking) => booking.status === 'confirmed').length ? bookings.filter((booking) => booking.status === 'confirmed').map((booking) => <BookingCard key={booking.id} booking={booking} showStudent onEnterClassroom={setClassroomBooking} />) : <EmptyState icon={Video} title="No confirmed classrooms" text="Accept a student booking and its unique classroom will appear here." />}</section>
        </div>
      )}

      {active === 'schedule' && (
        <div className="portal-view">
          <div className="portal-page-heading schedule-page-heading">
            <div><span className="portal-kicker">Recurring weekly calendar</span><h1>Set availability</h1><p>Click and drag across the calendar to add time. Drag across green slots to make them unavailable.</p></div>
            <div className="schedule-save-actions"><span>{availabilitySlots.length} slots · {(availabilitySlots.length / 2).toFixed(1)} hours/week</span>{saved && <span className="saved-label"><Check size={14} /> Saved</span>}<button className="portal-primary-button" onClick={saveAvailability}><Check size={16} /> Save availability</button></div>
          </div>
          <section className="portal-card availability-calendar-card">
            <div className="drag-instruction"><span><CalendarDays size={18} /></span><div><strong>Paint your available time</strong><small>Each cell is 30 minutes. Booked lessons are locked and cannot be removed.</small></div></div>
            <ScheduleCalendar
              weekOffset={scheduleWeek}
              onWeekOffset={setScheduleWeek}
              availabilitySlots={availabilitySlots}
              bookings={bookings}
              editable
              onPaint={paintAvailability}
            />
          </section>
        </div>
      )}

      {active === 'profile' && (
        <div className="portal-view">
          <section className="teacher-profile-hero"><div className="teacher-profile-photo-wrap"><ProfilePhoto accountId={account.id} name={account.fullName} refreshKey={mediaVersion} className="teacher-profile-photo" /><label title="Upload display photo"><Camera size={16} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadTeacherMedia(event, 'avatar')} /></label></div><div><StatusBadge status={account.status} /><h1>{account.fullName}</h1><p>{account.teacher.specialization} · {account.teacher.experience} years experience</p></div><div className="teacher-profile-hero__score"><Star size={21} /><strong>{account.teacher.rating || 'New'}</strong><span>{account.teacher.ratingCount ? `${account.teacher.ratingCount} class ratings` : 'rating'}</span></div></section>
          {mediaError && <div className="portal-error" role="alert">{mediaError}</div>}
          <div className="teacher-public-profile-grid">
            <section className="portal-card teacher-profile-detail"><span className="portal-kicker">Professional profile</span><h2>About my teaching</h2><p className="teacher-bio">{account.teacher.bio}</p><div className="profile-info-row profile-info-row--three"><div><span>Education</span><strong>{account.teacher.education}</strong></div><div><span>Languages</span><strong>{account.teacher.languages}</strong></div><div><span>Credentials</span><strong>{account.teacher.credentials?.length || 0} submitted</strong></div></div></section>
            <section className="portal-card teacher-video-manager"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Public introduction</span><h2>Introduction video</h2></div><span className="portal-card__icon"><Film size={21} /></span></div><IntroVideo accountId={account.id} refreshKey={mediaVersion} /><label className="media-upload-button"><Upload size={16} /> Upload introduction video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => uploadTeacherMedia(event, 'intro-video')} /></label><p>MP4 or WebM, up to 50 MB. Parents and visitors can watch this before choosing a teacher.</p></section>
          </div>
        </div>
      )}
      {feedbackBooking && <FeedbackDialog booking={feedbackBooking} teacherId={account.id} onClose={() => setFeedbackBooking(null)} onSaved={finishFeedback} />}
    </PortalShell>
  )
}

export function AdminTeacherProfile({ teacher, onBack, onStatusChange, processing, error }) {
  const profile = teacher.teacher || {}
  const credentials = Array.isArray(profile.credentials) ? profile.credentials : []
  const availabilitySlots = Array.isArray(profile.availabilitySlots) ? profile.availabilitySlots : []
  const teacherBookings = getBookings({ teacherId: teacher.id })
  const completedLessons = teacherBookings.filter((booking) => booking.status === 'completed').length

  return (
    <div className="portal-view admin-teacher-profile-view">
      <div className="admin-profile-backbar"><button onClick={onBack}><ChevronLeft size={17} /> Back to teachers</button><span><ShieldCheck size={15} /> Administrator profile view</span></div>
      {error && <div className="portal-error" role="alert">{error}</div>}
      <section className="admin-teacher-profile-hero">
        <ProfilePhoto accountId={teacher.id} name={teacher.fullName} className="admin-teacher-profile-photo" />
        <div><StatusBadge status={teacher.status || 'pending'} /><h1>{teacher.fullName || 'New Teacher'}</h1><p>{profile.specialization || 'Specialization not provided'} · {Number(profile.experience) || 0} years experience</p><div className="profile-tags"><span><Star size={13} /> {profile.rating || 'New'} rating</span><span><Video size={13} /> {profile.lessonsCompleted || completedLessons} lessons</span></div></div>
        <div className="admin-teacher-profile-actions">
          {teacher.status !== 'approved' && <button className="approve" onClick={() => onStatusChange(teacher.id, 'approved')} disabled={processing}><UserCheck size={16} /> {processing ? 'Saving…' : 'Approve teacher'}</button>}
          {teacher.status === 'approved' && <button className="suspend" onClick={() => onStatusChange(teacher.id, 'suspended')} disabled={processing}><Ban size={16} /> Suspend</button>}
          {teacher.status !== 'rejected' && !teacher.systemProfile && <button className="reject" onClick={() => onStatusChange(teacher.id, 'rejected')} disabled={processing}><XCircle size={16} /> Reject</button>}
        </div>
      </section>
      <div className="admin-teacher-profile-grid">
        <section className="portal-card"><span className="portal-kicker">Professional profile</span><h2>About the teacher</h2><p className="teacher-bio">{profile.bio || 'The teacher has not added a biography yet.'}</p><div className="profile-info-row profile-info-row--three"><div><span>Education</span><strong>{profile.education || 'Not provided'}</strong></div><div><span>Languages</span><strong>{profile.languages || 'Not provided'}</strong></div><div><span>Curriculum</span><strong>{profile.specialization || 'Not provided'}</strong></div></div></section>
        <section className="portal-card admin-teacher-media"><span className="portal-kicker">Public introduction</span><h2>Introduction video</h2><IntroVideo accountId={teacher.id} compact /><p>Visible to parents on the public teacher profile.</p></section>
        <section className="portal-card"><span className="portal-kicker">Teaching access</span><h2>Availability & classroom</h2><dl className="admin-teacher-detail-list"><div><dt>Weekly slots</dt><dd>{availabilitySlots.length} × 30 min</dd></div><div><dt>Class platform</dt><dd>{profile.classroom?.platform === 'voov' ? 'VooV' : 'Zoom / TutorPro Classroom'}</dd></div><div><dt>Confirmed bookings</dt><dd>{teacherBookings.filter((booking) => booking.status === 'confirmed').length}</dd></div><div><dt>Completed lessons</dt><dd>{completedLessons}</dd></div></dl></section>
        <section className="portal-card"><span className="portal-kicker">Verification</span><h2>Submitted credentials</h2>{credentials.length ? <ul className="admin-credential-list">{credentials.map((credential) => <li key={credential}><ShieldCheck size={15} /> {credential}</li>)}</ul> : <EmptyState icon={ShieldCheck} title="No credentials submitted" text="The teacher has not uploaded credential names yet." />}</section>
      </div>
      <section className="portal-card classroom-launch-list"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Teacher activity</span><h2>Recent bookings</h2></div></div>{teacherBookings.length ? teacherBookings.slice(0, 5).map((booking) => <BookingCard key={booking.id} booking={booking} showStudent />) : <EmptyState icon={CalendarDays} title="No bookings yet" text="Teacher bookings will appear here." />}</section>
    </div>
  )
}

export function AdminStudentProfile({ account, learnerId, onBack, onStatusChange, onRemove, processing, error }) {
  const learners = (account.children?.length ? account.children : account.child ? [account.child] : []).filter(Boolean)
  const learner = learners.find((item) => item.id === learnerId) || learners[0] || {
    id: `incomplete-${account.id}`,
    name: 'Incomplete student profile',
    year: 'Not provided',
    curriculum: 'Not provided',
    goal: 'Profile setup required',
    frequency: 'Not provided',
    accessStatus: 'incomplete',
    progress: 0,
    streak: 0,
    lessonsCompleted: 0,
    achievements: [],
    incomplete: true,
  }
  const isIncomplete = Boolean(learner.incomplete || !learners.length)
  const effectiveStatus = account.status === 'suspended' ? 'suspended' : learner.accessStatus || 'active'
  const learnerBookings = getBookings({ studentId: account.id }).filter((booking) => booking.learnerId ? booking.learnerId === learner.id : learner === learners[0])
  const completedLessons = learnerBookings.filter((booking) => booking.status === 'completed').length

  return (
    <div className="portal-view admin-student-profile-view">
      <div className="admin-profile-backbar"><button onClick={onBack}><ChevronLeft size={17} /> Back to students</button><span><ShieldCheck size={15} /> Administrator profile view</span></div>
      {error && <div className="portal-error" role="alert">{error}</div>}
      <section className="admin-student-profile-hero">
        <ProfilePhoto accountId={`${account.id}-${learner.id}`} name={learner.name} className="admin-student-profile-photo" />
        <div><StatusBadge status={effectiveStatus} /><h1>{learner.name}</h1><p>{learner.year} · {learner.curriculum} English</p><div className="profile-tags"><span><Star size={13} /> {learner.level || 'Building foundations'}</span><span><Flame size={13} /> {learner.streak || 0} day streak</span></div></div>
        <div className="admin-teacher-profile-actions">
          {!isIncomplete && effectiveStatus === 'active' && <button className="suspend" onClick={() => onStatusChange(account.id, learner.id, 'suspended')} disabled={processing}><Ban size={16} /> Suspend profile</button>}
          {!isIncomplete && effectiveStatus === 'suspended' && <button className="approve" onClick={() => onStatusChange(account.id, learner.id, 'active')} disabled={processing}><UserCheck size={16} /> Restore profile</button>}
          <button className="reject" onClick={() => onRemove({ account, learner })} disabled={processing}><Trash2 size={16} /> Remove registration</button>
        </div>
      </section>
      {isIncomplete && <div className="student-profile-suspension"><GraduationCap size={20} /><div><strong>This registration is incomplete</strong><span>Open the student account and add the learner name, school year, curriculum and learning goal.</span></div></div>}
      <div className="admin-student-profile-grid">
        <section className="portal-card"><span className="portal-kicker">Family account</span><h2>Parent and login details</h2><dl className="admin-teacher-detail-list"><div><dt>Parent / guardian</dt><dd>{account.parentName || 'Not provided'}</dd></div><div><dt>Account login</dt><dd>{account.loginId || account.email || 'Not provided'}</dd></div><div><dt>Account status</dt><dd>{account.status || 'active'}</dd></div><div><dt>Students in family</dt><dd>{learners.length}</dd></div></dl></section>
        <section className="portal-card"><span className="portal-kicker">Learning profile</span><h2>Programme preferences</h2><dl className="admin-teacher-detail-list"><div><dt>Main goal</dt><dd>{learner.goal || 'Not provided'}</dd></div><div><dt>Lesson rhythm</dt><dd>{learner.frequency || 'Not provided'}</dd></div><div><dt>Progress</dt><dd>{learner.progress || 0}%</dd></div><div><dt>Game stars</dt><dd>{learner.gameStars || 0}</dd></div></dl></section>
        <section className="portal-card"><span className="portal-kicker">Learning activity</span><h2>Lessons and achievements</h2><dl className="admin-teacher-detail-list"><div><dt>Total bookings</dt><dd>{learnerBookings.length}</dd></div><div><dt>Completed lessons</dt><dd>{learner.lessonsCompleted || completedLessons}</dd></div><div><dt>Upcoming lessons</dt><dd>{learnerBookings.filter((booking) => ['pending', 'confirmed'].includes(booking.status)).length}</dd></div><div><dt>Achievements</dt><dd>{learner.achievements?.length || 0}</dd></div></dl></section>
        <section className="portal-card"><span className="portal-kicker">Profile access</span><h2>Administrator controls</h2><p className="teacher-bio">Use the controls above to suspend, restore, or permanently remove this individual student registration. Other learners in the same family remain separate.</p></section>
      </div>
      <section className="portal-card classroom-launch-list"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Student activity</span><h2>Recent lessons</h2></div></div>{learnerBookings.length ? learnerBookings.slice(0, 5).map((booking) => <BookingCard key={booking.id} booking={booking} showTeacher />) : <EmptyState icon={CalendarDays} title="No lessons yet" text="Student bookings will appear here." />}</section>
    </div>
  )
}

function AddTeacherDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', specialization: 'Both Curricula', experience: '', education: '', languages: 'English', bio: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (form.fullName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(form.email) || form.password.length < 8 || !/[0-9]/.test(form.password)) {
      setError('Add a name, valid email and temporary password with at least 8 characters and one number.')
      return
    }
    setSubmitting(true)
    try {
      const teacher = await createTeacherByAdmin(form)
      onCreated(teacher)
    } catch (createError) {
      setError(createError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="portal-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="portal-dialog add-teacher-dialog" role="dialog" aria-modal="true" aria-labelledby="add-teacher-title">
        <button className="portal-dialog__close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="portal-dialog__heading"><span><UserCheck size={23} /></span><div><small>Administrator action</small><h2 id="add-teacher-title">Add a teacher</h2><p>Create an approved teacher login. They can change their profile and paint their own availability after signing in.</p></div></div>
        {error && <div className="portal-error" role="alert">{error}</div>}
        <form className="admin-teacher-form" onSubmit={submit}>
          <div className="admin-teacher-form__row"><label><span>Full name</span><input autoFocus name="fullName" value={form.fullName} onChange={update} placeholder="Teacher name" /></label><label><span>Email address</span><input type="email" name="email" value={form.email} onChange={update} placeholder="teacher@example.com" /></label></div>
          <div className="admin-teacher-form__row"><label><span>Temporary password</span><input type="password" name="password" value={form.password} onChange={update} placeholder="8+ characters and a number" /></label><label><span>Specialization</span><select name="specialization" value={form.specialization} onChange={update}><option>Both Curricula</option><option>Cambridge</option><option>Oxford</option></select></label></div>
          <div className="admin-teacher-form__row admin-teacher-form__row--three"><label><span>Experience</span><input type="number" min="0" name="experience" value={form.experience} onChange={update} placeholder="Years" /></label><label><span>Education</span><input name="education" value={form.education} onChange={update} placeholder="Degree" /></label><label><span>Languages</span><input name="languages" value={form.languages} onChange={update} placeholder="English…" /></label></div>
          <label><span>Short biography</span><textarea name="bio" value={form.bio} onChange={update} placeholder="Teaching background and approach…" /></label>
          <div className="portal-dialog__actions"><button type="button" className="portal-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="portal-primary-button" disabled={submitting}>{submitting ? 'Creating teacher…' : 'Create approved teacher'} <ArrowRight size={16} /></button></div>
        </form>
      </section>
    </div>
  )
}

function RemoveStudentDialog({ profile, onClose, onConfirm }) {
  const [confirmation, setConfirmation] = useState('')
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const isFinalStudent = (profile.account.children?.length || 1) <= 1
  const matches = confirmation.trim().toLowerCase() === profile.learner.name.trim().toLowerCase()

  const remove = async () => {
    if (!matches) return
    setRemoving(true)
    setError('')
    try {
      await onConfirm(profile, isFinalStudent)
    } catch (removeError) {
      setError(removeError.message)
      setRemoving(false)
    }
  }

  return (
    <div className="portal-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="portal-dialog remove-student-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-student-title">
        <button className="portal-dialog__close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <span className="remove-student-dialog__icon"><Trash2 size={28} /></span>
        <span className="portal-kicker">Permanent administrator action</span>
        <h2 id="remove-student-title">Remove {profile.learner.name}’s registration?</h2>
        <p>{isFinalStudent ? 'This is the final student in the family account, so the entire family login will also be removed.' : 'The family account and its other student profiles will remain active.'}</p>
        <ul><li><Trash2 size={14} /> Student profile and display photo</li><li><Trash2 size={14} /> Student booking and classroom history</li><li><Trash2 size={14} /> Student learning activity data</li></ul>
        {error && <div className="portal-error" role="alert">{error}</div>}
        <label><span>Type <strong>{profile.learner.name}</strong> to confirm</span><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={profile.learner.name} /></label>
        <div className="portal-dialog__actions"><button className="portal-secondary-button" onClick={onClose} disabled={removing}>Keep registration</button><button className="danger-confirm-button" onClick={remove} disabled={!matches || removing}><Trash2 size={16} /> {removing ? 'Removing…' : isFinalStudent ? 'Remove family registration' : 'Remove student profile'}</button></div>
      </section>
    </div>
  )
}

export function AdminDashboard({ account, onHome, onLogout }) {
  const [active, setActive] = useState('overview')
  const [version, setVersion] = useState(0)
  const [managedAccount, setManagedAccount] = useState(null)
  const [managedLearnerId, setManagedLearnerId] = useState('')
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [adminBooking, setAdminBooking] = useState(false)
  const [bookingStudentId, setBookingStudentId] = useState('')
  const [classroomBooking, setClassroomBooking] = useState(null)
  const [studentToRemove, setStudentToRemove] = useState(null)
  const [cloudStatus, setCloudStatus] = useState(cloudSyncEnabled() ? 'connecting' : 'local')
  const [cloudError, setCloudError] = useState('')
  const [adminActionError, setAdminActionError] = useState('')
  const [processingAccountId, setProcessingAccountId] = useState('')

  useEffect(() => {
    const synchronize = () => setVersion((value) => value + 1)
    window.addEventListener('storage', synchronize)
    window.addEventListener('tutorpro:data-change', synchronize)
    window.addEventListener('focus', synchronize)
    const interval = window.setInterval(synchronize, 3000)
    return () => {
      window.removeEventListener('storage', synchronize)
      window.removeEventListener('tutorpro:data-change', synchronize)
      window.removeEventListener('focus', synchronize)
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!cloudSyncEnabled()) return undefined
    let active = true
    const synchronizeCloud = async () => {
      try {
        const authorized = await verifyCloudAdmin()
        if (!authorized) throw new Error('This Supabase user is not listed in admin_members.')
        const [profiles, sharedBookings] = await Promise.all([fetchCloudProfiles(), fetchCloudBookings()])
        if (!active) return
        mergeCloudAccounts(profiles)
        mergeCloudBookings(sharedBookings)
        setCloudStatus('connected')
        setCloudError('')
        setVersion((value) => value + 1)
      } catch (syncError) {
        if (active) {
          setCloudStatus('error')
          setCloudError(syncError.message)
        }
      }
    }
    synchronizeCloud()
    const unsubscribeProfiles = subscribeToCloudProfiles(synchronizeCloud)
    const unsubscribeBookings = subscribeToCloudBookings(synchronizeCloud)
    const interval = window.setInterval(synchronizeCloud, 5000)
    return () => {
      active = false
      unsubscribeProfiles()
      unsubscribeBookings()
      window.clearInterval(interval)
    }
  }, [])

  const teachers = getAccounts('teacher')
  const students = getAccounts('student')
  const studentProfiles = students.flatMap((student) => {
    const learners = student.children?.length ? student.children : student.child ? [student.child] : []
    if (learners.length) return learners.map((learner) => ({ account: student, learner }))
    return [{
      account: student,
      learner: {
        id: `incomplete-${student.id}`,
        name: 'Incomplete student profile',
        year: 'Not provided',
        curriculum: 'Not provided',
        goal: 'Profile setup required',
        accessStatus: 'incomplete',
        incomplete: true,
      },
    }]
  })
  const bookings = getBookings()
  const bookingStats = getBookingStats()
  const pendingTeachers = teachers.filter((teacher) => teacher.status === 'pending').length
  const bookingProfile = studentProfiles.find((profile) => profile.learner.id === bookingStudentId) || studentProfiles[0] || null
  const bookingStudent = bookingProfile?.account || null
  const bookingLearner = bookingProfile?.learner || null
  void version

  const refresh = () => setVersion((value) => value + 1)
  const setStatus = async (accountId, status) => {
    setAdminActionError('')
    setProcessingAccountId(accountId)
    const previousStatus = getAccountById(accountId)?.status
    try {
      const updated = updateAccount(accountId, { status })
      if (cloudSyncEnabled()) await withTimeout(updateCloudProfile(updated), 8000, 'Supabase did not confirm the status update in time.')
      const profiles = cloudSyncEnabled() ? await withTimeout(fetchCloudProfiles(), 8000, 'Supabase profile refresh timed out.') : []
      if (profiles.length) mergeCloudAccounts(profiles)
      const refreshed = getAccountById(accountId)
      if (refreshed) setManagedAccount((current) => current?.id === accountId ? refreshed : current)
      refresh()
    } catch (statusError) {
      const reverted = previousStatus ? updateLocalAccount(accountId, { status: previousStatus }) : getAccountById(accountId)
      if (reverted) setManagedAccount((current) => current?.id === accountId ? reverted : current)
      setAdminActionError(`${statusError.message} The status was not changed. Confirm this administrator exists in Supabase admin_members.`)
    } finally {
      setProcessingAccountId('')
    }
  }

  const openManagedTeacher = (teacherId) => {
    setAdminActionError('')
    const teacher = getAccountById(teacherId)
    if (!teacher || teacher.role !== 'teacher') {
      setAdminActionError('Teacher profile could not be loaded from this browser. Refresh the registrations list and try again.')
      return
    }
    setManagedLearnerId('')
    setManagedAccount(teacher)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (cloudSyncEnabled()) {
      withTimeout(fetchCloudProfiles(), 8000, 'Cloud refresh timed out.')
        .then((profiles) => {
          if (profiles.length) mergeCloudAccounts(profiles)
          const refreshed = getAccountById(teacherId)
          if (refreshed?.role === 'teacher') setManagedAccount(refreshed)
        })
        .catch(() => {
          // The already-open local profile remains available to the administrator.
        })
    }
  }

  const openManagedStudent = (studentId, learnerId) => {
    setAdminActionError('')
    const student = getAccountById(studentId)
    if (!student || student.role !== 'student') {
      setAdminActionError('Student profile could not be loaded from this browser. Refresh the registrations list and try again.')
      return
    }
    setManagedLearnerId(learnerId)
    setManagedAccount(student)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (cloudSyncEnabled()) {
      withTimeout(fetchCloudProfiles(), 8000, 'Cloud refresh timed out.')
        .then((profiles) => {
          if (profiles.length) mergeCloudAccounts(profiles)
          const refreshed = getAccountById(studentId)
          if (refreshed?.role === 'student') setManagedAccount(refreshed)
        })
        .catch(() => {
          // The already-open local profile remains available to the administrator.
        })
    }
  }
  const setLearnerStatus = async (accountId, learnerId, accessStatus) => {
    setAdminActionError('')
    setProcessingAccountId(accountId)
    const previous = getAccountById(accountId)
    try {
      const updated = updateLearnerAccess(accountId, learnerId, accessStatus)
      if (cloudSyncEnabled()) await withTimeout(updateCloudProfile(updated), 8000, 'Supabase did not confirm the student status in time.')
      setManagedAccount((current) => current?.id === accountId ? updated : current)
      refresh()
    } catch (statusError) {
      const reverted = previous ? updateLocalAccount(accountId, { children: previous.children, child: previous.child }) : null
      if (reverted) setManagedAccount((current) => current?.id === accountId ? reverted : current)
      setAdminActionError(`${statusError.message} The student status was not changed in Supabase.`)
    } finally {
      setProcessingAccountId('')
    }
  }
  const removeStudentRegistration = async (profile, isFinalStudent) => {
    const isPrimary = profile.account.child?.id === profile.learner.id
    removeStudentBookingData(profile.account.id, isFinalStudent ? undefined : profile.learner.id, isPrimary)
    if (isFinalStudent) {
      await Promise.allSettled((profile.account.children || [profile.learner]).map((learner) => deleteProfileMediaOwner(`${profile.account.id}-${learner.id}`)))
      await deleteProfileMediaOwner(profile.account.id).catch(() => 0)
      removeStudentAccount(profile.account.id)
    } else {
      await deleteProfileMediaOwner(`${profile.account.id}-${profile.learner.id}`).catch(() => 0)
      removeStudentLearner(profile.account.id, profile.learner.id)
    }
    const refreshedFamily = getAccountById(profile.account.id)
    if (!refreshedFamily) {
      setManagedAccount(null)
      setManagedLearnerId('')
      setActive('students')
    } else if (managedAccount?.id === profile.account.id) {
      setManagedAccount(refreshedFamily)
      setManagedLearnerId(refreshedFamily.children?.[0]?.id || '')
    }
    setStudentToRemove(null)
    refresh()
  }
  const setBookingStatus = (bookingId, status) => {
    const previous = bookings.find((booking) => booking.id === bookingId)
    const updatedBooking = updateBooking(bookingId, { status })
    if (status === 'completed' && previous?.status !== 'completed') {
      const student = getAccountById(updatedBooking.studentId)
      const teacher = getAccountById(updatedBooking.teacherId)
      const lessonLearner = student?.children?.find((item) => item.id === updatedBooking.learnerId) || student?.child
      if (lessonLearner) {
        updateStudentProfile(student.id, {
          lessonsCompleted: (lessonLearner.lessonsCompleted || 0) + 1,
          progress: Math.min(100, (lessonLearner.progress || 0) + 8),
          streak: (lessonLearner.streak || 0) + 1,
          achievements: [...new Set([...(lessonLearner.achievements || []), 'Lesson learner'])],
        }, lessonLearner.id)
      }
      if (teacher?.teacher) {
        updateTeacherProfile(teacher.id, { lessonsCompleted: (teacher.teacher.lessonsCompleted || 0) + 1 })
      }
    }
    refresh()
  }

  const nav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'teachers', label: 'Teachers', icon: UserCheck, badge: pendingTeachers },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'bookings', label: 'All bookings', icon: CalendarCheck2, badge: bookingStats.pending },
    { id: 'profile', label: 'Admin account', icon: ShieldCheck },
  ]

  const exitManagedDashboard = () => {
    setManagedAccount(null)
    setManagedLearnerId('')
    refresh()
  }

  if (classroomBooking) return <OnlineClassroom booking={classroomBooking} account={account} onExit={() => setClassroomBooking(null)} />

  if (managedAccount?.role === 'teacher') {
    return (
      <PortalShell account={account} role="admin" active="teachers" onActive={(section) => { exitManagedDashboard(); setActive(section) }} onHome={onHome} onLogout={onLogout} navItems={nav}>
        <RoleErrorBoundary onBack={exitManagedDashboard}>
          <AdminTeacherProfile teacher={managedAccount} onBack={exitManagedDashboard} onStatusChange={setStatus} processing={processingAccountId === managedAccount.id} error={adminActionError} />
        </RoleErrorBoundary>
      </PortalShell>
    )
  }

  if (managedAccount?.role === 'student') {
    return (
      <PortalShell account={account} role="admin" active="students" onActive={(section) => { exitManagedDashboard(); setActive(section) }} onHome={onHome} onLogout={onLogout} navItems={nav}>
        <RoleErrorBoundary onBack={exitManagedDashboard}>
          <AdminStudentProfile account={managedAccount} learnerId={managedLearnerId} onBack={exitManagedDashboard} onStatusChange={setLearnerStatus} onRemove={setStudentToRemove} processing={processingAccountId === managedAccount.id} error={adminActionError} />
        </RoleErrorBoundary>
        {studentToRemove && <RemoveStudentDialog profile={studentToRemove} onClose={() => setStudentToRemove(null)} onConfirm={removeStudentRegistration} />}
      </PortalShell>
    )
  }

  return (
    <PortalShell account={account} role="admin" active={active} onActive={setActive} onHome={onHome} onLogout={onLogout} navItems={nav}>
      {adminActionError && <div className="portal-error admin-action-error" role="alert">{adminActionError}</div>}
      {active === 'overview' && (
        <div className="portal-view">
          <section className="admin-welcome"><div><span className="portal-kicker">TutorPro English command centre</span><span className={`admin-live-sync admin-live-sync--${cloudStatus}`}><i /> {cloudStatus === 'connected' ? 'Supabase live sync' : cloudStatus === 'connecting' ? 'Connecting shared database' : cloudStatus === 'error' ? 'Cloud sync needs attention' : 'This-browser sync'}</span><h1>Everything important, under control.</h1><p>New student and teacher registrations appear automatically with complete profile controls.</p></div><span className="admin-welcome__shield"><ShieldCheck size={34} /></span></section>
          {cloudError && <div className="portal-error admin-cloud-error" role="alert">{cloudError} Check the Supabase setup and administrator membership.</div>}
          <div className="portal-stat-grid">
            <article><span className="stat-icon stat-icon--blue"><GraduationCap size={21} /></span><div><small>Student profiles</small><strong>{studentProfiles.length}</strong><em>{students.length} family accounts</em></div></article>
            <article><span className="stat-icon stat-icon--orange"><Users size={21} /></span><div><small>Teacher profiles</small><strong>{teachers.length}</strong><em>{pendingTeachers} pending review</em></div></article>
            <article><span className="stat-icon stat-icon--gold"><CalendarDays size={21} /></span><div><small>Total bookings</small><strong>{bookingStats.total}</strong><em>{bookingStats.pending} pending</em></div></article>
            <article><span className="stat-icon stat-icon--green"><CheckCircle2 size={21} /></span><div><small>Lessons completed</small><strong>{bookingStats.completed}</strong><em>Across TutorPro English</em></div></article>
          </div>
          <div className="admin-overview-grid">
            <section className="portal-card admin-action-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Needs attention</span><h2>Teacher approvals</h2></div><button className="portal-text-button" onClick={() => setActive('teachers')}>Manage all <ChevronRight size={15} /></button></div>{teachers.filter((teacher) => teacher.status === 'pending').slice(0, 4).map((teacher) => <div className="approval-row" key={teacher.id}><span>{initials(teacher.fullName)}</span><div><strong>{teacher.fullName}</strong><small>{teacher.teacher.specialization} · {teacher.teacher.experience} years</small></div><button type="button" onClick={() => setStatus(teacher.id, 'approved')} disabled={processingAccountId === teacher.id}><Check size={15} /> {processingAccountId === teacher.id ? 'Saving…' : 'Approve'}</button></div>)}{!pendingTeachers && <EmptyState icon={UserCheck} title="No profiles waiting" text="New teacher applications will appear here." />}</section>
            <section className="portal-card admin-health-card"><span className="portal-kicker">Platform health</span><h2>Booking flow</h2><div className="health-donut" style={{ '--health': bookingStats.total ? `${Math.round((bookingStats.completed / bookingStats.total) * 100)}%` : '0%' }}><span><strong>{bookingStats.total ? Math.round((bookingStats.completed / bookingStats.total) * 100) : 0}%</strong><small>completed</small></span></div><dl><div><dt><i className="dot dot--orange" />Pending</dt><dd>{bookingStats.pending}</dd></div><div><dt><i className="dot dot--blue" />Confirmed</dt><dd>{bookingStats.confirmed}</dd></div><div><dt><i className="dot dot--green" />Completed</dt><dd>{bookingStats.completed}</dd></div></dl></section>
          </div>
        </div>
      )}

      {active === 'teachers' && (
        <div className="portal-view"><div className="portal-page-heading"><div><span className="portal-kicker">Team management</span><h1>Teachers</h1><p>Add teachers, review credentials and control access to their dashboard.</p></div><button className="portal-primary-button" onClick={() => setShowAddTeacher(true)}><Plus size={17} /> Add teacher</button></div><section className="portal-card admin-table-card"><div className="admin-table admin-table--teachers"><div className="admin-table__head"><span>Teacher</span><span>Profile</span><span>Credentials</span><span>Status</span><span>Controls</span></div>{teachers.map((teacher) => <div className="admin-table__row" key={teacher.id}><div className="table-person"><span>{initials(teacher.fullName)}</span><div><strong>{teacher.fullName}</strong><small>{teacher.loginId || teacher.email}</small></div></div><div><strong>{teacher.teacher.specialization}</strong><small>{teacher.teacher.experience} years · {teacher.teacher.languages}</small></div><div><strong>{teacher.teacher.credentials?.length || 0} files</strong><small>{teacher.teacher.credentials?.join(', ') || teacher.teacher.education}</small></div><div><StatusBadge status={teacher.status} /></div><div className="table-actions"><button type="button" className="table-access-button" onClick={() => openManagedTeacher(teacher.id)} disabled={processingAccountId === teacher.id} title="Access teacher dashboard"><Eye size={15} /> {processingAccountId === teacher.id ? 'Opening…' : 'Open'}</button>{teacher.status !== 'approved' && <button type="button" className="table-action table-action--approve" onClick={() => setStatus(teacher.id, 'approved')} disabled={processingAccountId === teacher.id} title="Approve and synchronize teacher"><UserCheck size={16} /></button>}{teacher.status !== 'rejected' && !teacher.systemProfile && <button type="button" className="table-action table-action--reject" onClick={() => setStatus(teacher.id, 'rejected')} disabled={processingAccountId === teacher.id} title="Reject teacher"><XCircle size={16} /></button>}{teacher.status === 'approved' && <button type="button" className="table-action table-action--suspend" onClick={() => setStatus(teacher.id, 'suspended')} disabled={processingAccountId === teacher.id} title="Suspend teacher"><Ban size={16} /></button>}</div></div>)}</div></section></div>
      )}

      {active === 'students' && (
        <div className="portal-view"><div className="portal-page-heading"><div><span className="portal-kicker">Learner community</span><h1>Students</h1><p>Manage every learner’s profile, access status and dashboard.</p></div></div><section className="portal-card admin-table-card"><div className="admin-table admin-table--students"><div className="admin-table__head"><span>Family</span><span>Student</span><span>Learning path</span><span>Status</span><span>Controls</span></div>{studentProfiles.length ? studentProfiles.map(({ account: student, learner: rowLearner }) => <div className="admin-table__row" key={rowLearner.id}><div className="table-person"><span>{initials(student.parentName)}</span><div><strong>{student.parentName}</strong><small>{student.loginId || student.email}</small></div></div><div><strong>{rowLearner.name}</strong><small>{rowLearner.year} · <span className={`inline-access inline-access--${rowLearner.accessStatus}`}>{rowLearner.accessStatus}</span></small></div><div><strong>{rowLearner.curriculum}</strong><small>{rowLearner.goal}</small></div><div><StatusBadge status={rowLearner.accessStatus} /></div><div className="table-actions"><button type="button" className="table-access-button" onClick={() => openManagedStudent(student.id, rowLearner.id)} disabled={processingAccountId === student.id} title="Access student dashboard"><Eye size={15} /> {processingAccountId === student.id ? 'Opening…' : 'Open'}</button>{!rowLearner.incomplete && (rowLearner.accessStatus === 'active' ? <button className="table-action table-action--suspend" onClick={() => setLearnerStatus(student.id, rowLearner.id, 'suspended')} title={`Suspend ${rowLearner.name}'s profile`}><Ban size={16} /></button> : <button className="table-action table-action--approve" onClick={() => setLearnerStatus(student.id, rowLearner.id, 'active')} title={`Restore ${rowLearner.name}'s profile`}><UserCheck size={16} /></button>)}<button className="table-action table-action--delete" onClick={() => setStudentToRemove({ account: student, learner: rowLearner })} title={`Remove ${rowLearner.name}'s registration`}><Trash2 size={16} /></button></div></div>) : <EmptyState icon={GraduationCap} title="No students yet" text="New parent registrations will appear here." />}</div></section></div>
      )}

      {active === 'bookings' && (
        adminBooking ? (
          <div className="admin-booking-view">
            <div className="admin-booking-context"><button onClick={() => setAdminBooking(false)}><ChevronLeft size={17} /> All bookings</button><label><span>Book for student</span><select value={bookingLearner?.id || ''} onChange={(event) => setBookingStudentId(event.target.value)}>{studentProfiles.map(({ account: student, learner: optionLearner }) => <option key={optionLearner.id} value={optionLearner.id}>{optionLearner.name} · {student.parentName} · {optionLearner.accessStatus}</option>)}</select></label></div>
            {bookingStudent && bookingLearner ? <BookLessonPanel key={bookingLearner.id} account={bookingStudent} learner={bookingLearner} adminBooking onBooked={refresh} /> : <EmptyState icon={GraduationCap} title="Register a student first" text="An administrator needs a student profile before creating a booking." />}
          </div>
        ) : (
          <div className="portal-view"><div className="portal-page-heading"><div><span className="portal-kicker">Platform calendar</span><h1>All bookings</h1><p>Oversee lesson requests or book an available teacher slot for a student.</p></div><button className="portal-primary-button" onClick={() => setAdminBooking(true)} disabled={!students.length}><CalendarPlus size={17} /> Book for a student</button></div><section className="portal-card lessons-list-card">{bookings.length ? bookings.map((booking) => <BookingCard key={booking.id} booking={booking} showStudent onEnterClassroom={setClassroomBooking} actions={<select className="booking-status-select" value={booking.status} onChange={(event) => setBookingStatus(booking.id, event.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="declined">Declined</option></select>} />) : <EmptyState title="No bookings yet" text="Student lesson requests will appear here automatically." />}</section></div>
        )
      )}

      {active === 'profile' && (
        <div className="portal-view"><section className="admin-profile-card"><span className="admin-profile-card__icon"><ShieldCheck size={34} /></span><span className="portal-kicker">Administrator account</span><h1>TutorPro English Control</h1><p>{account.email}</p><div><ShieldCheck size={18} /><span><strong>Full platform access</strong><small>Teacher approvals, student access and booking controls</small></span></div><button className="portal-secondary-button" onClick={onHome}><Home size={16} /> Return to website</button></section></div>
      )}
      {showAddTeacher && <AddTeacherDialog onClose={() => setShowAddTeacher(false)} onCreated={() => { setShowAddTeacher(false); refresh() }} />}
      {studentToRemove && <RemoveStudentDialog profile={studentToRemove} onClose={() => setStudentToRemove(null)} onConfirm={removeStudentRegistration} />}
    </PortalShell>
  )
}
