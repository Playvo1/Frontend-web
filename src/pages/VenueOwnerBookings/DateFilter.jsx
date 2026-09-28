import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePopover } from './usePopover.js'

// "All dates" button of the bookings page: opens a month calendar (Figma).
// Picking a day filters the list to that date; picking the selected day
// again goes back to all dates. value: '' (all) or "YYYY-MM-DD".
//
// As in the design, the calendar itself is Latin/English in both languages
// (Mo…Su, month name) and always laid out Monday → Sunday, left to right.

const WEEK_LENGTH = 7
const CALENDAR_CELLS = 42 // 6 weeks, as in the design

const monthNameFormat = new Intl.DateTimeFormat('en-US', { month: 'long' })
const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const fullDateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' })

// Mo, Tu, … Su (2026-06-01 is a Monday).
const WEEKDAYS = Array.from({ length: WEEK_LENGTH }, (_, index) =>
  weekdayFormat.format(new Date(2026, 5, 1 + index)).slice(0, 2),
)

const MONTHS = Array.from({ length: 12 }, (_, index) => monthNameFormat.format(new Date(2026, index, 1)))

function toIso(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function monthOf(isoDate) {
  const [year, month] = isoDate.split('-').map(Number)
  return { year, month: month - 1 }
}

// The 42 days shown for a month, starting on the Monday on/before the 1st.
function calendarDays({ year, month }) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % WEEK_LENGTH
  return Array.from({ length: CALENDAR_CELLS }, (_, index) => new Date(year, month, 1 - offset + index))
}

function DateFilter({ value, onChange, formatDate }) {
  const { t } = useTranslation()
  const { isOpen, setIsOpen, rootRef, triggerRef } = usePopover()
  const [view, setView] = useState(() => monthOf(value || toIso(new Date())))

  const open = () => {
    setView(monthOf(value || toIso(new Date())))
    setIsOpen(true)
  }

  const pick = (isoDate) => {
    onChange(isoDate === value ? '' : isoDate)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="vob-popover-root" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="vob-trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
      >
        <CalendarDays size={16} aria-hidden="true" />
        <span className="vob-trigger-label">
          {value ? <bdi dir="ltr">{formatDate(value)}</bdi> : t('venueOwnerBookings.allDates')}
        </span>
        <ChevronDown className="vob-trigger-chevron" size={14} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="vob-popover vob-calendar"
          role="dialog"
          aria-label={t('venueOwnerBookings.dateLabel')}
          dir="ltr"
        >
          <div className="vob-calendar-header">
            <label className="vob-month">
              <select
                className="vob-month-control"
                value={view.month}
                onChange={(event) => setView({ year: view.year, month: Number(event.target.value) })}
                aria-label={t('venueOwnerBookings.monthLabel')}
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown className="vob-month-chevron" size={12} aria-hidden="true" />
            </label>
          </div>

          <div className="vob-calendar-grid">
            {WEEKDAYS.map((day, index) => (
              <span
                key={day}
                className={`vob-weekday ${index >= 5 ? 'vob-weekday-weekend' : ''}`}
                aria-hidden="true"
              >
                {day}
              </span>
            ))}
            {calendarDays(view).map((date, index) => {
              const iso = toIso(date)
              const isWeekend = index % WEEK_LENGTH >= 5
              const isInMonth = date.getMonth() === view.month
              const tone = isWeekend ? 'weekend' : isInMonth ? 'inside' : 'outside'
              const isSelected = iso === value
              return (
                <button
                  key={iso}
                  type="button"
                  className={`vob-day vob-day-${tone} ${isSelected ? 'vob-day-selected' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={fullDateFormat.format(date)}
                  onClick={() => pick(iso)}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default DateFilter
