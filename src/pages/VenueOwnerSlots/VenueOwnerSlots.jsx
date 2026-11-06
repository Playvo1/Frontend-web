import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CirclePlus, Clock, Plus, SquarePen, Trash2, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { showToast } from '../../components/Toast/toast.js'
import { IS_API_ENABLED } from '../../config/api.js'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import {
  createVenueOwnerSlot,
  deleteVenueOwnerSlot,
  getSlotCreation,
  getVenueOwnerDaySlots,
  getVenueOwnerSlots,
  updateVenueOwnerSlot,
} from '../../services/slotsService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import { numberFormat } from '../VenueOwnerBookings/bookingFormat.js'
import DeleteSlotModal from './DeleteSlotModal.jsx'
import EditSlotModal from './EditSlotModal.jsx'
import '../../styles/skeleton.css'
import './VenueOwnerSlots.css'

// Venue Owner schedule (route: /venue-owner/slots), built from the Figma
// reference: a month calendar (end side) and the selected day's time slots
// (start side). Data comes from slotsService (see there for the endpoints):
// - API mode: all of the owner's slots (calendar dots) and, for the
//   selected day, the backend's date filter (?date=), with its own loading
//   and error state in the day card. Statuses: available, booked, blocked.
//   On the backend "blocked" is a slot held by a booking that awaits payment
//   (BookingController@store; released when it expires or the receipt is
//   rejected, "booked" once verified) — shown as "Pending payment". Like a
//   booked slot it cannot be edited (the backend refuses a slot that has a
//   booking), so it gets the locked note instead of Edit / Delete.
//   "Edit" saves through PUT, "Create time slot" / "Add" through POST and
//   "Delete" (after the confirmation dialog) through DELETE; then both lists
//   are read again from the backend, and a short message confirms a
//   creation / deletion only after the backend accepted it. Creating needs
//   the venue's sport (sport_id, from the venue's own data): without exactly
//   one sport on the venue the create buttons are disabled and the page says
//   why. A slot with any booking cannot be deleted (409): the dialog says so.
// - Demo mode: the mock list; the dialogs open but save nothing, and
//   "Delete" stays disabled (nothing can be deleted).
// Booked slots cannot be edited (the backend refuses them).
//
// While the slots load, the day card and the calendar are shown as
// placeholder blocks (no text) under the page title, as on the Reviews and
// Analytics pages.

