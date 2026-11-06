import { useEffect, useState } from 'react'
import { Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TOAST_EVENT } from './toast.js'
import './Toast.css'

const DURATION_MS = 4000

// Shows the messages sent with showToast (toast.js). The live region is
// always in the page so screen readers announce each new message.
function ToastHost() {
  const { t } = useTranslation()
  // { id, message } | null
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let nextId = 0
    const onToast = (event) => {
      nextId += 1
      setToast({ id: nextId, message: event.detail?.message })
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  return (
    <div className="pv-toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="pv-toast">
          <Info className="pv-toast-icon" size={18} aria-hidden="true" />
          <p className="pv-toast-text">{toast.message}</p>
          <button
            type="button"
            className="pv-toast-close"
            onClick={() => setToast(null)}
            aria-label={t('common.closeMessage')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

export default ToastHost
