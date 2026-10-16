/**
 * Novakid-style month calendar for the teacher Bookings page.
 *
 * WHAT IT REPLACES, AND WHY
 * -------------------------
 * The bookings page used to open on a long list ordered oldest-first (the
 * store order), so a teacher hunting for next week's classes scrolled past
 * months of completed lessons to reach them, and the old week grid showed
 * one week at a time with no sense of which days ahead were actually booked.
 *
 * This grid shows a whole month at a glance: every booked day carries its
 * classes as coloured chips on THAT DAY, exactly like the Novakid teacher
 * schedule. The cursor opens on the month of the nearest upcoming class -
 * never on an empty month - and "Next class" jumps straight to the next
 * booked day anywhere in the future. Picking a day opens the full class
 * cards for it underneath, so no scrolling is ever required to reach a date.
 *
 * Weeks start on Monday, matching src/schedule.js startOfWeek(), so this
 * grid and the weekly schedule grid agree on which column a day lives in.
 */
import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const BOOKING_DAY_STATUS_ORDER = ['ongoing', 'confirmed', 'pending', 'completed', 'absent', 'cancelled']

export function bookingDateKey(date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function bookingStamp(booking) {
  return new Date(`${booking.date}T${booking.time || '00:00'}:00`).getTime()
}

/** The nearest booked day: the soonest upcoming class, else the most recent past one. */
export function nearestBookingKey(bookings, from = new Date()) {
  const now = from.getTime()
  let upcoming = null
  let past = null
  for (const booking of bookings) {
    const stamp = bookingStamp(booking)
    if (Number.isNaN(stamp)) continue
    if (stamp >= now && (upcoming === null || stamp < upcoming)) upcoming = stamp
    if (stamp < now && (past === null || stamp > past)) past = stamp
  }
  const chosen = upcoming ?? past
  return chosen === null ? null : bookingDateKey(new Date(chosen))
}

function monthKeyOf(dateKey) {
  return dateKey ? dateKey.slice(0, 7) : null
}

function mondayBefore(date) {
  const value = new Date(date)
  value.setHours(12, 0, 0, 0)
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7))
  return value
}

export function BookingsMonthCalendar({
  bookings = [],
  selectedKey,
  onSelectDay,
  onOpenBooking,
  openMonthKey,
}) {
  const fallbackMonth = monthKeyOf(nearestBookingKey(bookings)) || bookingDateKey(new Date()).slice(0, 7)
  const [cursorMonth, setCursorMonth] = useState(openMonthKey || fallbackMonth)
  const [year, month] = cursorMonth.split('-').map(Number)

  const byDay = useMemo(() => {
    const map = new Map()
    for (const booking of bookings) {
      if (!booking?.date) continue
      const list = map.get(booking.date) || []
      list.push(booking)
      map.set(booking.date, list)
    }
    for (const list of map.values()) list.sort((a, b) => bookingStamp(a) - bookingStamp(b))
    return map
  }, [bookings])

  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1, 12)
    const start = mondayBefore(first)
    const daysInMonth = new Date(year, month, 0).getDate()
    const lead = (start.getDay() + 6) % 7
    const weeks = Math.ceil((lead + daysInMonth) / 7)
    return Array.from({ length: weeks * 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [year, month])

  const shiftMonth = (delta) => {
    const next = new Date(year, month - 1 + delta, 1, 12)
    setCursorMonth(`${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, '0')}`)
  }

  const jumpToNextClass = () => {
    const now = Date.now()
    const future = bookings
      .map((booking) => bookingStamp(booking))
      .filter((stamp) => !Number.isNaN(stamp) && stamp >= now)
      .sort((a, b) => a - b)[0]
    if (future === undefined) return
    const date = new Date(future)
    setCursorMonth(`${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`)
    onSelectDay?.(bookingDateKey(date))
  }

  const todayKey = bookingDateKey(new Date())

  return (
    <div className="tbcal" role="grid" aria-label="Booked classes by day">
      <div className="tbcal__head">
        <div className="tbcal__title"><CalendarDays size={17} /> <strong>{MONTH_NAMES[month - 1]} {year}</strong></div>
        <div className="tbcal__nav">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => { setCursorMonth(bookingDateKey(new Date()).slice(0, 7)); onSelectDay?.(todayKey) }}>Today</button>
          <button type="button" onClick={jumpToNextClass} aria-label="Jump to the next booked day">Next class <ArrowRight size={14} /></button>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="tbcal__dows" aria-hidden="true">{DAY_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
      <div className="tbcal__grid">
        {cells.map((date) => {
          const key = bookingDateKey(date)
          const dayBookings = byDay.get(key) || []
          const shown = dayBookings.slice(0, 3)
          const classes = [
            'tbcal__day',
            date.getMonth() !== month - 1 ? 'tbcal__day--other' : '',
            key === todayKey ? 'tbcal__day--today' : '',
            key === selectedKey ? 'tbcal__day--selected' : '',
          ].join(' ')
          return (
            <div
              key={key}
              className={classes}
              role="gridcell"
              aria-label={`${date.toDateString()}, ${dayBookings.length} class${dayBookings.length === 1 ? '' : 'es'}`}
              onClick={() => onSelectDay?.(key)}
            >
              <span className="tbcal__num">{date.getDate()}</span>
              <span className="tbcal__chips">
                {shown.map((booking) => (
                  <button
                    type="button"
                    key={booking.id}
                    className={`tbcal-chip tbcal-chip--${booking.status || 'confirmed'}`}
                    title={`${booking.time} · ${booking.learnerName || booking.studentId}`}
                    onClick={(event) => { event.stopPropagation(); onOpenBooking?.(booking) }}
                  >
                    {booking.time} {String(booking.learnerName || '').split(' ')[0]}
                  </button>
                ))}
                {dayBookings.length > shown.length && (
                  <span className="tbcal__more">+{dayBookings.length - shown.length} more</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
      <div className="tbcal__legend" aria-hidden="true">
        {BOOKING_DAY_STATUS_ORDER.map((status) => <span key={status} className={`tbcal-legend tbcal-legend--${status}`}>{status}</span>)}
      </div>
    </div>
  )
}