// As in the design, the calendar runs Monday → Sunday, left to right, in
// both languages.
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// Placeholders in the loading state: slot rows, calendar days (five weeks)
// and legend items.
const SKELETON_SLOTS = 4
const SKELETON_DAYS = 35
const SKELETON_LEGEND = 4

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
  const { token, logout } = useAuth()
  const isRtl = i18n.dir() === 'rtl'
  const language = i18n.language
  // All slots (calendar dots), or null while loading.
  const [slots, setSlots] = useState(null)
  // Loading all slots failed: null | 'network' | 'server'.
  const [errorKind, setErrorKind] = useState(null)
  const [attempt, setAttempt] = useState(0)
  // API mode, selected day: { date, slots } from the date filter, its
  // loading / error state and a counter to read it again.
  const [dayData, setDayData] = useState(null)
  // { key: 'date|attempt', kind } — applies only to that date and attempt.
  const [dayErrorState, setDayError] = useState(null)
  const [dayAttempt, setDayAttempt] = useState(0)
  // Reading the lists again after a save failed (the old lists stay).
  const [refreshFailed, setRefreshFailed] = useState(false)
  // API mode: { venueId, sportId } or { reason } (see getSlotCreation).
  const [creation, setCreation] = useState(null)
  // Slot whose "Edit" dialog is open.
  const [editingSlot, setEditingSlot] = useState(null)
  // Slot whose "Delete" confirmation is open.
  const [deletingSlot, setDeletingSlot] = useState(null)
  // "Create time slot" dialog: null (closed) | 'header' ("Create time
  // slot") | 'day' ("Add" in the selected day's card, where the day and
  // date are shown emphasized).
  const [createSource, setCreateSource] = useState(null)
  const [venue, setVenue] = useState(null)
  const [selected, setSelected] = useState(() => toIso(new Date()))
  const [view, setView] = useState(() => {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() }
  })
  const todayIso = toIso(new Date())
  const isLoading = slots === null && !errorKind

  useEffect(() => {
    let isActive = true
    getVenueOwnerVenue()
      .then((venueData) => isActive && setVenue(venueData))
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [])

  // All slots: loading → loaded, or → error ("Try again" runs it again).
  useEffect(() => {
    let isActive = true
    getVenueOwnerSlots(token)
      .then((list) => isActive && setSlots(list))
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setErrorKind(isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [attempt, token, logout])

  // API mode: the selected day's slots from the backend's date filter.
  useEffect(() => {
    if (!IS_API_ENABLED) return undefined
    let isActive = true
    const key = `${selected}|${dayAttempt}`
    getVenueOwnerDaySlots(selected, token)
      .then((list) => isActive && setDayData({ date: selected, slots: list }))
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setDayError({ key, kind: isConnectionFailure(error) ? 'network' : 'server' })
      })
    return () => {
      isActive = false
    }
  }, [selected, dayAttempt, token, logout])

  // API mode: can slots be created (the venue's sport)?
  useEffect(() => {
    if (!IS_API_ENABLED) return undefined
    let isActive = true
    getSlotCreation(token).then((result) => isActive && setCreation(result))
    return () => {
      isActive = false
    }
  }, [token])

  const retry = () => {
    setErrorKind(null)
    setSlots(null)
    setAttempt((count) => count + 1)
  }

  // After a save: read both lists again from the backend.
  const refresh = async () => {
    setRefreshFailed(false)
    setDayAttempt((count) => count + 1)
    try {
      setSlots(await getVenueOwnerSlots(token))
    } catch (error) {
      if (error?.status === 401) logout()
      else setRefreshFailed(true)
    }
  }

  // Saves; a 401 signs out, other errors go back to the dialog.
  const save = async (request) => {
    try {
      await request()
    } catch (error) {
      if (error?.status === 401) logout()
      throw error
    }
  }

  const submitEdit = async (fields) => {
    await save(() => updateVenueOwnerSlot(editingSlot.id, fields, token))
    setEditingSlot(null)
    await refresh()
  }

  const submitCreate = async (fields) => {
    await save(() =>
      createVenueOwnerSlot({ venueId: creation.venueId, sportId: creation.sportId, ...fields }, token),
    )
    setCreateSource(null)
    setSelected(fields.slot_date)
    showToast(t('venueOwnerSlots.created'))
    await refresh()
  }

  // Delete (confirmed in the dialog). Success: close, confirm, read the lists
  // again. 404 (already gone): the lists are read again so it disappears;
  // the dialog still says why nothing was deleted.
  const submitDelete = async () => {
    try {
      await save(() => deleteVenueOwnerSlot(deletingSlot.id, token))
    } catch (error) {
      if (error?.status === 404) refresh()
      throw error
    }
    setDeletingSlot(null)
    showToast(t('venueOwnerSlots.deleted'))
    await refresh()
  }

  // Create buttons: always in demo mode (dialog only, as before); in API
  // mode only with the venue's sport. Otherwise the reason is shown.
  const canCreate = !IS_API_ENABLED || Boolean(creation?.sportId)
  const createBlockedReason =
    IS_API_ENABLED && creation && !creation.sportId ? t(`venueOwnerSlots.createUnavailable.${creation.reason}`) : null

  // Statuses present on each date, for the calendar dots.
  const statusesByDate = useMemo(() => {
    const map = {}
    for (const slot of slots ?? []) {
      map[slot.slot_date] ??= new Set()
      map[slot.slot_date].add(slot.status)
    }
    return map
  }, [slots])

  // The selected day's list: the date filter's answer (API mode) or the
  // loaded list (demo mode).
  const dayError = dayErrorState?.key === `${selected}|${dayAttempt}` ? dayErrorState.kind : null
  const isDayLoading = IS_API_ENABLED && !dayError && dayData?.date !== selected
  const daySlots = useMemo(() => {
    const list = IS_API_ENABLED
      ? dayData?.date === selected
        ? dayData.slots
        : []
      : (slots ?? []).filter((slot) => slot.slot_date === selected)
    return [...list].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [slots, dayData, selected])
  const isEmptyDay = daySlots.length === 0 && !isDayLoading && !dayError
  const bookedCount = daySlots.filter((slot) => slot.status === 'booked').length
  const availableCount = daySlots.filter((slot) => slot.status === 'available').length

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
          {createBlockedReason && (
            <p id="vos-create-note" className="vos-create-note">
              {createBlockedReason}
            </p>
          )}
        </header>
        <button
          type="button"
          className="vos-create"
          onClick={() => setCreateSource('header')}
          disabled={!canCreate}
          aria-describedby={createBlockedReason ? 'vos-create-note' : undefined}
        >
          <Plus size={14} aria-hidden="true" />
          {t('venueOwnerSlots.createSlot')}
        </button>
      </div>

      {errorKind && (
        <div className="vos-message vos-load-error" role="alert">
          <p>
            {t(errorKind === 'network' ? 'venueOwnerSlots.errors.network' : 'venueOwnerSlots.loadError')}
          </p>
          <button type="button" className="vos-retry" onClick={retry}>
            {t('venueOwnerSlots.retry')}
          </button>
        </div>
      )}

      {refreshFailed && (
        <p className="vos-message" role="alert">
          {t('venueOwnerSlots.errors.refresh')}
        </p>
      )}

      {/* Loading state: placeholders in the page's layout. */}
      {isLoading && (
        <div className="vos-grid" aria-busy="true">
          <div className="vos-card vos-day" aria-hidden="true">
            <div className="vos-day-header">
              <div>
                <span className="vos-skeleton pv-shimmer vos-skeleton-day-title" />
                <span className="vos-skeleton pv-shimmer vos-skeleton-day-counts" />
              </div>
              <span className="vos-skeleton pv-shimmer vos-skeleton-add" />
            </div>
            <ul className="vos-slots">
              {Array.from({ length: SKELETON_SLOTS }, (_, row) => (
                <li key={row} className="vos-slot vos-skeleton-slot">
                  <span className="vos-skeleton-lines">
                    <span className="vos-skeleton pv-shimmer vos-skeleton-time" />
                    <span className="vos-skeleton pv-shimmer vos-skeleton-status" />
                    <span className="vos-skeleton pv-shimmer vos-skeleton-meta" />
                  </span>
                  <span className="vos-skeleton pv-shimmer vos-skeleton-action" />
                </li>
              ))}
            </ul>
          </div>

          <div className="vos-card vos-calendar" aria-hidden="true">
            <div className="vos-calendar-header">
              <span className="vos-skeleton pv-shimmer vos-skeleton-nav" />
              <span className="vos-skeleton pv-shimmer vos-skeleton-month" />
              <span className="vos-skeleton pv-shimmer vos-skeleton-nav" />
            </div>
            <div className="vos-month">
              {WEEKDAYS.map((day) => (
                <span key={day} className="vos-skeleton pv-shimmer vos-skeleton-weekday" />
              ))}
              {Array.from({ length: SKELETON_DAYS }, (_, day) => (
                <span key={day} className="vos-skeleton-block pv-shimmer vos-skeleton-day" />
              ))}
            </div>
            <div className="vos-legend">
              {Array.from({ length: SKELETON_LEGEND }, (_, item) => (
                <span key={item} className="vos-skeleton pv-shimmer vos-skeleton-legend" />
              ))}
            </div>
          </div>
        </div>
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
              {/* The empty-state design shows "Add" as an outlined button.
                  Opens the create dialog for this day. */}
              <button
                type="button"
                className={isEmptyDay ? 'vos-add vos-add-outlined' : 'vos-add'}
                onClick={() => setCreateSource('day')}
                disabled={!canCreate}
                aria-describedby={createBlockedReason ? 'vos-create-note' : undefined}
              >
                {isEmptyDay ? (
                  <Plus size={12} aria-hidden="true" />
                ) : (
                  <CirclePlus size={14} aria-hidden="true" />
                )}
                {t('venueOwnerSlots.add')}
              </button>
            </header>

            {isDayLoading ? (
              /* API mode: the day's slots are being read (date filter). */
              <ul className="vos-slots" aria-busy="true" aria-label={t('venueOwnerSlots.loadingDay')}>
                {Array.from({ length: 3 }, (_, row) => (
                  <li key={row} className="vos-slot vos-skeleton-slot" aria-hidden="true">
                    <span className="vos-skeleton-lines">
                      <span className="vos-skeleton pv-shimmer vos-skeleton-time" />
                      <span className="vos-skeleton pv-shimmer vos-skeleton-status" />
                      <span className="vos-skeleton pv-shimmer vos-skeleton-meta" />
                    </span>
                    <span className="vos-skeleton pv-shimmer vos-skeleton-action" />
                  </li>
                ))}
              </ul>
            ) : dayError ? (
              <div className="vos-empty vos-day-error" role="alert">
                <p className="vos-empty-title">
                  {t(dayError === 'network' ? 'venueOwnerSlots.errors.network' : 'venueOwnerSlots.errors.day')}
                </p>
                <button type="button" className="vos-retry" onClick={() => setDayAttempt((count) => count + 1)}>
                  {t('venueOwnerSlots.retry')}
                </button>
              </div>
            ) : isEmptyDay ? (
              /* Empty state (Figma). */
              <div className="vos-empty">
                <Clock className="vos-empty-icon" size={32} strokeWidth={1.5} aria-hidden="true" />
                <p className="vos-empty-title">{t('venueOwnerSlots.noSlots')}</p>
                <p className="vos-empty-text">{t('venueOwnerSlots.noSlotsHint')}</p>
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
                      {/* The player's name when the data has it (demo); the
                          backend's slots carry no name, so the price shows. */}
                      {slot.status === 'booked' && slot.captain_name ? (
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
                    {slot.status === 'booked' || slot.status === 'blocked' ? (
                      /* Booked-slot design (Figma): no edit/delete, a muted note
                         instead — also for a slot held by a pending booking. */
                      <span className="vos-slot-locked">{t('venueOwnerSlots.editUnavailable')}</span>
                    ) : (
                      /* Edit: saved through PUT (API mode). Delete: asks for
                         confirmation, then DELETE (API mode only). */
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
                          onClick={IS_API_ENABLED ? () => setDeletingSlot(slot) : undefined}
                          disabled={!IS_API_ENABLED}
                          title={IS_API_ENABLED ? undefined : t('venueOwnerSlots.deleteUnavailable')}
                          aria-haspopup={IS_API_ENABLED ? 'dialog' : undefined}
                          aria-label={
                            IS_API_ENABLED
                              ? undefined
                              : `${t('venueOwnerSlots.delete')} — ${t('venueOwnerSlots.deleteUnavailable')}`
                          }
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
                        {statuses.has('blocked') && <span className="vos-dot vos-dot-blocked" />}
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
                <span className="vos-dot vos-dot-blocked" aria-hidden="true" />
                {t('venueOwnerSlots.legend.blocked')}
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
          onClose={() => setEditingSlot(null)}
          onSubmit={IS_API_ENABLED ? submitEdit : undefined}
        />
      )}

      {deletingSlot && (
        <DeleteSlotModal
          key={deletingSlot.id}
          slot={deletingSlot}
          timeRange={formatRange(deletingSlot.start_time, deletingSlot.end_time)}
          onClose={() => setDeletingSlot(null)}
          onConfirm={submitDelete}
        />
      )}

      {createSource && (
        <EditSlotModal
          mode="create"
          emphasizeDate={createSource === 'day'}
          slot={{ slot_date: selected, start_time: '08:00', end_time: '09:00', hourly_price: null }}
          onClose={() => setCreateSource(null)}
          onSubmit={IS_API_ENABLED && canCreate ? submitCreate : undefined}
        />
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerSlots
