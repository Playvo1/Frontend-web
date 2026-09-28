import { useId } from 'react'
import './Input.css'

// Shared text input with an optional leading icon (e.g. from lucide-react).
// Uses a flex row so the icon side follows the surrounding text direction
// automatically in both RTL and LTR (no hard-coded left/right).
// Optional `error` (already-translated text) shows a validation message
// under the field; with no error the field renders exactly as before.
function Input({ icon: Icon, type = 'text', error, ...props }) {
  const errorId = useId()

  return (
    <div className="input">
      <div className={`input-field ${error ? 'input-field-invalid' : ''}`}>
        {Icon && <Icon className="input-icon" size={18} />}
        <input
          type={type}
          className="input-control"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="input-error">
          {error}
        </p>
      )}
    </div>
  )
}

export default Input
