// Display helpers shared by the Venue Owner bookings list and booking
// details pages. Dates, times and amounts are shown in the design's Latin
// format in both languages ("18 Sep 2026", "8:00 – 9:00 PM", "₪50").

export const numberFormat = new Intl.NumberFormat('en-US')

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

// "2026-09-18" -> "18 Sep 2026"
export function formatDate(isoDate) {
  const [year, , day] = isoDate.split('-')
  const month = monthFormat.format(new Date(`${isoDate}T00:00:00Z`))
  return `${Number(day)} ${month} ${year}`
}

// "HH:mm" (24h) -> { time: "8:00", period: "PM" }
function to12Hour(time) {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return { time: `${hour12}:${String(minutes).padStart(2, '0')}`, period }
}

export function formatTimeRange(start, end) {
  const from = to12Hour(start)
  const to = to12Hour(end)
  return from.period === to.period
    ? `${from.time} – ${to.time} ${to.period}`
    : `${from.time} ${from.period} – ${to.time} ${to.period}`
}

// "2026-09-18T07:42" -> "18 Sep 2026 · 7:42 AM"
export function formatDateTime(isoDateTime) {
  const [date, time] = isoDateTime.split('T')
  const { time: clock, period } = to12Hour(time)
  return `${formatDate(date)} · ${clock} ${period}`
}

export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
