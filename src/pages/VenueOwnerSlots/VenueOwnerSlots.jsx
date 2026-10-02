import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CirclePlus, Clock, Plus, SquarePen, Trash2, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { getVenueOwnerSlots } from '../../services/slotsService.js'
import { numberFormat } from '../VenueOwnerBookings/bookingFormat.js'
import DeleteSlotModal from './DeleteSlotModal.jsx'
import EditSlotModal from './EditSlotModal.jsx'
import './VenueOwnerSlots.css'

// Venue Owner schedule (route: /venue-owner/slots), built from the Figma
// reference: a month calendar (end side) and the selected day's time slots
// (start side). Data comes from slotsService (MOCK for now — no backend
// endpoint exists yet). Choosing a day and changing month are local UI
// only; "Create time slot", "Add", "Edit" and "Delete" have no action until
// the backend provides the time-slot endpoints.

// As in the design, the calendar runs Monday → Sunday, left to right, in
// both languages.
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function toIso(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function fromIso(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Day cells of a month: leading blanks up to the first day's weekday
// (Monday-first), then the days.
function monthCells({ year, month }) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, index) => new Date(year, month, index + 1)),
  ]
}

// "HH:mm" -> { time: "08:00", period: "AM" | "PM" }
function to12Hour(time) {
  const [hours, minutes] = time.split(':').map(Number)
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return {
    time: `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    period: hours >= 12 ? 'PM' : 'AM',
  }
}

function VenueOwnerSlots() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const language = i18n.language
  const [slots, setSlots] = useState(null)
  const [hasError, setHasError] = useState(false)
  // Available slot whose "Edit" dialog is open (UI only, see EditSlotModal).
  const [editingSlot, setEditingSlot] = useState(null)
  // Available slot whose "Delete" confirmation is open (UI only, see DeleteSlotModal).
  const [deletingSlot, setDeletingSlot] = useState(null)
  // "Create time slot" dialog (UI only, see EditSlotModal in create mode).
  const [isCreating, setIsCreating] = useState(false)
  const [venue, setVenue] = useState(null)
  const [selected, setSelected] = useState(() => toIso(new Date()))
  const [view, setView] = useState(() => {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() }
  })
  const todayIso = toIso(new Date())

  useEffect(() => {
    let isActive = true
    getVenueOwnerVenue()
      .then((venueData) => isActive && setVenue(venueData))
      .catch(() => {})
    getVenueOwnerSlots()
      .then((list) => isActive && setSlots(list))
      .catch(() => isActive && setHasError(true))
    return () => {
      isActive = false
    }
  }, [])

  // Statuses present on each date, for the calendar dots.
  const statusesByDate = useMemo(() => {
    const map = {}
    for (const slot of slots ?? []) {
      map[slot.slot_date] ??= new Set()
      map[slot.slot_date].add(slot.status)
    }
    return map
  }, [slots])

  const daySlots = useMemo(
    () =>
      (slots ?? [])
        .filter((slot) => slot.slot_date === selected)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots, selected],
  )
  const isEmptyDay = daySlots.length === 0
  const bookedCount = daySlots.filter((slot) => slot.status === 'booked').length
  const availableCount = daySlots.length - bookedCount

  // Day title in the design's form ("الجمعة، ١٨ سبتمبر ٢٠٢٦"); the month
  // title uses Latin digits ("سبتمبر 2026"), as in the design.
  const dayTitle = new Intl.DateTimeFormat(language === 'ar' ? 'ar-u-nu-arab' : language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromIso(selected))
  const monthTitle = new Intl.DateTimeFormat(`${language}-u-nu-latn`, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(view.year, view.month, 1))

  const periodLabel = (period) => (language === 'ar' ? (period === 'AM' ? 'ص' : 'م') : period)
  const formatRange = (start, end) => {
    const from = to12Hour(start)
    const to = to12Hour(end)
    return from.period === to.period
      ? `${from.time} – ${to.time} ${periodLabel(to.period)}`
      : `${from.time} ${periodLabel(from.period)} – ${to.time} ${periodLabel(to.period)}`
  }

  const changeMonth = (delta) => {
    const next = new Date(view.year, view.month + delta, 1)
    setView({ year: next.getFullYear(), month: next.getMonth() })
  }

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      <div className="vos-header">
        <header>
          <h1 className="vos-title">{t('venueOwnerSlots.title')}</h1>
          <p className="vos-subtitle">{t('venueOwnerSlots.subtitle')}</p>
        </header>
        {/* Opens the create dialog; no create-slot endpoint yet, so it is UI only. */}
        <button type="button" className="vos-create" onClick={() => setIsCreating(true)}>
          <Plus size={14} aria-hidden="true" />
          {t('venueOwnerSlots.createSlot')}
        </button>
      </div>

      {hasError && (
        <p className="vos-message" role="alert">
          {t('venueOwnerSlots.loadError')}
        </p>
      )}

      {slots && (
        <div className="vos-grid">
          {/* Start side: the selected day's slots. */}
          <section className="vos-card vos-day" aria-live="polite">
            <header className={isEmptyDay ? 'vos-day-header vos-day-header-empty' : 'vos-day-header'}>
              <div>
                <h2 className="vos-day-title">{dayTitle}</h2>
                {/* Empty-state design: a short note replaces the counts. */}
                {isEmptyDay ? (
                  <p className="vos-day-note">{t('venueOwnerSlots.noSlotsShort')}</p>
                ) : (
                  <p className="vos-day-counts">
                    <span className="vos-count">
                      <span className="vos-dot vos-dot-booked" aria-hidden="true" />
                      <bdi>{t('venueOwnerSlots.bookedCount', { value: bookedCount })}</bdi>
                    </span>
                    <span className="vos-count">
                      <span className="vos-dot vos-dot-available" aria-hidden="true" />
                      <bdi>{t('venueOwnerSlots.availableCount', { value: availableCount })}</bdi>
                    </span>
                  </p>
                )}
              </div>
              {/* The empty-state design shows "Add" as an outlined button. */}
              <button type="button" className={isEmptyDay ? 'vos-add vos-add-outlined' : 'vos-add'}>
                {isEmptyDay ? (
                  <Plus size={12} aria-hidden="true" />
                ) : (
                  <CirclePlus size={14} aria-hidden="true" />
                )}
                {t('venueOwnerSlots.add')}
              </button>
            </header>

            {isEmptyDay ? (
              /* Empty state (Figma). No create-slot endpoint yet: the button is UI only. */
              <div className="vos-empty">
                <Clock className="vos-empty-icon" size={32} strokeWidth={1.5} aria-hidden="true" />
                <p className="vos-empty-title">{t('venueOwnerSlots.noSlots')}</p>
                <p className="vos-empty-text">{t('venueOwnerSlots.noSlotsHint')}</p>
                <button type="button" className="vos-empty-create">
                  {t('venueOwnerSlots.createSlot')}
                </button>
              </div>
            ) : (
              <ul className="vos-slots">
                {daySlots.map((slot) => (
                  <li key={slot.id} className={`vos-slot vos-slot-${slot.status}`}>
                    <div className="vos-slot-info">
                      <bdi className="vos-slot-time">{formatRange(slot.start_time, slot.end_time)}</bdi>
                      <span className={`vos-slot-status vos-slot-status-${slot.status}`}>
                        {t(`venueOwnerSlots.status.${slot.status}`)}
                      </span>
                      {slot.status === 'booked' ? (
                        <span className="vos-slot-meta">
                          <User size={12} aria-hidden="true" />
                          <bdi>{slot.captain_name}</bdi>
                        </span>
                      ) : (
                        <span className="vos-slot-meta">
                          <bdi>
                            {t('venueOwnerSlots.perHour', {
                              price: `₪${numberFormat.format(slot.hourly_price)}`,
                            })}
                          </bdi>
                        </span>
                      )}
                    </div>
                    {slot.status === 'booked' ? (
                      /* Booked-slot design (Figma): no edit/delete, a muted note instead. */
                      <span className="vos-slot-locked">{t('venueOwnerSlots.editUnavailable')}</span>
                    ) : (
                      /* No edit/delete endpoints yet: UI only. */
                      <div className="vos-slot-actions">
                        <button
                          type="button"
                          className="vos-action vos-action-edit"
                          onClick={() => setEditingSlot(slot)}
                        >
                          <SquarePen size={13} aria-hidden="true" />
                          {t('venueOwnerSlots.edit')}
                        </button>
                        <button
                          type="button"
                          className="vos-action vos-action-delete"
                          onClick={() => setDeletingSlot(slot)}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          {t('venueOwnerSlots.delete')}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* End side: month calendar. */}
          <section className="vos-card vos-calendar" aria-label={t('venueOwnerSlots.calendarLabel')}>
            <header className="vos-calendar-header">
              <button
                type="button"
                className="vos-month-nav"
                onClick={() => changeMonth(-1)}
                aria-label={t('venueOwnerSlots.previousMonth')}
              >
                <PreviousIcon size={16} aria-hidden="true" />
              </button>
              <h2 className="vos-month-title">{monthTitle}</h2>
              <button
                type="button"
                className="vos-month-nav"
                onClick={() => changeMonth(1)}
                aria-label={t('venueOwnerSlots.nextMonth')}
              >
                <NextIcon size={16} aria-hidden="true" />
              </button>
            </header>

            <div className="vos-month" dir="ltr">
              {WEEKDAYS.map((day) => (
                <span key={day} className="vos-weekday">
                  {t(`venueOwnerSlots.weekdays.${day}`)}
                </span>
              ))}
              {monthCells(view).map((date, index) => {
                if (!date) return <span key={`blank-${index}`} aria-hidden="true" />
                const iso = toIso(date)
                const statuses = statusesByDate[iso]
                const isSelected = iso === selected
                const isToday = iso === todayIso
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`vos-day-cell ${isToday ? 'vos-day-today' : ''} ${isSelected ? 'vos-day-selected' : ''}`}
                    aria-pressed={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={new Intl.DateTimeFormat(language, { dateStyle: 'full' }).format(date)}
                    onClick={() => setSelected(iso)}
                  >
                    <span className="vos-day-number">{date.getDate()}</span>
                    {/* As in the design, a day without slots has its number centered. */}
                    {statuses && (
                      <span className="vos-day-dots" aria-hidden="true">
                        {statuses.has('available') && <span className="vos-dot vos-dot-available" />}
                        {statuses.has('booked') && <span className="vos-dot vos-dot-booked" />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <footer className="vos-legend">
              <span className="vos-legend-item">
                <span className="vos-dot vos-dot-booked" aria-hidden="true" />
                {t('venueOwnerSlots.legend.booked')}
              </span>
              <span className="vos-legend-item">
                <span className="vos-dot vos-dot-available" aria-hidden="true" />
                {t('venueOwnerSlots.legend.available')}
              </span>
              <span className="vos-legend-item">
                <span className="vos-legend-today" aria-hidden="true" />
                {t('venueOwnerSlots.legend.today')}
              </span>
              <span className="vos-legend-item">
                <span className="vos-legend-selected" aria-hidden="true" />
                {t('venueOwnerSlots.legend.selected')}
              </span>
            </footer>
          </section>
        </div>
      )}

      {editingSlot && (
        <EditSlotModal
          key={editingSlot.id}
          slot={editingSlot}
          formatTime={(time) => {
            const { time: clock, period } = to12Hour(time)
            return `${clock} ${periodLabel(period)}`
          }}
          onClose={() => setEditingSlot(null)}
        />
      )}

      {isCreating && (
        <EditSlotModal
          mode="create"
          slot={{ slot_date: selected, start_time: '08:00', end_time: '09:00', hourly_price: null }}
          formatTime={(time) => {
            const { time: clock, period } = to12Hour(time)
            return `${clock} ${periodLabel(period)}`
          }}
          onClose={() => setIsCreating(false)}
        />
      )}

      {deletingSlot && (
        <DeleteSlotModal
          key={deletingSlot.id}
          slot={deletingSlot}
          timeRange={formatRange(deletingSlot.start_time, deletingSlot.end_time)}
          onClose={() => setDeletingSlot(null)}
        />
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerSlots
