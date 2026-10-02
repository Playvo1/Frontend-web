import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './EditSlotModal.css'

// Time-slot form dialog (Figma), in two modes that share one layout:
// - "edit": opened from "Edit" on an available slot; shows that slot's
//   current values from the existing slot data.
// - "create": opened from "Create time slot"; the day/date are the day
//   selected in the calendar, the times start at the values shown in the
//   design (08:00 – 09:00) and the price is empty (design value as hint).
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

function EditSlotModal({ mode = 'edit', slot, formatTime, onClose }) {
  const textKey = mode === 'create' ? 'venueOwnerSlots.createSlotModal' : 'venueOwnerSlots.editSlot'
  const { t, i18n } = useTranslation()
  const dialogRef = useRef(null)
  const [startTime, setStartTime] = useState(slot.start_time)
  const [endTime, setEndTime] = useState(slot.end_time)
  const [price, setPrice] = useState(slot.hourly_price == null ? '' : String(slot.hourly_price))

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const [year, month, day] = slot.slot_date.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'long' }).format(date)
  const dateLabel = `${day}-${month}-${year}` // "18-9-2026", as in the design

  const hours = hourOf(endTime) - hourOf(startTime)
  const duration = hours > 0 ? t('venueOwnerSlots.editSlot.hours', { count: hours }) : '—'

  // Up/down arrows move a time by one hour (the slots are hourly).
  const step = (time, setTime, delta) => {
    const hour = hourOf(time) + delta
    if (hour >= 0 && hour <= 23) setTime(withHour(time, hour))
  }

  const timeField = (id, labelKey, time, setTime) => (
    <div className="esm-field">
      <label className="esm-label" htmlFor={id}>
        {t(labelKey)} <span className="esm-required">*</span>
      </label>
      <div className="esm-control">
        <output id={id} className="esm-value">
          <bdi>{formatTime(time)}</bdi>
        </output>
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
          <input id="esm-day" className="esm-control esm-input" value={weekday} readOnly />
        </div>
        <div className="esm-field">
          <label className="esm-label" htmlFor="esm-date">
            {t('venueOwnerSlots.editSlot.date')}
          </label>
          <input id="esm-date" className="esm-control esm-input" value={dateLabel} readOnly />
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
              className="esm-input esm-price-input"
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
