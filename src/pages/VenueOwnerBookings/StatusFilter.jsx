import { ChevronDown, Funnel } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePopover } from './usePopover.js'

// "Filter" button of the bookings page: opens a small panel listing
// "All statuses" and the documented BOOKING.status values (Figma).
// value: '' (all) or one of `statuses`.
function StatusFilter({ statuses, value, onChange }) {
  const { t } = useTranslation()
  const { isOpen, setIsOpen, rootRef, triggerRef } = usePopover()

  const options = [{ key: '', label: t('venueOwnerBookings.allStatuses') }].concat(
    statuses.map((status) => ({ key: status, label: t(`venueOwnerBookings.status.${status}`) })),
  )

  const select = (key) => {
    onChange(key)
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
        aria-haspopup="true"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Funnel size={16} aria-hidden="true" />
        <span className="vob-trigger-label">{t('venueOwnerBookings.filterButton')}</span>
        <ChevronDown className="vob-trigger-chevron vob-trigger-chevron-muted" size={14} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="vob-popover vob-status-panel"
          role="group"
          aria-label={t('venueOwnerBookings.statusLabel')}
        >
          {options.map((option) => (
            <button
              key={option.key || 'all'}
              type="button"
              className={`vob-status-option ${option.key === value ? 'vob-status-option-selected' : ''}`}
              aria-pressed={option.key === value}
              onClick={() => select(option.key)}
            >
              <span
                className={`vob-status-option-dot vob-status-option-dot-${option.key || 'all'}`}
                aria-hidden="true"
              />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default StatusFilter
