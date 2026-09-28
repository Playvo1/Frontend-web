import { useEffect, useRef, useState } from 'react'

// Open/close state for a small popover anchored to a trigger button: closes
// on an outside click/tap or Escape (focus then returns to the trigger).
// Returns refs for the wrapper (trigger + panel) and the trigger itself.
export function usePopover() {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return { isOpen, setIsOpen, rootRef, triggerRef }
}
