import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// "This week" period picker of the dashboard header: a button that opens a
// small list of periods (Figma: Today / This week / This month / Last month).
// The whole button — text and chevron — toggles the list; it closes on
// selection, outside click/tap, Escape or Tab.
//
// Only the selected period is kept here; the dashboard loads its numbers for
// it. `unsupported` (API mode: periods the backend does not accept) are still
// listed, marked "not supported yet" and cannot be selected, so no number is
// ever shown for them. Demo mode passes none (the mock data is the same for
// every period).
const PERIODS = ['today', 'week', 'month', 'lastMonth']

function PeriodSelect({ value, onChange, unsupported = [] }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(PERIODS.indexOf(value))
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  // Close when clicking/tapping outside.
  useEffect(() => {
    if (!isOpen) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  // Move keyboard focus into the list when it opens.
  useEffect(() => {
    if (isOpen) listRef.current?.focus()
  }, [isOpen])

  const open = () => {
    setActiveIndex(PERIODS.indexOf(value))
    setIsOpen(true)
  }

  const close = (returnFocus = true) => {
    setIsOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  const isUnsupported = (period) => unsupported.includes(period)

  const select = (period) => {
    if (isUnsupported(period)) return
    if (period !== value) onChange(period)
    close()
  }

  const onButtonKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      open()
    }
  }

  const onListKeyDown = (event) => {
    const last = PERIODS.length - 1
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => (index >= last ? 0 : index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => (index <= 0 ? last : index - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(last)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        select(PERIODS[activeIndex])
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        close(false)
        break
      default:
    }
  }

  const optionId = (period) => `${listId}-${period}`

  return (
    <div className="vo-period" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="vo-period-button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-label={`${t('venueOwnerDashboard.period.label')}: ${t(`venueOwnerDashboard.period.${value}`)}`}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={onButtonKeyDown}
      >
        {t(`venueOwnerDashboard.period.${value}`)}
        <ChevronDown className="vo-period-chevron" size={12} strokeWidth={2} aria-hidden="true" />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          className="vo-period-list"
          role="listbox"
          tabIndex={-1}
          aria-label={t('venueOwnerDashboard.period.label')}
          aria-activedescendant={optionId(PERIODS[activeIndex])}
          onKeyDown={onListKeyDown}
        >
          {PERIODS.map((period, index) => (
            <li
              key={period}
              id={optionId(period)}
              role="option"
              aria-selected={period === value}
              aria-disabled={isUnsupported(period) || undefined}
              className={`vo-period-option ${index === activeIndex ? 'vo-period-option-active' : ''} ${isUnsupported(period) ? 'vo-period-option-unsupported' : ''}`}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => select(period)}
            >
              {t(`venueOwnerDashboard.period.${period}`)}
              {isUnsupported(period) && (
                <span className="vo-period-option-note">{t('venueOwnerDashboard.period.unsupported')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PeriodSelect
