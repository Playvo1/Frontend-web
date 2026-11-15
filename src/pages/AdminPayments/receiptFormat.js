import { useMemo } from 'react'

// Display helpers of the Admin "Payment receipts" page and its review
// dialog, in the interface language with Latin digits (as the other Admin
// pages): booking date "17 ديسمبر 2025" / "17 December 2025", time range
// "09:00 – 10:00 م", upload time "اليوم، 09:15 ص" / "16 ديسمبر، 04:22 م"
// and amounts "₪80".

const DAY_MS = 24 * 60 * 60 * 1000
const amountFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

function startOfDay(date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

// useReceiptFormats(language, t) -> { bookingCode, slotDate, slotTime, moment, amount }
export function useReceiptFormats(language, t) {
  return useMemo(() => {
    const locale = language === 'ar' ? 'ar-u-nu-latn' : 'en-GB'
    const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    const dayMonthFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' })
    const dayMonthYearFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    // Booking times are wall-clock values ("21:00"): formatted as UTC so the
    // viewer's time zone never shifts them.
    const clockFormat = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })
    const localClockFormat = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: true })

    const clockParts = (time) => {
      const parts = clockFormat.formatToParts(new Date(`1970-01-01T${time}:00Z`))
      const period = parts.find((part) => part.type === 'dayPeriod')?.value ?? ''
      const clock = parts
        .filter((part) => part.type === 'hour' || part.type === 'minute' || (part.type === 'literal' && part.value === ':'))
        .map((part) => part.value)
        .join('')
      return { clock, period }
    }

    return {
      bookingCode: (id) => (id === null || id === undefined ? '—' : `#PV-${id}`),
      // "2026-12-17" -> "17 ديسمبر 2026"
      slotDate: (value) => (value ? dateFormat.format(new Date(`${value}T00:00:00Z`)) : null),
      // "09:00", "10:00" -> "09:00 – 10:00 م" (one period when both share it)
      slotTime: (start, end) => {
        if (!start || !end) return null
        const from = clockParts(start)
        const to = clockParts(end)
        return from.period === to.period
          ? `${from.clock} – ${to.clock} ${to.period}`.trim()
          : `${from.clock} ${from.period} – ${to.clock} ${to.period}`.trim()
      },
      // ISO timestamp -> "اليوم، 09:15 ص" / "أمس، 08:31 م" / "16 ديسمبر، 04:22 م"
      moment: (value) => {
        const date = value ? new Date(value) : null
        if (!date || Number.isNaN(date.getTime())) return null
        const today = startOfDay(new Date())
        const day = startOfDay(date)
        const daysAgo = Math.round((today - day) / DAY_MS)
        const dayLabel =
          daysAgo === 0
            ? t('adminPayments.today')
            : daysAgo === 1
              ? t('adminPayments.yesterday')
              : date.getFullYear() === today.getFullYear()
                ? dayMonthFormat.format(date)
                : dayMonthYearFormat.format(date)
        return t('adminPayments.uploadedAt', { day: dayLabel, time: localClockFormat.format(date) })
      },
      amount: (value) => (value === null || value === undefined ? null : `₪${amountFormat.format(value)}`),
    }
  }, [language, t])
}

// Upload-date filter: '' (all) | 'today' | 'week' (last 7 days) | 'month'
// (last 30 days), on the receipt's upload time.
export function inUploadRange(value, range) {
  if (!range) return true
  const time = value ? Date.parse(value) : NaN
  if (Number.isNaN(time)) return false
  const now = Date.now()
  if (range === 'today') return time >= startOfDay(new Date()).getTime()
  const days = range === 'week' ? 7 : 30
  return time >= now - days * DAY_MS
}
