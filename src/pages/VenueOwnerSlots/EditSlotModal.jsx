import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './EditSlotModal.css'

// Time-slot form dialog (Figma), in two modes that share one layout:
// - "edit": opened from "Edit" on an available slot; shows that slot's
//   current values from the existing slot data.
// - "create": opened from "Create time slot" or from "Add" in the selected
//   day's card; the date starts at the day selected in the calendar, the
//   times start at the values shown in the design (08:00 – 09:00) and the
//   price is empty (design value as hint). From "Create time slot" the date
//   can be changed; from "Add" (emphasizeDate) it stays that day's date,
//   read-only and shown darker.
// The start / end times and the price can be typed (the arrows still move a
// time by one hour). From "Create time slot" the day can also be picked:
// it moves the date to the next date (from the current one) on that day,
// and changing the date updates the day. The day and date are read-only
// when editing an existing slot.
// Changes stay in this dialog only: there are no confirmed backend
// endpoints for editing or creating a time slot yet, so the submit button
// has no action and nothing is written to the slot list.
//
// Uses the native <dialog> (showModal): it centers itself, traps focus,
// shows a backdrop and closes on Escape.

function hourOf(time) {
  return Number(time.split(':')[0])
}

function withHour(time, hour) {
  const minutes = time.split(':')[1]
  return `${String(hour).padStart(2, '0')}:${minutes}`
}

