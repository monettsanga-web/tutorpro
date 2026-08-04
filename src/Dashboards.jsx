import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  AudioLines,
  Award,
  Ban,
  Bell,
  BookOpen,
  Bot,
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
  CloudUpload,
  Coins,
  Download,
  Eye,
  ExternalLink,
  FileUp,
  Film,
  Flame,
  Gamepad2,
  GraduationCap,
  Globe2,
  Home,
  Languages,
  LayoutDashboard,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  Send,
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
  Volume2,
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
  removeTeacherAccount,
  syncPendingCloudProfile,
  updateAccount,
  updateLearnerAccess,
  updateLocalAccount,
  updateStudentProfile,
  updateTeacherProfile,
} from './auth.js'
import { createBooking, getBookings, getBookingStats, mergeCloudBookings, rateCompletedBooking, removeStudentBookingData, removeTeacherBookingData, saveTeacherFeedback, syncBookingNow, updateBooking } from './bookings.js'
import { downloadBookingCalendar } from './bookingCalendar.js'
import { notifyBookingParticipants } from './bookingNotifications.js'
import { ProfilePhoto, IntroVideo } from './ProfileMedia.jsx'
import PracticeWordSpeaker, { PracticeWordChip, speakPracticeWord } from './PracticeWordSpeaker.jsx'
import AnnouncementBanner from './AnnouncementBanner.jsx'
import RecordingPlayback from './RecordingPlayback.jsx'
import AdminReviewsPanel from './AdminReviewsPanel.jsx'
import { LANGUAGE_LABELS, languageForCountry, saveAnnouncement, translateAnnouncementBatch } from './announcements.js'
import { formatViewerTime, readTimezoneMode, saveTimezoneMode, timezoneCity, timezoneLabel, toViewerTime, viewerNeedsConversion, visitorTimeZone } from './timezone.js'
import OnlineClassroom from './OnlineClassroom.jsx'
import CoursewareManager from './CoursewareManager.jsx'
import { isTencentClassroomConfigured } from './tencentClassroom.js'
import SupportChatWidget from './SupportChatWidget.jsx'
import RoleErrorBoundary from './RoleErrorBoundary.jsx'
import { deleteProfileMediaOwner, getProfileMedia, saveProfileMedia } from './media.js'
import { fetchCloudBookings, subscribeToCloudBookings } from './cloudBookings.js'
import { cloudSyncEnabled, fetchCloudProfiles, fetchPublicTeachers, subscribeToCloudProfiles, updateCloudProfile, verifyCloudAdmin } from './cloudProfiles.js'
import { formatDateKey, HALF_HOUR_TIMES, makeSlotKey, minutesToTime, timeToMinutes, weekDates } from './schedule.js'
import { downloadSupportAttachment, fetchAdminSupportConversations, fetchAdminSupportThread, sendAdminSupportMessage, setSupportConversationStatus, uploadAdminSupportAttachment } from './supportChat.js'
import { translateSupportText } from './supportTranslation.js'
import { createHomework, getHomework, HOMEWORK_TYPES, homeworkStats, removeHomework, updateHomework } from './homework.js'
import { getLibraryBookmarks, getRecommendedLibraryResources, LIBRARY_CATEGORIES, searchLibraryResources, toggleLibraryBookmark } from './library.js'
import { currentVisitorLocale, isChineseVisitor, subscribeToVisitorLocale } from './visitorLocale.js'
import { supabase } from './supabaseClient.js'
import { getAmbassadorLevel, getNextAmbassadorLevel, getReferralCode, getReferralLink, getReferralStats, getShareTargets, referralActivity } from './referrals.js'
import { BADGE_CATALOG, DAILY_MISSIONS, canClaimMission, claimMission, deriveAutomaticBadges, getRewardProfile, rewardProgress } from './rewards.js'
import { buildLearningReport, skillLabel } from './learningReports.js'
import { MARKETING_TEMPLATES, campaignStats, readCampaignLog, saveCampaignLog } from './marketing.js'

const StudentGames = lazy(() => import('./StudentGames.jsx'))
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`
const today = () => formatDateKey(new Date())
const displayName = (account) => account.parentName || account.fullName || 'TutorPro Online English user'
const initials = (name = '') => name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
const COUNTRY_NAMES = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null

function countryLabel(country) {
  const code = String(country || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return 'Location unavailable'
  try { return COUNTRY_NAMES?.of(code) || code } catch { return code }
}

function countryFlag(country) {
  const code = String(country || '').toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0))) : '✦'
}

const LEARNING_GOALS = [
  'Speaking with confidence',
  'Reading comprehension',
  'Writing and grammar',
  'Schoolwork and exam support',
  'Build an all-round foundation',
]
const WEEKLY_SESSION_OPTIONS = [1, 2, 3]
const MONTHLY_PACKAGE_OPTIONS = [3, 4, 5, 6, 7]
const MONTHLY_BILLING_WEEKS = 4
const MAX_CUSTOM_WEEKLY_SESSIONS = 12
const weeklySessionRate = (sessions) => Number(sessions) <= 3 ? 10 : 8
const planSessionRate = (billingPlan, sessions) => billingPlan === 'monthly' ? (Number(sessions) <= 3 ? 10 : 8) : weeklySessionRate(sessions)
const planCreditCount = (billingPlan, sessions) => Number(sessions) * (billingPlan === 'monthly' ? MONTHLY_BILLING_WEEKS : 1)
const planTotal = (billingPlan, sessions) => planCreditCount(billingPlan, sessions) * planSessionRate(billingPlan, sessions)
const weeklyPlanTotal = (sessions) => planTotal('weekly', sessions)
const formatUsd = (amount) => `$${Number(amount).toFixed(2)} USD`

/**
 * Approximate local-currency reference shown beside the USD price so parents
 * outside the US can judge the cost instantly. PayPal is still charged in USD;
 * this is a display hint only, which is why it is labelled "approx".
 */
const LOCAL_PRICE_HINTS = {
  PL: { code: 'PLN', symbol: 'zł', perUsd: 4.0, suffix: true },
  EU: { code: 'EUR', symbol: '€', perUsd: 0.92 },
  GB: { code: 'GBP', symbol: '£', perUsd: 0.79 },
}
const EURO_COUNTRIES = ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'CY', 'MT', 'HR']

function localPriceHint(amount, country) {
  const code = String(country || '').toUpperCase()
  const hint = LOCAL_PRICE_HINTS[code] || (EURO_COUNTRIES.includes(code) ? LOCAL_PRICE_HINTS.EU : null)
  if (!hint) return ''
  const converted = Math.round(Number(amount) * hint.perUsd)
  return hint.suffix ? `≈ ${converted} ${hint.symbol}` : `≈ ${hint.symbol}${converted}`
}
const CHINA_TUITION_PER_25_MINUTES = 25
const CHINA_PROCESSING_FEE_PER_SESSION = 5
const chinaSessionTotal = (sessions, billingPlan = 'weekly') => planCreditCount(billingPlan, sessions) * (CHINA_TUITION_PER_25_MINUTES + CHINA_PROCESSING_FEE_PER_SESSION)
const formatRmb = (amount) => `RMB${Number(amount).toFixed(2)}`

const paymentMethodLabel = {
  paypal: 'PayPal Checkout',
  chinaQr: 'AUB PayMate / WeChat Pay QR',
}
const GRAMMAR_FOCUS_OPTIONS = [
  'Sentence structure',
  'Verb tenses',
  'Subject–verb agreement',
  'Articles (a, an, the)',
  'Prepositions',
  'Pronouns',
  'Plural nouns',
  'Question forms',
  'Punctuation',
]
const BOOKING_STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'absent', label: 'Absent' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'declined', label: 'Declined' },
]

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

export function ScheduleCalendar({
  weekOffset,
  onWeekOffset,
  availabilitySlots = [],
  bookings = [],
  editable = false,
  onPaint,
  selectedLessons = [],
  onSelect,
  onBookingOpen,
  onBookingFeedback,
  onBookingCancel,
  showInactiveBookings = false,
  duration = 25,
  multiSelect = false,
}) {
  const dates = weekDates(weekOffset)
  const available = new Set(availabilitySlots)
  const dragState = useRef(null)
  const scrollRef = useRef(null)
  const calendarRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timezoneMode, setTimezoneMode] = useState(readTimezoneMode)
  const viewerZone = visitorTimeZone()
  // Lesson times are stored in Manila time; convert for display only.
  const showLocalTimes = timezoneMode === 'local' && viewerNeedsConversion(viewerZone)
  const [nameMenu, setNameMenu] = useState(null)
  const [menuBusy, setMenuBusy] = useState(false)
  const [menuError, setMenuError] = useState('')
  const [confirmUnbook, setConfirmUnbook] = useState(false)

  const closeNameMenu = () => { setNameMenu(null); setConfirmUnbook(false); setMenuError(''); setMenuBusy(false) }

  useEffect(() => {
    if (!nameMenu) return undefined
    const dismiss = (event) => { if (!event.target.closest?.('.schedule-name-menu')) closeNameMenu() }
    const onKey = (event) => { if (event.key === 'Escape') closeNameMenu() }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', closeNameMenu)
    const scroller = scrollRef.current
    scroller?.addEventListener('scroll', closeNameMenu, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', closeNameMenu)
      scroller?.removeEventListener('scroll', closeNameMenu)
    }
  }, [nameMenu])

  const openNameMenu = (event, booking, studentName) => {
    event.stopPropagation()
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 250
    const menuHeight = 230
    let top = rect.bottom + 6
    if (top + menuHeight > window.innerHeight - 8) top = Math.max(8, rect.top - menuHeight - 6)
    const left = Math.min(Math.max(10, rect.left), Math.max(10, window.innerWidth - menuWidth - 10))
    setConfirmUnbook(false)
    setMenuError('')
    setNameMenu({ booking, studentName, top, left })
  }

  const runUnbook = async () => {
    if (!nameMenu || !onBookingCancel) return
    setMenuBusy(true)
    setMenuError('')
    try {
      await onBookingCancel(nameMenu.booking)
      closeNameMenu()
    } catch (cancelError) {
      setMenuError(cancelError?.message || 'Could not cancel this booking. Please try again.')
      setMenuBusy(false)
    }
  }
  const inactiveCalendarStatuses = new Set(['cancelled', 'declined', 'absent'])
  const releasedCalendarStatuses = new Set(['cancelled', 'declined'])
  const calendarBookings = bookings.filter((booking) => !releasedCalendarStatuses.has(booking.status))
  const activeBookings = showInactiveBookings
    ? [...calendarBookings].sort((first, second) => Number(!inactiveCalendarStatuses.has(first.status)) - Number(!inactiveCalendarStatuses.has(second.status)))
    : calendarBookings.filter((booking) => !inactiveCalendarStatuses.has(booking.status))
  const occupied = new Map()

  activeBookings.forEach((booking) => {
    const start = timeToMinutes(booking.time)
    const count = Math.ceil(Number(booking.duration) / 30)
    for (let index = 0; index < count; index += 1) {
      occupied.set(`${booking.date}-${minutesToTime(start + (index * 30))}`, { booking, isStart: index === 0 })
    }
  })

  const selectedCells = new Set()
  const selectedCellOwners = new Map()
  const selectedStartKeys = new Set()
  selectedLessons.forEach((selection) => {
    if (!selection?.date || !selection?.time) return
    const start = timeToMinutes(selection.time)
    const count = Math.ceil(Number(selection.duration || duration) / 30)
    const startKey = `${selection.date}-${selection.time}`
    selectedStartKeys.add(startKey)
    for (let index = 0; index < count; index += 1) {
      const cellKey = `${selection.date}-${minutesToTime(start + (index * 30))}`
      selectedCells.add(cellKey)
      selectedCellOwners.set(cellKey, selection)
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

  useEffect(() => {
    const syncMode = () => setTimezoneMode(readTimezoneMode())
    window.addEventListener('tutorpro:timezone-change', syncMode)
    return () => window.removeEventListener('tutorpro:timezone-change', syncMode)
  }, [])

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === calendarRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  // Let the calendar page use the full monitor width. CSS :has() handles this
  // on modern browsers; this keeps older desktop browsers working too.
  useEffect(() => {
    const host = calendarRef.current?.closest('.portal-content')
    if (!host) return undefined
    host.classList.add('portal-content--wide-calendar')
    return () => {
      if (!host.querySelector('.schedule-calendar')) host.classList.remove('portal-content--wide-calendar')
    }
  }, [])

  const weekStart = dates[0]
  const weekEnd = dates[6]
  const rangeLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const toggleCalendarFullscreen = () => {
    const node = calendarRef.current
    if (!node) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else node.requestFullscreen?.().catch(() => {})
  }

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

  const startBookingSelection = (event, date, time, selectable, selectedOwner) => {
    if (editable || !multiSelect || !onSelect || event.button !== 0 || (!selectable && !selectedOwner)) return
    event.preventDefault()
    const mode = selectedOwner ? 'remove' : 'add'
    dragState.current = { booking: true, mode }
    onSelect(selectedOwner || { date, time }, mode)
  }

  const continueBookingSelection = (date, time, selectable, selectedOwner) => {
    if (!dragState.current?.booking || !multiSelect || !onSelect) return
    const mode = dragState.current.mode
    if (mode === 'add' && selectable) onSelect({ date, time }, 'add')
    if (mode === 'remove' && selectedOwner) onSelect(selectedOwner, 'remove')
  }

  const canSelect = (dayIndex, dateKey, time) => {
    if (!onSelect) return false
    if (selectedStartKeys.has(`${dateKey}-${time}`)) return true
    const start = timeToMinutes(time)
    const count = Math.ceil(Number(duration) / 30)
    const now = new Date()
    if (new Date(`${dateKey}T${time}:00`) <= now) return false
    for (let index = 0; index < count; index += 1) {
      const slotTime = minutesToTime(start + (index * 30))
      if ((start + (index * 30)) >= 1440) return false
      if (!available.has(makeSlotKey(dayIndex, slotTime))) return false
      if (occupied.has(`${dateKey}-${slotTime}`)) return false
      if (multiSelect && selectedCells.has(`${dateKey}-${slotTime}`)) return false
    }
    return true
  }

  return (
    <div className="schedule-calendar" ref={calendarRef}>
      <div className="schedule-toolbar">
        <div className="schedule-toolbar__arrows">
          <button onClick={() => onWeekOffset(weekOffset - 1)} aria-label="Previous week"><ChevronLeft size={19} /></button>
          <button onClick={() => onWeekOffset(weekOffset + 1)} aria-label="Next week"><ChevronRight size={19} /></button>
        </div>
        <strong>{rangeLabel}</strong>
        <button className="schedule-today" onClick={() => onWeekOffset(0)}>Today</button>
        <div className="schedule-view-tabs"><span className="active">Week</span><span>30 min slots</span></div>
        {viewerNeedsConversion(viewerZone) && (
          <div className="schedule-timezone-switch" role="group" aria-label="Choose which timezone lesson times are shown in">
            <Globe2 size={14} />
            <button type="button" className={timezoneMode === 'local' ? 'active' : ''} onClick={() => { saveTimezoneMode('local'); setTimezoneMode('local') }}>My time ({timezoneLabel(viewerZone)})</button>
            <button type="button" className={timezoneMode === 'school' ? 'active' : ''} onClick={() => { saveTimezoneMode('school'); setTimezoneMode('school') }}>Manila (UTC+8)</button>
          </div>
        )}
        <button type="button" className="schedule-fullscreen-button" onClick={toggleCalendarFullscreen} title={isFullscreen ? 'Exit full screen' : 'View calendar full screen'}>{isFullscreen ? <><Minimize2 size={14} /> Exit full screen</> : <><Maximize2 size={14} /> Full screen</>}</button>
      </div>
      <div className="schedule-scroll" ref={scrollRef}>
        <div className="schedule-days">
          <div className="schedule-time-heading" title={showLocalTimes ? `Times shown in your local time (${timezoneCity(viewerZone)})` : 'Times shown in Manila school time'}>{showLocalTimes ? timezoneLabel(viewerZone) : 'UTC+8'}</div>
          {dates.map((date) => {
            const dateKey = formatDateKey(date)
            const current = dateKey === today()
            return <div className={`schedule-day-heading ${current ? 'current' : ''}`} key={dateKey}><span>{date.toLocaleDateString('en', { weekday: 'short' })}</span><strong>{date.getDate()}</strong></div>
          })}
        </div>
        <div className={`schedule-body ${editable ? 'schedule-body--editable' : ''} ${multiSelect ? 'schedule-body--multi' : ''}`}>
          {HALF_HOUR_TIMES.map((time) => (
            <div className="schedule-row" key={time}>
              <div className={`schedule-time ${time.endsWith(':30') ? 'half' : ''}`}>{showLocalTimes ? toViewerTime(time, formatDateKey(dates[0]), viewerZone).time : time}</div>
              {dates.map((date, dayIndex) => {
                const dateKey = formatDateKey(date)
                const slotKey = makeSlotKey(dayIndex, time)
                const bookingCell = occupied.get(`${dateKey}-${time}`)
                const isAvailable = available.has(slotKey)
                const selectable = canSelect(dayIndex, dateKey, time)
                const selectedOwner = selectedCellOwners.get(`${dateKey}-${time}`)
                const isSelected = Boolean(selectedOwner)
                const isPast = new Date(`${dateKey}T${time}:00`) <= new Date()
                const student = bookingCell ? getAccountById(bookingCell.booking.studentId) : null
                const bookedLearner = student?.children?.find((item) => item.id === bookingCell?.booking.learnerId) || student?.child
                const feedbackAvailable = Boolean(onBookingFeedback && bookingCell && ['confirmed', 'ongoing', 'completed'].includes(bookingCell.booking.status))
                const classes = [
                  'schedule-cell',
                  isAvailable ? 'available' : 'unavailable',
                  bookingCell ? 'booked' : '',
                  bookingCell && bookingCell.booking.isTrialClass ? 'booking-status-trial' : '',
                  bookingCell ? `booking-status-${bookingCell.booking.status}` : '',
                  bookingCell && (onBookingOpen || onBookingCancel) ? 'manageable' : '',
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
                    aria-label={`${date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })} ${time}${bookingCell ? `, booked for ${bookedLearner?.name || bookingCell.booking.learnerName || 'student'}` : isAvailable ? ', available' : ', unavailable'}`}
                    aria-pressed={editable ? isAvailable : isSelected}
                    disabled={bookingCell ? !(onBookingOpen || onBookingCancel) : !editable && !selectable && !isSelected}
                    onPointerDown={(event) => { startPaint(event, slotKey, Boolean(bookingCell)); startBookingSelection(event, dateKey, time, selectable, selectedOwner) }}
                    onPointerEnter={() => { continuePaint(slotKey, Boolean(bookingCell)); continueBookingSelection(dateKey, time, selectable, selectedOwner) }}
                    onClick={(event) => {
                      if (bookingCell && onBookingCancel) {
                        openNameMenu(event, bookingCell.booking, bookedLearner?.name || bookingCell.booking.learnerName || 'Booked lesson')
                        return
                      }
                      if (bookingCell && onBookingOpen) {
                        onBookingOpen(bookingCell.booking)
                        return
                      }
                      if (editable && event.detail === 0 && !bookingCell) applyPaint(slotKey, !isAvailable)
                      if (!editable && !multiSelect && selectable) onSelect({ date: dateKey, time }, 'toggle')
                      if (!editable && multiSelect && event.detail === 0 && (selectable || selectedOwner)) onSelect(selectedOwner || { date: dateKey, time }, selectedOwner ? 'remove' : 'add')
                    }}
                  >
                    {bookingCell?.isStart && (() => {
                      const cellName = bookedLearner?.name || bookingCell.booking.learnerName || 'Booked lesson'
                      const nameActions = Boolean(onBookingCancel)
                      return (
                        <span className="schedule-booking-label">
                          <strong className={nameActions ? 'schedule-name-action' : feedbackAvailable ? 'schedule-feedback-target' : ''}>{cellName}</strong>
                          {nameActions && <b className="schedule-feedback-prompt schedule-tap-prompt"><MoreHorizontal size={9} /> Tap for options</b>}
                          {!nameActions && feedbackAvailable && <b className="schedule-feedback-prompt"><MessageSquareText size={9} /> {bookingCell.booking.teacherFeedback ? 'Edit feedback' : 'Write feedback'}</b>}
                          {bookingCell.booking.slotComment && <em>Comment</em>}
                        </span>
                      )
                    })()}
                    {!editable && selectable && !bookingCell && <i>Available</i>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {nameMenu && (() => {
        const menuBooking = nameMenu.booking
        const alreadyReleased = ['cancelled', 'declined'].includes(menuBooking.status)
        const unbookable = !['completed', 'cancelled', 'declined'].includes(menuBooking.status)
        const canFeedback = Boolean(onBookingFeedback) && ['confirmed', 'ongoing', 'completed'].includes(menuBooking.status)
        return createPortal((
          <div className="schedule-name-menu" style={{ top: `${nameMenu.top}px`, left: `${nameMenu.left}px` }} role="dialog" aria-label={`Options for ${nameMenu.studentName}`}>
            <div className="schedule-name-menu__head">
              <div><strong>{nameMenu.studentName}</strong><small>{formatLessonDate(menuBooking.date, menuBooking.time, true)} · {formatTime(menuBooking.time)} · {menuBooking.duration} min</small></div>
              <button type="button" onClick={closeNameMenu} aria-label="Close options"><X size={15} /></button>
            </div>
            {menuError && <p className="schedule-name-menu__error" role="alert">{menuError}</p>}
            {confirmUnbook ? (
              <div className="schedule-name-menu__confirm">
                <p>Unbook this class and free the slot?</p>
                <div>
                  <button type="button" onClick={() => setConfirmUnbook(false)} disabled={menuBusy}>Keep</button>
                  <button type="button" className="danger" onClick={runUnbook} disabled={menuBusy}>{menuBusy ? 'Cancelling…' : 'Yes, unbook'}</button>
                </div>
              </div>
            ) : (
              <div className="schedule-name-menu__actions">
                {onBookingOpen && <button type="button" onClick={() => { const target = menuBooking; closeNameMenu(); onBookingOpen(target) }}><CalendarCheck2 size={14} /> View booking details</button>}
                {canFeedback && <button type="button" onClick={() => { const target = menuBooking; closeNameMenu(); onBookingFeedback(target) }}><MessageSquareText size={14} /> {menuBooking.teacherFeedback ? 'Edit feedback' : 'Write feedback'}</button>}
                {onBookingCancel && unbookable && <button type="button" className="danger" onClick={() => setConfirmUnbook(true)}><XCircle size={14} /> Unbook / cancel class</button>}
                {alreadyReleased && <p className="schedule-name-menu__note">This class is already cancelled.</p>}
                {!unbookable && !alreadyReleased && <p className="schedule-name-menu__note">Completed classes cannot be unbooked.</p>}
              </div>
            )}
          </div>
        ), document.body)
      })()}
      <div className="schedule-legend">
        {showInactiveBookings ? <><span><i className="legend-dot legend-dot--booked" />Confirmed</span><span><i className="legend-dot legend-dot--ongoing" />Ongoing</span><span><i className="legend-dot legend-dot--completed" />Completed</span><span><i className="legend-dot legend-dot--absent" />Absent</span><span><i className="legend-dot legend-dot--cancelled" />Cancelled / declined</span></> : <><span><i className="legend-dot legend-dot--available" />Available</span><span><i className="legend-dot legend-dot--selected" />Selected</span><span><i className="legend-dot legend-dot--booked" />Booked</span><span><i className="legend-dot legend-dot--unavailable" />Unavailable</span></>}
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
          <img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="TutorPro Online English panda mascot" />
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


function TeacherFeedbackSummary({ feedback }) {
  if (!feedback) return null
  const summary = feedback.summary || ''
  const createdAt = feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  return (
    <section className="parent-class-feedback-summary" aria-label="Professional class feedback summary">
      <div className="parent-class-feedback-summary__header">
        <span><MessageSquareText size={18} /></span>
        <div>
          <small>Teacher class feedback</small>
          <strong>Professional lesson summary</strong>
          {createdAt && <em>{createdAt}</em>}
        </div>
      </div>
      <div className="parent-class-feedback-summary__body">
        <article><h4>Class summary</h4><p>{summary}</p></article>
        {(feedback.strength || feedback.nextStep || feedback.homework) && (
          <div className="parent-class-feedback-summary__grid">
            {feedback.strength && <div><span>Strength shown</span><p>{feedback.strength}</p></div>}
            {feedback.nextStep && <div><span>Next learning step</span><p>{feedback.nextStep}</p></div>}
            {feedback.homework && <div><span>Home practice</span><p>{feedback.homework}</p></div>}
          </div>
        )}
        {feedback.practiceWords?.length > 0 && <PracticeWordSpeaker words={feedback.practiceWords} />}
        {feedback.grammarFocus?.length > 0 && <div className="parent-feedback-chip-row parent-feedback-chip-row--grammar"><b>Grammar focus</b>{feedback.grammarFocus.map((focus) => <i key={focus}>{focus}</i>)}</div>}
        {feedback.resourceLinks?.length > 0 && <div className="parent-feedback-resources"><b><BookOpen size={13} /> Practice resources</b>{feedback.resourceLinks.map((link, index) => <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>{link.resourceType === 'video' ? '🎬' : link.resourceType === 'worksheet' ? '📝' : link.resourceType === 'quiz' ? '❓' : link.resourceType === 'reading' ? '📖' : link.resourceType === 'audio' ? '🎧' : '🔗'} {link.title}</a>)}</div>}
      </div>
    </section>
  )
}

function BookingCard({ booking, showStudent = false, showTeacher = false, actions, onEnterClassroom, onManageBooking, onOpenChat }) {
  const student = getAccountById(booking.studentId)
  const teacher = getAccountById(booking.teacherId)
  const learner = student?.children?.find((item) => item.id === booking.learnerId) || student?.child
  const person = showStudent ? (learner?.name || booking.learnerName) : showTeacher ? (teacher?.fullName || booking.teacherName) : ''
  const classroom = teacher?.teacher?.classroom || {}
  const meetingPlatform = classroom.platform === 'voov' ? 'VooV' : 'Zoom'
  const meetingLink = classroom.platform === 'voov' ? classroom.voovLink : classroom.zoomLink
  const session = booking.classroomSummary
  const sessionMinutes = session?.elapsedSeconds ? Math.max(1, Math.round(session.elapsedSeconds / 60)) : 0

  return (
    <article 
      className={`lesson-card ${booking.isTrialClass ? 'lesson-card--trial' : ''}`}
      style={booking.isTrialClass ? {
        borderLeft: '5px solid #ff9e2c',
        paddingLeft: '14px',
        background: 'rgba(255, 158, 44, 0.04)',
        borderRadius: '8px',
        marginBottom: '10px'
      } : undefined}
    >
      <div className="lesson-card__date">
        <strong>{new Date(`${booking.date}T00:00`).getDate()}</strong>
        <span>{new Date(`${booking.date}T00:00`).toLocaleDateString('en', { month: 'short' })}</span>
      </div>
      <div className="lesson-card__main">
        <div className="lesson-card__top" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <StatusBadge status={booking.status} />
          <span>{booking.duration} min</span>
          
          {/* Trial class badges */}
          {booking.isTrialClass && (
            <span style={{ background: '#ff9e2c', color: '#090510', fontSize: '0.62rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🎁 Free Trial Class
            </span>
          )}
          {booking.isTrialClass && booking.trialEnrolled && (
            <span style={{ background: '#bce94e', color: '#090510', fontSize: '0.62rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🏆 Enrolled (₱100)
            </span>
          )}
          {booking.isTrialClass && !booking.trialEnrolled && (
            <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.62rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Trial (₱40)
            </span>
          )}
        </div>
        <h3>{booking.focus}</h3>
        <p className="lesson-card__details" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', margin: '8px 0' }}>
          {person && (
            <strong 
              className="booking-person-name"
              style={{
                fontSize: '1.25rem', // Make it BIGGER as requested!
                fontWeight: '900',
                padding: '4px 10px',
                borderRadius: '8px',
                background: booking.isTrialClass ? '#ffebd0' : '#effbd5',
                color: '#321568',
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
              }}
            >
              {showTeacher ? '👨‍🏫 Teacher' : '👶 Student'}: {person}
            </strong>
          )}
          <span style={{ fontSize: '0.8rem', color: 'var(--portal-muted)' }}>
            {formatLessonDate(booking.date, booking.time)} at <strong className="lesson-time" style={{ color: '#fff' }}>{formatTime(booking.time)}</strong>
          </span>
        </p>
        {['confirmed', 'ongoing'].includes(booking.status) && <div className="lesson-classroom-actions">{onEnterClassroom && <button className="tutorpro-classroom-link" onClick={() => onEnterClassroom(booking)}><Video size={14} /> {booking.status === 'ongoing' ? 'Resume private classroom' : 'Enter private classroom'} <ShieldCheck size={11} /></button>}{meetingLink ? <a className="private-class-link" href={meetingLink} target="_blank" rel="noopener noreferrer"><Video size={13} /> {meetingPlatform} fallback</a> : <span className="meeting-link-pending"><Clock3 size={12} /> External meeting link not configured</span>}</div>}
        {booking.teacherNote && <small>Lesson note: {booking.teacherNote}</small>}
        {booking.slotComment && <div className="booking-slot-comment"><MessageSquareText size={13} /><span><strong>Booking comment</strong>{booking.slotComment}</span></div>}
        {booking.classroomRecordings?.length > 0 && <RecordingPlayback recordings={booking.classroomRecordings} canDownload={showStudent} />}
        {session && <div className="booking-classroom-summary"><Video size={14} /><div><strong>Classroom recap saved</strong><span>{sessionMinutes ? `${sessionMinutes} min · ` : ''}⭐ {session.classStars || 0} · {session.coursewareTitle || 'Courseware'}{session.presentedFileName ? ` · ${session.presentedFileName}` : ''}{session.lastStudentReaction?.label ? ` · ${session.lastStudentReaction.emoji || ''} ${session.lastStudentReaction.label}` : ''}</span></div></div>}
        <div className="booking-utility-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          {onManageBooking && <button className="manage-booking-button" onClick={() => onManageBooking(booking)}><MessageSquareText size={14} /> Comment or manage</button>}

          {booking.status === 'confirmed' && <button className="add-calendar-button" onClick={() => downloadBookingCalendar(booking, { teacherName: teacher?.fullName || booking.teacherName, learnerName: learner?.name || booking.learnerName })}><CalendarPlus size={14} /> Add to phone calendar</button>}
        </div>
        {booking.teacherFeedback && <TeacherFeedbackSummary feedback={booking.teacherFeedback} />}
        {booking.studentRating && <div className="lesson-rating-preview"><Star size={12} fill="currentColor" /> {booking.studentRating.score}/5 {booking.studentRating.comment && <span>“{booking.studentRating.comment}”</span>}</div>}
      </div>
      {actions && <div className="lesson-card__actions">{actions}</div>}
    </article>
  )
}

export function DirectChatModal({ currentUserId, currentUserRole, targetUserId, targetUserName, onClose }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const messagesEndRef = useRef(null)

  const getChatKey = () => {
    return [currentUserId, targetUserId].sort().join('--')
  }

  const loadMessages = () => {
    try {
      const chats = JSON.parse(localStorage.getItem('tutorpro_direct_messages_v1') || '{}')
      const chatKey = getChatKey()
      setMessages(chats[chatKey] || [])
    } catch {
      setMessages([])
    }
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!text.trim()) return

    const newMessage = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderRole: currentUserRole,
      body: text.trim(),
      createdAt: new Date().toISOString()
    }

    try {
      const chats = JSON.parse(localStorage.getItem('tutorpro_direct_messages_v1') || '{}')
      const chatKey = getChatKey()
      const thread = chats[chatKey] || []
      const updated = [...thread, newMessage]
      chats[chatKey] = updated
      localStorage.setItem('tutorpro_direct_messages_v1', JSON.stringify(chats))
      setMessages(updated)
      setText('')
      window.dispatchEvent(new Event('tutorpro:data-change'))
    } catch (err) {
      alert("Failed to send message: " + err.message)
    }
  }

  useEffect(() => {
    loadMessages()
    const handleDataChange = () => loadMessages()
    window.addEventListener('storage', handleDataChange)
    window.addEventListener('tutorpro:data-change', handleDataChange)
    const interval = setInterval(loadMessages, 3000)
    return () => {
      window.removeEventListener('storage', handleDataChange)
      window.removeEventListener('tutorpro:data-change', handleDataChange)
      clearInterval(interval)
    }
  }, [currentUserId, targetUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="portal-dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 9999 }}>
      <section className="portal-dialog direct-chat-dialog" role="dialog" aria-modal="true" style={{ width: '450px', maxWidth: '90vw', height: '550px', display: 'flex', flexDirection: 'column' }}>
        <header className="portal-dialog__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          <div>
            <span className="portal-kicker" style={{ textTransform: 'uppercase', color: '#bce94e', fontWeight: '800', fontSize: '0.68rem', letterSpacing: '0.05em' }}>Direct Messaging</span>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>💬 Chat with {targetUserName}</h3>
          </div>
          <button className="portal-dialog__close" onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#b9adc7', cursor: 'pointer' }}><X size={20} /></button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length ? messages.map((msg) => {
            const isMe = msg.senderId === currentUserId
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%',
                  background: isMe ? '#7850c9' : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: '1.4' }}>{msg.body}</p>
                  <small style={{ display: 'block', textAlign: 'right', fontSize: '0.62rem', color: isMe ? 'rgba(255,255,255,0.7)' : '#b9adc7', marginTop: '4px' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              </div>
            )
          }) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#b9adc7', textAlign: 'center', padding: '20px' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💬</span>
              <strong>No messages yet</strong>
              <span style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '4px' }}>Say hello and start the conversation! Your chats are secure.</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
          <input
            type="text"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            style={{
              background: '#bce94e',
              color: '#090510',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem'
            }}
          >
            Send <Send size={14} />
          </button>
        </form>
      </section>
    </div>
  )
}

export function BookingSlotDialog({ booking, account, onClose, onChanged }) {
  const student = getAccountById(booking.studentId)
  const learner = student?.children?.find((item) => item.id === booking.learnerId) || student?.child
  const learnerName = learner?.name || booking.learnerName || 'Student'
  const teacher = getAccountById(booking.teacherId)
  const [current, setCurrent] = useState(booking)
  const [comment, setComment] = useState(booking.slotComment || '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [previousStatus, setPreviousStatus] = useState('')
  const [error, setError] = useState('')
  const canComment = account.role === 'admin' || (account.role === 'teacher' && account.id === booking.teacherId)
  const canCancel = account.role === 'admin'
    || (account.role === 'teacher' && account.id === booking.teacherId)
    || (account.role === 'student' && account.id === booking.studentId)
  const cancellable = !['ongoing', 'completed', 'absent', 'cancelled', 'declined'].includes(current.status)

  const changed = (updated) => {
    setCurrent(updated)
    onChanged?.(updated)
  }

  const saveComment = async () => {
    const normalized = comment.trim()
    if (normalized.length > 500) {
      setError('Keep the booking comment under 500 characters.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updated = updateBooking(current.id, {
        slotComment: normalized,
        slotCommentAuthor: account.role,
        slotCommentUpdatedAt: new Date().toISOString(),
      })
      changed(updated)
      if (cloudSyncEnabled()) await withTimeout(syncBookingNow(updated), 10000, 'The shared booking database did not confirm the comment in time.')
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2200)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const cancelBookingSlot = async () => {
    const statusBeforeCancel = current.status
    setSaving(true)
    setError('')
    try {
      const updated = updateBooking(current.id, { status: 'cancelled' })
      setPreviousStatus(statusBeforeCancel)
      setConfirmCancel(false)
      changed(updated)
      if (cloudSyncEnabled()) await withTimeout(syncBookingNow(updated), 10000, 'The shared booking database did not confirm the cancellation in time.')
      void notifyBookingParticipants(updated, 'cancelled')
    } catch (cancelError) {
      setError(cancelError.message)
    } finally {
      setSaving(false)
    }
  }

  const undoCancellation = async () => {
    if (!previousStatus) return
    setSaving(true)
    setError('')
    try {
      const updated = updateBooking(current.id, { status: previousStatus })
      setPreviousStatus('')
      changed(updated)
      if (cloudSyncEnabled()) await withTimeout(syncBookingNow(updated), 10000, 'The shared booking database did not confirm the restored booking in time.')
      void notifyBookingParticipants(updated, 'restored')
    } catch (undoError) {
      setError(undoError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="portal-dialog-backdrop booking-slot-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="portal-dialog booking-slot-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-slot-title">
        <button className="portal-dialog__close" onClick={onClose} aria-label="Close booking details"><X size={19} /></button>
        <div className="booking-slot-dialog__heading"><span><CalendarCheck2 size={25} /></span><div><small>Booked calendar slot</small><h2 id="booking-slot-title">{learnerName}</h2><p>{formatLessonDate(current.date, current.time, true)} at <strong>{formatTime(current.time)}</strong> · {current.duration} minutes</p></div><StatusBadge status={current.status} /></div>

        <div className="booking-slot-facts"><div><span>Student</span><strong>{learnerName}</strong></div><div><span>Teacher</span><strong>{teacher?.fullName || current.teacherName || 'Teacher'}</strong></div><div><span>Lesson focus</span><strong>{current.focus}</strong></div></div>
        {current.note && <div className="booking-parent-note"><MessageSquareText size={16} /><div><strong>Parent booking note</strong><span>{current.note}</span></div></div>}

        <div className="booking-comment-editor">
          <div><span>Comment beside {learnerName}’s booked slot</span>{saved && <em><Check size={13} /> Saved live</em>}</div>
          {canComment ? <><textarea value={comment} onChange={(event) => { setComment(event.target.value); setSaved(false); setError('') }} maxLength="500" placeholder={`Write a reminder or lesson comment for ${learnerName}…`} /><div className="booking-comment-actions"><small>{comment.length}/500 · Visible to the parent, teacher and administrator</small><button onClick={saveComment} disabled={saving || comment.trim() === (current.slotComment || '').trim()}><Save size={15} /> {saving ? 'Saving…' : 'Save comment'}</button></div></> : <div className="booking-comment-readonly">{current.slotComment ? <><MessageSquareText size={16} /><span>{current.slotComment}</span></> : <span>No teacher comment has been added to this booking yet.</span>}</div>}
        </div>

        {/* Trial Class Enrollment Settings for Admin */}
        {account.role === 'admin' && current.isTrialClass && (
          <div className="booking-trial-enrollment-editor" style={{ marginTop: '15px', padding: '12px', background: 'rgba(188, 233, 78, 0.08)', borderRadius: '8px', border: '1px solid rgba(188, 233, 78, 0.25)', marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={Boolean(current.trialEnrolled)} 
                onChange={async (e) => {
                  const val = e.target.checked
                  setSaving(true)
                  try {
                    const updated = updateBooking(current.id, { trialEnrolled: val })
                    changed(updated)
                    if (cloudSyncEnabled()) await withTimeout(syncBookingNow(updated), 10000, 'Could not sync booking.')
                  } catch (err) {
                    setError(err.message)
                  } finally {
                    setSaving(false)
                  }
                }} 
                disabled={saving}
                style={{ width: '18px', height: '18px', accentColor: '#bce94e', cursor: 'pointer' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#bce94e' }}>🎁 Successful Trial Class Enrolled</strong>
                <span style={{ fontSize: '0.74rem', color: '#b9adc7' }}>Marking this trial class as enrolled will upgrade the teacher's payout from ₱40 to ₱100!</span>
              </div>
            </label>
          </div>
        )}

        {error && <div className="portal-error" role="alert">{error}</div>}
        {previousStatus && <div className="booking-undo-banner"><div><strong>Booking cancelled</strong><span>The calendar slot has been released.</span></div><button onClick={undoCancellation} disabled={saving}><RotateCcw size={15} /> Undo cancellation</button></div>}
        {confirmCancel && !previousStatus && <div className="booking-cancel-confirm"><div><strong>Cancel this booking?</strong><span>This releases the lesson slot. You can undo it while this window remains open.</span></div><button onClick={() => setConfirmCancel(false)} disabled={saving}>Keep booking</button><button className="danger" onClick={cancelBookingSlot} disabled={saving}>{saving ? 'Cancelling…' : 'Confirm cancellation'}</button></div>}

        <div className="booking-slot-dialog__footer"><button className="portal-secondary-button" onClick={onClose}>Close</button>{current.status === 'confirmed' && <button className="add-calendar-button" onClick={() => downloadBookingCalendar(current, { teacherName: teacher?.fullName || current.teacherName, learnerName })}><CalendarPlus size={16} /> Add calendar reminder</button>}{canCancel && cancellable && !confirmCancel && !previousStatus && <button className="booking-cancel-button" onClick={() => setConfirmCancel(true)}><XCircle size={16} /> Cancel booking</button>}</div>
      </section>
    </div>
  )
}

function BookLessonPanel({ account, learner: learnerProp, onBooked, adminBooking = false }) {
  let teachers = getApprovedTeachers()
  const learner = learnerProp || account.child

  if (!adminBooking && learner?.assignedTeacherId) {
    teachers = teachers.filter((t) => t.id === learner.assignedTeacherId)
  }
  const [form, setForm] = useState({ teacherId: account.preferredTeacherId || '', duration: '25', focus: learner.goal, note: '' })
  const [selectedLessons, setSelectedLessons] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [error, setError] = useState('')
  const [successCount, setSuccessCount] = useState(0)
  const selectedTeacherId = teachers.some((teacher) => teacher.id === form.teacherId) ? form.teacherId : teachers[0]?.id || ''
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId)
  const teacherBookings = selectedTeacherId ? getBookings({ teacherId: selectedTeacherId }) : []

  const update = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (['teacherId', 'duration'].includes(name)) setSelectedLessons([])
    setError('')
    setSuccessCount(0)
  }

  const selectSlot = ({ date, time }, mode = 'toggle') => {
    const key = `${date}-${time}`
    setSelectedLessons((current) => {
      const exists = current.some((selection) => `${selection.date}-${selection.time}` === key)
      if (mode === 'remove' || (mode === 'toggle' && exists)) return current.filter((selection) => `${selection.date}-${selection.time}` !== key)
      if (exists || current.length >= 12) return current
      const start = timeToMinutes(time)
      const end = start + (Math.ceil(Number(form.duration) / 30) * 30)
      const overlaps = current.some((selection) => {
        if (selection.date !== date) return false
        const selectedStart = timeToMinutes(selection.time)
        const selectedEnd = selectedStart + (Math.ceil(Number(selection.duration || form.duration) / 30) * 30)
        return start < selectedEnd && end > selectedStart
      })
      if (overlaps) return current
      return [...current, { date, time, duration: Number(form.duration) }].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    })
    setError('')
    setSuccessCount(0)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!selectedTeacherId || !selectedLessons.length || !form.focus) {
      setError('Choose one or more available times on the calendar to continue.')
      return
    }

    // Restrict bookings to only paid session count (booking credits) for Parent view
    const balance = typeof account.paidLessonsBalance === 'number' ? account.paidLessonsBalance : 0
    if (!adminBooking && selectedLessons.length > balance) {
      setError(`⚠️ You only have ${balance} paid lesson credits left, but you are trying to book ${selectedLessons.length} lessons. Please complete payment first so your booking credits can be added.`)
      return
    }

    let createdCount = 0
    try {
      for (const selection of selectedLessons) {
        let booking = createBooking({ ...form, ...selection, teacherId: selectedTeacherId, teacherName: selectedTeacher.fullName, studentId: account.id, learnerId: learner.id, learnerName: learner.name, learnerProfile: learner })
        if (adminBooking) booking = updateBooking(booking.id, { status: 'confirmed' })
        if (cloudSyncEnabled()) await withTimeout(syncBookingNow(booking), 10000, 'The shared booking database did not respond in time.')
        void notifyBookingParticipants(booking, adminBooking ? 'confirmed' : 'requested')
        createdCount += 1
      }
      
      // Update account paidLessonsBalance credits upon successful booking
      if (!adminBooking) {
        const nextBalance = balance - createdCount
        const updated = updateAccount(account.id, { paidLessonsBalance: nextBalance })
        onBooked()
      } else {
        onBooked()
      }

      setSuccessCount(createdCount)
      setSelectedLessons([])
      setForm((current) => ({ ...current, note: '' }))
    } catch (bookingError) {
      if (createdCount) {
        setSuccessCount(createdCount)
        setSelectedLessons((current) => current.slice(createdCount))
        onBooked()
      }
      setError(`${createdCount ? `${createdCount} lesson${createdCount > 1 ? 's were' : ' was'} saved. ` : ''}${bookingError.message}`)
    }
  }

  if (account.status === 'suspended') {
    return (
      <div className="portal-view">
        <div className="portal-page-heading"><div><span className="portal-kicker">Family account access</span><h1>Account suspended</h1><p>All student profiles in this family account are temporarily paused.</p></div></div>
        <section className="student-suspended-card"><span><Ban size={30} /></span><div><small>Family account · Suspended</small><h2>{learner.name} cannot book while this account is suspended.</h2><p>Contact the TutorPro Online English administrator to restore access.</p>{adminBooking && <button className="portal-primary-button" onClick={() => { updateAccount(account.id, { status: 'active' }); onBooked() }}>Restore family account <UserCheck size={16} /></button>}</div></section>
      </div>
    )
  }

  if (learner.accessStatus === 'suspended') {
    return (
      <div className="portal-view">
        <div className="portal-page-heading"><div><span className="portal-kicker">Student access</span><h1>Profile suspended</h1><p>This learner cannot schedule or enter new classes while suspended.</p></div></div>
        <section className="student-suspended-card"><span><Ban size={30} /></span><div><small>Student status · Suspended</small><h2>{learner.name}’s learning profile is paused.</h2><p>Please contact the TutorPro Online English administrator to restore booking and classroom access.</p>{adminBooking && <button className="portal-primary-button" onClick={() => { updateLearnerAccess(account.id, learner.id, 'active'); onBooked() }}>Restore {learner.name} <UserCheck size={16} /></button>}</div></section>
      </div>
    )
  }



  return (
    <div className="portal-view">
      <div className="portal-page-heading">
        <div><span className="portal-kicker">Live availability</span><h1>Book one or multiple classes</h1><p>Click individual times or click and drag across the teacher’s available 30-minute slots.</p></div>
      </div>
      <section className="portal-card booking-calendar-card">
        <div className="booking-controls">
          <label><span>Teacher</span><select name="teacherId" value={selectedTeacherId} onChange={update}>{teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.fullName} · {teacher.teacher.specialization}</option>)}</select></label>
          <label><span>Lesson focus</span><select name="focus" value={form.focus} onChange={update}><option>Speaking with confidence</option><option>Reading comprehension</option><option>Writing and grammar</option><option>Schoolwork and exam support</option><option>Build an all-round foundation</option></select></label>
          <fieldset className="compact-duration"><legend>Lesson length</legend><div>{['25', '50'].map((duration) => <label className={form.duration === duration ? 'selected' : ''} key={duration}><input type="radio" name="duration" value={duration} checked={form.duration === duration} onChange={update} /><span>{duration} min</span></label>)}</div></fieldset>
        </div>

        {successCount > 0 && <div className="portal-success"><CheckCircle2 size={18} /><div><strong>{successCount} lesson{successCount > 1 ? 's' : ''} {adminBooking ? 'booked and confirmed!' : 'requested!'}</strong><span>{adminBooking ? 'The student and teacher calendars are reserved.' : 'The selected times are reserved while confirmation is pending.'}</span></div></div>}
        {error && <div className="portal-error" role="alert">{error}</div>}

        {teachers.length && selectedTeacher ? (
          <><div className="multi-book-tip"><CalendarPlus size={17} /><span><strong>Multi-book mode</strong> Click a time to select it, or hold and drag across several available times. Click selected times again to remove them.</span><em>{selectedLessons.length}/12 selected</em></div><ScheduleCalendar
            weekOffset={weekOffset}
            onWeekOffset={setWeekOffset}
            availabilitySlots={selectedTeacher.teacher.availabilitySlots || []}
            bookings={teacherBookings}
            duration={Number(form.duration)}
            selectedLessons={selectedLessons}
            onSelect={selectSlot}
            multiSelect
          /></>
        ) : (
          <EmptyState icon={Users} title="Teachers are being prepared" text="An administrator needs to approve a teacher before new lessons can be requested." />
        )}

        <form className="booking-confirm-bar" onSubmit={submit}>
          <div className={selectedLessons.length ? 'selected' : ''}>
            <span className="portal-card__icon"><Clock3 size={21} /></span>
            <div><small>{selectedLessons.length ? `${selectedLessons.length} lesson time${selectedLessons.length > 1 ? 's' : ''} selected` : 'Click or drag across available times'}</small><strong>{selectedLessons.length ? `${formatLessonDate(selectedLessons[0].date, selectedLessons[0].time, true)} at ${formatTime(selectedLessons[0].time)}${selectedLessons.length > 1 ? ` + ${selectedLessons.length - 1} more` : ''}` : 'No time selected yet'}</strong><em>{form.duration} min per lesson · select up to 12 times</em></div>
          </div>
          <label><span>Note <i>applies to all selected lessons</i></span><input name="note" value={form.note} onChange={update} placeholder="Note for the teacher" /></label>
          <button className="portal-primary-button" type="submit" disabled={!selectedLessons.length}>{adminBooking ? `Book ${selectedLessons.length || ''} & confirm` : `Request ${selectedLessons.length || ''} lesson${selectedLessons.length === 1 ? '' : 's'}`} <ArrowRight size={17} /></button>
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
        <p>Your rating helps families choose the right teacher and helps TutorPro Online English keep every class excellent.</p>
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

export function FeedbackDialog({ booking, teacherId, onClose, onSaved }) {
  const student = getAccountById(booking.studentId)
  const learner = student?.children?.find((item) => item.id === booking.learnerId) || student?.child
  const existing = booking.teacherFeedback || {}
  const RESOURCE_TYPE_OPTIONS = [
    { value: 'link', label: '🔗 Link', icon: '🔗' },
    { value: 'video', label: '🎬 Video', icon: '🎬' },
    { value: 'worksheet', label: '📝 Worksheet', icon: '📝' },
    { value: 'quiz', label: '❓ Quiz', icon: '❓' },
    { value: 'reading', label: '📖 Reading', icon: '📖' },
    { value: 'audio', label: '🎧 Audio', icon: '🎧' },
    { value: 'other', label: '📎 Other', icon: '📎' },
  ]
  const [form, setForm] = useState({
    summary: existing.summary || '',
    strength: existing.strength || '',
    nextStep: existing.nextStep || '',
    homework: existing.homework || '',
    practiceWords: Array.isArray(existing.practiceWords) ? existing.practiceWords : [],
    grammarFocus: Array.isArray(existing.grammarFocus) ? existing.grammarFocus : [],
    resourceLinks: Array.isArray(existing.resourceLinks) ? existing.resourceLinks : [],
  })
  const [wordDraft, setWordDraft] = useState('')
  const [resourceDraft, setResourceDraft] = useState({ title: '', url: '', resourceType: 'link' })
  const [error, setError] = useState('')

  const fillTemplate = (type) => {
    const studentName = learner?.name || 'the student'
    const templates = {
      speaking: {
        summary: `Today, ${studentName} did a fantastic job practicing active speaking and sentence structures! We covered the main topics, participated in high-energy vocabulary drills, and built full-sentence responses to several conversational questions. ${studentName} had an amazing attitude throughout the class!`,
        strength: `Confident, spontaneous spoken answers and high-energy vocabulary drills!`,
        nextStep: `Practice using complete sentences with richer adjectives instead of single-word answers.`,
        homework: `Practice speaking about your favorite hobbies in 3 complete sentences before our next lesson.`
      },
      phonics: {
        summary: `Excellent phonics and reading session with ${studentName}! We focused closely on target sound blend pronunciations, spelling targets, and reading comprehension. ${studentName} successfully identified several key vowel sound blends and applied them to full-sentence readings!`,
        strength: `Excellent phonics decoding and accurate pronunciation of blend sounds.`,
        nextStep: `Build fluency by reading longer paragraphs smoothly without stopping at individual words.`,
        homework: `Read slide 5 out loud three times to practice reading flow and pronunciation.`
      },
      grammar: {
        summary: `A highly focused session on grammar and writing with ${studentName}! We practiced standard auxiliary verb agreements, past-tense verb conjugations, and structured sentence builders. ${studentName} successfully constructed several grammatically perfect sentences!`,
        strength: `Quick understanding of verb agreement rules and excellent spelling.`,
        nextStep: `Practice identifying irregular past-tense verbs and constructing complex compound sentences.`,
        homework: `Write 3 short sentences about what you did yesterday using correct past-tense verbs.`
      },
      effort: {
        summary: `Outstanding effort and motivation shown by ${studentName} in today's lesson! We explored interactive courseware, vocabulary cards, and reading materials. ${studentName} showed unbreakable focus, asked brilliant questions, and completed every task with a huge smile!`,
        strength: `Exceptional listening skills, high motivation, and positive participation!`,
        nextStep: `Continue building vocabulary width by introducing 3 new adjectives every day.`,
        homework: `Review our new adjectives and use them in daily conversations with your family!`
      }
    }
    const selected = templates[type]
    if (selected) {
      setForm((current) => ({
        ...current,
        summary: selected.summary,
        strength: selected.strength,
        nextStep: selected.nextStep,
        homework: selected.homework
      }))
    }
  }


  const addPracticeWord = () => {
    const word = wordDraft.trim().replace(/^,+|,+$/g, '')
    if (!word) return
    if (word.length > 40) {
      setError('Keep each practice word or phrase under 40 characters.')
      return
    }
    setForm((current) => current.practiceWords.some((item) => item.toLowerCase() === word.toLowerCase()) || current.practiceWords.length >= 12
      ? current
      : { ...current, practiceWords: [...current.practiceWords, word] })
    setWordDraft('')
    setError('')
  }

  const toggleGrammarFocus = (focus) => {
    setForm((current) => ({
      ...current,
      grammarFocus: current.grammarFocus.includes(focus)
        ? current.grammarFocus.filter((item) => item !== focus)
        : [...current.grammarFocus, focus],
    }))
  }

  const addResourceLink = () => {
    const title = resourceDraft.title.trim()
    const url = resourceDraft.url.trim()
    if (!title) { setError('Add a title for the resource link.') ; return }
    if (!url || !/^https?:\/\//i.test(url)) { setError('Resource links must start with http:// or https://') ; return }
    if (title.length > 120) { setError('Keep the resource title under 120 characters.') ; return }
    if (form.resourceLinks.length >= 10) { setError('You can add up to 10 resource links per feedback.') ; return }
    setForm((current) => ({
      ...current,
      resourceLinks: [...current.resourceLinks, { title, url, resourceType: resourceDraft.resourceType }],
    }))
    setResourceDraft({ title: '', url: '', resourceType: 'link' })
    setError('')
  }

  const removeResourceLink = (index) => {
    setForm((current) => ({
      ...current,
      resourceLinks: current.resourceLinks.filter((_, i) => i !== index),
    }))
  }

  const submit = (event) => {
    event.preventDefault()
    try {
      const pendingWord = wordDraft.trim()
      const feedback = pendingWord && !form.practiceWords.some((item) => item.toLowerCase() === pendingWord.toLowerCase())
        ? { ...form, practiceWords: [...form.practiceWords, pendingWord].slice(0, 12) }
        : form
      saveTeacherFeedback(booking.id, teacherId, feedback)
      onSaved(booking.status !== 'completed')
    } catch (feedbackError) {
      setError(feedbackError.message)
    }
  }

  return (
    <div className="portal-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="portal-dialog feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <button className="portal-dialog__close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="portal-dialog__heading"><span><MessageSquareText size={23} /></span><div><small>Post-class feedback</small><h2 id="feedback-title">Feedback for {learner?.name || booking.learnerName || 'the student'}</h2><p>Parents will see this feedback in the completed lesson and student dashboard.</p></div></div>
        <div className="feedback-selected-student-card">
          <span><UserRound size={18} /></span>
          <div><small>Selected student</small><strong>{learner?.name || booking.learnerName || 'Student'}</strong><em>{formatLessonDate(booking.date, booking.time, true)} at {formatTime(booking.time)} · {booking.focus}</em></div>
        </div>
        {error && <div className="portal-error" role="alert">{error}</div>}


        {/* ✨ FAST FEEDBACK TEMPLATE RECOMMENDATIONS */}
        <div className="feedback-recommendations" style={{ margin: '15px 0', padding: '12px', background: 'rgba(120, 80, 201, 0.08)', border: '1px solid rgba(120, 80, 201, 0.2)', borderRadius: '10px' }}>
          <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#bce94e', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ✨ Fast Feedback Recommendations (Click to Pre-fill)
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={() => fillTemplate('speaking')}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.72rem', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🗣️ Speaking Confidence
            </button>
            <button 
              type="button" 
              onClick={() => fillTemplate('phonics')}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.72rem', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              📖 Phonics & Reading
            </button>
            <button 
              type="button" 
              onClick={() => fillTemplate('grammar')}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.72rem', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✍️ Grammar & Builder
            </button>
            <button 
              type="button" 
              onClick={() => fillTemplate('effort')}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.72rem', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🚀 Exceptional Effort
            </button>
          </div>
        </div>

        <form className="feedback-form" onSubmit={submit}>
          <label><span>Class summary * <em>{form.summary.length}/5000</em></span><textarea autoFocus value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Paste or type up to 5,000 characters. What did you cover and how did the student participate?" maxLength={5000} /></label>
          <div><label><span>Strength shown</span><input value={form.strength} onChange={(event) => setForm((current) => ({ ...current, strength: event.target.value }))} placeholder="e.g. Clear spoken answers" /></label><label><span>Next learning step</span><input value={form.nextStep} onChange={(event) => setForm((current) => ({ ...current, nextStep: event.target.value }))} placeholder="e.g. Use richer vocabulary" /></label></div>
          <div className="feedback-practice-grid">
            <fieldset className="feedback-word-practice"><legend>Words or phrases to practise</legend><p>Add up to 12 vocabulary or pronunciation targets. Tap any added word to hear how the student will hear it.</p><div className="feedback-word-entry"><input value={wordDraft} onChange={(event) => setWordDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addPracticeWord() } }} placeholder="Type a word, then press Enter" maxLength="40" /><button type="button" onClick={addPracticeWord} disabled={!wordDraft.trim() || form.practiceWords.length >= 12}><Plus size={15} /> Add</button></div><div className="feedback-chip-list feedback-chip-list--speak">{form.practiceWords.length ? form.practiceWords.map((word) => <span key={word}><button type="button" className="feedback-chip-speak" onClick={() => speakPracticeWord(word)} aria-label={`Hear ${word}`} title={`Hear "${word}" pronounced`}><Volume2 size={12} /></button>{word}<button type="button" onClick={() => setForm((current) => ({ ...current, practiceWords: current.practiceWords.filter((item) => item !== word) }))} aria-label={`Remove ${word}`}><X size={12} /></button></span>) : <small>No practice words selected yet.</small>}</div></fieldset>
            <fieldset className="feedback-grammar-focus"><legend>Grammar to practise</legend><p>Select every grammar area that needs more practice.</p><div>{GRAMMAR_FOCUS_OPTIONS.map((focus) => <label className={form.grammarFocus.includes(focus) ? 'selected' : ''} key={focus}><input type="checkbox" checked={form.grammarFocus.includes(focus)} onChange={() => toggleGrammarFocus(focus)} /><span>{focus}</span></label>)}</div></fieldset>
          </div>
          <label><span>Optional homework</span><input value={form.homework} onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))} placeholder="A short practice task for next class" /></label>

          <fieldset className="feedback-resource-links">
            <legend>Resource links for the student</legend>
            <p>Attach worksheets, videos, quizzes or other practice materials the student can access after class.</p>
            <div className="feedback-resource-entry">
              <select value={resourceDraft.resourceType} onChange={(event) => setResourceDraft((current) => ({ ...current, resourceType: event.target.value }))} aria-label="Resource type" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.78rem', outline: 'none', minWidth: '110px' }}>
                {RESOURCE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input value={resourceDraft.title} onChange={(event) => setResourceDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Resource title (e.g. Phonics worksheet)" maxLength="120" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addResourceLink() } }} style={{ flex: '1 1 140px', minWidth: '0' }} />
              <input value={resourceDraft.url} onChange={(event) => setResourceDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addResourceLink() } }} style={{ flex: '1 1 180px', minWidth: '0' }} />
              <button type="button" onClick={addResourceLink} disabled={form.resourceLinks.length >= 10} style={{ whiteSpace: 'nowrap' }}><Plus size={15} /> Add</button>
            </div>
            {form.resourceLinks.length > 0 && (
              <div className="feedback-resource-list">
                {form.resourceLinks.map((link, index) => {
                  const typeOption = RESOURCE_TYPE_OPTIONS.find((option) => option.value === link.resourceType) || RESOURCE_TYPE_OPTIONS[0]
                  return (
                    <div className="feedback-resource-item" key={`${link.url}-${index}`}>
                      <span className="feedback-resource-type">{typeOption.icon}</span>
                      <a className="feedback-resource-detail" href={link.url} target="_blank" rel="noopener noreferrer" title={`Open ${link.title} in a new tab`}>
                        <strong>{link.title}</strong>
                        <small>{link.url}</small>
                        <em>Open link in new tab ↗</em>
                      </a>
                      <button type="button" onClick={() => removeResourceLink(index)} aria-label={`Remove ${link.title}`}><X size={13} /></button>
                    </div>
                  )
                })}
              </div>
            )}
            {form.resourceLinks.length === 0 && <small style={{ color: '#b9adc7' }}>No resource links added yet.</small>}
          </fieldset>
          <div className="portal-dialog__actions"><button type="button" className="portal-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="portal-primary-button">Save feedback & complete class <Check size={16} /></button></div>
        </form>
      </section>
    </div>
  )
}

function AddStudentDialog({ account, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', year: '', curriculum: 'Cambridge', goal: 'Speaking with confidence', frequency: '1–2 weekly' })
  const [error, setError] = useState('')
  const [pendingAccount, setPendingAccount] = useState(null)
  const [syncing, setSyncing] = useState(false)

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!pendingAccount && (form.name.trim().length < 2 || !form.year)) {
      setError('Add the student name and school year.')
      return
    }
    setSyncing(true)
    setError('')
    let profileToSync = pendingAccount
    try {
      profileToSync = profileToSync || addStudentLearner(account.id, form)
      const learnerId = profileToSync.children[profileToSync.children.length - 1].id
      setPendingAccount(profileToSync)
      const synchronized = await withTimeout(syncPendingCloudProfile(profileToSync.id), 10000, 'The shared student database did not respond in time.')
      setPendingAccount(null)
      onAdded(synchronized || profileToSync, learnerId)
    } catch (addError) {
      setError(profileToSync
        ? `${addError.message} The additional student is saved on this device and TutorPro Online English will keep retrying cloud synchronization. Confirm the parent email, then select “Retry shared sync”—do not add the student again.`
        : addError.message)
    } finally {
      setSyncing(false)
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
          <label><span>Main learning goal</span><select name="goal" value={form.goal} onChange={update}>{LEARNING_GOALS.map((goal) => <option key={goal}>{goal}</option>)}</select></label>
          <div className="portal-dialog__actions"><button type="button" className="portal-secondary-button" onClick={onClose} disabled={syncing}>Cancel</button><button type="submit" className="portal-primary-button" disabled={syncing}>{pendingAccount ? <CloudUpload size={16} /> : <Plus size={16} />} {syncing ? 'Synchronizing…' : pendingAccount ? 'Retry shared sync' : 'Add & synchronize student'}</button></div>
        </form>
      </section>
    </div>
  )
}



function StudentAiReportPanel({ account, learner, onOpenLibrary }) {
  const bookings = getBookings({ studentId: account.id }).filter((booking) => booking.learnerId ? booking.learnerId === learner.id : true)
  const homework = getHomework({ studentId: account.id, learnerId: learner.id })
  const report = buildLearningReport({ learner, bookings, homework })
  const suggestedResources = getRecommendedLibraryResources({ learner, homework, feedback: bookings }).slice(0, 4)
  const scoreEntries = Object.entries(report.scores)

  return (
    <div className="portal-view ai-report-view">
      <section className="ai-report-hero">
        <div>
          <span className="portal-kicker">AI learning report</span>
          <h1>{learner.name}'s progress snapshot</h1>
          <p>{report.summary} This report uses class history, teacher feedback, homework status and learning goals to recommend the next best practice steps.</p>
          <div className="ai-report-hero__stats"><span><strong>{report.completedLessons}</strong> completed lessons</span><span><strong>{report.attendanceRate}%</strong> attendance</span><span><strong>{report.homeworkRate}%</strong> homework</span></div>
        </div>
        <div className="ai-report-score-card"><small>Overall momentum</small><strong>{Math.round((report.scores.speaking + report.scores.reading + report.scores.grammar + report.scores.vocabulary) / 4)}%</strong><span>Updated {new Date(report.generatedAt).toLocaleDateString('en')}</span></div>
      </section>

      <section className="portal-card ai-report-scores-card">
        <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Skill map</span><h2>Learning scores</h2></div></div>
        <div className="ai-skill-grid">{scoreEntries.map(([key, value]) => <div key={key}><span>{skillLabel(key)}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>)}</div>
      </section>

      <div className="ai-report-grid">
        <section className="portal-card ai-recommendations-card"><span className="portal-kicker">Next best actions</span><h2>AI recommendations</h2>{report.recommendations.map((item) => <article key={item.title}><span>{item.type}</span><div><strong>{item.title}</strong><p>{item.action}</p></div></article>)}</section>
        <section className="portal-card ai-practice-card"><span className="portal-kicker">Practice focus</span><h2>Words & grammar</h2>{report.practiceWords.length ? <div className="ai-chip-row ai-chip-row--speak"><b>Words</b>{report.practiceWords.map((word) => <PracticeWordChip key={word} word={word} />)}</div> : <p>No practice words yet. They will appear after teacher feedback.</p>}{report.grammarFocus.length ? <div className="ai-chip-row ai-chip-row--grammar"><b>Grammar</b>{report.grammarFocus.map((focus) => <i key={focus}>{focus}</i>)}</div> : <p>Grammar focus will appear after class feedback.</p>}</section>
      </div>

      <section className="portal-card ai-resource-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Recommended library</span><h2>Suggested practice resources</h2></div><button className="portal-text-button" onClick={onOpenLibrary}>Open Library <ChevronRight size={15} /></button></div><div className="ai-resource-list">{suggestedResources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer"><strong>{resource.title}</strong><span>{resource.category} · {resource.level}</span></a>)}</div></section>

      <section className="portal-card ai-feedback-timeline"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Recent feedback</span><h2>Teacher notes used in this report</h2></div></div>{report.recentFeedback.length ? report.recentFeedback.map((booking) => <article key={booking.id}><strong>{formatLessonDate(booking.date, booking.time)}</strong><p>{booking.teacherFeedback.summary}</p>{booking.teacherFeedback.nextStep && <small>Next: {booking.teacherFeedback.nextStep}</small>}</article>) : <EmptyState icon={MessageSquareText} title="No teacher feedback yet" text="AI insights become richer after completed lessons with feedback." />}</section>
    </div>
  )
}

function StudentRewardsPanel({ account, learner, onAccountChange }) {
  const [version, setVersion] = useState(0)
  const syncedProfile = deriveAutomaticBadges(learner)
  const profile = syncedProfile
  const progress = rewardProgress(profile.xp)
  const saveRewardProfile = (nextProfile) => {
    const updated = updateStudentProfile(account.id, {
      rewardProfile: nextProfile,
      gameStars: nextProfile.stars,
      achievements: [...new Set([...(learner.achievements || []), ...BADGE_CATALOG.filter((badge) => nextProfile.badges.includes(badge.id)).map((badge) => badge.title)])],
    }, learner.id)
    onAccountChange?.(updated)
    setVersion((value) => value + 1)
  }
  useEffect(() => {
    if (JSON.stringify(learner.rewardProfile || {}) !== JSON.stringify(syncedProfile)) saveRewardProfile(syncedProfile)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  void version
  const claim = (mission) => {
    if (!canClaimMission(profile, mission.id)) return
    saveRewardProfile(claimMission(profile, mission))
  }
  return (
    <div className="portal-view rewards-view"><section className="rewards-hero-card"><div><span className="portal-kicker">Reward system</span><h1>{progress.current.emoji} {progress.current.title}</h1><p>Earn XP, coins, stars and badges by completing homework, lessons, games and daily missions.</p><div className="rewards-hero-stats"><span><strong>{profile.xp}</strong> XP</span><span><strong>{profile.coins}</strong> coins</span><span><strong>{profile.stars}</strong> stars</span><span><strong>{profile.badges.length}</strong> badges</span></div></div><div className="rewards-level-card"><small>Next level</small><strong>{progress.next ? progress.next.title : 'Top level reached'}</strong><i><b style={{ width: `${progress.percent}%` }} /></i><span>{progress.next ? `${progress.remaining} XP to go` : 'You unlocked every level!'}</span></div></section><section className="rewards-grid"><article className="portal-card rewards-missions-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Daily missions</span><h2>Claim today’s rewards</h2></div></div>{DAILY_MISSIONS.map((mission) => { const available = canClaimMission(profile, mission.id); return <button key={mission.id} className={available ? '' : 'claimed'} onClick={() => claim(mission)} disabled={!available}><span>{available ? '✨' : '✅'}</span><div><strong>{mission.title}</strong><small>+{mission.reward.xp} XP · +{mission.reward.coins} coins · +{mission.reward.stars} star</small></div></button> })}</article><article className="portal-card rewards-wallet-card"><span className="portal-kicker">Reward wallet</span><h2>Student balance</h2><dl><div><dt>XP</dt><dd>{profile.xp}</dd></div><div><dt>Coins</dt><dd>{profile.coins}</dd></div><div><dt>Stars</dt><dd>{profile.stars}</dd></div><div><dt>Level</dt><dd>{progress.current.level}</dd></div></dl></article></section><section className="portal-card rewards-badge-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Achievements</span><h2>Badges and certificates</h2></div></div><div className="rewards-badge-grid">{BADGE_CATALOG.map((badge) => <article key={badge.id} className={profile.badges.includes(badge.id) ? 'earned' : 'locked'}><span>{badge.emoji}</span><strong>{badge.title}</strong><small>{badge.description}</small></article>)}</div></section><section className="portal-card rewards-history-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Reward history</span><h2>Recent earnings</h2></div></div>{profile.transactions.length ? <div className="rewards-history-list">{profile.transactions.slice(0, 12).map((item) => <article key={item.id}><span>🎁</span><div><strong>{item.reason}</strong><small>+{item.xp} XP · +{item.coins} coins · +{item.stars} stars</small></div><time>{new Date(item.createdAt).toLocaleDateString('en')}</time></article>)}</div> : <EmptyState icon={Award} title="No rewards yet" text="Complete a mission or homework to earn your first reward." />}</section></div>
  )
}

function AdminRewardsPanel() {
  const students = getAccounts('student')
  const learners = students.flatMap((student) => (student.children?.length ? student.children : student.child ? [student.child] : []).map((learner) => ({ student, learner, profile: getRewardProfile(learner) })))
  const totalXp = learners.reduce((sum, item) => sum + item.profile.xp, 0)
  const totalCoins = learners.reduce((sum, item) => sum + item.profile.coins, 0)
  const totalBadges = learners.reduce((sum, item) => sum + item.profile.badges.length, 0)
  const topLearners = [...learners].sort((a, b) => b.profile.xp - a.profile.xp).slice(0, 20)
  return <div className="portal-view rewards-view"><div className="portal-page-heading"><div><span className="portal-kicker">Student rewards</span><h1>Rewards, XP and badges</h1><p>Monitor student engagement across homework, games, lessons and missions.</p></div></div><div className="portal-stat-grid"><article><span className="stat-icon stat-icon--blue"><Award size={21} /></span><div><small>Total XP</small><strong>{totalXp}</strong><em>All learners</em></div></article><article><span className="stat-icon stat-icon--gold"><Coins size={21} /></span><div><small>Coins issued</small><strong>{totalCoins}</strong><em>Student wallet</em></div></article><article><span className="stat-icon stat-icon--green"><CheckCircle2 size={21} /></span><div><small>Badges earned</small><strong>{totalBadges}</strong><em>Achievements</em></div></article></div><section className="portal-card rewards-admin-table"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Leaderboard</span><h2>Top students by XP</h2></div></div><div className="admin-table"><div className="admin-table__head"><span>Student</span><span>Family</span><span>Level</span><span>XP</span><span>Badges</span></div>{topLearners.map(({ student, learner, profile }) => { const progress = rewardProgress(profile.xp); return <div className="admin-table__row" key={`${student.id}-${learner.id}`}><div><strong>{learner.name}</strong><small>{learner.curriculum} · {learner.year}</small></div><div><strong>{displayName(student)}</strong><small>{student.loginId || student.email}</small></div><div><strong>{progress.current.emoji} {progress.current.title}</strong><small>Level {progress.current.level}</small></div><div><strong>{profile.xp}</strong></div><div><strong>{profile.badges.length}</strong></div></div> })}</div></section></div>
}

function HomeworkStatusBadge({ status }) {
  return <span className={`homework-status homework-status--${status || 'assigned'}`}>{status || 'assigned'}</span>
}

function StudentHomeworkPanel({ account, learner, onAccountChange }) {
  const [version, setVersion] = useState(0)
  const [note, setNote] = useState({})
  const homework = getHomework({ studentId: account.id, learnerId: learner.id })
  const stats = homeworkStats(homework)

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener('tutorpro:homework-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('tutorpro:homework-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  void version

  const markComplete = (item) => {
    updateHomework(item.id, { status: 'completed', studentNote: note[item.id] || '', completedAt: new Date().toISOString() })
    const latest = getAccountById(account.id)
    const currentLearner = latest?.children?.find((entry) => entry.id === learner.id) || learner
    const updated = updateStudentProfile(account.id, {
      gameStars: (currentLearner.gameStars || 0) + 1,
      achievements: [...new Set([...(currentLearner.achievements || []), 'Homework hero'])],
    }, learner.id)
    onAccountChange?.(updated)
    setVersion((value) => value + 1)
  }

  return (
    <div className="portal-view homework-view">
      <div className="portal-page-heading"><div><span className="portal-kicker">Homework center</span><h1>{learner.name}'s homework</h1><p>Complete teacher assignments, open resources, and earn stars for submitted practice.</p></div><span className="support-inbox-live"><i /> {stats.completed}/{stats.total} completed</span></div>
      <div className="portal-stat-grid"><article><span className="stat-icon stat-icon--blue"><BookOpen size={21} /></span><div><small>Assigned</small><strong>{stats.assigned}</strong><em>Open tasks</em></div></article><article><span className="stat-icon stat-icon--green"><CheckCircle2 size={21} /></span><div><small>Completed</small><strong>{stats.completed}</strong><em>Great work</em></div></article><article><span className="stat-icon stat-icon--orange"><Clock3 size={21} /></span><div><small>Overdue</small><strong>{stats.overdue}</strong><em>Needs attention</em></div></article></div>
      <section className="homework-list">
        {homework.length ? homework.map((item) => <article className="portal-card homework-card" key={item.id}><div className="homework-card__head"><div><span className="portal-kicker">{item.type}</span><h2>{item.title}</h2><p>{item.teacherName} · {item.dueDate ? `Due ${new Date(`${item.dueDate}T00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}` : 'No due date'}</p></div><HomeworkStatusBadge status={item.status} /></div><p className="homework-card__instructions">{item.instructions}</p>{item.resourceUrl && <a className="homework-resource-link" href={item.resourceUrl} target="_blank" rel="noreferrer">Open practice resource <ExternalLink size={14} /></a>}{['assigned'].includes(item.status) ? <div className="homework-submit-box"><textarea value={note[item.id] || ''} onChange={(event) => setNote((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Optional note for your teacher…" maxLength="600" /><button className="portal-primary-button" onClick={() => markComplete(item)}>Mark complete <Check size={16} /></button></div> : <div className="homework-complete-note"><CheckCircle2 size={16} /> Submitted {item.completedAt ? new Date(item.completedAt).toLocaleDateString('en') : 'recently'}{item.teacherReview && <span> · Teacher: {item.teacherReview}</span>}</div>}</article>) : <EmptyState icon={BookOpen} title="No homework yet" text="Your teacher assignments will appear here after class." />}
      </section>
    </div>
  )
}

function TeacherHomeworkPanel({ account }) {
  const [version, setVersion] = useState(0)
  const bookings = getBookings({ teacherId: account.id })
  const studentOptions = [...new Map(bookings.map((booking) => [`${booking.studentId}-${booking.learnerId}`, booking])).values()]
  const teacherHomework = getHomework({ teacherId: account.id })
  const stats = homeworkStats(teacherHomework)
  const [form, setForm] = useState(() => ({
    studentKey: studentOptions[0] ? `${studentOptions[0].studentId}-${studentOptions[0].learnerId}` : '',
    type: 'Reading',
    title: '',
    instructions: '',
    resourceUrl: '',
    dueDate: '',
  }))
  const selectedBooking = studentOptions.find((booking) => `${booking.studentId}-${booking.learnerId}` === form.studentKey)

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener('tutorpro:homework-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('tutorpro:homework-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  void version

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const assign = (event) => {
    event.preventDefault()
    try {
      if (!selectedBooking) throw new Error('Choose a student from your bookings first.')
      createHomework({
        teacherId: account.id,
        teacherName: account.fullName,
        studentId: selectedBooking.studentId,
        learnerId: selectedBooking.learnerId,
        learnerName: selectedBooking.learnerName,
        type: form.type,
        title: form.title,
        instructions: form.instructions,
        resourceUrl: form.resourceUrl,
        dueDate: form.dueDate,
      })
      setForm((current) => ({ ...current, title: '', instructions: '', resourceUrl: '' }))
      setVersion((value) => value + 1)
    } catch (error) {
      alert(error.message)
    }
  }

  const review = (item, text = 'Reviewed by teacher') => {
    updateHomework(item.id, { status: 'reviewed', teacherReview: text, reviewedAt: new Date().toISOString() })
    setVersion((value) => value + 1)
  }

  return (
    <div className="portal-view homework-view">
      <div className="portal-page-heading"><div><span className="portal-kicker">Homework center</span><h1>Assign student practice</h1><p>Create homework from your booked learners and review completed submissions.</p></div></div>
      <div className="portal-stat-grid"><article><span className="stat-icon stat-icon--blue"><BookOpen size={21} /></span><div><small>Total</small><strong>{stats.total}</strong><em>Assigned tasks</em></div></article><article><span className="stat-icon stat-icon--green"><CheckCircle2 size={21} /></span><div><small>Completed</small><strong>{stats.completed}</strong><em>Submitted/reviewed</em></div></article><article><span className="stat-icon stat-icon--orange"><Clock3 size={21} /></span><div><small>Overdue</small><strong>{stats.overdue}</strong><em>Open tasks</em></div></article></div>
      <section className="portal-card homework-assignment-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">New homework</span><h2>Create assignment</h2></div></div><form className="homework-assignment-form" onSubmit={assign}><label><span>Student</span><select name="studentKey" value={form.studentKey} onChange={update}>{studentOptions.map((booking) => <option value={`${booking.studentId}-${booking.learnerId}`} key={`${booking.studentId}-${booking.learnerId}`}>{booking.learnerName}</option>)}</select></label><label><span>Type</span><select name="type" value={form.type} onChange={update}>{HOMEWORK_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label><span>Due date</span><input type="date" name="dueDate" value={form.dueDate} onChange={update} /></label><label><span>Title</span><input name="title" value={form.title} onChange={update} placeholder="e.g. Past tense speaking practice" /></label><label className="homework-assignment-form__wide"><span>Instructions</span><textarea name="instructions" value={form.instructions} onChange={update} placeholder="Tell the student exactly what to practise…" maxLength="4000" /></label><label className="homework-assignment-form__wide"><span>Resource link</span><input name="resourceUrl" value={form.resourceUrl} onChange={update} placeholder="https://… optional" /></label><button className="portal-primary-button" type="submit">Assign homework <Send size={16} /></button></form></section>
      <section className="homework-list">{teacherHomework.length ? teacherHomework.map((item) => <article className="portal-card homework-card" key={item.id}><div className="homework-card__head"><div><span className="portal-kicker">{item.type}</span><h2>{item.title}</h2><p>{item.learnerName} · {item.dueDate || 'No due date'}</p></div><HomeworkStatusBadge status={item.status} /></div><p className="homework-card__instructions">{item.instructions}</p>{item.resourceUrl && <a className="homework-resource-link" href={item.resourceUrl} target="_blank" rel="noreferrer">Open resource <ExternalLink size={14} /></a>}{item.studentNote && <div className="homework-complete-note">Student note: {item.studentNote}</div>}{item.status === 'completed' && <button className="portal-secondary-button" onClick={() => review(item)}>Mark reviewed</button>}<button className="portal-text-button" onClick={() => { removeHomework(item.id); setVersion((value) => value + 1) }}>Remove</button></article>) : <EmptyState icon={BookOpen} title="No homework assigned" text="Create your first assignment above." />}</section>
    </div>
  )
}

function AdminHomeworkPanel() {
  const [version, setVersion] = useState(0)
  const allHomework = getHomework()
  const stats = homeworkStats(allHomework)
  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener('tutorpro:homework-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('tutorpro:homework-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  void version
  const exportCsv = () => {
    const header = 'Student,Teacher,Type,Title,Status,Due Date\n'
    const body = allHomework.map((item) => [item.learnerName, item.teacherName, item.type, item.title, item.status, item.dueDate].map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `tutorpro-homework-${today()}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  return <div className="portal-view homework-view"><div className="portal-page-heading"><div><span className="portal-kicker">Homework operations</span><h1>Homework Center</h1><p>Monitor teacher assignments, student completion and overdue practice.</p></div><button className="portal-primary-button" onClick={exportCsv}><Download size={16} /> Export CSV</button></div><div className="portal-stat-grid"><article><span className="stat-icon stat-icon--blue"><BookOpen size={21} /></span><div><small>Total homework</small><strong>{stats.total}</strong><em>All assignments</em></div></article><article><span className="stat-icon stat-icon--green"><CheckCircle2 size={21} /></span><div><small>Completed</small><strong>{stats.completed}</strong><em>Submitted/reviewed</em></div></article><article><span className="stat-icon stat-icon--orange"><Clock3 size={21} /></span><div><small>Overdue</small><strong>{stats.overdue}</strong><em>Needs follow-up</em></div></article></div><section className="homework-list">{allHomework.length ? allHomework.map((item) => <article className="portal-card homework-card" key={item.id}><div className="homework-card__head"><div><span className="portal-kicker">{item.type}</span><h2>{item.title}</h2><p>{item.learnerName} · {item.teacherName} · {item.dueDate || 'No due date'}</p></div><HomeworkStatusBadge status={item.status} /></div><p className="homework-card__instructions">{item.instructions}</p>{item.resourceUrl && <a className="homework-resource-link" href={item.resourceUrl} target="_blank" rel="noreferrer">Open resource <ExternalLink size={14} /></a>}</article>) : <EmptyState icon={BookOpen} title="No homework yet" text="Teacher assignments will appear here." />}</section></div>
}


function LibraryResourceCard({ resource, bookmarked, onToggle }) {
  return (
    <article className="portal-card library-resource-card">
      <div className="library-resource-card__top"><span>{resource.type}</span><button type="button" onClick={() => onToggle(resource.id)}>{bookmarked ? '★ Saved' : '☆ Save'}</button></div>
      <h2>{resource.title}</h2>
      <p>{resource.description}</p>
      <div className="library-resource-card__meta"><span>{resource.category}</span><span>{resource.level}</span>{resource.featured && <span>Featured</span>}</div>
      <div className="library-resource-card__tags">{resource.tags.map((tag) => <i key={tag}>{tag}</i>)}</div>
      <a className="portal-primary-button" href={resource.url} target="_blank" rel="noreferrer">Open resource <ExternalLink size={15} /></a>
    </article>
  )
}

function DigitalLibraryPanel({ account, learner = null, role = 'student' }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [bookmarks, setBookmarks] = useState(() => getLibraryBookmarks(account?.id))
  const learnerHomework = learner ? getHomework({ studentId: account.id, learnerId: learner.id }) : []
  const learnerBookings = learner ? getBookings({ studentId: account.id }).filter((booking) => booking.learnerId === learner.id || !booking.learnerId) : []
  const recommended = getRecommendedLibraryResources({ learner, homework: learnerHomework, feedback: learnerBookings })
  const results = searchLibraryResources(query, category)

  useEffect(() => {
    const refresh = () => setBookmarks(getLibraryBookmarks(account?.id))
    window.addEventListener('tutorpro:library-change', refresh)
    return () => window.removeEventListener('tutorpro:library-change', refresh)
  }, [account?.id])

  const toggle = (resourceId) => setBookmarks(toggleLibraryBookmark(account?.id, resourceId))

  return (
    <div className="portal-view digital-library-view">
      <div className="portal-page-heading"><div><span className="portal-kicker">Digital library</span><h1>{role === 'teacher' ? 'Teaching resource library' : learner ? `${learner.name}'s learning library` : 'TutorPro resource library'}</h1><p>Reading, grammar, phonics, vocabulary, speaking and classroom resources for TutorPro learners.</p></div><span className="support-inbox-live"><i /> {bookmarks.length} saved</span></div>
      <section className="library-hero-card"><div><span className="portal-kicker">AI-style recommendations</span><h2>Suggested for current learning goals</h2><p>Resources are recommended from goals, homework and teacher feedback keywords.</p></div><div className="library-recommendation-row">{recommended.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer"><strong>{resource.title}</strong><span>{resource.category}</span></a>)}</div></section>
      <section className="portal-card library-filter-card"><div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reading, grammar, phonics, speaking…" /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{LIBRARY_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div></section>
      <section className="library-grid">{results.map((resource) => <LibraryResourceCard key={resource.id} resource={resource} bookmarked={bookmarks.includes(resource.id)} onToggle={toggle} />)}</section>
      {!results.length && <EmptyState icon={BookOpen} title="No resources found" text="Try another keyword or category." />}
    </div>
  )
}

function ReferralDashboardPanel({ account, role = 'parent', onAccountChange }) {
  const [copied, setCopied] = useState('')
  const [posterReady, setPosterReady] = useState(false)
  const allAccounts = getAccounts()
  const stats = getReferralStats(account, allAccounts)
  const code = stats.code
  const link = stats.link
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&ecc=M&margin=10&data=${encodeURIComponent(link)}`
  const nextLabel = stats.nextLevel ? `${stats.nextLevel.label} at ${stats.nextLevel.min} successful referrals` : 'Top ambassador level unlocked'
  const shareText = role === 'teacher'
    ? `Join TutorPro Online English PH through my teacher referral link and start learning online English.`
    : `Try TutorPro Online English PH for online English classes. Use my referral link and we both earn a free lesson after your first package.`
  const shareTargets = getShareTargets(link, shareText)
  const recent = referralActivity(account, allAccounts).slice(0, 8)

  useEffect(() => {
    if (!account.referralCode) {
      const updated = updateAccount(account.id, { referralCode: code, referralWallet: account.referralWallet || { freeLessons: 0, coupons: [], coins: 0, xp: 0, transactions: [] } })
      onAccountChange?.(updated)
    }
  }, [account.id])

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setCopied('Copy failed')
    }
  }

  const downloadPoster = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350)
    gradient.addColorStop(0, '#321568')
    gradient.addColorStop(0.55, '#7048df')
    gradient.addColorStop(1, '#090510')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.beginPath(); ctx.arc(910, 130, 240, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#bce94e'
    ctx.font = '900 48px sans-serif'
    ctx.fillText('TutorPro Online English PH', 70, 115)
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 88px sans-serif'
    ctx.fillText('Invite a friend.', 70, 260)
    ctx.fillText('Earn free lessons.', 70, 360)
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.font = '36px sans-serif'
    ctx.fillText(`Referral code: ${code}`, 70, 470)
    ctx.fillText(`${displayName(account)} is inviting you to join.`, 70, 530)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(70, 620, 420, 420)
    try {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.src = qrUrl
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
      ctx.drawImage(image, 90, 640, 380, 380)
    } catch {
      ctx.fillStyle = '#321568'
      ctx.font = '900 42px sans-serif'
      ctx.fillText(code, 145, 845)
    }
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 44px sans-serif'
    ctx.fillText('Scan to register', 540, 720)
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.font = '32px sans-serif'
    ctx.fillText('New parent reward: 1 free lesson', 540, 790)
    ctx.fillText('Referrer reward: 1 free lesson', 540, 845)
    ctx.font = '27px sans-serif'
    ctx.fillText(link.replace(/^https?:\/\//, ''), 70, 1140)
    ctx.fillStyle = '#bce94e'
    ctx.font = '900 38px sans-serif'
    ctx.fillText('Start learning English with confidence.', 70, 1220)
    const a = document.createElement('a')
    a.download = `tutorpro-referral-${code}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
    setPosterReady(true)
    window.setTimeout(() => setPosterReady(false), 1800)
  }

  return (
    <div className="portal-view referral-dashboard-view">
      <section className="referral-hero-card">
        <div>
          <span className="portal-kicker">Referral & ambassador programme</span>
          <h1>{stats.level.emoji} {stats.level.label}</h1>
          <p>Share TutorPro Online English PH and earn free lessons automatically when your friend registers and purchases their first package.</p>
          <div className="referral-hero-stats"><span><strong>{stats.successfulReferrals}</strong> successful</span><span><strong>{stats.pendingReferrals}</strong> pending</span><span><strong>{stats.wallet.freeLessons}</strong> wallet lessons</span></div>
        </div>
        <div className="referral-qr-card"><img src={qrUrl} alt="Referral QR code" /><strong>{code}</strong><button onClick={() => copy(code, 'Code copied')}>Copy code</button></div>
      </section>

      <section className="referral-grid">
        <article className="portal-card referral-link-card"><span className="portal-kicker">Your referral link</span><h2>Invite families</h2><div className="referral-copy-box"><code>{link}</code><button onClick={() => copy(link, 'Link copied')}>Copy</button></div>{copied && <small className="referral-copied">{copied}</small>}<div className="referral-share-buttons">{shareTargets.map((target) => <a key={target.id} href={target.url} target="_blank" rel="noreferrer">{target.label}</a>)}</div><button className="portal-primary-button" onClick={downloadPoster}><Download size={16} /> Generate poster</button>{posterReady && <span className="saved-label"><Check size={14} /> Poster downloaded</span>}</article>
        <article className="portal-card referral-progress-card"><span className="portal-kicker">Next reward</span><h2>{nextLabel}</h2><div className="referral-progress"><i><b style={{ width: `${stats.progressToNext}%` }} /></i><span>{stats.progressToNext}%</span></div><ul>{stats.level.benefits.map((benefit) => <li key={benefit}><CheckCircle2 size={15} /> {benefit}</li>)}</ul></article>
        <article className="portal-card referral-wallet-card"><span className="portal-kicker">Rewards wallet</span><h2>Free lessons & bonuses</h2><dl><div><dt>Free lessons</dt><dd>{stats.wallet.freeLessons}</dd></div><div><dt>Coins</dt><dd>{stats.wallet.coins}</dd></div><div><dt>XP</dt><dd>{stats.wallet.xp}</dd></div><div><dt>Coupons</dt><dd>{stats.wallet.coupons.length}</dd></div></dl></article>
      </section>

      <section className="portal-card referral-activity-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Recent activity</span><h2>Referral history</h2></div><span className="support-inbox-live"><i /> Auto tracked</span></div>{recent.length ? <div className="referral-activity-list">{recent.map((item) => <article key={item.id}><span>{item.type === 'reward' ? '🎁' : '👨‍👩‍👧'}</span><div><strong>{item.title}</strong><small>{item.status} {item.date ? `· ${new Date(item.date).toLocaleDateString('en')}` : ''}</small></div></article>)}</div> : <EmptyState icon={Award} title="No referral activity yet" text="Share your link with families and your registrations will appear here." />}</section>
    </div>
  )
}



function AdminAnalyticsPanel() {
  const students = getAccounts('student')
  const teachers = getAccounts('teacher')
  const allBookings = getBookings()
  const allHomework = getHomework()
  const allProfiles = [...students, ...teachers]
  const paymentTransactions = students.flatMap((student) => {
    const transactions = Array.isArray(student.paymentTransactions) ? student.paymentTransactions : student.latestPayment ? [student.latestPayment] : []
    return transactions.map((transaction) => ({ ...transaction, student }))
  })
  const revenue = paymentTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  const completedBookings = allBookings.filter((booking) => booking.status === 'completed')
  const referralRows = allProfiles.map((profile) => ({ profile, stats: getReferralStats(profile, allProfiles) }))
  const referralSuccess = referralRows.reduce((sum, row) => sum + row.stats.successfulReferrals, 0)
  const referralPending = referralRows.reduce((sum, row) => sum + row.stats.pendingReferrals, 0)
  const homework = homeworkStats(allHomework)
  const conversionRate = allBookings.length ? Math.round((completedBookings.length / allBookings.length) * 100) : 0
  const lastEightWeeks = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - ((7 - index) * 7))
    const end = new Date(start); end.setDate(start.getDate() + 6)
    const startKey = formatDateKey(start); const endKey = formatDateKey(end)
    const weekBookings = allBookings.filter((booking) => booking.date >= startKey && booking.date <= endKey)
    return { label: `${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`, total: weekBookings.length, completed: weekBookings.filter((booking) => booking.status === 'completed').length }
  })
  const maxWeek = Math.max(1, ...lastEightWeeks.map((week) => week.total))
  const revenueByMonth = paymentTransactions.reduce((groups, transaction) => {
    const date = new Date(transaction.paidAt || transaction.createdAt || Date.now())
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
    groups[key] = (groups[key] || 0) + Number(transaction.amount || 0)
    return groups
  }, {})
  const revenueRows = Object.entries(revenueByMonth).sort(([a],[b]) => a.localeCompare(b)).slice(-6)
  const maxRevenue = Math.max(1, ...revenueRows.map(([, value]) => value))
  const teacherRows = teachers.map((teacher) => {
    const teacherBookings = allBookings.filter((booking) => booking.teacherId === teacher.id)
    const completed = teacherBookings.filter((booking) => booking.status === 'completed').length
    const feedbackMissing = teacherBookings.filter((booking) => booking.status === 'completed' && !booking.teacherFeedback?.summary?.trim()).length
    const ratings = teacherBookings.filter((booking) => booking.studentRating?.score).map((booking) => Number(booking.studentRating.score))
    const rating = ratings.length ? Math.round((ratings.reduce((sum, score) => sum + score, 0) / ratings.length) * 10) / 10 : 0
    return { teacher, total: teacherBookings.length, completed, feedbackMissing, rating }
  }).sort((a,b) => b.completed - a.completed).slice(0,8)
  return (
    <div className="portal-view admin-analytics-view"><div className="portal-page-heading"><div><span className="portal-kicker">Analytics center</span><h1>Platform analytics</h1><p>Track revenue, bookings, referral growth, teacher performance and homework engagement.</p></div></div><div className="portal-stat-grid"><article><span className="stat-icon stat-icon--green"><Coins size={21} /></span><div><small>Tracked revenue</small><strong>${revenue.toLocaleString(undefined,{maximumFractionDigits:2})}</strong><em>{paymentTransactions.length} payment records</em></div></article><article><span className="stat-icon stat-icon--blue"><CalendarCheck2 size={21} /></span><div><small>Booking conversion</small><strong>{conversionRate}%</strong><em>{completedBookings.length}/{allBookings.length} completed</em></div></article><article><span className="stat-icon stat-icon--gold"><Award size={21} /></span><div><small>Referral success</small><strong>{referralSuccess}</strong><em>{referralPending} pending</em></div></article><article><span className="stat-icon stat-icon--orange"><BookOpen size={21} /></span><div><small>Homework completion</small><strong>{homework.completed}</strong><em>{homework.overdue} overdue</em></div></article></div><div className="admin-analytics-grid"><section className="portal-card admin-chart-card"><div><span className="portal-kicker">Bookings</span><h2>Last 8 weeks</h2></div><div className="admin-bar-chart">{lastEightWeeks.map((week) => <div key={week.label}><i style={{ height: `${Math.max(8, (week.total / maxWeek) * 100)}%` }}><b style={{ height: `${week.total ? (week.completed / week.total) * 100 : 0}%` }} /></i><span>{week.label}</span><small>{week.total}</small></div>)}</div><p><b /> Completed portion · total bookings shown below each week.</p></section><section className="portal-card admin-chart-card"><div><span className="portal-kicker">Revenue</span><h2>Monthly tracked payments</h2></div>{revenueRows.length ? <div className="admin-revenue-list">{revenueRows.map(([month, value]) => <article key={month}><span>{month}</span><i><b style={{ width: `${(value / maxRevenue) * 100}%` }} /></i><strong>${value.toLocaleString(undefined,{maximumFractionDigits:2})}</strong></article>)}</div> : <EmptyState icon={Coins} title="No payment records yet" text="Verified PayPal and manual payment records will appear here." />}</section></div><section className="portal-card admin-analytics-table-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Teacher performance</span><h2>Completed lessons, ratings and feedback gaps</h2></div></div><div className="admin-analytics-table"><div className="admin-analytics-table__head"><span>Teacher</span><span>Total</span><span>Completed</span><span>Rating</span><span>Missing feedback</span></div>{teacherRows.map((row) => <div className="admin-analytics-table__row" key={row.teacher.id}><div className="table-person"><ProfilePhoto accountId={row.teacher.id} name={row.teacher.fullName} className="learner-tab-photo" /><div><strong>{row.teacher.fullName}</strong><small>{row.teacher.teacher?.specialization}</small></div></div><strong>{row.total}</strong><strong>{row.completed}</strong><strong>{row.rating || 'New'}</strong><strong className={row.feedbackMissing ? 'needs-attention' : ''}>{row.feedbackMissing}</strong></div>)}</div></section></div>
  )
}

function AdminPaymentsPanel() {
  const [version, setVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const students = getAccounts('student')
  const studentRows = students.flatMap((student) => {
    const learners = student.children?.length ? student.children : student.child ? [student.child] : []
    return (learners.length ? learners : [{ id: student.id, name: student.parentName || 'Student', incomplete: true }]).map((learner) => ({ student, learner }))
  })
  const [form, setForm] = useState(() => ({
    studentId: students[0]?.id || '',
    method: 'GCash QR',
    credits: '1',
    amount: '',
    currency: 'USD',
    packageName: 'Manual verified payment',
    reference: '',
    note: '',
  }))
  const selectedStudent = students.find((student) => student.id === form.studentId) || students[0] || null
  const paymentRows = students.map((student) => {
    const transactions = Array.isArray(student.paymentTransactions) ? student.paymentTransactions : []
    const latest = student.latestPayment || transactions[transactions.length - 1] || null
    const credits = typeof student.paidLessonsBalance === 'number' ? student.paidLessonsBalance : 0
    return { student, transactions, latest, credits }
  })
  const allTransactions = paymentRows.flatMap((row) => row.transactions.map((transaction) => ({ ...transaction, student: row.student })))
  const uniquePaymentKeys = new Set()
  const totalRevenue = allTransactions.reduce((sum, transaction) => {
    const key = transaction.orderId || transaction.captureId || transaction.reference || `${transaction.student.id}-${transaction.paidAt || transaction.createdAt || Math.random()}`
    if (uniquePaymentKeys.has(key)) return sum
    uniquePaymentKeys.add(key)
    return sum + Number(transaction.amount || 0)
  }, 0)
  const paidStudents = paymentRows.filter((row) => row.credits > 0).length
  const zeroCreditStudents = paymentRows.filter((row) => row.credits <= 0).length
  const manualVerifiedCount = allTransactions.filter((transaction) => transaction.provider === 'manual-admin').length

  const update = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
    setMessage('')
  }

  const verifyManualPayment = async (event) => {
    event.preventDefault()
    if (!selectedStudent) {
      setError('Select a student account first.')
      return
    }
    const credits = Number(form.credits)
    const amount = Number(form.amount || 0)
    if (!Number.isFinite(credits) || credits <= 0) {
      setError('Enter a valid number of credits to add.')
      return
    }
    if (amount < 0) {
      setError('Amount cannot be negative.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const currentCredits = typeof selectedStudent.paidLessonsBalance === 'number' ? selectedStudent.paidLessonsBalance : 0
      const transactions = Array.isArray(selectedStudent.paymentTransactions) ? selectedStudent.paymentTransactions : []
      const paymentRecord = {
        provider: 'manual-admin',
        method: form.method,
        packageName: form.packageName || 'Manual verified payment',
        reference: form.reference.trim(),
        note: form.note.trim(),
        amount,
        currency: form.currency || 'USD',
        credits,
        status: 'VERIFIED',
        verifiedBy: 'admin',
        paidAt: new Date().toISOString(),
      }
      const updated = updateAccount(selectedStudent.id, {
        paidLessonsBalance: currentCredits + credits,
        latestPayment: paymentRecord,
        paymentTransactions: [...transactions, paymentRecord].slice(-80),
      })
      if (cloudSyncEnabled()) await updateCloudProfile(updated)
      setMessage(`${displayName(selectedStudent)} credited with ${credits} lesson credit${credits > 1 ? 's' : ''}.`)
      setForm((current) => ({ ...current, credits: '1', amount: '', reference: '', note: '' }))
      setVersion((value) => value + 1)
    } catch (verifyError) {
      setError(verifyError.message)
    } finally {
      setSaving(false)
    }
  }

  const exportPayments = () => {
    const header = ['Parent', 'Login', 'Credits', 'Last Method', 'Last Amount', 'Currency', 'Last Paid At', 'Transactions'].join(',')
    const body = paymentRows.map(({ student, latest, credits, transactions }) => [
      displayName(student),
      student.loginId || student.email || '',
      credits,
      latest?.method || latest?.provider || '',
      latest?.amount || '',
      latest?.currency || '',
      latest?.paidAt || latest?.createdAt || '',
      transactions.length,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tutorpro-payments-${today()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  void version

  return (
    <div className="portal-view admin-payments-view">
      <div className="portal-page-heading">
        <div><span className="portal-kicker">Payment command center</span><h1>Payments, credits and QR verification</h1><p>Track PayPal revenue, manually verify GCash/AUB/WeChat QR receipts, and manage student lesson credits.</p></div>
        <button className="portal-primary-button" onClick={exportPayments}><Download size={16} /> Export payments</button>
      </div>

      <div className="portal-stat-grid">
        <article><span className="stat-icon stat-icon--green"><Coins size={21} /></span><div><small>Tracked revenue</small><strong>${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><em>PayPal + manual records</em></div></article>
        <article><span className="stat-icon stat-icon--blue"><UserCheck size={21} /></span><div><small>Students with credits</small><strong>{paidStudents}</strong><em>Can book lessons</em></div></article>
        <article><span className="stat-icon stat-icon--orange"><Clock3 size={21} /></span><div><small>Zero-credit accounts</small><strong>{zeroCreditStudents}</strong><em>Need payment or reward</em></div></article>
        <article><span className="stat-icon stat-icon--gold"><CheckCircle2 size={21} /></span><div><small>Manual verifications</small><strong>{manualVerifiedCount}</strong><em>QR/receipt credits</em></div></article>
      </div>

      <section className="portal-card admin-manual-payment-card">
        <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Manual QR verification</span><h2>Add credits after receipt review</h2><p>Use this for GCash, AUB PayMate, WeChat Pay or special admin adjustments.</p></div></div>
        {error && <div className="portal-error" role="alert">{error}</div>}
        {message && <div className="portal-success" role="status"><CheckCircle2 size={17} /><div><strong>Payment verified</strong><span>{message}</span></div></div>}
        <form className="admin-manual-payment-form" onSubmit={verifyManualPayment}>
          <label><span>Student account</span><select name="studentId" value={selectedStudent?.id || ''} onChange={update}>{students.map((student) => <option key={student.id} value={student.id}>{displayName(student)} · {student.loginId || student.email || 'no login'}</option>)}</select></label>
          <label><span>Payment method</span><select name="method" value={form.method} onChange={update}><option>GCash QR</option><option>AUB PayMate QR</option><option>WeChat Pay QR</option><option>PayPal manual check</option><option>Referral reward</option><option>Admin adjustment</option></select></label>
          <label><span>Credits to add</span><input name="credits" type="number" min="1" max="200" value={form.credits} onChange={update} /></label>
          <label><span>Amount</span><input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={update} placeholder="0.00" /></label>
          <label><span>Currency</span><select name="currency" value={form.currency} onChange={update}><option>USD</option><option>PHP</option><option>RMB</option></select></label>
          <label><span>Package / reason</span><input name="packageName" value={form.packageName} onChange={update} placeholder="Monthly package / QR payment" /></label>
          <label><span>Reference / receipt ID</span><input name="reference" value={form.reference} onChange={update} placeholder="Receipt number or screenshot note" /></label>
          <label className="admin-manual-payment-form__wide"><span>Admin note</span><input name="note" value={form.note} onChange={update} placeholder="Optional note for this payment verification" /></label>
          <button className="portal-primary-button" type="submit" disabled={saving || !students.length}>{saving ? 'Saving…' : 'Verify payment & add credits'} <Check size={16} /></button>
        </form>
      </section>

      <section className="portal-card admin-payments-table-card">
        <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Student payment status</span><h2>Credits and latest payments</h2></div></div>
        <div className="admin-payments-table">
          <div className="admin-payments-table__head"><span>Family / student</span><span>Credits</span><span>Latest payment</span><span>Transactions</span><span>Status</span></div>
          {paymentRows.map(({ student, latest, transactions, credits }) => {
            const learners = (student.children?.length ? student.children : student.child ? [student.child] : []).map((learner) => learner.name).join(', ')
            return <div className="admin-payments-table__row" key={student.id}><div><strong>{displayName(student)}</strong><small>{learners || student.loginId || student.email}</small></div><div><strong>{credits}</strong><small>booking credits</small></div><div><strong>{latest ? `${latest.method || latest.provider || 'Payment'} ${latest.amount ? `· ${latest.currency || 'USD'} ${latest.amount}` : ''}` : 'No payment yet'}</strong><small>{latest?.paidAt ? new Date(latest.paidAt).toLocaleString('en') : latest?.createdAt ? new Date(latest.createdAt).toLocaleString('en') : 'Awaiting verification'}</small></div><div><strong>{transactions.length}</strong><small>records</small></div><div><StatusBadge status={credits > 0 ? 'active' : 'pending'} /></div></div>
          })}
        </div>
      </section>
    </div>
  )
}

function AdminReferralDashboard() {
  const accounts = getAccounts()
  const participants = accounts.filter((account) => ['student', 'teacher'].includes(account.role))
  const rows = participants.map((account) => ({ account, stats: getReferralStats(account, accounts) })).sort((a, b) => b.stats.successfulReferrals - a.stats.successfulReferrals)
  const successful = rows.reduce((sum, row) => sum + row.stats.successfulReferrals, 0)
  const pending = rows.reduce((sum, row) => sum + row.stats.pendingReferrals, 0)
  const exportCsv = () => {
    const header = 'Name,Role,Referral Code,Successful,Pending,Level\n'
    const body = rows.map(({ account, stats }) => [displayName(account), account.role, stats.code, stats.successfulReferrals, stats.pendingReferrals, stats.level.label].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'tutorpro-referrals.csv'; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="portal-view referral-dashboard-view">
      <div className="portal-page-heading"><div><span className="portal-kicker">Growth engine</span><h1>Referral analytics</h1><p>Track parent and teacher referrals, rewards, conversion and ambassador progress.</p></div><button className="portal-primary-button" onClick={exportCsv}><Download size={16} /> Export CSV</button></div>
      <div className="portal-stat-grid"><article><span className="stat-icon stat-icon--green"><Award size={21} /></span><div><small>Successful referrals</small><strong>{successful}</strong><em>Rewarded</em></div></article><article><span className="stat-icon stat-icon--orange"><Clock3 size={21} /></span><div><small>Pending referrals</small><strong>{pending}</strong><em>Awaiting first package</em></div></article><article><span className="stat-icon stat-icon--blue"><Users size={21} /></span><div><small>Ambassadors</small><strong>{rows.filter((row) => row.stats.successfulReferrals > 0).length}</strong><em>Active referrers</em></div></article><article><span className="stat-icon stat-icon--gold"><Coins size={21} /></span><div><small>Free lessons issued</small><strong>{successful * 2}</strong><em>Both families</em></div></article></div>
      <section className="portal-card referral-admin-table"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Leaderboard</span><h2>Top ambassadors</h2></div></div><div className="admin-table"><div className="admin-table__head"><span>Member</span><span>Code</span><span>Level</span><span>Successful</span><span>Pending</span></div>{rows.slice(0, 30).map(({ account, stats }) => <div className="admin-table__row" key={account.id}><div className="table-person"><ProfilePhoto accountId={account.id} name={displayName(account)} className="learner-tab-photo" /><div><strong>{displayName(account)}</strong><small>{account.role}</small></div></div><div><strong>{stats.code}</strong><small>{stats.link}</small></div><div><strong>{stats.level.emoji} {stats.level.label}</strong><small>{stats.nextLevel ? `Next: ${stats.nextLevel.label}` : 'Top level'}</small></div><div><strong>{stats.successfulReferrals}</strong></div><div><strong>{stats.pendingReferrals}</strong></div></div>)}</div></section>
    </div>
  )
}

function StudentPaymentGateway({ account, adminPreview = false, onPaymentComplete }) {
  const defaultWeeklySessions = Number(account.preferredWeeklySessions || 4)
  const defaultBillingPlan = account.preferredBillingPlan || (defaultWeeklySessions >= 4 ? 'monthly' : 'weekly')
  const [billingPlan, setBillingPlan] = useState(defaultBillingPlan === 'monthly' ? 'monthly' : 'weekly')
  const initialOptions = defaultBillingPlan === 'monthly' ? MONTHLY_PACKAGE_OPTIONS : WEEKLY_SESSION_OPTIONS
  const [weeklySessions, setWeeklySessions] = useState(Math.min(MAX_CUSTOM_WEEKLY_SESSIONS, Math.max(1, initialOptions.includes(defaultWeeklySessions) ? defaultWeeklySessions : initialOptions[0])))
  const [visitorLocale, setVisitorLocale] = useState(currentVisitorLocale)
  const chinaQrAllowed = adminPreview || isChineseVisitor(visitorLocale) || isChineseVisitor({ language: '', country: account.registrationCountry })
  const [paymentMethod, setPaymentMethod] = useState(chinaQrAllowed ? 'chinaQr' : 'paypal')
  const [gatewayError, setGatewayError] = useState('')
  const [gatewayReady, setGatewayReady] = useState(false)
  const [lastPaymentMessage, setLastPaymentMessage] = useState('')
  const paypalContainerId = `paypal-weekly-plan-${String(account.id || 'student').replace(/[^a-zA-Z0-9_-]/g, '')}`
  const sessionOptions = billingPlan === 'monthly' ? MONTHLY_PACKAGE_OPTIONS : WEEKLY_SESSION_OPTIONS
  const sessionRate = planSessionRate(billingPlan, weeklySessions)
  const creditCount = planCreditCount(billingPlan, weeklySessions)
  const weeklyTotal = planTotal(billingPlan, weeklySessions)
  const chinaTuition = creditCount * CHINA_TUITION_PER_25_MINUTES
  const chinaProcessingFee = creditCount * CHINA_PROCESSING_FEE_PER_SESSION
  const chinaTotal = chinaSessionTotal(weeklySessions, billingPlan)
  const currentCredits = typeof account.paidLessonsBalance === 'number' ? account.paidLessonsBalance : 0
  const configuredPayPalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || ''
  const paypalClientId = configuredPayPalClientId || 'sb'
  const paypalCurrency = import.meta.env.VITE_PAYPAL_CURRENCY || 'USD'
  const isPayPalTestMode = !configuredPayPalClientId || paypalClientId === 'sb' || import.meta.env.VITE_PAYPAL_ENV === 'sandbox'
  const selectedMethodName = paymentMethodLabel[paymentMethod] || 'Selected gateway'

  useEffect(() => subscribeToVisitorLocale(setVisitorLocale), [])

  useEffect(() => {
    if (!chinaQrAllowed && paymentMethod === 'chinaQr') {
      setPaymentMethod('paypal')
    }
  }, [chinaQrAllowed, paymentMethod])

  useEffect(() => {
    if (!Number.isFinite(Number(weeklySessions)) || Number(weeklySessions) < 1) setWeeklySessions(1)
    if (Number(weeklySessions) > MAX_CUSTOM_WEEKLY_SESSIONS) setWeeklySessions(MAX_CUSTOM_WEEKLY_SESSIONS)
  }, [weeklySessions])

  const setCustomSessionCount = (value) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return
    setWeeklySessions(Math.min(MAX_CUSTOM_WEEKLY_SESSIONS, Math.max(1, Math.round(numeric))))
    setGatewayError('')
    setLastPaymentMessage('')
  }

  const chooseBillingPlan = (nextPlan) => {
    const options = nextPlan === 'monthly' ? MONTHLY_PACKAGE_OPTIONS : WEEKLY_SESSION_OPTIONS
    setBillingPlan(nextPlan)
    setWeeklySessions((current) => Math.min(MAX_CUSTOM_WEEKLY_SESSIONS, Math.max(1, Number(current) || options[0])))
    setGatewayError('')
    setLastPaymentMessage('')
  }

  const paypalApiRequest = useCallback(async (path, body) => {
    const { data } = supabase ? await supabase.auth.getSession() : { data: null }
    const token = data?.session?.access_token
    if (!token) throw new Error('Please log in again before starting payment.')
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || 'Payment verification failed.')
    return payload
  }, [])

  useEffect(() => {
    setGatewayReady(false)
    if (paymentMethod !== 'paypal') return undefined
    let cancelled = false
    const scriptId = 'paypal-weekly-plan-sdk'
    const renderPayPalButtons = () => {
      if (cancelled) return
      const container = document.getElementById(paypalContainerId)
      if (!container || !window.paypal?.Buttons) return
      container.innerHTML = ''
      setGatewayError('')
      setGatewayReady(true)
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
        },
        createOrder() {
          return paypalApiRequest('/api/paypal/create-order', { accountId: account.id, billingPlan, weeklySessions })
            .then((payload) => payload.orderId)
            .catch((error) => {
              setGatewayError(error.message)
              throw error
            })
        },
        onApprove(data) {
          return paypalApiRequest('/api/paypal/capture-order', { accountId: account.id, orderId: data.orderID })
            .then((payload) => {
              const updated = updateLocalAccount(account.id, {
                paidLessonsBalance: payload.paidLessonsBalance,
                preferredWeeklySessions: payload.preferredWeeklySessions || weeklySessions,
                preferredBillingPlan: payload.preferredBillingPlan || billingPlan,
                latestPayment: payload.latestPayment,
              })
              onPaymentComplete(updated)
              const addedText = payload.alreadyCredited ? 'This payment was already credited.' : `${payload.creditsAdded || creditCount} booking credit${(payload.creditsAdded || creditCount) > 1 ? 's' : ''} added.`
              const message = `Server verified PayPal payment. ${addedText} New balance: ${payload.paidLessonsBalance}.`
              setLastPaymentMessage(message)
              window.alert(`🎉 ${message}`)
            })
            .catch((error) => {
              setGatewayError(error.message)
              throw error
            })
        },
        onCancel() {
          setGatewayError('Payment was cancelled before completion.')
        },
        onError(error) {
          console.error('PayPal payment error:', error)
          setGatewayError((current) => current || 'PayPal could not complete the payment. Please try again or refresh the page.')
        },
      }).render(`#${paypalContainerId}`).catch((error) => {
        console.error('PayPal render error:', error)
        if (!cancelled) setGatewayError(error.message || 'PayPal buttons could not load. Please refresh and try again.')
      })
    }

    if (window.paypal?.Buttons) {
      renderPayPalButtons()
      return () => {
        cancelled = true
        const container = document.getElementById(paypalContainerId)
        if (container) container.innerHTML = ''
      }
    }

    let script = document.getElementById(scriptId)
    const handleLoad = () => renderPayPalButtons()
    const handleError = () => {
      if (!cancelled) setGatewayError('PayPal SDK failed to load. Check your internet connection or PayPal client ID.')
    }
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=${encodeURIComponent(paypalCurrency)}&intent=capture&components=buttons&enable-funding=card`
      script.async = true
      script.addEventListener('load', handleLoad)
      script.addEventListener('error', handleError)
      document.head.appendChild(script)
    } else {
      script.addEventListener('load', handleLoad)
      script.addEventListener('error', handleError)
      if (window.paypal?.Buttons) renderPayPalButtons()
    }

    return () => {
      cancelled = true
      script?.removeEventListener('load', handleLoad)
      script?.removeEventListener('error', handleError)
      const container = document.getElementById(paypalContainerId)
      if (container) container.innerHTML = ''
    }
  }, [account.id, billingPlan, creditCount, onPaymentComplete, paymentMethod, paypalApiRequest, paypalClientId, paypalContainerId, paypalCurrency, weeklySessions])

  const methodCards = [
    { id: 'paypal', title: isPayPalTestMode ? 'PayPal Sandbox' : 'PayPal / Card Checkout', text: isPayPalTestMode ? 'Sandbox checkout is active until your live Client ID is configured.' : 'Live PayPal and debit/credit card checkout is active.', enabled: true },
    ...(chinaQrAllowed ? [{ id: 'chinaQr', title: 'AUB PayMate / WeChat Pay QR', text: adminPreview ? 'Admin preview access.' : 'China visitor payment QR.', enabled: true }] : []),
  ]

  return (
    <section className="portal-card student-payment-pro" aria-labelledby="student-payment-title">
      <div className="student-payment-pro__glow" aria-hidden="true" />
      <div className="student-payment-pro__header">
        <div className="student-payment-pro__intro">
          <span className="portal-kicker">Secure package checkout</span>
          <h2 id="student-payment-title">Choose your lesson package</h2>
          <p>Choose flexible weekly credits or the monthly package from our pricing plan, with server-verified payments before scheduling unlocks.</p>
          <div className="student-payment-pro__trust-row">
            <span><ShieldCheck size={14} /> Server verified</span>
            <span><Clock3 size={14} /> 25-minute sessions</span>
            <span><CheckCircle2 size={14} /> Credits unlock scheduling</span>
          </div>
        </div>
        <div className="student-payment-pro__amount-card">
          <small style={{ color: 'rgba(255, 255, 255, 0.82)' }}>{paymentMethod === 'chinaQr' && chinaQrAllowed ? 'China QR amount due' : 'Amount due today'}</small>
          <strong style={{ color: '#ffffff' }}>{paymentMethod === 'chinaQr' && chinaQrAllowed ? formatRmb(chinaTotal) : formatUsd(weeklyTotal)}</strong>
          <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{billingPlan === 'monthly' ? 'Monthly package' : 'Weekly plan'} · {creditCount} booking credit{creditCount > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="student-payment-pro__layout">
        <div className="student-payment-pro__planner">
          <div className="student-payment-pro__panel">
            <div className="student-payment-pro__panel-heading">
              <div>
                <small>Step 1</small>
                <h3>Choose package</h3>
              </div>
              <span>{billingPlan === 'monthly' ? 'Monthly' : 'Weekly'}</span>
            </div>
            <div className="student-payment-pro__package-grid" role="list" aria-label="Billing package options">
              <button
                type="button"
                className={`student-payment-pro__package${billingPlan === 'weekly' ? ' student-payment-pro__package--active' : ''}`}
                onClick={() => chooseBillingPlan('weekly')}
                aria-pressed={billingPlan === 'weekly'}
              >
                <small>Weekly</small>
                <strong>Flexible weekly plan</strong>
                <span>1–12 sessions/week · auto-calculated</span>
              </button>
              <button
                type="button"
                className={`student-payment-pro__package${billingPlan === 'monthly' ? ' student-payment-pro__package--active' : ''}`}
                onClick={() => chooseBillingPlan('monthly')}
                aria-pressed={billingPlan === 'monthly'}
              >
                <small>Package</small>
                <strong>Monthly package</strong>
                <span>1–12 sessions/week · monthly total calculated</span>
              </button>
            </div>

            <div className="student-payment-pro__panel-heading student-payment-pro__panel-heading--sub">
              <div>
                <small>{billingPlan === 'monthly' ? 'Monthly package sessions' : 'Weekly sessions'}</small>
                <h3>{billingPlan === 'monthly' ? 'Select your weekly rhythm' : 'Select weekly credits'}</h3>
              </div>
              <span>{weeklySessions} / week</span>
            </div>
            <div className="student-payment-pro__session-grid" role="list" aria-label="Session options">
              {sessionOptions.map((sessions) => {
                const selected = sessions === weeklySessions
                const credits = planCreditCount(billingPlan, sessions)
                return (
                  <button
                    key={`${billingPlan}-${sessions}`}
                    type="button"
                    className={`student-payment-pro__session${selected ? ' student-payment-pro__session--active' : ''}`}
                    onClick={() => { setWeeklySessions(sessions); setGatewayError(''); setLastPaymentMessage('') }}
                    aria-pressed={selected}
                  >
                    <strong>{sessions}</strong>
                    <span>session{sessions > 1 ? 's' : ''} / week</span>
                    <small>{formatUsd(planTotal(billingPlan, sessions))} · {credits} credit{credits > 1 ? 's' : ''}</small>
                    {billingPlan === 'monthly' && <em>4-week monthly billing</em>}
                  </button>
                )
              })}
            </div>
            <div className="student-payment-pro__custom-session-input">
              <label>
                <span>Type exact sessions per week</span>
                <input type="number" min="1" max={MAX_CUSTOM_WEEKLY_SESSIONS} value={weeklySessions} onChange={(event) => setCustomSessionCount(event.target.value)} />
              </label>
              <p>{billingPlan === 'monthly' ? `${creditCount} total monthly credits · 4-week billing` : `${creditCount} weekly credit${creditCount > 1 ? 's' : ''}`} · {formatUsd(sessionRate)} per class · Total {formatUsd(weeklyTotal)}</p>
            </div>
          </div>

          <div className="student-payment-pro__panel student-payment-pro__summary-panel">
            <div className="student-payment-pro__panel-heading">
              <div>
                <small>Step 2</small>
                <h3>Review summary</h3>
              </div>
            </div>
            <div className="student-payment-pro__summary-list">
              <div><span>Current booking credits</span><strong>{currentCredits}</strong></div>
              <div><span>Credits after verified payment</span><strong>{currentCredits + creditCount}</strong></div>
              {paymentMethod === 'chinaQr' && chinaQrAllowed ? (
                <>
                  <div><span>Tuition</span><strong>{formatRmb(chinaTuition)}</strong></div>
                  <div><span>Processing fee</span><strong>{formatRmb(chinaProcessingFee)}</strong></div>
                  <div className="student-payment-pro__summary-total"><span>Total QR payment</span><strong>{formatRmb(chinaTotal)}</strong></div>
                </>
              ) : (
                <>
                  <div><span>Package</span><strong>{billingPlan === 'monthly' ? 'Monthly package' : 'Weekly plan'}</strong></div>
                  <div><span>Rate</span><strong>{formatUsd(sessionRate)} / class{localPriceHint(sessionRate, account.registrationCountry) && <em className="price-local-hint">{localPriceHint(sessionRate, account.registrationCountry)}</em>}</strong></div>
                  <div><span>Credits included</span><strong>{creditCount}</strong></div>
                  <div className="student-payment-pro__summary-total"><span>Total PayPal payment</span><strong>{formatUsd(weeklyTotal)}{localPriceHint(weeklyTotal, account.registrationCountry) && <em className="price-local-hint">{localPriceHint(weeklyTotal, account.registrationCountry)}</em>}</strong></div>
                </>
              )}
            </div>
          </div>

          <div className="student-payment-pro__panel">
            <div className="student-payment-pro__panel-heading">
              <div>
                <small>Step 3</small>
                <h3>Choose payment method</h3>
              </div>
            </div>
            <div className="student-payment-pro__method-grid">
              {methodCards.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={`student-payment-pro__method${paymentMethod === method.id ? ' student-payment-pro__method--active' : ''}`}
                  onClick={() => { setPaymentMethod(method.id); setGatewayError(''); setLastPaymentMessage('') }}
                >
                  <span className="student-payment-pro__method-icon">{method.id === 'paypal' ? 'P' : 'QR'}</span>
                  <span>
                    <strong>{method.title}</strong>
                    <small>{method.text}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="student-payment-pro__checkout">
          {paymentMethod === 'paypal' ? (
            <div className="student-payment-pro__checkout-card student-payment-pro__paypal-card">
              <div className="student-payment-pro__checkout-heading">
                <div>
                  <small>Secure checkout</small>
                  <h3>{isPayPalTestMode ? 'Pay with PayPal Sandbox' : 'Pay with PayPal or card'}</h3>
                </div>
                <span className={isPayPalTestMode ? 'student-payment-pro__badge student-payment-pro__badge--warn' : 'student-payment-pro__badge student-payment-pro__badge--live'}>{isPayPalTestMode ? 'TEST MODE' : 'LIVE PAYPAL'}</span>
              </div>
              <div className="student-payment-pro__secure-note">
                <ShieldCheck size={16} /> PayPal confirms payment on the server before credits are added.
              </div>
              <div id={paypalContainerId} className="student-payment-pro__paypal-buttons" />
              {!gatewayReady && !gatewayError && <p className="student-payment-pro__loading">Loading secure PayPal checkout…</p>}
              <ul className="student-payment-pro__micro-list">
                <li>Debit/credit card availability depends on PayPal and the buyer’s country.</li>
                <li>Successful payment adds the package credits shown in the summary.</li>
              </ul>
            </div>
          ) : (
            <div className="student-payment-pro__checkout-card student-payment-pro__qr-card">
              <div className="student-payment-pro__checkout-heading">
                <div>
                  <small>China QR payment</small>
                  <h3>{selectedMethodName}</h3>
                </div>
                <span className="student-payment-pro__badge student-payment-pro__badge--manual">Admin verified</span>
              </div>
              <div className="student-payment-pro__qr-layout">
                <div className="student-payment-pro__qr-frame">
                  <img src={assetUrl('assets/aub-wechat-pay-qr.jpg')} alt="TutorPro AUB PayMate and WeChat Pay QR code" />
                </div>
                <div className="student-payment-pro__qr-details">
                  <p>For China visitors only. Scan this QR with AUB PayMate or WeChat Pay and pay the exact amount below.</p>
                  <div className="student-payment-pro__summary-list student-payment-pro__qr-breakdown">
                    <div><span>Package</span><strong>{billingPlan === 'monthly' ? 'Monthly package' : 'Weekly plan'}</strong></div>
                    <div><span>Sessions</span><strong>{creditCount} × 25 minutes</strong></div>
                    <div><span>Tuition</span><strong>RMB25 / 25 minutes</strong></div>
                    <div><span>Processing fee</span><strong>RMB5 / session</strong></div>
                    <div className="student-payment-pro__summary-total"><span>Total to pay</span><strong>{formatRmb(chinaTotal)}</strong></div>
                    <div><span>Merchant ID</span><strong>108382</strong></div>
                  </div>
                  <p className="student-payment-pro__manual-warning">After paying, send your receipt to admin support. Credits are added only after admin verification.</p>
                  {adminPreview && <p className="student-payment-pro__admin-note">Admin preview: China QR is visible because you opened the student dashboard from admin access.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="student-payment-pro__footer-notes">
        <span>USD pricing: Weekly plan is $10 per 25-minute class. Monthly package is 3–7 sessions/week billed for 4 weeks: 3/week at $10 per class, 4–7/week at $8 per class.</span>
        {chinaQrAllowed && <span>China QR rule: RMB25 per 25 minutes plus RMB5 processing fee per selected session. Hidden outside China except for admin preview.</span>}
        <span>{isPayPalTestMode ? 'PayPal is currently in sandbox mode. Add your live PayPal Client ID in Vercel to accept real payments.' : 'PayPal live checkout is active. Successful payments are verified on the server before booking credits are added.'}</span>
      </div>
      {gatewayError && <div className="portal-error student-payment-pro__message" role="alert">{gatewayError}</div>}
      {lastPaymentMessage && <div className="portal-success student-payment-pro__message" role="status"><CheckCircle2 size={16} /> {lastPaymentMessage}</div>}
    </section>
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
  const [managedBooking, setManagedBooking] = useState(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [directChatUser, setDirectChatUser] = useState(null)
  const [supportLocale, setSupportLocale] = useState(currentVisitorLocale)
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
  const upcoming = bookings.find((booking) => booking.date >= today() && ['pending', 'confirmed', 'ongoing'].includes(booking.status))
  const completed = bookings.filter((booking) => booking.status === 'completed').length
  const pendingCount = bookings.filter((booking) => booking.status === 'pending').length
  const parentChinaSupport = isChineseVisitor(supportLocale) || isChineseVisitor({ language: '', country: account.registrationCountry })
  const studentSyncCallbacks = useRef({ onAccountChange, onLogout })
  void bookingVersion

  useEffect(() => subscribeToVisitorLocale(setSupportLocale), [])

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
      const currentLearner = latest.children?.find((item) => item.id === activeLearnerId) || latest.child
      const currentStillExists = latest.children?.some((item) => item.id === activeLearnerId)
      setAccount(latest)
      studentSyncCallbacks.current.onAccountChange(latest)
      if (currentLearner?.goalManagedByAdmin) {
        setProfile((value) => ({ ...value, goal: currentLearner.goal }))
      }
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
        await syncPendingCloudProfile(initialAccount.id).catch(() => null)
        const [profiles, publicTeachers, sharedBookings] = await Promise.all([fetchCloudProfiles(), fetchPublicTeachers().catch(() => []), fetchCloudBookings()])
        if (active) {
          mergeCloudAccounts([...profiles, ...publicTeachers])
          mergeCloudBookings(sharedBookings)
        }
      } catch {
        // The local profile remains usable while cloud connectivity recovers.
      }
    }
    synchronizeCloud()
    const unsubscribeProfiles = subscribeToCloudProfiles(synchronizeCloud)
    const unsubscribeBookings = subscribeToCloudBookings(synchronizeCloud)
    const interval = window.setInterval(synchronizeCloud, 3000)
    return () => {
      active = false
      unsubscribeProfiles()
      unsubscribeBookings()
      window.clearInterval(interval)
    }
  }, [initialAccount.id])

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
      const media = await saveProfileMedia(`${account.id}-${learner.id}`, 'avatar', file)
      if (media.dataUrl) {
        const updated = updateStudentProfile(account.id, { profilePhotoUrl: media.dataUrl }, learner.id)
        setAccount(updated)
        onAccountChange(updated)
      }
      setMediaVersion((value) => value + 1)
    } catch (uploadError) {
      setMediaError(uploadError.message)
    }
    event.target.value = ''
  }

  const saveProfile = () => {
    const updated = updateStudentProfile(account.id, { frequency: profile.frequency }, learner.id)
    setAccount(updated)
    onAccountChange(updated)
    setProfileSaved(true)
    window.setTimeout(() => setProfileSaved(false), 2200)
  }

  const cancel = (bookingId) => {
    const updated = updateBooking(bookingId, { status: 'cancelled' })
    syncBookingNow(updated)
      .then(() => notifyBookingParticipants(updated, 'cancelled'))
      .catch(() => {})
    setBookingVersion((value) => value + 1)
  }

  const completeStudentPayment = useCallback((updatedAccount) => {
    setAccount(updatedAccount)
    onAccountChange(updatedAccount)
    setBookingVersion((value) => value + 1)
  }, [onAccountChange])

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
    { id: 'curriculum', label: 'Curriculum Framework', icon: BookOpen },
    { id: 'games', label: 'English games', icon: Gamepad2 },
    { id: 'referrals', label: 'Referrals', icon: Award },
    { id: 'homework', label: 'Homework', icon: BookOpen },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'rewards', label: 'Rewards', icon: Award },
    { id: 'ai-report', label: 'AI report', icon: Bot },
    { id: 'support', label: 'Parent support', icon: MessageSquareText },
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
          <AnnouncementBanner account={account} />
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
            <img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="TutorPro Online English panda mascot" />
          </section>

          <StudentPaymentGateway account={account} adminPreview={adminPreview} onPaymentComplete={completeStudentPayment} />

          <div className="portal-stat-grid">
            <article><span className="stat-icon stat-icon--orange"><BookOpen size={21} /></span><div><small>Lessons completed</small><strong>{learner.lessonsCompleted || completed}</strong><em>Keep going!</em></div></article>
            <article><span className="stat-icon stat-icon--blue"><TrendingUp size={21} /></span><div><small>Learning progress</small><strong>{learner.progress || 18}%</strong><em>On the rise</em></div></article>
            <article><span className="stat-icon stat-icon--gold"><Flame size={21} /></span><div><small>Learning streak</small><strong>{learner.streak || 0} days</strong><em>Personal best</em></div></article>
            <article><span className="stat-icon stat-icon--green"><Gamepad2 size={21} /></span><div><small>Game stars</small><strong>{learner.gameStars || 0}</strong><em>Learn through play</em></div></article>
          </div>

          <div className="student-overview-grid">
            <section className="portal-card">
              <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Coming up</span><h2>Next lesson</h2></div><button className="portal-text-button" onClick={() => setActive('lessons')}>All lessons <ChevronRight size={15} /></button></div>
              {upcoming ? <BookingCard booking={upcoming} showTeacher onEnterClassroom={setClassroomBooking} onManageBooking={setManagedBooking} onOpenChat={(id, name) => setDirectChatUser({ id, name })} /> : <EmptyState title="No lesson booked yet" text="Choose a time that works for your family and start with a focused first class." action={() => setActive('book')} actionLabel="Book a class" />}
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
            <ScheduleCalendar weekOffset={lessonsWeek} onWeekOffset={setLessonsWeek} bookings={bookings} onBookingOpen={setManagedBooking} />
          </section>
          <section className="portal-card lessons-list-card schedule-list-below">
            <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">All requests</span><h2>Lesson details</h2></div></div>
            {bookings.length ? bookings.map((booking) => <BookingCard key={booking.id} booking={booking} showTeacher onEnterClassroom={setClassroomBooking} onManageBooking={setManagedBooking} onOpenChat={(id, name) => setDirectChatUser({ id, name })} actions={['pending', 'confirmed'].includes(booking.status) ? <button className="portal-danger-link" onClick={() => cancel(booking.id)}>Cancel</button> : booking.status === 'completed' && !booking.studentRating ? <button className="rate-class-button" onClick={() => setRatingBooking(booking)}><Star size={14} /> Rate class</button> : booking.studentRating ? <span className="rated-class-label"><Star size={13} fill="currentColor" /> {booking.studentRating.score}/5</span> : null} />) : <EmptyState title="Your lesson list is ready" text="Once you request a class, all updates will appear here." action={() => setActive('book')} actionLabel="Book the first class" />}
          </section>
        </div>
      )}

      {active === 'games' && <Suspense fallback={<div className="game-loading"><i /><strong>Launching 3D English Game Zone…</strong><span>Preparing the world for {learner.name}</span></div>}><StudentGames key={learner.id} learner={learner} onEarnStars={earnGameStars} /></Suspense>}

      {active === 'referrals' && <ReferralDashboardPanel account={account} role="parent" onAccountChange={(updated) => { setAccount(updated); onAccountChange(updated) }} />}

      {active === 'homework' && <StudentHomeworkPanel account={account} learner={learner} onAccountChange={(updated) => { setAccount(updated); onAccountChange(updated) }} />}

      {active === 'library' && <DigitalLibraryPanel account={account} learner={learner} role="student" />}

      {active === 'rewards' && <StudentRewardsPanel account={account} learner={learner} onAccountChange={(updated) => { setAccount(updated); onAccountChange(updated) }} />}

      {active === 'ai-report' && <StudentAiReportPanel account={account} learner={learner} onOpenLibrary={() => setActive('library')} />}

      {active === 'curriculum' && (
        <div className="portal-view">
          <div className="portal-page-heading">
            <div>
              <span className="portal-kicker">TutorPro Syllabus</span>
              <h1>Structured English Curriculum Framework</h1>
              <p>Explore your child's learning milestones, international alignments, and targeted educational standards.</p>
            </div>
          </div>
          
          {/* Scrollable table framework container inside a portal-card with HIGH LEGIBILITY light theme colors */}
          <section className="portal-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #ddd6e7' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'center', background: '#fff' }}>
                <thead>
                  <tr style={{ background: 'rgba(112, 72, 223, 0.08)', borderBottom: '2px solid rgba(112, 72, 223, 0.15)' }}>
                    <th style={{ padding: '14px', color: '#7048df', fontSize: '0.82rem', fontWeight: 'bold', width: '150px' }}>年齡 Age</th>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <th key={i} style={{ padding: '14px', color: '#321568', fontSize: '0.82rem', fontWeight: '900', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>Lv.{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(112, 72, 223, 0.1)' }}>
                    <td style={{ padding: '14px', color: '#321568', fontSize: '0.82rem', fontWeight: 'bold', background: 'rgba(112, 72, 223, 0.02)' }}>年級對應<br/><small style={{ color: '#665578', fontSize: '0.7rem' }}>Grade</small></td>
                    {['K1', 'K2', 'K3', 'Pre-school', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'].map((g, idx) => (
                      <td key={idx} style={{ padding: '14px', color: '#463650', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>{g}</td>
                    ))}
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(112, 72, 223, 0.1)' }}>
                    <td style={{ padding: '14px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold', background: 'rgba(112, 72, 223, 0.02)' }}>CEFR Level</td>
                    <td colSpan={3} style={{ padding: '14px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold' }}>pre-A1</td>
                    <td colSpan={3} style={{ padding: '14px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>A1</td>
                    <td colSpan={2} style={{ padding: '14px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>A2</td>
                    <td style={{ padding: '14px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>A2+</td>
                    <td colSpan={2} style={{ padding: '14px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>B1</td>
                    <td style={{ padding: '14px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>B1+</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(112, 72, 223, 0.1)' }}>
                    <td style={{ padding: '14px', color: '#d97706', fontSize: '0.82rem', fontWeight: 'bold', background: 'rgba(112, 72, 223, 0.02)' }}>US CCSS</td>
                    <td colSpan={3} style={{ padding: '14px', color: '#b45309', fontSize: '0.82rem', fontWeight: 'bold' }}>GK</td>
                    <td colSpan={3} style={{ padding: '14px', color: '#b45309', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>G1</td>
                    <td colSpan={2} style={{ padding: '14px', color: '#b45309', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>G2</td>
                    <td style={{ padding: '14px', color: '#b45309', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>G3</td>
                    <td style={{ padding: '14px', color: '#b45309', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>G4</td>
                    <td style={{ padding: '14px', color: '#b45309', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>G5</td>
                    <td style={{ padding: '14px', color: '#b45309', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>G6</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(112, 72, 223, 0.1)' }}>
                    <td style={{ padding: '14px', color: '#a855f7', fontSize: '0.82rem', fontWeight: 'bold', background: 'rgba(112, 72, 223, 0.02)' }}>Cambridge</td>
                    <td colSpan={3} style={{ padding: '14px', color: '#6b21a8', fontSize: '0.82rem', fontWeight: 'bold' }}>Towards Starters</td>
                    <td colSpan={3} style={{ padding: '14px', color: '#6b21a8', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>YLE Starters</td>
                    <td colSpan={2} style={{ padding: '14px', color: '#6b21a8', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>Start to Movers</td>
                    <td style={{ padding: '14px', color: '#6b21a8', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>Movers to Flyers</td>
                    <td colSpan={2} style={{ padding: '14px', color: '#6b21a8', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>Movers to Flyers / KET</td>
                    <td style={{ padding: '14px', color: '#6b21a8', fontSize: '0.82rem', fontWeight: 'bold', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>PET</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '24px 14px', color: '#ef4444', fontSize: '0.82rem', fontWeight: 'bold', background: 'rgba(112, 72, 223, 0.02)', verticalAlign: 'middle' }}>Outcomes</td>
                    <td colSpan={3} style={{ padding: '20px 16px', fontSize: '0.78rem', color: '#51435f', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.6' }}>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '14px', margin: 0 }}>
                        <li>熟練掌握26個字母及44個基本發音及拼讀</li>
                        <li style={{ marginTop: '6px' }}>能夠拼讀和拼寫簡單單詞</li>
                        <li style={{ marginTop: '6px' }}>逐漸建立英語閱讀與溝通基礎</li>
                      </ul>
                    </td>
                    <td colSpan={3} style={{ padding: '20px 16px', fontSize: '0.78rem', color: '#51435f', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.6', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '14px', margin: 0 }}>
                        <li>完全掌握自然拼讀及字母組合發音</li>
                        <li style={{ marginTop: '6px' }}>培養閱讀與寫作表達能力</li>
                        <li style={{ marginTop: '6px' }}>可以進行日常流利溝通</li>
                      </ul>
                    </td>
                    <td colSpan={3} style={{ padding: '20px 16px', fontSize: '0.78rem', color: '#51435f', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.6', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '14px', margin: 0 }}>
                        <li>自如用英語表達觀點、喜好、想法</li>
                        <li style={{ marginTop: '6px' }}>進行段落和100詞內短寫作</li>
                        <li style={{ marginTop: '6px' }}>熟練使用多種閱讀策略</li>
                      </ul>
                    </td>
                    <td colSpan={3} style={{ padding: '20px 16px', fontSize: '0.78rem', color: '#51435f', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.6', borderLeft: '1px solid rgba(112, 72, 223, 0.1)' }}>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '14px', margin: 0 }}>
                        <li>流暢與英語母語者全方位交流交際</li>
                        <li style={{ marginTop: '6px' }}>複雜問題解讀，達到美國中學閱讀水準</li>
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'center', color: '#7048df', fontSize: '0.78rem', padding: '14px', background: 'rgba(112, 72, 223, 0.05)', borderTop: '1px solid rgba(112, 72, 223, 0.1)', fontWeight: 'bold' }}>
              👈 Swipe horizontally to view full levels (Lv.0 to Lv.11) 👉
            </div>
          </section>
        </div>
      )}

      {active === 'support' && (
        <div className="portal-view parent-support-view">
          <div className="portal-page-heading">
            <div><span className="portal-kicker">English & 中文 support</span><h1>Parent Support</h1><p>Ask the administrator about registration, schedules, teachers or your child’s learning plan.</p></div>
            <span className="support-inbox-live"><i /> Private support</span>
          </div>
          {!parentChinaSupport && (
            <section className="portal-card parent-support-channel-card">
              <div><span className="portal-kicker">Messenger available</span><h2>Prefer Facebook Messenger?</h2><p>Parents outside China can message TutorPro Online English directly on Facebook Messenger. If Messenger is unavailable, use the secure website chat below.</p></div>
              <a className="portal-primary-button" href="https://m.me/526047974195321" target="_blank" rel="noreferrer"><MessageSquareText size={16} /> Chat on Messenger</a>
            </section>
          )}
          {parentChinaSupport && <div className="support-language-note support-language-note--portal"><Languages size={15} /><span>Facebook/Messenger may not be accessible in China. Please use the secure website chat below; admin will reply from the TutorPro inbox.</span></div>}
          <SupportChatWidget embedded />
        </div>
      )}


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
              <div className="admin-managed-goal"><span>Main Learning Goal <em><ShieldCheck size={12} /> Admin managed</em></span><strong>{learner.goal || 'Not provided'}</strong><small>Parents can view this goal. Only the TutorPro Online English administrator can type or change it.</small></div>
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
      {managedBooking && <BookingSlotDialog booking={managedBooking} account={account} onClose={() => setManagedBooking(null)} onChanged={(updated) => { setManagedBooking(updated); setBookingVersion((value) => value + 1) }} />}
      {ratingBooking && <RatingDialog booking={ratingBooking} studentId={account.id} onClose={() => setRatingBooking(null)} onSaved={() => { setRatingBooking(null); setBookingVersion((value) => value + 1) }} />}
      {showAddStudent && <AddStudentDialog account={account} onClose={() => setShowAddStudent(false)} onAdded={finishAddingStudent} />}
      {directChatUser && (
        <DirectChatModal 
          currentUserId={account.id} 
          currentUserRole={account.role} 
          targetUserId={directChatUser.id} 
          targetUserName={directChatUser.name} 
          onClose={() => setDirectChatUser(null)} 
        />
      )}
    </PortalShell>
  )
}

function TargetIcon() {
  return <TrendingUp size={25} />
}

export function TeacherDashboard({ account: initialAccount, onAccountChange, onHome, onLogout, adminPreview = false, initialSection = 'overview' }) {
  const [active, setActive] = useState(initialSection)
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
  const [bookingWeek, setBookingWeek] = useState(0)
  const [bookingView, setBookingView] = useState('list')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all')
  const [saved, setSaved] = useState(false)
  const [mediaVersion, setMediaVersion] = useState(0)
  const [mediaError, setMediaError] = useState('')
  const [teacherName, setTeacherName] = useState(account.fullName)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')
  const [feedbackBooking, setFeedbackBooking] = useState(null)
  const [classroomBooking, setClassroomBooking] = useState(null)
  const [managedBooking, setManagedBooking] = useState(null)
  const [classroom, setClassroom] = useState(account.teacher.classroom || { platform: 'zoom', zoomLink: '', voovLink: '' })
  const [classroomSaved, setClassroomSaved] = useState(false)
  const [classroomError, setClassroomError] = useState('')
  const [directChatUser, setDirectChatUser] = useState(null)
  const [sampleClassUrl, setSampleClassUrl] = useState(account.teacher.sampleClassUrl || '')
  const [sampleClassSaved, setSampleClassSaved] = useState(false)
  const [savingSampleClass, setSavingSampleClass] = useState(false)
  const [introVideoUrl, setIntroVideoUrl] = useState(account.teacher.introVideoUrl || '')
  const [introVideoSaved, setIntroVideoSaved] = useState(false)
  const [savingIntroVideo, setSavingIntroVideo] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState(account.teacher.payoutMethod || 'GCash')
  const [payoutDetails, setPayoutDetails] = useState(account.teacher.payoutDetails || '')
  const [payoutSaved, setPayoutSaved] = useState(false)
  const [savingPayout, setSavingPayout] = useState(false)
  const bookings = getBookings({ teacherId: account.id })
  
  // Teacher earnings calculation with new business rules (Trial payouts: ₱40 normal / ₱100 if enrolled, Regular: pesoRate)
  const rate = Number(account.teacher.pesoRate || 350)
  const regularCompletedBookings = bookings.filter((booking) => !booking.isTrialClass && (booking.status === 'completed' || booking.status === 'absent'))
  const regularSlotsCount = regularCompletedBookings.reduce((acc, b) => acc + (b.duration || 25) / 25, 0)
  
  const trialCompletedBookings = bookings.filter((booking) => booking.isTrialClass && (booking.status === 'completed' || booking.status === 'absent'))
  const trialEnrolledCount = trialCompletedBookings.filter(b => b.trialEnrolled).length
  const trialNotEnrolledCount = trialCompletedBookings.filter(b => !b.trialEnrolled).length
  const estimatedEarnings = (regularSlotsCount * rate) + (trialEnrolledCount * 100) + (trialNotEnrolledCount * 40)

  const tencentClassroomReady = isTencentClassroomConfigured()
  const pending = bookings.filter((booking) => booking.status === 'pending').length
  const feedbackNeededBookings = bookings
    .filter((booking) => booking.status === 'completed' && !booking.teacherFeedback?.summary?.trim())
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
  const filteredBookings = bookingStatusFilter === 'all' ? bookings : bookings.filter((booking) => booking.status === bookingStatusFilter)
  const bookingStatusCount = (status) => status === 'all' ? bookings.length : bookings.filter((booking) => booking.status === status).length
  const teacherSyncCallbacks = useRef({ onAccountChange, onLogout })
  void version

  useEffect(() => {
    teacherSyncCallbacks.current = { onAccountChange, onLogout }
  }, [onAccountChange, onLogout])

  useEffect(() => {
    const synchronize = () => {
      const latest = getAccountById(initialAccount.id)
      if (!latest || ['rejected', 'suspended', 'removed'].includes(latest.status)) {
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
    const synchronizeCloud = async (change) => {
      if (!active) return
      if (change?.eventType === 'DELETE' && change.old?.id === initialAccount.id) {
        try { updateLocalAccount(initialAccount.id, { status: 'removed' }) } catch { /* The local profile may already be gone. */ }
        teacherSyncCallbacks.current.onLogout()
        return
      }
      try {
        const [profiles, sharedBookings] = await Promise.all([fetchCloudProfiles(), fetchCloudBookings()])
        if (active) {
          mergeCloudAccounts(profiles)
          mergeCloudBookings(sharedBookings)
        }
      } catch {
        // The teacher dashboard keeps its offline copy until cloud connectivity recovers.
      }
    }
    synchronizeCloud()
    const unsubscribeProfiles = subscribeToCloudProfiles(synchronizeCloud)
    const unsubscribeBookings = subscribeToCloudBookings(synchronizeCloud)
    const interval = window.setInterval(synchronizeCloud, 3000)
    return () => {
      active = false
      unsubscribeProfiles()
      unsubscribeBookings()
      window.clearInterval(interval)
    }
  }, [initialAccount.id])

  useEffect(() => {
    if (active !== 'overview') return undefined
    const refreshFeedbackQueue = () => setVersion((value) => value + 1)
    refreshFeedbackQueue()
    window.addEventListener('focus', refreshFeedbackQueue)
    const interval = window.setInterval(refreshFeedbackQueue, 1500)
    return () => {
      window.removeEventListener('focus', refreshFeedbackQueue)
      window.clearInterval(interval)
    }
  }, [active])

  const refresh = () => setVersion((value) => value + 1)

  const uploadTeacherMedia = async (event, kind) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMediaError('')
    try {
      const media = await saveProfileMedia(account.id, kind, file)
      if (kind === 'avatar' && media.dataUrl) {
        const updated = updateAccount(account.id, { profilePhotoUrl: media.dataUrl })
        setAccount(updated)
        onAccountChange(updated)
      }
      setMediaVersion((value) => value + 1)
    } catch (uploadError) {
      setMediaError(uploadError.message)
    }
    event.target.value = ''
  }

  const saveTeacherName = async () => {
    const name = teacherName.trim()
    setNameError('')
    if (name.length < 2 || name.length > 80) {
      setNameError('Enter a teacher display name between 2 and 80 characters.')
      return
    }
    const previousName = account.fullName
    try {
      const updated = updateAccount(account.id, { fullName: name })
      if (cloudSyncEnabled()) await withTimeout(updateCloudProfile(updated), 8000, 'Supabase did not confirm the name update in time.')
      bookings.forEach((booking) => updateBooking(booking.id, { teacherName: name }))
      setAccount(updated)
      onAccountChange(updated)
      setNameSaved(true)
      window.setTimeout(() => setNameSaved(false), 2000)
    } catch (saveError) {
      const reverted = updateLocalAccount(account.id, { fullName: previousName })
      setAccount(reverted)
      setTeacherName(previousName)
      setNameError(saveError.message)
    }
  }

  const saveSampleClassUrl = async () => {
    setSavingSampleClass(true)
    setSampleClassSaved(false)
    try {
      const updated = updateTeacherProfile(account.id, { sampleClassUrl: sampleClassUrl.trim() })
      if (cloudSyncEnabled()) {
        await withTimeout(updateCloudProfile(updated), 8000, 'Supabase did not confirm the profile update in time.')
      }
      setAccount(updated)
      onAccountChange(updated)
      setSampleClassSaved(true)
    } catch (err) {
      alert("Failed to save sample class URL: " + err.message)
    } finally {
      setSavingSampleClass(false)
    }
  }

  const saveIntroVideoUrl = async () => {
    setSavingIntroVideo(true)
    setIntroVideoSaved(false)
    try {
      const updated = updateTeacherProfile(account.id, { introVideoUrl: introVideoUrl.trim() })
      if (cloudSyncEnabled()) {
        await withTimeout(updateCloudProfile(updated), 8000, 'Supabase did not confirm the profile update in time.')
      }
      setAccount(updated)
      onAccountChange(updated)
      setIntroVideoSaved(true)
    } catch (err) {
      alert("Failed to save introduction video URL: " + err.message)
    } finally {
      setSavingIntroVideo(false)
    }
  }

  const savePayoutPreferences = async () => {
    setSavingPayout(true)
    setPayoutSaved(false)
    try {
      const updated = updateTeacherProfile(account.id, { 
        payoutMethod, 
        payoutDetails: payoutDetails.trim() 
      })
      if (cloudSyncEnabled()) {
        await withTimeout(updateCloudProfile(updated), 8000, 'Supabase did not confirm the payout update.')
      }
      setAccount(updated)
      onAccountChange(updated)
      setPayoutSaved(true)
    } catch (err) {
      alert("Failed to save payout preferences: " + err.message)
    } finally {
      setSavingPayout(false)
    }
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
    if (['confirmed', 'declined', 'cancelled'].includes(status)) {
      syncBookingNow(booking)
        .then(() => notifyBookingParticipants(booking, status === 'confirmed' ? 'confirmed' : 'cancelled'))
        .catch(() => {})
    } else if (['ongoing', 'absent'].includes(status)) syncBookingNow(booking).catch(() => {})
    refresh()
  }

  const unbookCalendarClass = async (booking) => {
    const updated = updateBooking(booking.id, { status: 'cancelled', cancelledBy: 'teacher', cancelledAt: new Date().toISOString() })
    refresh()
    if (cloudSyncEnabled()) await withTimeout(syncBookingNow(updated), 10000, 'The shared booking database did not confirm the cancellation in time.')
    void notifyBookingParticipants(updated, 'cancelled')
    return updated
  }

  const openTeacherClassroom = (booking) => {
    const activeClassroomBooking = booking.status === 'confirmed'
      ? updateBooking(booking.id, { status: 'ongoing', classStartedAt: new Date().toISOString() })
      : booking
    if (activeClassroomBooking.status === 'ongoing') syncBookingNow(activeClassroomBooking).catch(() => {})
    setClassroomBooking(activeClassroomBooking)
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
    const embeddedTencent = classroom.platform === 'voov' && tencentClassroomReady
    const activeLink = classroom.platform === 'zoom' ? classroom.zoomLink : classroom.voovLink
    if (!activeLink && !embeddedTencent) {
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
    { id: 'courseware', label: 'Courseware', icon: BookOpen },
    { id: 'schedule', label: 'Availability', icon: CalendarDays },
    { id: 'support', label: 'Support & Chat', icon: MessageSquareText },
    { id: 'referrals', label: 'Teacher referrals', icon: Award },
    { id: 'homework', label: 'Homework', icon: BookOpen },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'profile', label: 'My profile', icon: UserRound },
  ]

  if (classroomBooking) return <OnlineClassroom booking={classroomBooking} account={account} onExit={() => setClassroomBooking(null)} />

  return (
    <PortalShell account={account} role="teacher" active={active} onActive={setActive} onHome={onHome} onLogout={onLogout} navItems={nav} adminPreview={adminPreview} mediaVersion={mediaVersion}>
      {account.status !== 'approved' && <div className={`approval-banner approval-banner--${account.status}`}><ShieldCheck size={21} /><div><strong>{account.status === 'pending' ? 'Profile under review' : `Account ${account.status}`}</strong><span>{account.status === 'pending' ? 'An administrator will review your profile and credentials before students can book you.' : 'Contact the TutorPro Online English administrator if you need help.'}</span></div></div>}

      {active === 'overview' && (
        <div className="portal-view">
          <AnnouncementBanner account={account} />
          <div className="portal-page-heading"><div><span className="portal-kicker">Teacher studio</span><h1>Good day, {account.fullName.split(' ')[0]}.</h1><p>Keep every learner, booking and teaching hour in view.</p></div><button className="portal-primary-button" onClick={() => setActive('schedule')}><CalendarDays size={17} /> Update availability</button></div>
          <div className="portal-stat-grid portal-stat-grid--four" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <article><span className="stat-icon stat-icon--orange"><ClipboardCheck size={21} /></span><div><small>Pending requests</small><strong>{pending}</strong><em>Needs attention</em></div></article>
            <article><span className="stat-icon stat-icon--blue"><Video size={21} /></span><div><small>Lessons completed</small><strong>{account.teacher.lessonsCompleted || 0}</strong><em>All time</em></div></article>
            <article><span className="stat-icon stat-icon--gold"><Star size={21} /></span><div><small>Teacher rating</small><strong>{account.teacher.rating ? `${account.teacher.rating}.0` : 'New'}</strong><em>Student feedback</em></div></article>
            <article className="teacher-feedback-due-stat"><span className="stat-icon stat-icon--pink"><MessageSquareText size={21} /></span><div><small>Feedback due</small><strong>{feedbackNeededBookings.length}</strong><em>Needs remark</em></div></article>
            <article style={{ border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.04)' }}><span className="stat-icon stat-icon--green"><Coins size={21} style={{ color: '#10b981' }} /></span><div><small style={{ color: '#10b981' }}>Estimated Earnings</small><strong style={{ color: '#10b981' }}>₱{estimatedEarnings.toLocaleString()}</strong><em style={{ fontSize: '0.65rem' }}>{trialCompletedBookings.length} trials · {regularCompletedBookings.length} regular classes</em></div></article>
          </div>
          <section className="portal-card teacher-feedback-queue-card">
            <div className="portal-card__heading portal-card__heading--small">
              <div><span className="portal-kicker">Smart feedback queue</span><h2>Completed classes needing remarks</h2><p>All completed lessons without teacher feedback appear here until remarks are saved.</p></div>
              <div className="teacher-feedback-queue-actions"><button className="portal-text-button" onClick={refresh}>Refresh <RotateCcw size={15} /></button><button className="portal-text-button" onClick={() => setActive('bookings')}>All bookings <ChevronRight size={15} /></button></div>
            </div>
            {feedbackNeededBookings.length ? (
              <div className="teacher-feedback-queue-list">
                {feedbackNeededBookings.slice(0, 4).map((booking) => (
                  <article key={booking.id}>
                    <div><strong>{booking.learnerName || 'Student'}</strong><span>{formatLessonDate(booking.date, booking.time)} · {formatTime(booking.time)} · {booking.focus}</span></div>
                    <StatusBadge status={booking.status} />
                    <button type="button" onClick={() => setFeedbackBooking(booking)}><MessageSquareText size={15} /> Write feedback</button>
                  </article>
                ))}
              </div>
            ) : <EmptyState icon={MessageSquareText} title="No completed classes need remarks" text="Every completed class already has teacher feedback." />}
          </section>

          <div className="teacher-overview-grid">
            <section className="portal-card">
              <div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Action centre</span><h2>Booking requests</h2></div><button className="portal-text-button" onClick={() => setActive('bookings')}>View all <ChevronRight size={15} /></button></div>
              {bookings.filter((booking) => booking.status === 'pending').slice(0, 3).map((booking) => <BookingCard key={booking.id} booking={booking} showStudent onManageBooking={setManagedBooking} onOpenChat={(id, name) => setDirectChatUser({ id, name })} actions={<><button className="lesson-action lesson-action--accept" onClick={() => changeStatus(booking.id, 'confirmed')}><Check size={15} /></button><button className="lesson-action lesson-action--decline" onClick={() => changeStatus(booking.id, 'declined')}><X size={15} /></button></>} />)}
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
          <div className="portal-page-heading teacher-bookings-heading"><div><span className="portal-kicker">Lesson management</span><h1>Bookings</h1><p>Keep upcoming, ongoing, completed, absent and cancelled classes clearly separated.</p></div><div className="teacher-booking-view-toggle" role="group" aria-label="Choose booking view"><button type="button" className={bookingView === 'list' ? 'active' : ''} onClick={() => setBookingView('list')}><ClipboardCheck size={15} /> List view</button><button type="button" className={bookingView === 'calendar' ? 'active' : ''} onClick={() => setBookingView('calendar')}><CalendarDays size={15} /> Calendar view</button></div></div>
          <section className="portal-card teacher-booking-status-card"><div><span className="portal-kicker">Class status</span><strong>Choose which bookings to show</strong></div><div className="booking-status-filters teacher-booking-status-filters" role="group" aria-label="Filter teacher bookings by status">{BOOKING_STATUS_OPTIONS.map((option) => <button type="button" key={option.id} className={`booking-status-filter booking-status-filter--${option.id} ${bookingStatusFilter === option.id ? 'active' : ''}`} onClick={() => setBookingStatusFilter(option.id)}><span>{option.label}</span><strong>{bookingStatusCount(option.id)}</strong></button>)}</div></section>
          {bookingView === 'list' ? <section className="portal-card lessons-list-card">
            {filteredBookings.length ? filteredBookings.map((booking) => {
              let actions = null
              if (booking.status === 'pending') actions = <><button className="lesson-action lesson-action--wide lesson-action--accept" onClick={() => changeStatus(booking.id, 'confirmed')}>Accept</button><button className="lesson-action lesson-action--wide lesson-action--decline" onClick={() => changeStatus(booking.id, 'declined')}>Decline</button></>
              if (booking.status === 'confirmed') actions = <><button className="lesson-action lesson-action--wide lesson-action--complete" onClick={() => setFeedbackBooking(booking)}><MessageSquareText size={13} /> Complete & feedback</button><button className="lesson-action lesson-action--wide lesson-action--absent" onClick={() => changeStatus(booking.id, 'absent')}><XCircle size={13} /> Mark absent</button></>
              if (booking.status === 'ongoing') actions = <><button className="lesson-action lesson-action--wide lesson-action--complete" onClick={() => setFeedbackBooking(booking)}><MessageSquareText size={13} /> Complete & feedback</button><button className="lesson-action lesson-action--wide lesson-action--absent" onClick={() => changeStatus(booking.id, 'absent')}><XCircle size={13} /> Mark absent</button></>
              if (booking.status === 'completed') actions = <button className="lesson-action lesson-action--wide lesson-action--feedback" onClick={() => setFeedbackBooking(booking)}><MessageSquareText size={13} /> {booking.teacherFeedback ? 'Edit feedback' : 'Add feedback'}</button>
              if (booking.status === 'absent') actions = <button className="lesson-action lesson-action--wide lesson-action--restore" onClick={() => changeStatus(booking.id, 'confirmed')}><RotateCcw size={13} /> Restore booking</button>
              return <BookingCard key={booking.id} booking={booking} showStudent onEnterClassroom={openTeacherClassroom} onManageBooking={setManagedBooking} onOpenChat={(id, name) => setDirectChatUser({ id, name })} actions={actions} />
            }) : <EmptyState title={`No ${bookingStatusFilter === 'all' ? '' : `${bookingStatusFilter} `}bookings`} text="Choose another class status to see matching teacher bookings." />}
          </section> : <section className="portal-card booking-calendar-card teacher-booking-calendar"><div className="drag-instruction teacher-feedback-instruction"><span><MessageSquareText size={18} /></span><div><strong>Separated calendar statuses</strong><small>Calendar colours distinguish ongoing, completed, absent and cancelled classes. Click a student name to write feedback, view details or unbook the class.</small></div></div><ScheduleCalendar weekOffset={bookingWeek} onWeekOffset={setBookingWeek} bookings={filteredBookings} onBookingOpen={setManagedBooking} onBookingFeedback={setFeedbackBooking} onBookingCancel={unbookCalendarClass} showInactiveBookings /></section>}
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
                <button className={classroom.platform === 'voov' ? 'active' : ''} onClick={() => { setClassroom((current) => ({ ...current, platform: 'voov' })); setClassroomError('') }}><span className="platform-logo platform-logo--voov">V</span><div><strong>VooV / Tencent RTC</strong><small>{tencentClassroomReady ? 'Embedded securely inside TutorPro Online English' : 'Add a VooV fallback meeting link'}</small></div><i>{classroom.platform === 'voov' && <Check size={14} />}</i></button>
              </div>
              <div className="classroom-link-fields">
                <label><span>Zoom meeting link</span><div><Video size={17} /><input type="url" value={classroom.zoomLink || ''} onChange={(event) => setClassroom((current) => ({ ...current, zoomLink: event.target.value }))} placeholder="https://zoom.us/j/…" /></div></label>
                <label><span>{tencentClassroomReady ? 'Optional VooV fallback link' : 'VooV meeting link'}</span><div><Video size={17} /><input type="url" value={classroom.voovLink || ''} onChange={(event) => setClassroom((current) => ({ ...current, voovLink: event.target.value }))} placeholder="https://voovmeeting.com/…" /></div></label>
              </div>
              <button className="portal-primary-button" onClick={saveClassroom}><ShieldCheck size={16} /> Save private classroom</button>
            </section>
            <aside className="classroom-privacy-card"><span><ShieldCheck size={27} /></span><h2>Private by design</h2><p>Every confirmed booking receives a different classroom ID and secret token. Only its teacher, student and administrator can enter during the scheduled window.</p><ul><li><Check size={14} /> Unique room for every booking</li><li><Check size={14} /> Camera, microphone and screen sharing</li><li><Check size={14} /> Live annotation and lesson files</li></ul></aside>
          </div>
          <section className="portal-card classroom-launch-list"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Booked classrooms</span><h2>Launch or resume a class</h2></div></div>{bookings.filter((booking) => ['confirmed', 'ongoing'].includes(booking.status)).length ? bookings.filter((booking) => ['confirmed', 'ongoing'].includes(booking.status)).map((booking) => <BookingCard key={booking.id} booking={booking} showStudent onEnterClassroom={openTeacherClassroom} onManageBooking={setManagedBooking} onOpenChat={(id, name) => setDirectChatUser({ id, name })} />) : <EmptyState icon={Video} title="No active classrooms" text="Accept a student booking and its unique classroom will appear here." />}</section>
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
              onBookingOpen={setManagedBooking}
            />
          </section>
        </div>
      )}

      {active === 'support' && (
        <div className="portal-view parent-support-view">
          <div className="portal-page-heading">
            <div>
              <span className="portal-kicker">TutorPro Helpdesk</span>
              <h1>Teachers Support</h1>
              <p>Choose Facebook Messenger or secure website chat. Website chat opens directly from your teacher account.</p>
            </div>
            <span className="support-inbox-live"><i /> Teacher support</span>
          </div>
          <section className="portal-card teacher-support-channel-card">
            <div><span className="portal-kicker">Choose a chat channel</span><h2>How would you like to contact admin?</h2><p>Facebook Messenger is quick for non-China access. Website chat works inside TutorPro and will not ask for your email again.</p></div>
            <div className="teacher-support-channel-card__actions">
              <a className="portal-primary-button" href="https://m.me/526047974195321" target="_blank" rel="noreferrer"><MessageSquareText size={16} /> Facebook Messenger</a>
              <a className="portal-secondary-button" href="#teacher-website-support"><MessageSquareText size={16} /> Website chat</a>
            </div>
          </section>
          <div id="teacher-website-support">
            <SupportChatWidget embedded autoStartForAccount audience="teacher" />
          </div>
        </div>
      )}

      {active === 'referrals' && <ReferralDashboardPanel account={account} role="teacher" onAccountChange={(updated) => { setAccount(updated); onAccountChange(updated) }} />}

      {active === 'courseware' && <CoursewareManager account={account} mode="teacher" />}

      {active === 'homework' && <TeacherHomeworkPanel account={account} />}

      {active === 'library' && <DigitalLibraryPanel account={account} role="teacher" />}

      {active === 'profile' && (
        <div className="portal-view">
          <section className="teacher-profile-hero"><div className="teacher-profile-photo-wrap"><ProfilePhoto accountId={account.id} name={account.fullName} refreshKey={mediaVersion} className="teacher-profile-photo" /><label title="Upload display photo"><Camera size={16} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadTeacherMedia(event, 'avatar')} /></label></div><div><StatusBadge status={account.status} /><h1>{account.fullName}</h1><p>{account.teacher.specialization} · {account.teacher.experience} years experience</p></div><div className="teacher-profile-hero__score"><Star size={21} /><strong>{account.teacher.rating || 'New'}</strong><span>{account.teacher.ratingCount ? `${account.teacher.ratingCount} class ratings` : 'rating'}</span></div></section>
          {mediaError && <div className="portal-error" role="alert">{mediaError}</div>}
          <section className="portal-card teacher-name-editor"><div><span className="portal-kicker">Public teacher name</span><h2>Edit display name</h2><p>This name appears to parents, students, bookings and the Admin Dashboard.</p></div><label><span>Teacher display name</span><input value={teacherName} onChange={(event) => { setTeacherName(event.target.value); setNameSaved(false); setNameError('') }} maxLength="80" /></label><button className="portal-primary-button" onClick={saveTeacherName}>Save name <Check size={16} /></button>{nameSaved && <span className="saved-label"><Check size={14} /> Saved</span>}{nameError && <div className="portal-error" role="alert">{nameError}</div>}</section>
          <div className="teacher-public-profile-grid">
            <section className="portal-card teacher-profile-detail"><span className="portal-kicker">Professional profile</span><h2>About my teaching</h2><p className="teacher-bio">{account.teacher.bio}</p><div className="profile-info-row profile-info-row--three"><div><span>Education</span><strong>{account.teacher.education}</strong></div><div><span>Languages</span><strong>{account.teacher.languages}</strong></div><div><span>Credentials</span><strong>{account.teacher.credentials?.length || 0} submitted</strong></div></div></section>
            <section className="portal-card teacher-video-manager">
              <div className="portal-card__heading portal-card__heading--small">
                <div><span className="portal-kicker">Public introduction</span><h2>Introduction video</h2></div>
                <span className="portal-card__icon"><Film size={21} /></span>
              </div>
              <IntroVideo accountId={account.id} refreshKey={mediaVersion} />
              
              <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#bce94e', marginBottom: '8px', textTransform: 'uppercase' }}>Option A: Paste Video Link</span>
                <input 
                  type="text"
                  placeholder="Paste YouTube, Shorts, Drive or Vimeo link..."
                  value={introVideoUrl}
                  onChange={(e) => {
                    setIntroVideoUrl(e.target.value)
                    setIntroVideoSaved(false)
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.78rem',
                    outline: 'none',
                    marginBottom: '8px'
                  }}
                />
                <button 
                  type="button"
                  className="portal-primary-button" 
                  onClick={saveIntroVideoUrl}
                  disabled={savingIntroVideo}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.75rem' }}
                >
                  {savingIntroVideo ? 'Saving Intro Link...' : 'Save Intro Link'}
                </button>
                {introVideoSaved && (
                  <span className="saved-label" style={{ display: 'inline-block', marginTop: '6px', color: '#bce94e', fontSize: '0.72rem' }}>
                    <Check size={12} /> Introduction link saved!
                  </span>
                )}
              </div>

              <div style={{ marginTop: '14px', textAlign: 'center', color: '#b9adc7', fontSize: '0.7rem', fontWeight: 'bold' }}>— OR —</div>

              <div style={{ marginTop: '14px' }}>
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#bce94e', marginBottom: '8px', textTransform: 'uppercase' }}>Option B: Upload raw video file</span>
                <label className="media-upload-button" style={{ margin: 0 }}><Upload size={16} /> Upload introduction video<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => uploadTeacherMedia(event, 'intro-video')} /></label>
                <p style={{ marginTop: '6px', fontSize: '0.65rem', color: '#b9adc7' }}>MP4 or WebM, up to 50 MB.</p>
              </div>
            </section>
            
            {/* PASTING SAMPLE CLASS LINK FORM */}
            <section className="portal-card teacher-sample-class">
              <div className="portal-card__heading portal-card__heading--small">
                <div><span className="portal-kicker">Sample Lesson Recording</span><h2>Sample class video link</h2></div>
                <span className="portal-card__icon"><Video size={21} /></span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#b9adc7', marginBottom: '6px' }}>
                  Paste link to your sample class (YouTube, YouTube Shorts, Vimeo, Bilibili, Google Drive video, or Raw Mp4 url)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtube.com/shorts/..."
                  value={sampleClassUrl}
                  onChange={(e) => {
                    setSampleClassUrl(e.target.value)
                    setSampleClassSaved(false)
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    marginBottom: '10px'
                  }}
                />
                <button 
                  type="button"
                  className="portal-primary-button" 
                  onClick={saveSampleClassUrl}
                  disabled={savingSampleClass}
                  style={{ width: '100%' }}
                >
                  {savingSampleClass ? 'Saving & Syncing...' : 'Save Sample Class Link'}
                </button>
                {sampleClassSaved && (
                  <span className="saved-label" style={{ display: 'inline-block', marginTop: '6px', color: '#bce94e', fontSize: '0.75rem' }}>
                    <Check size={14} /> Saved and synced to public showcase!
                  </span>
                )}
              </div>
            </section>

            {/* PHILIPPINE PAYOUT PREFERENCES */}
            <section className="portal-card teacher-payout-preferences">
              <div className="portal-card__heading portal-card__heading--small">
                <div><span className="portal-kicker">Salary Payout Settings</span><h2>Philippine Payout Preferences</h2></div>
                <span className="portal-card__icon"><Coins size={21} /></span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#b9adc7', marginBottom: '6px' }}>
                  Select your preferred payout channel (Philippines local wallets & bank transfers)
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => {
                    setPayoutMethod(e.target.value)
                    setPayoutSaved(false)
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    marginBottom: '10px'
                  }}
                >
                  <option value="GCash">GCash Wallet (Philippines)</option>
                  <option value="Maya">Maya Wallet (Philippines)</option>
                  <option value="BDO">BDO Unibank (Bank Transfer)</option>
                  <option value="BPI">BPI (Bank Transfer)</option>
                  <option value="PayPal">PayPal Business Account</option>
                </select>

                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#b9adc7', marginBottom: '6px' }}>
                  Mobile Phone Number or Bank Account Number
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 0917-123-4567 or 1234-5678-90"
                  value={payoutDetails}
                  onChange={(e) => {
                    setPayoutDetails(e.target.value)
                    setPayoutSaved(false)
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    marginBottom: '12px'
                  }}
                />

                <button 
                  type="button"
                  className="portal-primary-button" 
                  onClick={savePayoutPreferences}
                  disabled={savingPayout}
                  style={{ width: '100%' }}
                >
                  {savingPayout ? 'Saving Payouts...' : 'Save Philippine Payout Details'}
                </button>
                {payoutSaved && (
                  <span className="saved-label" style={{ display: 'inline-block', marginTop: '6px', color: '#bce94e', fontSize: '0.75rem' }}>
                    <Check size={14} /> Salary preferences saved successfully!
                  </span>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
      {managedBooking && <BookingSlotDialog booking={managedBooking} account={account} onClose={() => setManagedBooking(null)} onChanged={(updated) => { setManagedBooking(updated); refresh() }} />}
      {feedbackBooking && <FeedbackDialog booking={feedbackBooking} teacherId={account.id} onClose={() => setFeedbackBooking(null)} onSaved={finishFeedback} />}
      {directChatUser && (
        <DirectChatModal 
          currentUserId={account.id} 
          currentUserRole={account.role} 
          targetUserId={directChatUser.id} 
          targetUserName={directChatUser.name} 
          onClose={() => setDirectChatUser(null)} 
        />
      )}
    </PortalShell>
  )
}

function AdminInterviewRecordings({ interview }) {
  const sessionId = interview?.recordingSessionId
  const [recordingResult, setRecordingResult] = useState({ sessionId: null, items: [], error: '' })
  const [recordingUrls, setRecordingUrls] = useState({})
  const [loadingIndex, setLoadingIndex] = useState(null)
  const [recordingError, setRecordingError] = useState('')
  const recordings = recordingResult.sessionId === sessionId ? recordingResult.items : []
  const loading = Boolean(sessionId && recordingResult.sessionId !== sessionId)
  const displayedError = recordingError || (recordingResult.sessionId === sessionId ? recordingResult.error : '')

  useEffect(() => {
    let active = true
    if (!sessionId) return () => { active = false }
    import('./teacherInterviewMedia.js')
      .then(({ fetchAdminTeacherInterviewRecordings }) => fetchAdminTeacherInterviewRecordings(sessionId))
      .then((items) => { if (active) setRecordingResult({ sessionId, items, error: '' }) })
      .catch((loadError) => { if (active) setRecordingResult({ sessionId, items: [], error: loadError.message }) })
    return () => { active = false }
  }, [sessionId])

  const openRecording = async (recording) => {
    setLoadingIndex(recording.question_index)
    setRecordingError('')
    try {
      const { createAdminInterviewRecordingUrl } = await import('./teacherInterviewMedia.js')
      const url = await createAdminInterviewRecordingUrl(recording.storage_path)
      setRecordingUrls((current) => ({ ...current, [`${sessionId}-${recording.question_index}`]: url }))
    } catch (loadError) {
      setRecordingError(loadError.message)
    } finally {
      setLoadingIndex(null)
    }
  }

  return (
    <div className="admin-interview-recordings">
      <div className="admin-interview-recordings__heading"><div><span className="portal-kicker">Private applicant audio</span><h3>Recorded answers</h3></div><span>{interview?.recordingCount || recordings.length || 0} recordings</span></div>
      {!sessionId && <div className="admin-interview-recordings__notice"><AudioLines size={19} /><span><strong>Audio is not available for this application.</strong><small>{interview?.recordingNotice || 'This application was submitted before secure recorded interviews were enabled.'}</small></span></div>}
      {loading && <div className="admin-interview-recordings__loading"><i /> Loading private recordings…</div>}
      {displayedError && <div className="portal-error" role="alert">{displayedError}</div>}
      {!loading && recordings.length > 0 && <div className="admin-interview-recordings__list">{recordings.map((recording) => <article key={recording.question_index}><div><span>Answer {recording.question_index + 1} · {recording.stage}</span><strong>{recording.question}</strong><small>{Math.floor(recording.duration_seconds / 60)}:{String(recording.duration_seconds % 60).padStart(2, '0')} · {(recording.byte_size / 1024).toFixed(0)} KB</small></div>{recordingUrls[`${sessionId}-${recording.question_index}`] ? <audio controls src={recordingUrls[`${sessionId}-${recording.question_index}`]}>Recorded answer playback is not supported by this browser.</audio> : <button type="button" onClick={() => openRecording(recording)} disabled={loadingIndex === recording.question_index}><Volume2 size={15} /> {loadingIndex === recording.question_index ? 'Opening…' : 'Listen securely'}</button>}</article>)}</div>}
    </div>
  )
}

export function AdminTeacherProfile({ teacher, onBack, onStatusChange, onRemove, processing, error, onOpenChat }) {
  const [pesoRate, setPesoRate] = useState(350)
  const [savingRate, setSavingRate] = useState(false)

  const profile = teacher?.teacher || {}

  useEffect(() => {
    if (profile?.pesoRate) {
      setPesoRate(profile.pesoRate)
    }
  }, [teacher])

  try {
    const credentials = Array.isArray(profile.credentials) ? profile.credentials : []
    const availabilitySlots = Array.isArray(profile.availabilitySlots) ? profile.availabilitySlots : []
    const teacherBookings = getBookings({ teacherId: teacher?.id }) || []
    const completedLessons = teacherBookings.filter((booking) => booking.status === 'completed' || booking.status === 'absent').length
    const rate = Number.isFinite(Number(profile.pesoRate)) ? Number(profile.pesoRate) : 350
    const regularCompletedBookings = teacherBookings.filter((booking) => !booking.isTrialClass && (booking.status === 'completed' || booking.status === 'absent'))
    const regularSlotsCount = regularCompletedBookings.reduce((acc, b) => acc + (b.duration || 25) / 25, 0)
    
    const trialCompletedBookings = teacherBookings.filter((booking) => booking.isTrialClass && (booking.status === 'completed' || booking.status === 'absent'))
    const trialEnrolledCount = trialCompletedBookings.filter(b => b.trialEnrolled).length
    const trialNotEnrolledCount = trialCompletedBookings.filter(b => !b.trialEnrolled).length

    const computedEarnings = (regularSlotsCount * rate) + (trialEnrolledCount * 100) + (trialNotEnrolledCount * 40)
    const estimatedEarnings = Number.isFinite(computedEarnings) ? computedEarnings : 0
    const interview = profile.interview || null
    const recommendationClass = interview?.overallRecommendation?.startsWith('Strong') ? 'strong' : interview?.overallRecommendation?.startsWith('Consider') ? 'consider' : 'review'

    const handleSavePesoRate = async () => {
      setSavingRate(true)
      try {
        const updated = updateAccount(teacher.id, {
          teacher: {
            ...profile,
            pesoRate: Number(pesoRate)
          }
        })
        if (cloudSyncEnabled()) {
          await updateCloudProfile(updated)
        }
        alert("Teacher's Peso Rate successfully saved!")
      } catch (err) {
        alert("Failed to save peso rate: " + err.message)
      } finally {
        setSavingRate(false)
      }
    }

    return (
      <div className="portal-view admin-teacher-profile-view">
        <div className="admin-profile-backbar"><button onClick={onBack}><ChevronLeft size={17} /> Back to teachers</button><span><ShieldCheck size={15} /> Administrator profile view</span></div>
        {error && <div className="portal-error" role="alert">{error}</div>}
        <section className="admin-teacher-profile-hero">
          <ProfilePhoto accountId={teacher?.id} name={teacher?.fullName} className="admin-teacher-profile-photo" />
          <div><StatusBadge status={teacher?.status || 'pending'} /><h1>{teacher?.fullName || 'New Teacher'}</h1><p>{profile.specialization || 'Specialization not provided'} · {Number(profile.experience) || 0} years experience</p><div className="profile-tags"><span><Star size={13} /> {profile.rating || 'New'} rating</span><span><Video size={13} /> {profile.lessonsCompleted || completedLessons} lessons</span></div></div>
          <div className="admin-teacher-profile-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* NATIVE INTER-WEBSITE CHAT BUTTON */}
            <button
              type="button"
              onClick={() => onOpenChat?.(teacher?.email || teacher?.loginId, teacher?.fullName)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#bce94e',
                color: '#090510',
                fontWeight: '850',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              <MessageSquareText size={15} /> 💬 Chat on Website
            </button>

            <button 
              type="button" 
              onClick={async () => {
                const bodyText = prompt(`Send a direct email message to ${teacher?.fullName} (${teacher?.email || teacher?.loginId}):`);
                if (!bodyText?.trim()) return;
                try {
                  const { supabase } = await import('./supabaseClient.js');
                  const { data, error: invokeError } = await supabase.functions.invoke('mass-announcement', {
                    body: {
                      subject: "Message from TutorPro Administration",
                      body: bodyText.trim(),
                      recipientEmail: teacher?.email || teacher?.loginId
                    }
                  });
                  if (invokeError || data?.error) throw new Error(invokeError?.message || data?.error || 'Failed to send email');
                  alert(`Message successfully emailed to ${teacher?.fullName}!`);
                } catch(err) {
                  alert("Failed to send message: " + err.message);
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              <Send size={15} /> Send Email
            </button>

            {teacher?.status !== 'approved' && <button className="approve" onClick={() => onStatusChange(teacher?.id, 'approved')} disabled={processing}><UserCheck size={16} /> {processing ? 'Saving…' : 'Approve teacher'}</button>}
            {teacher?.status === 'approved' && <button className="suspend" onClick={() => onStatusChange(teacher?.id, 'suspended')} disabled={processing}><Ban size={16} /> Suspend</button>}
            {teacher?.status !== 'rejected' && !teacher?.systemProfile && <button className="reject" onClick={() => onStatusChange(teacher?.id, 'rejected')} disabled={processing}><XCircle size={16} /> Reject</button>}
            {!teacher?.systemProfile && onRemove && <button className="delete" onClick={() => onRemove(teacher)} disabled={processing}><Trash2 size={16} /> Delete profile</button>}
          </div>
        </section>
      <div className="admin-teacher-profile-grid">
        <section className="portal-card"><span className="portal-kicker">Professional profile</span><h2>About the teacher</h2><p className="teacher-bio">{profile.bio || 'The teacher has not added a biography yet.'}</p><div className="profile-info-row profile-info-row--three"><div><span>Education</span><strong>{profile.education || 'Not provided'}</strong></div><div><span>Languages</span><strong>{profile.languages || 'Not provided'}</strong></div><div><span>Curriculum</span><strong>{profile.specialization || 'Not provided'}</strong></div></div></section>
        <section className="portal-card admin-teacher-media"><span className="portal-kicker">Public introduction</span><h2>Introduction video</h2><IntroVideo accountId={teacher.id} compact /><p>Visible to parents on the public teacher profile.</p></section>
        <section className="portal-card"><span className="portal-kicker">Teaching access</span><h2>Availability & classroom</h2><dl className="admin-teacher-detail-list"><div><dt>Weekly slots</dt><dd>{availabilitySlots.length} × 30 min</dd></div><div><dt>Class platform</dt><dd>{profile.classroom?.platform === 'voov' ? 'VooV' : 'Zoom / TutorPro Classroom'}</dd></div><div><dt>Confirmed bookings</dt><dd>{teacherBookings.filter((booking) => booking.status === 'confirmed').length}</dd></div><div><dt>Completed/Absent lessons</dt><dd>{completedLessons} classes</dd></div><div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', gridColumn: '1/-1' }}><dt style={{ fontSize: '0.72rem', color: '#b9adc7' }}>Earnings Breakdown</dt><dd style={{ fontSize: '0.72rem', color: '#fff', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}><span>Regular: {regularSlotsCount} slots × ₱{rate} = ₱{(regularSlotsCount * rate).toLocaleString()}</span><span>Trial Enrolled: {trialEnrolledCount} × ₱100 = ₱{(trialEnrolledCount * 100).toLocaleString()}</span><span>Trial Not Enrolled: {trialNotEnrolledCount} × ₱40 = ₱{(trialNotEnrolledCount * 40).toLocaleString()}</span></dd></div><div><dt style={{ color: '#10b981', fontWeight: 'bold' }}>Estimated Earnings</dt><dd style={{ color: '#10b981', fontWeight: 'black', fontSize: '1.2rem' }}>₱{estimatedEarnings.toLocaleString()}</dd></div></dl>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 'bold', color: '#b9adc7', marginBottom: '6px' }}>Configure Peso Rate (PHP per completed/absent class)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0 10px', borderRadius: '8px', color: '#b9adc7', fontSize: '0.8rem' }}>₱</span>
              <input 
                type="number" 
                value={pesoRate}
                onChange={(e) => setPesoRate(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSavePesoRate}
                disabled={savingRate}
                style={{
                  background: '#bce94e',
                  color: '#090510',
                  fontWeight: '850',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                {savingRate ? 'Saving...' : 'Save Rate'}
              </button>
            </div>
          </div>
        </section>
        <section className="portal-card"><span className="portal-kicker">Verification</span><h2>Submitted credentials</h2>{credentials.length ? <ul className="admin-credential-list">{credentials.map((credential, index) => <li key={credential} style={{ display: 'block', margin: '4px 0' }}><button type="button" onClick={async () => { try { const record = await getProfileMedia(teacher.id, `credential-${index}`); if (record?.blob) { const objectUrl = URL.createObjectURL(record.blob); window.open(objectUrl, '_blank'); } else { alert("This credential file binary has not been uploaded yet or is empty."); } } catch(err) { alert("Error opening file: " + err.message); } }} style={{ background: 'transparent', border: 'none', color: '#bce94e', cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', padding: '0', fontWeight: 'bold' }}><ShieldCheck size={15} /> {credential} (Click to View File)</button></li>)}</ul> : <EmptyState icon={ShieldCheck} title="No credentials submitted" text="The teacher has not uploaded credential names yet." />}</section>
      </div>
      <section className="portal-card admin-interview-review">
        <div className="admin-interview-heading">
          <div>
            <span className="portal-kicker">Required first-round screening</span>
            <h2>AI teacher interview</h2>
            <p>Internal evaluation and full applicant transcript. Never shown to the applicant.</p>
          </div>
          {interview ? (
            <span className={`interview-recommendation interview-recommendation--${recommendationClass}`}>{interview.overallRecommendation}</span>
          ) : (
            <span className="interview-recommendation interview-recommendation--review">Not completed</span>
          )}
        </div>
        {interview ? (
          <>
            <div className="admin-interview-metrics">
              <div>
                <span>English proficiency</span>
                <strong>{interview.englishProficiency?.band || 'Needs review'}</strong>
                <small>{interview.englishProficiency?.justification}</small>
              </div>
              <div>
                <span>Live micro-demo</span>
                <strong>{interview.liveDemo?.band || 'Needs review'}</strong>
                <small>{interview.liveDemo?.justification}</small>
              </div>
              <div>
                <span>Availability</span>
                <strong>Applicant statement</strong>
                <small>{interview.availability || 'Not stated'}</small>
              </div>
            </div>
            <div className="admin-interview-evidence">
              <div>
                <h3>Strengths</h3>
                {Array.isArray(interview.strengths) && interview.strengths.length ? (
                  <ul>
                    {interview.strengths.map((item) => (
                      <li key={item}><CheckCircle2 size={14} /> {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No strengths were extracted automatically.</p>
                )}
              </div>
              <div>
                <h3>Concerns / gaps</h3>
                {Array.isArray(interview.concerns) && interview.concerns.length ? (
                  <ul>
                    {interview.concerns.map((item) => (
                      <li key={item}><XCircle size={14} /> {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No specific concerns were flagged.</p>
                )}
              </div>
            </div>
            <div className="admin-interview-next">
              <strong>Suggested next step</strong>
              <p>{interview.suggestedNextStep}</p>
              <small>Evaluation source: {interview.source === 'ai-evaluator' ? 'AI evaluator' : 'Structured fallback — human review required'} · Completed {interview.completedAt ? new Date(interview.completedAt).toLocaleString('en') : 'recently'}</small>
            </div>
            <AdminInterviewRecordings interview={interview} />
            <details className="admin-interview-transcript">
              <summary>Open complete interview transcript ({Array.isArray(interview.transcript) ? interview.transcript.length : 0} responses)</summary>
              <div>
                {Array.isArray(interview.transcript) && interview.transcript.map((item, index) => (
                  <article key={`${item.stage}-${index}`}>
                    <span>{item.stage}</span>
                    <h4>{item.question}</h4>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </details>
          </>
        ) : (
          <div className="admin-interview-empty">
            <Bot size={27} />
            <strong>No interview record</strong>
            <span>Teacher accounts created directly by an administrator may not include an applicant interview.</span>
          </div>
        )}
      </section>
      <section className="portal-card classroom-launch-list"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Teacher activity</span><h2>Recent bookings</h2></div></div>{teacherBookings.length ? teacherBookings.slice(0, 5).map((booking) => <BookingCard key={booking.id} booking={booking} showStudent />) : <EmptyState icon={CalendarDays} title="No bookings yet" text="Teacher bookings will appear here." />}</section>
    </div>
  )
  } catch (renderError) {
    console.error("Render error inside AdminTeacherProfile: ", renderError)
    return (
      <div className="role-error-card" style={{ padding: '30px', background: '#110925', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', margin: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#ff4d4d', fontWeight: 'bold', marginBottom: '10px' }}>⚠️ Layout Evaluation Exception</h2>
        <p style={{ color: '#b9adc7', fontSize: '0.9rem', marginBottom: '15px' }}>
          TutorPro Online English was unable to compile the teacher profile layout. Detail description:
        </p>
        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', color: '#ff4d4d', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap' }}>
          {renderError.stack || renderError.message}
        </pre>
        <button onClick={onBack} className="portal-primary-button" style={{ marginTop: '15px' }}>Return to Admin</button>
      </div>
    )
  }
}

export function AdminStudentProfile({ account, learnerId, onBack, onStatusChange, onGoalChange, onRemove, processing, error, teachers = [], onOpenChat }) {
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
  const [goalDraft, setGoalDraft] = useState(learner.goal || '')
  const [goalError, setGoalError] = useState('')
  const [goalSaved, setGoalSaved] = useState(false)

  const [paidBalance, setPaidBalance] = useState(typeof account.paidLessonsBalance === 'number' ? account.paidLessonsBalance : 0)
  const [savingBalance, setSavingBalance] = useState(false)
  const [balanceSaved, setBalanceSaved] = useState(false)
  const [enrollmentSaving, setEnrollmentSaving] = useState(false)
  const [enrollmentSaved, setEnrollmentSaved] = useState(false)
  const [enrollmentStatus, setEnrollmentStatus] = useState(learner.enrollmentStatus || (learner.trialClass ? 'trial' : 'enrolled'))

  const handleSaveBalance = async () => {
    setSavingBalance(true)
    setBalanceSaved(false)
    try {
      const updated = updateAccount(account.id, { paidLessonsBalance: Number(paidBalance) })
      if (cloudSyncEnabled()) {
        await updateCloudProfile(updated)
      }
      setBalanceSaved(true)
      window.setTimeout(() => setBalanceSaved(false), 2000)
    } catch (err) {
      alert("Failed to save booking credits: " + err.message)
    } finally {
      setSavingBalance(false)
    }
  }

  const updateEnrollmentStatus = async (nextStatus) => {
    if (isIncomplete || nextStatus === enrollmentStatus) return
    setEnrollmentSaving(true)
    setEnrollmentSaved(false)
    try {
      const updated = updateStudentProfile(account.id, {
        enrollmentStatus: nextStatus,
        trialClass: nextStatus === 'trial',
        enrolledAt: nextStatus === 'enrolled' ? new Date().toISOString() : learner.enrolledAt || '',
      }, learner.id)
      if (cloudSyncEnabled()) await updateCloudProfile(updated)
      setEnrollmentStatus(nextStatus)
      setEnrollmentSaved(true)
      window.setTimeout(() => setEnrollmentSaved(false), 2200)
    } catch (err) {
      alert('Failed to update enrollment status: ' + err.message)
    } finally {
      setEnrollmentSaving(false)
    }
  }

  useEffect(() => {
    setEnrollmentStatus(learner.enrollmentStatus || (learner.trialClass ? 'trial' : 'enrolled'))
  }, [learner.enrollmentStatus, learner.trialClass])

  useEffect(() => {
    if (typeof account.paidLessonsBalance === 'number') {
      setPaidBalance(account.paidLessonsBalance)
    }
  }, [account])

  const [assignedTeacherId, setAssignedTeacherId] = useState(learner.assignedTeacherId || '')

  const handleSaveAssignedTeacher = async (teacherId) => {
    const selectedTeacher = teachers.find(t => t.id === teacherId);
    const teacherName = selectedTeacher ? selectedTeacher.fullName : '';
    try {
      const updated = updateStudentProfile(account.id, { 
        assignedTeacherId: teacherId,
        assignedTeacherName: teacherName
      }, learner.id);
      
      if (cloudSyncEnabled()) {
        await updateCloudProfile(updated)
      }
      setAssignedTeacherId(teacherId);
      alert(`Successfully assigned ${teacherName || 'None'} to ${learner.name}!`);
    } catch (err) {
      alert("Failed to assign teacher: " + err.message);
    }
  }

  const saveGoal = async () => {
    const goal = goalDraft.trim()
    if (goal.length < 3 || goal.length > 180) {
      setGoalError('Type a learning goal between 3 and 180 characters.')
      return
    }
    setGoalError('')
    setGoalSaved(false)
    try {
      await onGoalChange(account.id, learner.id, goal)
      setGoalSaved(true)
      window.setTimeout(() => setGoalSaved(false), 2200)
    } catch (saveError) {
      setGoalError(saveError.message)
    }
  }

  return (
    <div className="portal-view admin-student-profile-view">
      <div className="admin-profile-backbar"><button onClick={onBack}><ChevronLeft size={17} /> Back to students</button><span><ShieldCheck size={15} /> Administrator profile view</span></div>
      {error && <div className="portal-error" role="alert">{error}</div>}
      <section className="admin-student-profile-hero">
        <ProfilePhoto accountId={`${account.id}-${learner.id}`} name={learner.name} className="admin-student-profile-photo" />
        <div><StatusBadge status={effectiveStatus} /><h1>{learner.name}</h1><p>{learner.year} · {learner.curriculum} English</p><div className="profile-tags"><span><Star size={13} /> {learner.level || 'Building foundations'}</span><span><Flame size={13} /> {learner.streak || 0} day streak</span></div></div>
        <div className="admin-teacher-profile-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* WEBPAGE CHAT TRIGGER */}
          <button
            type="button"
            onClick={() => onOpenChat?.(account.email || account.loginId, account.parentName)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#bce94e',
              color: '#090510',
              fontWeight: '850',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            <MessageSquareText size={15} /> 💬 Chat on Website
          </button>
          {!isIncomplete && effectiveStatus === 'active' && <button className="suspend" onClick={() => onStatusChange(account.id, learner.id, 'suspended')} disabled={processing}><Ban size={16} /> Suspend profile</button>}
          {!isIncomplete && effectiveStatus === 'suspended' && <button className="approve" onClick={() => onStatusChange(account.id, learner.id, 'active')} disabled={processing}><UserCheck size={16} /> Restore profile</button>}
          <button className="reject" onClick={() => onRemove({ account, learner })} disabled={processing}><Trash2 size={16} /> Remove registration</button>
        </div>
      </section>
      {isIncomplete && <div className="student-profile-suspension"><GraduationCap size={20} /><div><strong>This registration is incomplete</strong><span>Open the student account and add the learner name, school year, curriculum and learning goal.</span></div></div>}
      <div className="admin-student-profile-grid">
        <section className="portal-card"><span className="portal-kicker">Family account</span><h2>Parent and login details</h2><dl className="admin-teacher-detail-list"><div><dt>Parent / guardian</dt><dd>{account.parentName || 'Not provided'}</dd></div><div><dt>Account login</dt><dd>{account.loginId || account.email || 'Not provided'}</dd></div><div><dt>Account status</dt><dd>{account.status || 'active'}</dd></div><div><dt>Students in family</dt><dd>{learners.length}</dd></div></dl></section>
        <section className="portal-card admin-enrollment-card"><div><span className="portal-kicker">Trial & enrollment</span><h2>Student class stage</h2><p>Mark whether this learner is still on a trial class or already enrolled. This helps admin and teacher payout review.</p></div>{enrollmentSaved && <span className="saved-label"><Check size={14} /> Saved</span>}<div className="admin-enrollment-card__options"><button type="button" className={enrollmentStatus === 'trial' ? 'active' : ''} onClick={() => updateEnrollmentStatus('trial')} disabled={enrollmentSaving || isIncomplete}><Sparkles size={16} /> Trial class</button><button type="button" className={enrollmentStatus === 'enrolled' ? 'active' : ''} onClick={() => updateEnrollmentStatus('enrolled')} disabled={enrollmentSaving || isIncomplete}><UserCheck size={16} /> Enrolled student</button></div><small>{enrollmentSaving ? 'Saving status…' : `Current stage: ${enrollmentStatus === 'trial' ? 'Trial class' : 'Enrolled student'}`}</small></section>
        <section className="portal-card admin-goal-editor"><span className="portal-kicker">Admin-only learning profile</span><div className="admin-goal-editor__heading"><div><h2>Main Learning Goal</h2><p>Type the personalised goal parents will see in their dashboard and bookings.</p></div>{goalSaved && <span className="saved-label"><Check size={14} /> Saved live</span>}</div><textarea value={goalDraft} onChange={(event) => { setGoalDraft(event.target.value); setGoalError(''); setGoalSaved(false) }} maxLength="180" placeholder="e.g. Speak confidently in complete sentences and prepare for the school interview" disabled={isIncomplete || processing} />{goalError && <div className="portal-error" role="alert">{goalError}</div>}<div className="admin-goal-editor__actions"><small>{goalDraft.length}/180 characters · Only administrators can edit this field</small><button className="portal-primary-button" onClick={saveGoal} disabled={!onGoalChange || isIncomplete || processing || goalDraft.trim() === (learner.goal || '').trim()}><Check size={15} /> {processing ? 'Saving…' : 'Save goal live'}</button></div><dl className="admin-teacher-detail-list"><div><dt>Lesson rhythm</dt><dd>{learner.frequency || 'Not provided'}</dd></div><div><dt>Progress</dt><dd>{learner.progress || 0}%</dd></div><div><dt>Game stars</dt><dd>{learner.gameStars || 0}</dd></div></dl></section>
        <section className="portal-card"><span className="portal-kicker">Learning activity</span><h2>Lessons and achievements</h2><dl className="admin-teacher-detail-list"><div><dt>Total bookings</dt><dd>{learnerBookings.length}</dd></div><div><dt>Completed lessons</dt><dd>{learner.lessonsCompleted || completedLessons}</dd></div><div><dt>Upcoming lessons</dt><dd>{learnerBookings.filter((booking) => ['pending', 'confirmed', 'ongoing'].includes(booking.status)).length}</dd></div><div><dt>Achievements</dt><dd>{learner.achievements?.length || 0}</dd></div></dl></section>
        <section className="portal-card"><span className="portal-kicker">Profile access</span><h2>Administrator controls</h2><p className="teacher-bio">Use the controls above to suspend, restore, or permanently remove this individual student registration. Other learners in the same family separate.</p></section>
        <section className="portal-card"><span className="portal-kicker">Academic Management</span><h2>Assign Specific Teacher</h2><p style={{ fontSize: '0.75rem', color: '#b9adc7', marginBottom: '12px' }}>Assign a specific teacher. Once assigned, this student will ONLY be allowed to see and book lessons with this teacher.</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={assignedTeacherId}
              onChange={(e) => handleSaveAssignedTeacher(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="">-- No Specific Teacher Assigned --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </select>
          </div>
        </section>

        {/* ADMIN BOOKING CREDITS CONTROL */}
        <section className="portal-card">
          <span className="portal-kicker">Tuition & Billing</span>
          <h2>Paid Session Credits</h2>
          <p style={{ fontSize: '0.75rem', color: '#b9adc7', marginBottom: '12px' }}>
            Control the number of paid slots this parent is allowed to book. Booking a lesson decrements this balance automatically.
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="number" 
              value={paidBalance}
              onChange={(e) => { setPaidBalance(e.target.value); setBalanceSaved(false); }}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSaveBalance}
              disabled={savingBalance}
              className="portal-primary-button"
              style={{ margin: 0, padding: '8px 16px', fontSize: '0.75rem' }}
            >
              {savingBalance ? 'Saving...' : 'Save Credits'}
            </button>
          </div>
          {balanceSaved && <span className="saved-label" style={{ display: 'block', marginTop: '6px', color: '#bce94e', fontSize: '0.75rem' }}><Check size={14} /> Credits saved successfully!</span>}
        </section>
      </div>
      <section className="portal-card classroom-launch-list"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Student activity</span><h2>Recent lessons</h2></div></div>{learnerBookings.length ? learnerBookings.slice(0, 5).map((booking) => <BookingCard key={booking.id} booking={booking} showTeacher />) : <EmptyState icon={CalendarDays} title="No lessons yet" text="Student bookings will appear here." />}</section>
    </div>
  )
}

export function SupportInbox({ onUnreadChange }) {
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [thread, setThread] = useState(null)
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [translations, setTranslations] = useState({})
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesRef = useRef(null)
  const supportAttachmentInputRef = useRef(null)

  const loadConversations = useCallback(async () => {
    try {
      const rows = await fetchAdminSupportConversations()
      setConversations(rows)
      onUnreadChange?.(rows.reduce((total, item) => total + Number(item.unread_count || 0), 0))
      setError('')
      if (!selectedId && rows[0]) setSelectedId(rows[0].id)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [onUnreadChange, selectedId])

  const loadThread = useCallback(async (conversationId = selectedId) => {
    if (!conversationId) return
    try {
      const next = await fetchAdminSupportThread(conversationId)
      setThread(next)
      setError('')
      await loadConversations()
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [loadConversations, selectedId])

  useEffect(() => {
    let active = true
    const refresh = async () => {
      if (!active) return
      await loadConversations()
      if (selectedId) await loadThread(selectedId)
    }
    refresh()
    const interval = window.setInterval(refresh, 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [loadConversations, loadThread, selectedId])

  useEffect(() => {
    const element = messagesRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [thread?.messages?.length])

  useEffect(() => {
    if (!thread?.messages?.length) return undefined
    let active = true
    thread.messages.filter((message) => message.sender === 'parent' && !translations[message.id]).forEach(async (message) => {
      const translated = await translateSupportText(message.body, 'en')
      if (active && translated && translated.trim().toLowerCase() !== message.body.trim().toLowerCase()) {
        setTranslations((current) => ({ ...current, [message.id]: translated }))
      }
    })
    return () => { active = false }
  }, [thread?.messages, translations])

  const selectConversation = (conversationId) => {
    setSelectedId(conversationId)
    setThread(null)
    setDraft('')
    setAttachment(null)
    setTranslations({})
    if (supportAttachmentInputRef.current) supportAttachmentInputRef.current.value = ''
  }

  const reply = async (event) => {
    event.preventDefault()
    if (!selectedId || (!draft.trim() && !attachment)) return
    setSending(true)
    setError('')
    const messageText = draft.trim()
    try {
      if (attachment) await uploadAdminSupportAttachment(selectedId, attachment, messageText)
      else await sendAdminSupportMessage(selectedId, messageText)
      setDraft('')
      setAttachment(null)
      if (supportAttachmentInputRef.current) supportAttachmentInputRef.current.value = ''
      await loadThread(selectedId)

      // Trigger the bilingual secure email notification via Supabase Edge Function!
      if (cloudSyncEnabled() && supabase) {
        try {
          await supabase.functions.invoke('support-notification', {
            body: {
              conversationId: selectedId,
              messageBody: messageText || "Shared a support file attachment."
            }
          });
        } catch (notiError) {
          console.warn("Support email notification failed to send:", notiError);
        }
      }
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  const chooseSupportAttachment = (event) => {
    const file = event.target.files?.[0] || null
    if (file && file.size > (3 * 1024 * 1024)) {
      setError('Keep support attachments under 3 MB.')
      event.target.value = ''
      return
    }
    setAttachment(file)
    setError('')
  }

  const toggleStatus = async () => {
    if (!thread) return
    setSending(true)
    try {
      await setSupportConversationStatus(thread.id, thread.status === 'closed' ? 'open' : 'closed')
      await loadThread(thread.id)
    } catch (statusError) {
      setError(statusError.message)
    } finally {
      setSending(false)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = conversations.filter((item) => !normalizedQuery
    || item.parent_name?.toLowerCase().includes(normalizedQuery)
    || item.email?.toLowerCase().includes(normalizedQuery)
    || item.last_message?.toLowerCase().includes(normalizedQuery))

  return (
    <div className="portal-view support-inbox-view">
      <div className="portal-page-heading"><div><span className="portal-kicker">Parents & Teachers Care</span><h1>Parents/Teachers support inbox</h1><p>Reply to parents and teachers directly from TutorPro Online English.</p></div><span className="support-inbox-live"><i /> Live inbox</span></div>
      {error && <div className="portal-error" role="alert">{error}</div>}
      <section className="support-inbox">
        <aside className="support-conversation-list">
          <label><MessageSquareText size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search parent or email…" /></label>
          <div>{loading ? <div className="support-inbox-empty">Loading conversations…</div> : filtered.length ? filtered.map((conversation) => <button className={selectedId === conversation.id ? 'active' : ''} onClick={() => selectConversation(conversation.id)} key={conversation.id}><span>{initials(conversation.parent_name)}</span><div><strong>{conversation.parent_name}</strong><small>{conversation.last_message || conversation.email}</small><time>{new Date(conversation.updated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</time></div>{Number(conversation.unread_count) > 0 && <i>{conversation.unread_count}</i>}</button>) : <div className="support-inbox-empty"><MessageSquareText size={25} /><strong>No parent messages yet</strong><span>New website conversations will appear here.</span></div>}</div>
        </aside>

        <div className="support-admin-thread">
          {thread ? <>
            <header><div><span>{initials(thread.parentName)}</span><div><strong>{thread.parentName}</strong><small>{thread.email} · {/^zh/.test(thread.language) ? 'Chinese' : thread.language || 'English'}</small></div></div><button onClick={toggleStatus} disabled={sending}>{thread.status === 'closed' ? 'Reopen' : 'Close conversation'}</button></header>
            <div className="support-admin-messages" ref={messagesRef}>{thread.messages?.map((message) => <div className={`support-admin-message support-admin-message--${message.sender}`} key={message.id}><small>{message.sender === 'admin' ? 'TutorPro Admin' : thread.parentName}</small><p>{message.body}</p>{translations[message.id] && <p className="support-admin-translation"><Languages size={12} /> {translations[message.id]}</p>}{message.attachment && <button className="support-admin-attachment" onClick={() => downloadSupportAttachment(message.attachment).catch((downloadError) => setError(downloadError.message))}><Paperclip size={13} /><span>{message.attachment.name}</span><Download size={13} /></button>}<time>{new Date(message.createdAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div>)}</div>
            <form onSubmit={reply}>{attachment && <div className="support-admin-selected-file"><Paperclip size={13} /><span>{attachment.name}</span><button type="button" onClick={() => { setAttachment(null); if (supportAttachmentInputRef.current) supportAttachmentInputRef.current.value = '' }}><X size={13} /></button></div>}<label className="support-admin-file-button" title="Upload attachment"><FileUp size={18} /><input ref={supportAttachmentInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.jpg,.jpeg,.png,.webp,.pdf,.txt" onChange={chooseSupportAttachment} /></label><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); reply(event) } }} placeholder={/^zh/.test(thread.language) ? '用中文或英文回复家长…' : 'Reply to the parent…'} maxLength="1000" /><button type="submit" disabled={sending || (!draft.trim() && !attachment)}><Send size={17} /> {sending ? 'Sending…' : 'Send reply'}</button></form>
          </> : <div className="support-thread-placeholder"><MessageSquareText size={36} /><h2>Select a conversation</h2><p>Parent details and private messages will appear here.</p></div>}
        </div>
      </section>
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

function RemoveTeacherDialog({ teacher, onClose, onConfirm }) {
  const [confirmation, setConfirmation] = useState('')
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const teacherName = teacher.fullName || 'New Teacher'
  const matches = confirmation.trim().toLowerCase() === teacherName.trim().toLowerCase()

  const remove = async () => {
    if (!matches) return
    setRemoving(true)
    setError('')
    try {
      await onConfirm(teacher)
    } catch (removeError) {
      setError(removeError.message)
      setRemoving(false)
    }
  }

  return (
    <div className="portal-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="portal-dialog remove-student-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-teacher-title">
        <button className="portal-dialog__close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <span className="remove-student-dialog__icon"><Trash2 size={28} /></span>
        <span className="portal-kicker">Permanent administrator action</span>
        <h2 id="remove-teacher-title">Delete {teacherName}’s teacher profile?</h2>
        <p>This removes the teacher from TutorPro Online English and revokes dashboard access. This action cannot be undone.</p>
        <ul><li><Trash2 size={14} /> Teacher profile, photo and introduction video</li><li><Trash2 size={14} /> Assigned bookings and private classrooms</li><li><Trash2 size={14} /> Teacher dashboard access</li></ul>
        {error && <div className="portal-error" role="alert">{error}</div>}
        <label><span>Type <strong>{teacherName}</strong> to confirm</span><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={teacherName} /></label>
        <div className="portal-dialog__actions"><button className="portal-secondary-button" onClick={onClose} disabled={removing}>Keep teacher</button><button className="danger-confirm-button" onClick={remove} disabled={!matches || removing}><Trash2 size={16} /> {removing ? 'Deleting…' : 'Delete teacher profile'}</button></div>
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

export function AdminTeacherBookingGroups({ bookings, teachers, onStatusChange, onOpenTeacher, onEnterClassroom, onManageBooking }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]))
  const bookingTeacherIds = [...new Set(bookings.map((booking) => booking.teacherId).filter(Boolean))]
  const teacherOptions = bookingTeacherIds.map((teacherId) => teacherById.get(teacherId) || {
    id: teacherId,
    fullName: bookings.find((booking) => booking.teacherId === teacherId)?.teacherName || 'Former teacher',
    status: 'removed',
    teacher: {},
  })
  const teacherScopedBookings = teacherFilter === 'all' ? bookings : bookings.filter((booking) => booking.teacherId === teacherFilter)
  const visibleBookings = statusFilter === 'all' ? teacherScopedBookings : teacherScopedBookings.filter((booking) => booking.status === statusFilter)
  const groupedBookings = visibleBookings.reduce((groups, booking) => {
    const teacherId = booking.teacherId || 'unassigned'
    const current = groups.get(teacherId) || []
    current.push(booking)
    groups.set(teacherId, current)
    return groups
  }, new Map())
  const statusCount = (status) => status === 'all' ? teacherScopedBookings.length : teacherScopedBookings.filter((booking) => booking.status === status).length

  return (
    <>
      <section className="portal-card admin-booking-filter-card">
        <div className="admin-booking-filterbar"><label><span>Teacher profile</span><select value={teacherFilter} onChange={(event) => setTeacherFilter(event.target.value)}><option value="all">All teachers ({bookings.length})</option>{teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName} ({bookings.filter((booking) => booking.teacherId === teacher.id).length})</option>)}</select></label><div><span>Booking status</span><div className="booking-status-filters" role="group" aria-label="Filter bookings by status">{BOOKING_STATUS_OPTIONS.map((option) => <button type="button" key={option.id} className={`booking-status-filter booking-status-filter--${option.id} ${statusFilter === option.id ? 'active' : ''}`} onClick={() => setStatusFilter(option.id)}><span>{option.label}</span><strong>{statusCount(option.id)}</strong></button>)}</div></div></div>
      </section>
      <div className="admin-teacher-booking-groups">
        {Array.from(groupedBookings.entries()).map(([teacherId, teacherBookings]) => {
          const teacher = teacherById.get(teacherId)
          const teacherName = teacher?.fullName || teacherBookings[0]?.teacherName || 'Unassigned teacher'
          const profile = teacher?.teacher || {}
          const allTeacherBookings = bookings.filter((booking) => booking.teacherId === teacherId)
          return <section className="portal-card admin-teacher-booking-group" key={teacherId}><header><ProfilePhoto accountId={teacherId} name={teacherName} className="admin-booking-teacher-photo" /><div className="admin-teacher-booking-profile"><div><StatusBadge status={teacher?.status || 'removed'} /><span>Teacher booking profile</span></div><h2>{teacherName}</h2><p>{profile.specialization || 'Teacher profile unavailable'} · {Number(profile.experience) || 0} years experience</p></div><dl><div><dt>Shown</dt><dd>{teacherBookings.length}</dd></div><div><dt>Total</dt><dd>{allTeacherBookings.length}</dd></div><div><dt>Completed</dt><dd>{allTeacherBookings.filter((booking) => booking.status === 'completed').length}</dd></div></dl>{teacher && onOpenTeacher && <button type="button" className="admin-open-teacher-profile" onClick={() => onOpenTeacher(teacher.id)}><Eye size={15} /> Open profile</button>}</header><div className="admin-teacher-booking-list">{teacherBookings.map((booking) => <BookingCard key={booking.id} booking={booking} showStudent onEnterClassroom={onEnterClassroom} onManageBooking={onManageBooking} actions={<label className="booking-status-control"><span>Status</span><select className="booking-status-select" value={booking.status} onChange={(event) => onStatusChange(booking.id, event.target.value)}>{BOOKING_STATUS_OPTIONS.filter((option) => option.id !== 'all').map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>} />)}</div></section>
        })}
        {!visibleBookings.length && <section className="portal-card"><EmptyState icon={CalendarCheck2} title={`No ${statusFilter === 'all' ? '' : `${statusFilter} `}bookings found`} text="Choose another teacher or booking status to see matching lessons." /></section>}
      </div>
    </>
  )
}


export function AdminAnnouncementsPanel() {
  const [target, setTarget] = useState('ALL')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [campaignLog, setCampaignLog] = useState(readCampaignLog)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [autoTranslate, setAutoTranslate] = useState(true)
  const stats = campaignStats(campaignLog)

  const applyMarketingTemplate = (templateId) => {
    setSelectedTemplateId(templateId)
    const template = MARKETING_TEMPLATES.find((item) => item.id === templateId)
    if (!template) return
    setTarget(template.audience)
    setSubject(template.subject)
    setBody(template.body)
    setError('')
    setMessage('')
  }

  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) {
      setError('Please fill out both the subject and the announcement body!')
      return
    }
    setSending(true)
    setError('')
    setMessage('')
    try {
      const cleanSubject = subject.trim()
      const cleanBody = body.trim()

      // Work out which languages the audience actually needs, based on the
      // country saved from each account's registration IP.
      let translations = {}
      let languageNote = ''
      if (autoTranslate) {
        const audience = getAccounts().filter((item) => {
          const role = String(item.role || '').toUpperCase()
          if (role === 'ADMIN') return false
          if (target === 'TEACHER') return role === 'TEACHER'
          if (target === 'STUDENT') return role === 'STUDENT'
          return true
        })
        const needed = [...new Set(audience.map((item) => languageForCountry(item.registrationCountry)))]
          .filter((code) => code && code !== 'en')
        if (needed.length) {
          setMessage(`Translating into ${needed.length} language${needed.length > 1 ? 's' : ''}…`)
          translations = await translateAnnouncementBatch(cleanSubject, cleanBody, needed)
          const done = Object.keys(translations)
          if (done.length) languageNote = ` Translated into ${done.map((code) => LANGUAGE_LABELS[code] || code).join(', ')}.`
        }
      }

      const { supabase } = await import('./supabaseClient.js')
      const { data, error: invokeError } = await supabase.functions.invoke('mass-announcement', {
        body: {
          subject: cleanSubject,
          body: cleanBody,
          targetRole: target,
          // The email function can send each person their own language when
          // it supports it; the English original always remains included.
          autoTranslate,
          translations,
        },
      })
      if (invokeError || data?.error) throw new Error(invokeError?.message || data?.error || 'Failed to send bulk announcement')
      const recipients = data?.recipients || 0

      // Also publish it inside the dashboard, where it translates live from
      // the reader's current IP language.
      saveAnnouncement({ subject: cleanSubject, body: cleanBody, target, translations })

      setMessage(`🎉 Successfully sent campaign to ${recipients} active registered emails!${languageNote} It is also posted on their dashboards.`)
      setCampaignLog(saveCampaignLog({ target, subject: cleanSubject, templateId: selectedTemplateId, recipients, status: 'sent' }))
      setSubject('')
      setBody('')
      setSelectedTemplateId('')
    } catch (err) {
      setError(err.message || 'Announcement broadcast failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="portal-view marketing-view">
      <div className="portal-page-heading"><div><span className="portal-kicker">Marketing automation</span><h1>Email campaigns & announcements</h1><p>Use ready-made campaign templates for booking reminders, payments, homework, referrals, feedback and reactivation.</p></div></div>
      <div className="portal-stat-grid marketing-stat-grid"><article><span className="stat-icon stat-icon--blue"><Bell size={21} /></span><div><small>Total campaigns</small><strong>{stats.total}</strong><em>Logged locally</em></div></article><article><span className="stat-icon stat-icon--green"><GraduationCap size={21} /></span><div><small>Parent/student</small><strong>{stats.student}</strong><em>Student audience</em></div></article><article><span className="stat-icon stat-icon--orange"><UserCheck size={21} /></span><div><small>Teacher</small><strong>{stats.teacher}</strong><em>Teacher audience</em></div></article><article><span className="stat-icon stat-icon--gold"><Users size={21} /></span><div><small>All users</small><strong>{stats.all}</strong><em>Whole community</em></div></article></div>
      <section className="portal-card marketing-template-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Campaign templates</span><h2>Choose a ready-made automation message</h2></div></div><div className="marketing-template-grid">{MARKETING_TEMPLATES.map((template) => <button key={template.id} type="button" className={selectedTemplateId === template.id ? 'active' : ''} onClick={() => applyMarketingTemplate(template.id)}><strong>{template.name}</strong><span>{template.audience}</span></button>)}</div></section>
      <section className="portal-card marketing-compose-card">
        <form onSubmit={handleSendAnnouncement}>
          <label><span>Target audience</span><select value={target} onChange={(e) => setTarget(e.target.value)}><option value="ALL">All Registered Emails (Teachers & Parents)</option><option value="TEACHER">Teachers Only</option><option value="STUDENT">Students/Parents Only</option></select></label>
          <label><span>Email subject</span><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. TutorPro Online English Holiday Schedule Update" /></label>
          <label><span>Campaign body</span><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your campaign details here..." /></label>
          <label className="announcement-translate-toggle"><input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} /><span><Globe2 size={15} /> <b>Auto-translate for each recipient</b><small>Write in English. Each parent and teacher also gets it in their own language, based on the country detected from their IP address. The English original is always included underneath.</small></span></label>
          {error && <div className="portal-error" role="alert">{error}</div>}
          {message && <div className="portal-success" role="status"><CheckCircle2 size={17} /><div><strong>Campaign sent</strong><span>{message}</span></div></div>}
          <button className="portal-primary-button" type="submit" disabled={sending}>{sending ? <RotateCcw className="animate-spin w-4 h-4" /> : <Bell size={15} />} {sending ? 'Broadcasting emails...' : 'Send campaign email'}</button>
        </form>
      </section>
      <section className="portal-card marketing-log-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Recent campaigns</span><h2>Campaign history</h2></div></div>{campaignLog.length ? <div className="marketing-log-list">{campaignLog.slice(0, 10).map((entry) => <article key={entry.id}><span>{entry.status === 'sent' ? '✅' : '✉️'}</span><div><strong>{entry.subject}</strong><small>{entry.target} · {entry.recipients || 0} recipients · {new Date(entry.createdAt).toLocaleString('en')}</small></div></article>)}</div> : <EmptyState icon={Bell} title="No campaigns sent yet" text="Choose a template and send your first announcement." />}</section>
    </div>
  )
}

export class AdminRenderErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', background: '#090510', border: '2px solid #ff4d4d', borderRadius: '12px', color: '#fff', margin: '20px', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#ff4d4d', fontWeight: 'bold', marginBottom: '10px' }}>⚠️ Admin Portal Render Exception</h2>
          <p style={{ color: '#b9adc7', fontSize: '0.9rem', marginBottom: '15px' }}>
            A rendering error occurred inside the Admin Dashboard workspace. Stack trace:
          </p>
          <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: '#ff4d4d', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack || this.state.error?.message}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ background: '#bce94e', color: '#090510', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Try Again</button>
        </div>
      )
    }
    return this.props.children
  }
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
  const [managedBooking, setManagedBooking] = useState(null)
  const [studentToRemove, setStudentToRemove] = useState(null)
  const [teacherToRemove, setTeacherToRemove] = useState(null)
  const [cloudStatus, setCloudStatus] = useState(cloudSyncEnabled() ? 'connecting' : 'local')
  const [cloudError, setCloudError] = useState('')
  const [adminActionError, setAdminActionError] = useState('')
  const [processingAccountId, setProcessingAccountId] = useState('')
  const [supportUnread, setSupportUnread] = useState(0)
  const [initialSupportId, setInitialSupportId] = useState('')
  const [adminBookingView, setAdminBookingView] = useState('list') // list, calendar
  const [selectedCalendarTeacherId, setSelectedCalendarTeacherId] = useState('')
  const [adminCalendarWeek, setAdminCalendarWeek] = useState(0)
  const [adminReserveSlot, setAdminReserveSlot] = useState(null)
  const [adminReserveDuration, setAdminReserveDuration] = useState('25')
  const [adminReserveFocus, setAdminReserveFocus] = useState('Speaking with confidence')
  const [adminReserveNote, setAdminReserveNote] = useState('Reserved by administrator')
  const [adminReserveMessage, setAdminReserveMessage] = useState('')
  const [adminReserveError, setAdminReserveError] = useState('')
  const [adminReserving, setAdminReserving] = useState(false)

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
  const countryGroups = students.reduce((groups, student) => {
    const country = String(student.registrationCountry || '').toUpperCase()
    const key = /^[A-Z]{2}$/.test(country) ? country : 'UNKNOWN'
    const group = groups.get(key) || { code: key, families: 0, learners: 0 }
    group.families += 1
    group.learners += (student.children?.length || (student.child ? 1 : 0))
    groups.set(key, group)
    return groups
  }, new Map())
  const studentCountries = [...countryGroups.values()].sort((first, second) => second.learners - first.learners || first.code.localeCompare(second.code))
  const locatedStudentFamilies = studentCountries.filter((country) => country.code !== 'UNKNOWN').reduce((total, country) => total + country.families, 0)
  const bookings = getBookings()
  const bookingStats = getBookingStats()
  const pendingTeachers = teachers.filter((teacher) => teacher.status === 'pending').length
  const bookingProfile = studentProfiles.find((profile) => profile.learner.id === bookingStudentId) || studentProfiles[0] || null
  const bookingStudent = bookingProfile?.account || null
  const bookingLearner = bookingProfile?.learner || null
  const selectedCalendarTeacher = teachers.find((teacher) => teacher.id === selectedCalendarTeacherId) || teachers[0] || null
  const selectedTeacherBookings = selectedCalendarTeacher ? bookings.filter((booking) => booking.teacherId === selectedCalendarTeacher.id) : []
  const paymentTransactions = students.flatMap((student) => {
    const transactions = Array.isArray(student.paymentTransactions) ? student.paymentTransactions : student.latestPayment ? [student.latestPayment] : []
    return transactions.map((transaction) => ({ ...transaction, student }))
  })
  const uniquePaidOrders = new Set()
  const verifiedRevenue = paymentTransactions.reduce((sum, transaction) => {
    const key = transaction.orderId || transaction.captureId || `${transaction.student.id}-${transaction.paidAt || transaction.createdAt || Math.random()}`
    if (uniquePaidOrders.has(key)) return sum
    uniquePaidOrders.add(key)
    return sum + Number(transaction.amount || 0)
  }, 0)
  const studentsWithCredits = students.filter((student) => (student.paidLessonsBalance || 0) > 0)
  const studentsWithoutCredits = students.filter((student) => (student.paidLessonsBalance || 0) <= 0)
  const missingFeedbackBookings = bookings.filter((booking) => booking.status === 'completed' && !booking.teacherFeedback?.summary?.trim())
  const trialBookingsNeedingReview = bookings.filter((booking) => booking.isTrialClass && booking.status === 'completed' && !booking.trialEnrolled)
  const referralRows = [...students, ...teachers].map((profile) => ({ profile, stats: getReferralStats(profile, [...students, ...teachers]) }))
  const referralSuccessful = referralRows.reduce((sum, row) => sum + row.stats.successfulReferrals, 0)
  const referralPending = referralRows.reduce((sum, row) => sum + row.stats.pendingReferrals, 0)
  const teacherPayoutRows = teachers.map((teacher) => {
    const teacherBookings = bookings.filter((booking) => teacher.id === booking.teacherId)
    const rate = Number(teacher.teacher?.pesoRate || 350)
    const regularCompleted = teacherBookings.filter((booking) => !booking.isTrialClass && ['completed', 'absent'].includes(booking.status))
    const regularSlots = regularCompleted.reduce((total, booking) => total + ((Number(booking.duration) || 25) / 25), 0)
    const trialCompleted = teacherBookings.filter((booking) => booking.isTrialClass && ['completed', 'absent'].includes(booking.status))
    const trialEnrolled = trialCompleted.filter((booking) => booking.trialEnrolled).length
    const trialNotEnrolled = trialCompleted.filter((booking) => !booking.trialEnrolled).length
    const payout = (regularSlots * rate) + (trialEnrolled * 100) + (trialNotEnrolled * 40)
    return { teacher, payout, regularSlots, trialEnrolled, trialNotEnrolled }
  }).sort((a, b) => b.payout - a.payout)
  const estimatedTeacherPayout = teacherPayoutRows.reduce((sum, row) => sum + row.payout, 0)
  const adminActionItems = [
    { id: 'zero-credits', label: 'Students with 0 credits', count: studentsWithoutCredits.length, action: () => setActive('students'), tone: 'orange' },
    { id: 'missing-feedback', label: 'Completed classes missing feedback', count: missingFeedbackBookings.length, action: () => setActive('bookings'), tone: 'pink' },
    { id: 'trial-review', label: 'Trials not marked enrolled', count: trialBookingsNeedingReview.length, action: () => setActive('bookings'), tone: 'gold' },
    { id: 'pending-bookings', label: 'Pending bookings', count: bookingStats.pending, action: () => setActive('bookings'), tone: 'blue' },
  ]

  const exportAdminCommandCenterCsv = () => {
    const lines = [
      ['Metric', 'Value'],
      ['Verified revenue USD', verifiedRevenue.toFixed(2)],
      ['Estimated teacher payout PHP', estimatedTeacherPayout.toFixed(2)],
      ['Students with credits', studentsWithCredits.length],
      ['Students with zero credits', studentsWithoutCredits.length],
      ['Successful referrals', referralSuccessful],
      ['Pending referrals', referralPending],
      ['Missing feedback bookings', missingFeedbackBookings.length],
      ['Trial bookings needing review', trialBookingsNeedingReview.length],
    ]
    const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tutorpro-admin-command-center-${today()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (teachers.length && !selectedCalendarTeacherId) {
      setSelectedCalendarTeacherId(teachers[0].id)
    }
  }, [teachers, selectedCalendarTeacherId])

  useEffect(() => {
    setAdminReserveSlot(null)
    setAdminReserveError('')
    setAdminReserveMessage('')
  }, [selectedCalendarTeacherId, bookingStudentId, adminReserveDuration, adminCalendarWeek])

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
        mergeCloudAccounts(profiles, { reconcile: true })
        mergeCloudBookings(sharedBookings, { reconcile: true })
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

  useEffect(() => {
    if (!cloudSyncEnabled()) return undefined
    let active = true
    const refreshSupportCount = async () => {
      try {
        const conversations = await fetchAdminSupportConversations()
        if (active) setSupportUnread(conversations.reduce((total, item) => total + Number(item.unread_count || 0), 0))
      } catch {
        // The support SQL may not be installed yet; the inbox shows setup guidance when opened.
      }
    }
    refreshSupportCount()
    const interval = window.setInterval(refreshSupportCount, 8000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const refresh = () => setVersion((value) => value + 1)
  const setStatus = async (accountId, status) => {
    setAdminActionError('')
    setProcessingAccountId(accountId)
    const previousStatus = getAccountById(accountId)?.status
    try {
      const updated = updateAccount(accountId, { status })
      if (cloudSyncEnabled()) await withTimeout(updateCloudProfile(updated), 8000, 'Supabase did not confirm the status update in time.')
      if (updated.role === 'teacher') {
        getBookings({ teacherId: accountId }).forEach((booking) => updateBooking(booking.id, { teacherName: updated.fullName || booking.teacherName || 'Teacher' }))
      }
      const profiles = cloudSyncEnabled() ? await withTimeout(fetchCloudProfiles(), 8000, 'Supabase profile refresh timed out.') : []
      if (profiles.length) mergeCloudAccounts(profiles, { reconcile: true })
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

  const launchSupportChat = async (email, fullName) => {
    setAdminActionError('')
    try {
      if (cloudSyncEnabled()) {
        const { supabase } = await import('./supabaseClient.js')
        if (supabase) {
          // Fetch existing support conversations
          const { data: convs, error: fetchErr } = await supabase.from('support_conversations').select('*')
          if (fetchErr) throw fetchErr
          
          let found = convs?.find(c => c.parent_email?.toLowerCase() === email?.toLowerCase() || c.parent_name?.toLowerCase() === fullName?.toLowerCase());
          if (!found) {
            const { data, error: createErr } = await supabase.rpc('create_support_conversation', {
              parent_name: fullName,
              parent_email: email,
              visitor_language: 'en',
              first_message: `Admin initiated chat with ${fullName}.`,
            });
            if (createErr) throw createErr;
            setInitialSupportId(data.conversationId);
          } else {
            setInitialSupportId(found.id);
          }
        }
      } else {
        // Local mode chat fallback
        const localConvs = JSON.parse(localStorage.getItem('tutorpro_local_support_threads_v1') || '[]')
        let found = localConvs.find(c => c.email?.toLowerCase() === email?.toLowerCase())
        if (!found) {
          const newConv = {
            id: 'local-conv-' + crypto.randomUUID(),
            parentName: fullName,
            email: email,
            messages: [{ id: crypto.randomUUID(), sender: 'admin', body: `Admin initiated chat with ${fullName}.`, createdAt: new Date().toISOString() }],
            status: 'open',
            createdAt: new Date().toISOString()
          }
          localConvs.push(newConv)
          localStorage.setItem('tutorpro_local_support_threads_v1', JSON.stringify(localConvs))
          setInitialSupportId(newConv.id)
        } else {
          setInitialSupportId(found.id)
        }
      }
      
      setActive('support');
      setManagedAccount(null);
      setManagedLearnerId('');
    } catch (e) {
      setAdminActionError(`Could not initiate chat: ${e.message}`);
    }
  }

  const openManagedTeacher = (teacherId) => {
    setAdminActionError('')
    let teacher = getAccountById(teacherId)
    if (!teacher) {
      const fallbackTeacher = teachers.find(t => t.id === teacherId)
      if (fallbackTeacher) teacher = fallbackTeacher
    }
    if (!teacher) {
      const bookingForName = bookings.find(b => b.teacherId === teacherId)
      teacher = {
        id: teacherId,
        role: 'teacher',
        status: 'approved',
        fullName: bookingForName?.teacherName || 'TutorPro Online English Teacher',
        teacher: {
          specialization: 'Both Curricula',
          bio: 'Teacher profile setup is loaded from sync. Configure their local rates below.',
          education: 'Verified ESL Instructor',
          experience: 5,
          languages: 'English',
          pesoRate: 350
        }
      }
    }
    
    // Self-healing: Force role to lowercase 'teacher' to correct any old browser storage caches!
    if (teacher) {
      teacher.role = 'teacher'
      if (!teacher.teacher) {
        teacher.teacher = {
          specialization: 'Both Curricula',
          bio: 'Teacher profile setup is loaded from sync. Configure their local rates below.',
          education: 'Verified ESL Instructor',
          experience: 5,
          languages: 'English',
          pesoRate: 350
        }
      }
    }

    if (!teacher || teacher.role?.toLowerCase() !== 'teacher') {
      setAdminActionError('Teacher profile could not be loaded from this browser. Refresh the registrations list and try again.')
      return
    }
    setManagedLearnerId('')
    setManagedAccount(teacher)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { window.scrollTo(0, 0) }

    if (cloudSyncEnabled()) {
      withTimeout(fetchCloudProfiles(), 8000, 'Cloud refresh timed out.')
        .then((profiles) => {
          if (profiles.length) mergeCloudAccounts(profiles, { reconcile: true })
          const refreshed = getAccountById(teacherId)
          if (refreshed?.role?.toLowerCase() === 'teacher') setManagedAccount(refreshed)
        })
        .catch(() => {
          // The already-open local profile remains available to the administrator.
        })
    }
  }

  const openManagedStudent = (studentId, learnerId) => {
    setAdminActionError('')
    let student = getAccountById(studentId)
    if (!student) {
      const fallbackStudent = students.find(s => s.id === studentId)
      if (fallbackStudent) student = fallbackStudent
    }
    if (!student) {
      const bookingForName = bookings.find(b => b.studentId === studentId)
      student = {
        id: studentId,
        role: 'student',
        status: 'active',
        parentName: bookingForName?.learnerName || 'TutorPro Parent',
        fullName: bookingForName?.learnerName || 'TutorPro Student',
        children: [{
          id: learnerId || crypto.randomUUID(),
          name: bookingForName?.learnerName || 'Student',
          goal: 'Speaking with confidence',
          frequency: '1–2 weekly',
          accessStatus: 'active',
          progress: 18,
          streak: 0,
          lessonsCompleted: 0,
          achievements: []
        }]
      }
      student.child = student.children[0]
    }
    
    // Self-healing: Force role to lowercase 'student' to correct any old browser storage caches!
    if (student) {
      student.role = 'student'
      if (!student.children || !student.children.length) {
        student.children = [{
          id: learnerId || crypto.randomUUID(),
          name: student.fullName || 'Student',
          goal: 'Speaking with confidence',
          frequency: '1–2 weekly',
          accessStatus: 'active',
          progress: 18,
          streak: 0,
          lessonsCompleted: 0,
          achievements: []
        }]
        student.child = student.children[0]
      }
    }

    if (!student || student.role?.toLowerCase() !== 'student') {
      setAdminActionError('Student profile could not be loaded from this browser. Refresh the registrations list and try again.')
      return
    }
    setManagedLearnerId(learnerId || student.child?.id || '')
    setManagedAccount(student)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { window.scrollTo(0, 0) }

    if (cloudSyncEnabled()) {
      withTimeout(fetchCloudProfiles(), 8000, 'Cloud refresh timed out.')
        .then((profiles) => {
          if (profiles.length) mergeCloudAccounts(profiles, { reconcile: true })
          const refreshed = getAccountById(studentId)
          if (refreshed?.role?.toLowerCase() === 'student') setManagedAccount(refreshed)
        })
        .catch(() => {
          // The already-open local profile remains available to the administrator.
        })
    }
  }
  const setLearnerGoal = async (accountId, learnerId, goal) => {
    const normalizedGoal = goal.trim()
    if (normalizedGoal.length < 3 || normalizedGoal.length > 180) throw new Error('Type a learning goal between 3 and 180 characters.')
    setAdminActionError('')
    setProcessingAccountId(accountId)
    const previous = getAccountById(accountId)
    try {
      const updated = updateStudentProfile(accountId, { goal: normalizedGoal, goalManagedByAdmin: true }, learnerId)
      if (cloudSyncEnabled()) await withTimeout(updateCloudProfile(updated), 8000, 'Supabase did not confirm the learning goal in time.')
      setManagedAccount((current) => current?.id === accountId ? updated : current)
      refresh()
      return updated
    } catch (goalUpdateError) {
      const reverted = previous ? updateLocalAccount(accountId, { children: previous.children, child: previous.child }) : null
      if (reverted) setManagedAccount((current) => current?.id === accountId ? reverted : current)
      const message = `${goalUpdateError.message} The learning goal was not changed.`
      setAdminActionError(message)
      throw new Error(message, { cause: goalUpdateError })
    } finally {
      setProcessingAccountId('')
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
  const removeTeacherRegistration = async (teacher) => {
    setAdminActionError('')
    setProcessingAccountId(teacher.id)
    try {
      await withTimeout(removeTeacherAccount(teacher.id), 10000, 'Teacher deletion was not confirmed in time.')
      removeTeacherBookingData(teacher.id)
      await deleteProfileMediaOwner(teacher.id).catch(() => 0)
      if (managedAccount?.id === teacher.id) setManagedAccount(null)
      setTeacherToRemove(null)
      setActive('teachers')
      refresh()
    } catch (removeError) {
      setAdminActionError(`${removeError.message} The teacher profile was not deleted.`)
      throw removeError
    } finally {
      setProcessingAccountId('')
    }
  }

  const reserveAdminTeacherSlot = async () => {
    setAdminReserveError('')
    setAdminReserveMessage('')
    if (!selectedCalendarTeacher) {
      setAdminReserveError('Select a teacher first.')
      return
    }
    if (!bookingStudent || !bookingLearner || bookingLearner.incomplete) {
      setAdminReserveError('Select a complete student profile to reserve this slot.')
      return
    }
    if (!adminReserveSlot?.date || !adminReserveSlot?.time) {
      setAdminReserveError('Click an available slot on the teacher schedule first.')
      return
    }
    setAdminReserving(true)
    try {
      let booking = createBooking({
        teacherId: selectedCalendarTeacher.id,
        teacherName: selectedCalendarTeacher.fullName,
        studentId: bookingStudent.id,
        learnerId: bookingLearner.id,
        learnerName: bookingLearner.name,
        learnerProfile: bookingLearner,
        date: adminReserveSlot.date,
        time: adminReserveSlot.time,
        duration: Number(adminReserveDuration),
        focus: adminReserveFocus,
        note: adminReserveNote,
      })
      booking = updateBooking(booking.id, { status: 'confirmed', reservedByAdmin: true })
      if (cloudSyncEnabled()) await withTimeout(syncBookingNow(booking), 10000, 'The reserved booking did not sync in time.')
      void notifyBookingParticipants(booking, 'confirmed')
      setManagedBooking(booking)
      setAdminReserveSlot(null)
      setAdminReserveMessage(`Reserved ${formatLessonDate(booking.date, booking.time, true)} at ${formatTime(booking.time)} for ${bookingLearner.name}.`)
      refresh()
    } catch (reserveError) {
      setAdminReserveError(reserveError.message)
    } finally {
      setAdminReserving(false)
    }
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
    if (['confirmed', 'cancelled', 'declined'].includes(status)) {
      syncBookingNow(updatedBooking)
        .then(() => notifyBookingParticipants(updatedBooking, status === 'confirmed' ? 'confirmed' : 'cancelled'))
        .catch(() => {})
    } else if (['ongoing', 'absent'].includes(status)) syncBookingNow(updatedBooking).catch(() => {})
    refresh()
  }

  const unbookCalendarClass = async (booking) => {
    const updated = updateBooking(booking.id, { status: 'cancelled', cancelledBy: 'admin', cancelledAt: new Date().toISOString() })
    refresh()
    if (cloudSyncEnabled()) await withTimeout(syncBookingNow(updated), 10000, 'The shared booking database did not confirm the cancellation in time.')
    void notifyBookingParticipants(updated, 'cancelled')
    return updated
  }

  const nav = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'teachers', label: 'Teachers', icon: UserCheck, badge: pendingTeachers },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'support', label: 'Parents/Teachers support', icon: MessageSquareText, badge: supportUnread },
    { id: 'reviews', label: 'Parent reviews', icon: Star },
    { id: 'referrals', label: 'Referral growth', icon: Award },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'bookings', label: 'All bookings', icon: CalendarCheck2, badge: bookingStats.pending },
    { id: 'courseware', label: 'Courseware', icon: BookOpen },
    { id: 'payments', label: 'Payments', icon: Coins },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'homework', label: 'Homework', icon: BookOpen },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'profile', label: 'Admin account', icon: ShieldCheck },
  ]

  const exitManagedDashboard = () => {
    setManagedAccount(null)
    setManagedLearnerId('')
    refresh()
  }

  if (classroomBooking) return <OnlineClassroom booking={classroomBooking} account={account} onExit={() => setClassroomBooking(null)} />

  const managedRole = managedAccount?.role?.toLowerCase()

  if (managedRole === 'teacher') {
    return (
      <AdminRenderErrorBoundary>
        <PortalShell account={account} role="admin" active="teachers" onActive={(section) => { exitManagedDashboard(); setActive(section) }} onHome={onHome} onLogout={onLogout} navItems={nav}>
          <RoleErrorBoundary onBack={exitManagedDashboard}>
            <AdminTeacherProfile teacher={managedAccount} onBack={exitManagedDashboard} onStatusChange={setStatus} onRemove={setTeacherToRemove} processing={processingAccountId === managedAccount.id} error={adminActionError} onOpenChat={launchSupportChat} />
          </RoleErrorBoundary>
          {teacherToRemove && <RemoveTeacherDialog teacher={teacherToRemove} onClose={() => setTeacherToRemove(null)} onConfirm={removeTeacherRegistration} />}
        </PortalShell>
      </AdminRenderErrorBoundary>
    )
  }

  if (managedRole === 'student') {
    return (
      <AdminRenderErrorBoundary>
        <PortalShell account={account} role="admin" active="students" onActive={(section) => { exitManagedDashboard(); setActive(section) }} onHome={onHome} onLogout={onLogout} navItems={nav}>
          <RoleErrorBoundary onBack={exitManagedDashboard}>
            <AdminStudentProfile key={`${managedAccount.id}-${managedLearnerId}`} account={managedAccount} learnerId={managedLearnerId} onBack={exitManagedDashboard} onStatusChange={setLearnerStatus} onGoalChange={setLearnerGoal} onRemove={setStudentToRemove} processing={processingAccountId === managedAccount.id} error={adminActionError} teachers={teachers} onOpenChat={launchSupportChat} />
          </RoleErrorBoundary>
          {studentToRemove && <RemoveStudentDialog profile={studentToRemove} onClose={() => setStudentToRemove(null)} onConfirm={removeStudentRegistration} />}
        </PortalShell>
      </AdminRenderErrorBoundary>
    )
  }

  return (
    <PortalShell account={account} role="admin" active={active} onActive={setActive} onHome={onHome} onLogout={onLogout} navItems={nav}>
      {adminActionError && <div className="portal-error admin-action-error" role="alert">{adminActionError}</div>}
      {active === 'overview' && (
        <div className="portal-view">
          <section className="admin-welcome"><div><span className="portal-kicker">TutorPro Online English command centre</span><span className={`admin-live-sync admin-live-sync--${cloudStatus}`}><i /> {cloudStatus === 'connected' ? 'Supabase live sync' : cloudStatus === 'connecting' ? 'Connecting shared database' : cloudStatus === 'error' ? 'Cloud sync needs attention' : 'This-browser sync'}</span><h1>Everything important, under control.</h1><p>New student and teacher registrations appear automatically with complete profile controls.</p></div><span className="admin-welcome__shield"><ShieldCheck size={34} /></span></section>
          {cloudError && <div className="portal-error admin-cloud-error" role="alert">{cloudError} Check the Supabase setup and administrator membership.</div>}
          <div className="portal-stat-grid">
            <article><span className="stat-icon stat-icon--blue"><GraduationCap size={21} /></span><div><small>Student profiles</small><strong>{studentProfiles.length}</strong><em>{students.length} family accounts</em></div></article>
            <article><span className="stat-icon stat-icon--orange"><Users size={21} /></span><div><small>Teacher profiles</small><strong>{teachers.length}</strong><em>{pendingTeachers} pending review</em></div></article>
            <article><span className="stat-icon stat-icon--gold"><CalendarDays size={21} /></span><div><small>Total bookings</small><strong>{bookingStats.total}</strong><em>{bookingStats.pending} pending</em></div></article>
            <article><span className="stat-icon stat-icon--green"><CheckCircle2 size={21} /></span><div><small>Lessons completed</small><strong>{bookingStats.completed}</strong><em>Across TutorPro Online English</em></div></article>
          </div>

          <section className="admin-command-center">
            <div className="admin-command-center__header">
              <div><span className="portal-kicker">Command center</span><h2>Growth, revenue and action priorities</h2><p>High-priority operational signals for payments, referrals, teacher payouts, feedback and student credits.</p></div>
              <button className="portal-secondary-button" onClick={exportAdminCommandCenterCsv}><Download size={16} /> Export report</button>
            </div>
            <div className="admin-command-center__metrics">
              <article><span>Revenue</span><strong>${verifiedRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>Verified PayPal payments</small></article>
              <article><span>Teacher payout</span><strong>₱{estimatedTeacherPayout.toLocaleString()}</strong><small>Estimated completed/absent classes</small></article>
              <article><span>Paid students</span><strong>{studentsWithCredits.length}</strong><small>{studentsWithoutCredits.length} need credits</small></article>
              <article><span>Referrals</span><strong>{referralSuccessful}</strong><small>{referralPending} pending first package</small></article>
            </div>
            <div className="admin-command-center__body">
              <div className="admin-action-stack">
                {adminActionItems.map((item) => <button key={item.id} className={`admin-action-stack__item admin-action-stack__item--${item.tone}`} onClick={item.action}><strong>{item.count}</strong><span>{item.label}</span><ChevronRight size={16} /></button>)}
              </div>
              <div className="admin-payout-mini-list">
                <div><span className="portal-kicker">Teacher payout preview</span><h3>Top estimated payouts</h3></div>
                {teacherPayoutRows.slice(0, 4).map((row) => <article key={row.teacher.id}><span>{initials(row.teacher.fullName)}</span><div><strong>{row.teacher.fullName}</strong><small>{row.regularSlots} regular slots · {row.trialEnrolled} enrolled trials · {row.trialNotEnrolled} trials</small></div><b>₱{row.payout.toLocaleString()}</b></article>)}
                {!teacherPayoutRows.length && <small>No teacher payout data yet.</small>}
              </div>
            </div>
          </section>

          <div className="admin-overview-grid">
            <section className="portal-card admin-action-card"><div className="portal-card__heading portal-card__heading--small"><div><span className="portal-kicker">Needs attention</span><h2>Teacher approvals</h2></div><button className="portal-text-button" onClick={() => setActive('teachers')}>Manage all <ChevronRight size={15} /></button></div>{teachers.filter((teacher) => teacher.status === 'pending').slice(0, 4).map((teacher) => <div className="approval-row" key={teacher.id}><span>{initials(teacher.fullName)}</span><div><strong>{teacher.fullName}</strong><small>{teacher.teacher.specialization} · {teacher.teacher.experience} years</small></div><button type="button" onClick={() => setStatus(teacher.id, 'approved')} disabled={processingAccountId === teacher.id}><Check size={15} /> {processingAccountId === teacher.id ? 'Saving…' : 'Approve'}</button></div>)}{!pendingTeachers && <EmptyState icon={UserCheck} title="No profiles waiting" text="New teacher applications will appear here." />}</section>
            <section className="portal-card admin-health-card"><span className="portal-kicker">Platform health</span><h2>Booking flow</h2><div className="health-donut" style={{ '--health': bookingStats.total ? `${Math.round((bookingStats.completed / bookingStats.total) * 100)}%` : '0%' }}><span><strong>{bookingStats.total ? Math.round((bookingStats.completed / bookingStats.total) * 100) : 0}%</strong><small>completed</small></span></div><dl><div><dt><i className="dot dot--orange" />Pending</dt><dd>{bookingStats.pending}</dd></div><div><dt><i className="dot dot--blue" />Confirmed</dt><dd>{bookingStats.confirmed}</dd></div><div><dt><i className="dot dot--green" />Completed</dt><dd>{bookingStats.completed}</dd></div></dl></section>
          </div>
        </div>
      )}

      {active === 'teachers' && (
        <div className="portal-view"><div className="portal-page-heading"><div><span className="portal-kicker">Team management</span><h1>Teachers</h1><p>Add teachers, review credentials and control access to their dashboard.</p></div><button className="portal-primary-button" onClick={() => setShowAddTeacher(true)}><Plus size={17} /> Add teacher</button></div><section className="portal-card admin-table-card"><div className="admin-table admin-table--teachers"><div className="admin-table__head"><span>Teacher</span><span>Profile</span><span>Credentials</span><span>Status</span><span>Controls</span></div>{teachers.map((teacher) => <div className="admin-table__row" key={teacher.id}><div className="table-person"><span>{initials(teacher.fullName)}</span><div><strong>{teacher.fullName}</strong><small>{teacher.loginId || teacher.email}</small></div></div><div><strong>{teacher.teacher.specialization}</strong><small>{teacher.teacher.experience} years · {teacher.teacher.languages}</small></div><div><strong>{teacher.teacher.credentials?.length || 0} files</strong><small>{teacher.teacher.credentials?.join(', ') || teacher.teacher.education}</small></div><div><StatusBadge status={teacher.status} /></div><div className="table-actions"><button type="button" className="table-access-button" onClick={() => openManagedTeacher(teacher.id)} disabled={processingAccountId === teacher.id} title="Access teacher dashboard"><Eye size={15} /> {processingAccountId === teacher.id ? 'Opening…' : 'Open'}</button>{teacher.status !== 'approved' && <button type="button" className="table-action table-action--approve" onClick={() => setStatus(teacher.id, 'approved')} disabled={processingAccountId === teacher.id} title="Approve and synchronize teacher"><UserCheck size={16} /></button>}{teacher.status !== 'rejected' && !teacher.systemProfile && <button type="button" className="table-action table-action--reject" onClick={() => setStatus(teacher.id, 'rejected')} disabled={processingAccountId === teacher.id} title="Reject teacher"><XCircle size={16} /></button>}{teacher.status === 'approved' && <button type="button" className="table-action table-action--suspend" onClick={() => setStatus(teacher.id, 'suspended')} disabled={processingAccountId === teacher.id} title="Suspend teacher"><Ban size={16} /></button>}{!teacher.systemProfile && <button type="button" className="table-action table-action--delete" onClick={() => setTeacherToRemove(teacher)} disabled={processingAccountId === teacher.id} title={`Delete ${teacher.fullName}'s teacher profile`}><Trash2 size={16} /></button>}</div></div>)}</div></section></div>
      )}

      {active === 'students' && (
        <div className="portal-view"><div className="portal-page-heading"><div><span className="portal-kicker">Learner community</span><h1>Students</h1><p>Manage every learner’s profile, access status and dashboard.</p></div></div><section className="student-world-card"><div className="student-world-card__intro"><span className="student-world-card__orb"><Globe2 size={25} /></span><div><span className="portal-kicker">TutorPro around the world</span><h2>Your learning community, at a glance.</h2><p>Registration countries are estimated from the visitor’s IP at sign-up. We save only the country code—never an IP address.</p></div><div className="student-world-card__metric"><strong>{studentCountries.filter((country) => country.code !== 'UNKNOWN').length}</strong><span>countries represented</span></div></div><div className="student-world-card__countries">{studentCountries.length ? studentCountries.map((country) => <div className={`student-country-pill${country.code === 'UNKNOWN' ? ' student-country-pill--unknown' : ''}`} key={country.code}><span aria-hidden="true">{countryFlag(country.code)}</span><div><strong>{country.code === 'UNKNOWN' ? 'Awaiting location' : countryLabel(country.code)}</strong><small>{country.learners} learner{country.learners === 1 ? '' : 's'} · {country.families} {country.families === 1 ? 'family' : 'families'}</small></div></div>) : <div className="student-world-card__empty">Your global learner map will appear here as families register.</div>}</div><div className="student-world-card__footer"><span><i /> {locatedStudentFamilies} of {students.length} family accounts include a country estimate</span><span>Private, aggregate view for administrators</span></div></section><section className="portal-card admin-table-card"><div className="admin-table admin-table--students"><div className="admin-table__head"><span>Family</span><span>Student</span><span>Learning path</span><span>Country</span><span>Status</span><span>Controls</span></div>{studentProfiles.length ? studentProfiles.map(({ account: student, learner: rowLearner }) => <div className="admin-table__row" key={rowLearner.id}><div className="table-person"><span>{initials(student.parentName)}</span><div><strong>{student.parentName}</strong><small>{student.loginId || student.email}</small></div></div><div><strong>{rowLearner.name}</strong><small>{rowLearner.year} · <span className={`inline-access inline-access--${rowLearner.accessStatus}`}>{rowLearner.accessStatus}</span></small></div><div><strong>{rowLearner.curriculum}</strong><small>{rowLearner.goal}</small></div><div className="student-country-cell"><span aria-hidden="true">{countryFlag(student.registrationCountry)}</span><div><strong>{student.registrationCountry ? countryLabel(student.registrationCountry) : 'Unavailable'}</strong><small>{student.registrationCountry ? 'IP estimate at registration' : 'Registered before location capture'}</small></div></div><div><StatusBadge status={rowLearner.accessStatus} /></div><div className="table-actions"><button type="button" className="table-access-button" onClick={() => openManagedStudent(student.id, rowLearner.id)} disabled={processingAccountId === student.id} title="Access student dashboard"><Eye size={15} /> {processingAccountId === student.id ? 'Opening…' : 'Open'}</button>{!rowLearner.incomplete && (rowLearner.accessStatus === 'active' ? <button className="table-action table-action--suspend" onClick={() => setLearnerStatus(student.id, rowLearner.id, 'suspended')} title={`Suspend ${rowLearner.name}'s profile`}><Ban size={16} /></button> : <button className="table-action table-action--approve" onClick={() => setLearnerStatus(student.id, rowLearner.id, 'active')} title={`Restore ${rowLearner.name}'s profile`}><UserCheck size={16} /></button>)}<button className="table-action table-action--delete" onClick={() => setStudentToRemove({ account: student, learner: rowLearner })} title={`Remove ${rowLearner.name}'s registration`}><Trash2 size={16} /></button></div></div>) : <EmptyState icon={GraduationCap} title="No students yet" text="New parent registrations will appear here." />}</div></section></div>
      )}

      {active === 'support' && <SupportInbox onUnreadChange={setSupportUnread} initialConversationId={initialSupportId} />}

      {active === 'referrals' && <AdminReferralDashboard />}

      {active === 'reviews' && <AdminReviewsPanel />}

      {active === 'announcements' && <AdminAnnouncementsPanel />}

      {active === 'bookings' && (
        adminBooking ? (
          <div className="admin-booking-view">
            <div className="admin-booking-context"><button onClick={() => setAdminBooking(false)}><ChevronLeft size={17} /> All bookings</button><label><span>Book for student</span><select value={bookingLearner?.id || ''} onChange={(event) => setBookingStudentId(event.target.value)}>{studentProfiles.map(({ account: student, learner: optionLearner }) => <option key={optionLearner.id} value={optionLearner.id}>{optionLearner.name} · {student.parentName} · {optionLearner.accessStatus}</option>)}</select></label></div>
            {bookingStudent && bookingLearner ? <BookLessonPanel key={bookingLearner.id} account={bookingStudent} learner={bookingLearner} adminBooking onBooked={refresh} /> : <EmptyState icon={GraduationCap} title="Register a student first" text="An administrator needs a student profile before creating a booking." />}
          </div>
        ) : (
          <div className="portal-view">
            <div className="portal-page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="portal-kicker">Platform calendar</span>
                <h1>All bookings</h1>
                <p>Filter by list, or view any teacher's live schedule calendar with interactive status details.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="portal-primary-button" onClick={() => setAdminBooking(true)} disabled={!students.length}>
                  <CalendarPlus size={17} /> Book for student
                </button>
              </div>
            </div>

            {/* View Switcher Toggle */}
            <div className="portal-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setAdminBookingView('list')}
                  style={{
                    background: adminBookingView === 'list' ? '#7048df' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  List View 📋
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setAdminBookingView('calendar');
                    if (teachers.length && !selectedCalendarTeacherId) {
                      setSelectedCalendarTeacherId(teachers[0].id);
                    }
                  }}
                  style={{
                    background: adminBookingView === 'calendar' ? '#7048df' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Schedule Calendar 📅
                </button>
              </div>

              {adminBookingView === 'calendar' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#b9adc7', fontWeight: 'bold' }}>Select Teacher:</span>
                  <select
                    value={selectedCalendarTeacherId}
                    onChange={(e) => setSelectedCalendarTeacherId(e.target.value)}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.fullName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {adminBookingView === 'list' ? (
              <AdminTeacherBookingGroups bookings={bookings} teachers={teachers} onStatusChange={setBookingStatus} onOpenTeacher={openManagedTeacher} onEnterClassroom={setClassroomBooking} onManageBooking={setManagedBooking} />
            ) : (
              <section className="portal-card booking-calendar-card teacher-booking-calendar admin-reserve-calendar-card">
                <div className="drag-instruction teacher-feedback-instruction" style={{ marginBottom: '15px' }}>
                  <span><CalendarCheck2 size={18} /></span>
                  <div>
                    <strong>Reserve a slot for {selectedCalendarTeacher?.fullName || 'selected teacher'}</strong>
                    <small>Choose a student, click any available teacher slot, then reserve it as a confirmed class. Click a booked student name to view details or unbook the class.</small>
                  </div>
                </div>

                <div className="admin-reserve-panel">
                  <label><span>Student</span><select value={bookingLearner?.id || ''} onChange={(event) => setBookingStudentId(event.target.value)}>{studentProfiles.map(({ account: student, learner: optionLearner }) => <option key={optionLearner.id} value={optionLearner.id}>{optionLearner.name} · {student.parentName} · {optionLearner.accessStatus}</option>)}</select></label>
                  <label><span>Lesson focus</span><select value={adminReserveFocus} onChange={(event) => setAdminReserveFocus(event.target.value)}><option>Speaking with confidence</option><option>Reading comprehension</option><option>Writing and grammar</option><option>Schoolwork and exam support</option><option>Build an all-round foundation</option></select></label>
                  <label><span>Length</span><select value={adminReserveDuration} onChange={(event) => setAdminReserveDuration(event.target.value)}><option value="25">25 min</option><option value="50">50 min</option></select></label>
                  <label><span>Admin note</span><input value={adminReserveNote} onChange={(event) => setAdminReserveNote(event.target.value)} placeholder="Reserved by administrator" /></label>
                  <div className="admin-reserve-panel__selected"><span>Selected slot</span><strong>{adminReserveSlot ? `${formatLessonDate(adminReserveSlot.date, adminReserveSlot.time, true)} at ${formatTime(adminReserveSlot.time)}` : 'Click an available slot below'}</strong></div>
                  <button type="button" className="portal-primary-button" onClick={reserveAdminTeacherSlot} disabled={adminReserving || !adminReserveSlot || !bookingLearner || bookingLearner.incomplete}>{adminReserving ? 'Reserving…' : 'Reserve selected slot'} <CalendarCheck2 size={16} /></button>
                </div>
                {adminReserveError && <div className="portal-error" role="alert">{adminReserveError}</div>}
                {adminReserveMessage && <div className="portal-success" role="status"><CheckCircle2 size={17} /><div><strong>Slot reserved</strong><span>{adminReserveMessage}</span></div></div>}

                <ScheduleCalendar 
                  weekOffset={adminCalendarWeek} 
                  onWeekOffset={setAdminCalendarWeek}
                  availabilitySlots={selectedCalendarTeacher?.teacher?.availabilitySlots || []}
                  bookings={selectedTeacherBookings}
                  duration={Number(adminReserveDuration)}
                  selectedLessons={adminReserveSlot ? [{ ...adminReserveSlot, duration: Number(adminReserveDuration) }] : []}
                  onSelect={(slot) => { setAdminReserveSlot({ date: slot.date, time: slot.time, duration: Number(adminReserveDuration) }); setAdminReserveError(''); setAdminReserveMessage('') }}
                  onBookingOpen={setManagedBooking} 
                  onBookingCancel={unbookCalendarClass}
                  showInactiveBookings 
                />
              </section>
            )}
          </div>
        )
      )}

      {active === 'payments' && <AdminPaymentsPanel />}

      {active === 'analytics' && <AdminAnalyticsPanel />}

      {active === 'courseware' && <CoursewareManager account={account} mode="admin" />}

      {active === 'homework' && <AdminHomeworkPanel />}

      {active === 'support' && (
        <div className="portal-view parent-support-view">
          <div className="portal-page-heading">
            <div>
              <span className="portal-kicker">TutorPro Helpdesk</span>
              <h1>Contact Administration</h1>
              <p>Chat with TutorPro Customer Service about bookings, payouts, rates, or general inquiries in real-time.</p>
            </div>
            <span className="support-inbox-live"><i /> Secure Chat</span>
          </div>
          <SupportChatWidget embedded />
        </div>
      )}

      {active === 'profile' && (
        <div className="portal-view"><section className="admin-profile-card"><span className="admin-profile-card__icon"><ShieldCheck size={34} /></span><span className="portal-kicker">Administrator account</span><h1>TutorPro Online English Control</h1><p>{account.email}</p><div><ShieldCheck size={18} /><span><strong>Full platform access</strong><small>Teacher approvals, student access and booking controls</small></span></div><button className="portal-secondary-button" onClick={onHome}><Home size={16} /> Return to website</button></section></div>
      )}
      {managedBooking && <BookingSlotDialog booking={managedBooking} account={account} onClose={() => setManagedBooking(null)} onChanged={(updated) => { setManagedBooking(updated); refresh() }} />}
      {showAddTeacher && <AddTeacherDialog onClose={() => setShowAddTeacher(false)} onCreated={() => { setShowAddTeacher(false); refresh() }} />}
      {teacherToRemove && <RemoveTeacherDialog teacher={teacherToRemove} onClose={() => setTeacherToRemove(null)} onConfirm={removeTeacherRegistration} />}
      {studentToRemove && <RemoveStudentDialog profile={studentToRemove} onClose={() => setStudentToRemove(null)} onConfirm={removeStudentRegistration} />}
    </PortalShell>
  )
}
