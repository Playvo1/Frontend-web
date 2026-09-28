import { useEffect, useRef, useState } from 'react'

// Tracks the rendered width of an element (ResizeObserver), so SVG charts
// can be drawn in real pixels at any screen size — text and points never
// stretch, and nothing overflows horizontally.
export function useElementWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined

    const update = () => setWidth(Math.floor(element.getBoundingClientRect().width))
    update()

    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
