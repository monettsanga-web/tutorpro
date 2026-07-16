export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const HALF_HOUR_TIMES = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

export function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number)
  return (hours * 60) + minutes
}

export function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function weekdayIndex(dateValue) {
  const date = typeof dateValue === 'string' ? new Date(`${dateValue}T12:00:00`) : dateValue
  return (date.getDay() + 6) % 7
}

export function makeSlotKey(dayIndex, time) {
  return `${dayIndex}-${time}`
}

export function buildWeeklySlots(dayIndices = [0, 1, 2, 3, 4], from = '16:00', to = '20:00') {
  const slots = []
  const start = timeToMinutes(from)
  const end = timeToMinutes(to)
  dayIndices.forEach((dayIndex) => {
    for (let minutes = start; minutes < end; minutes += 30) {
      slots.push(makeSlotKey(dayIndex, minutesToTime(minutes)))
    }
  })
  return slots
}

export function slotsFromAvailabilityRanges(ranges = []) {
  const slots = []
  ranges.forEach((range) => {
    if (!range.enabled) return
    const dayIndex = WEEKDAYS.indexOf(range.day)
    if (dayIndex < 0) return
    slots.push(...buildWeeklySlots([dayIndex], range.from, range.to))
  })
  return [...new Set(slots)]
}

export function lessonSlotKeys(date, time, duration = 25) {
  const dayIndex = weekdayIndex(date)
  const start = timeToMinutes(time)
  const slotCount = Math.ceil(Number(duration) / 30)
  return Array.from({ length: slotCount }, (_, index) => makeSlotKey(dayIndex, minutesToTime(start + (index * 30))))
}

export function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfWeek(date = new Date()) {
  const value = new Date(date)
  value.setHours(12, 0, 0, 0)
  const mondayOffset = (value.getDay() + 6) % 7
  value.setDate(value.getDate() - mondayOffset)
  return value
}

export function weekDates(weekOffset = 0) {
  const start = startOfWeek()
  start.setDate(start.getDate() + (weekOffset * 7))
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}