// Day picker order, as the calendar (Monday first); values are getDay().
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// "HH:mm" -> minutes since midnight, or null when empty / invalid.
function minutesOf(time) {
  const match = /^(\d{2}):(\d{2})/.exec(time ?? '')
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function EditSlotModal({ mode = 'edit', slot, emphasizeDate = false, onClose }) {
  const textKey = mode === 'create' ? 'venueOwnerSlots.createSlotModal' : 'venueOwnerSlots.editSlot'
  const { t, i18n } = useTranslation()
  const dialogRef = useRef(null)
  const [startTime, setStartTime] = useState(slot.start_time)
  const [endTime, setEndTime] = useState(slot.end_time)
  const [price, setPrice] = useState(slot.hourly_price == null ? '' : String(slot.hourly_price))
  const [slotDate, setSlotDate] = useState(slot.slot_date)
  // The date can be changed only when creating from "Create time slot".
  const isDateEditable = mode === 'create' && !emphasizeDate

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const [year, month, day] = (slotDate || slot.slot_date).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekdayFormat = new Intl.DateTimeFormat(i18n.language, { weekday: 'long' })
  const weekday = weekdayFormat.format(date)

  // Picking a day: the next date on that weekday, from the current date.
  const pickWeekday = (target) => {
    const next = new Date(date)
    next.setDate(date.getDate() + ((target - date.getDay() + 7) % 7))
    setSlotDate(toIsoDate(next))
  }
  const dateLabel = `${day}-${month}-${year}` // "18-9-2026", as in the design
  const dateInputClass = emphasizeDate ? 'esm-control esm-input esm-input-locked' : 'esm-control esm-input'

  // Duration from the typed times (whole or fractional hours).
  const start = minutesOf(startTime)
  const end = minutesOf(endTime)
  const hours = start != null && end != null && end > start ? Math.round(((end - start) / 60) * 100) / 100 : 0
  const duration = hours > 0 ? t('venueOwnerSlots.editSlot.hours', { count: hours }) : '—'

  // Up/down arrows move a time by one hour (the slots are hourly).
  const step = (time, setTime, delta) => {
    const base = minutesOf(time) == null ? '08:00' : time
    const hour = hourOf(base) + delta
    if (hour >= 0 && hour <= 23) setTime(withHour(base, hour))
  }

  const timeField = (id, labelKey, time, setTime) => (
    <div className="esm-field">
      <label className="esm-label" htmlFor={id}>
        {t(labelKey)} <span className="esm-required">*</span>
      </label>
      <div className="esm-control esm-time">
        <input
          id={id}
          type="time"
          className="esm-input esm-input-editable esm-time-input"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          required
        />
        <span className="esm-stepper">
          <button
            type="button"
            className="esm-step"
            onClick={() => step(time, setTime, 1)}
            aria-label={t('venueOwnerSlots.editSlot.later', { field: t(labelKey) })}
          >
            <ChevronUp size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="esm-step"
            onClick={() => step(time, setTime, -1)}
            aria-label={t('venueOwnerSlots.editSlot.earlier', { field: t(labelKey) })}
          >
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
  )

  return (
    <dialog
      ref={dialogRef}
      className="esm vos-modal"
      aria-labelledby="esm-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="esm-header">
        <div>
          <h2 id="esm-title" className="esm-title">
            {t(`${textKey}.title`)}
          </h2>
          <p className="esm-subtitle">{t(`${textKey}.subtitle`)}</p>
        </div>
        <button
          type="button"
          className="esm-close"
          onClick={onClose}
          aria-label={t('venueOwnerSlots.editSlot.close')}
        >
          <X size={22} aria-hidden="true" />
        </button>
      </header>

      <div className="esm-grid">
        <div className="esm-field">
          <label className="esm-label" htmlFor="esm-day">
            {t('venueOwnerSlots.editSlot.day')}
          </label>
          {isDateEditable ? (
            <div className="esm-control esm-select">
              <select
                id="esm-day"
                className="esm-input esm-input-editable esm-select-input"
                value={date.getDay()}
                onChange={(event) => pickWeekday(Number(event.target.value))}
              >
                {WEEKDAY_ORDER.map((value) => {
                  // 2024-01-01 was a Monday: offset to get each weekday's name.
                  const sample = new Date(2024, 0, value === 0 ? 7 : value)
                  return (
                    <option key={value} value={value}>
                      {weekdayFormat.format(sample)}
                    </option>
                  )
                })}
              </select>
              <ChevronDown size={14} className="esm-select-icon" aria-hidden="true" />
            </div>
          ) : (
            <input id="esm-day" className={dateInputClass} value={weekday} readOnly />
          )}
        </div>
        <div className="esm-field">
          <label className="esm-label" htmlFor="esm-date">
            {t('venueOwnerSlots.editSlot.date')}
          </label>
          {isDateEditable ? (
            <input
              id="esm-date"
              type="date"
              className="esm-control esm-input esm-input-editable"
              value={slotDate}
              onChange={(event) => setSlotDate(event.target.value)}
              required
            />
          ) : (
            <input id="esm-date" className={dateInputClass} value={dateLabel} readOnly />
          )}
        </div>

        {timeField('esm-start', 'venueOwnerSlots.editSlot.startTime', startTime, setStartTime)}
        {timeField('esm-end', 'venueOwnerSlots.editSlot.endTime', endTime, setEndTime)}

        <div className="esm-field">
          <label className="esm-label" htmlFor="esm-duration">
            {t('venueOwnerSlots.editSlot.duration')}
          </label>
          <input id="esm-duration" className="esm-control esm-input" value={duration} readOnly />
        </div>
        <div className="esm-field">
          <label className="esm-label" htmlFor="esm-price">
            {t('venueOwnerSlots.editSlot.pricePerHour')}
          </label>
          <div className="esm-control esm-price">
            <span className="esm-currency" aria-hidden="true">
              ₪
            </span>
            <input
              id="esm-price"
              className="esm-input esm-input-editable esm-price-input"
              inputMode="numeric"
              value={price}
              placeholder="50"
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>
      </div>

      <footer className="esm-footer">
        {/* No slot edit/create endpoint yet: the submit button is UI only. */}
        <button type="button" className="esm-button esm-save">
          {t(`${textKey}.submit`)}
        </button>
        <button type="button" className="esm-button esm-cancel" onClick={onClose}>
          {t('venueOwnerSlots.editSlot.cancel')}
        </button>
      </footer>
    </dialog>
  )
}

export default EditSlotModal
