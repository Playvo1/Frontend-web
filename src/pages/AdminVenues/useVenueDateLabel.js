import { useMemo } from 'react'

// "2025-12-12" (or an ISO date-time) -> "12 ديسمبر 2025" / "12 December 2025",
// with Latin digits, read in UTC so no time zone moves it a day. Shared by
// the Admin venues list and venue details pages.
export function useVenueDateLabel(language) {
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(language === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    return (value) => {
      const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00Z`) : null
      return date && !Number.isNaN(date.getTime()) ? format.format(date) : '—'
    }
  }, [language])
}
