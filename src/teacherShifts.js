/**
 * Day-shift and night-shift quick fill for the teacher availability calendar.
 *
 * THE OWNER'S ASK
 * ---------------
 * A teacher who is still waiting for approval must already be able to open
 * their available hours, and the calendar should offer them a simple choice:
 * day shift or night shift. Philippine teachers covering European and American
 * school hours mostly work nights, so "set your availability" without a night
 * option meant painting forty cells by hand after midnight.
 *
 * WHAT A SHIFT IS
 * ---------------
 * A preset weekly pattern, not a restriction: choosing a shift fills the whole
 * week with that window and the teacher still paints over it freely before
 * saving. The chosen shift is stored on the teacher profile so the admin table
 * can show who works nights.
 *
 * Night crosses midnight, so the weekly pattern carries both halves on every
 * day: 18:00-24:00 and 00:00-02:00, which as a recurring week reads exactly as
 * "every night, including the small hours".
 */

import { buildWeeklySlots } from './schedule.js'

export const TEACHER_SHIFTS = {
  day: { id: 'day', label: 'Day shift', hours: '08:00 – 18:00', start: '08:00', end: '18:00' },
  /* The owner's hours, corrected: Philippine evenings covering European
     school days run nine at night to three in the morning. */
  night: { id: 'night', label: 'Night shift', hours: '21:00 – 03:00', start: '21:00', end: '03:00' },
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

/** The recurring weekly slot keys for a shift, or [] for an unknown shift. */
export function buildShiftSlots(shiftId) {
  const shift = TEACHER_SHIFTS[shiftId]
  if (!shift) return []
  if (timeToMinutesSafe(shift.start) < timeToMinutesSafe(shift.end)) {
    return buildWeeklySlots(EVERY_DAY, shift.start, shift.end)
  }
  return [
    ...buildWeeklySlots(EVERY_DAY, shift.start, '24:00'),
    ...buildWeeklySlots(EVERY_DAY, '00:00', shift.end),
  ]
}

function timeToMinutesSafe(time) {
  const [hours, minutes] = String(time).split(':').map(Number)
  return (hours * 60) + minutes
}

/** 'day' | 'night' | '' - whatever the profile declares, sanitised. */
export function teacherShift(account) {
  const shift = String(account?.teacher?.shift || '').toLowerCase()
  return TEACHER_SHIFTS[shift] ? shift : ''
}
