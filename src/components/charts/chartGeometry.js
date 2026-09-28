// Shared geometry for the dashboard SVG charts (no chart library).
//
// The value axis sits on the inline-start side (right in RTL, left in LTR)
// and the category order follows the text direction: the first category is
// drawn at the start edge — Saturday on the right in Arabic, on the left in
// English.

export const AXIS_WIDTH = 44
export const PAD_TOP = 12
export const PAD_BOTTOM = 30
export const PAD_END = 8

export function getPlotBox({ width, height, isRtl }) {
  const left = isRtl ? PAD_END : AXIS_WIDTH
  const right = isRtl ? width - AXIS_WIDTH : width - PAD_END
  return { left, right, top: PAD_TOP, bottom: height - PAD_BOTTOM }
}

// x of category `index` (0-based) out of `count`, following text direction.
// `mode: 'edge'` puts first/last points on the plot edges (line chart);
// `mode: 'band'` puts them in the middle of equal bands (bar chart).
export function categoryX({ index, count, box, isRtl, mode = 'edge' }) {
  const plotWidth = box.right - box.left
  const fromStart =
    mode === 'band'
      ? ((index + 0.5) * plotWidth) / count
      : count > 1
        ? (index * plotWidth) / (count - 1)
        : plotWidth / 2
  return isRtl ? box.right - fromStart : box.left + fromStart
}

export function valueY({ value, max, box }) {
  const clamped = Math.max(0, Math.min(value, max))
  return box.bottom - (clamped / max) * (box.bottom - box.top)
}

export function ticks(max, step) {
  const values = []
  for (let v = 0; v <= max; v += step) values.push(v)
  return values
}

// Smooth line through points without overshooting (monotone cubic
// interpolation, Fritsch–Carlson). Points must be sorted by x.
export function monotonePath(points) {
  const n = points.length
  if (n === 0) return ''
  if (n === 1) return `M${points[0].x},${points[0].y}`

  const dx = []
  const slope = []
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1].x - points[i].x)
    slope.push((points[i + 1].y - points[i].y) / dx[i])
  }

  const tangent = [slope[0]]
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) {
      tangent.push(0)
    } else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      tangent.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]))
    }
  }
  tangent.push(slope[n - 2])

  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3
    d += ` C${points[i].x + h},${points[i].y + h * tangent[i]} ${points[i + 1].x - h},${
      points[i + 1].y - h * tangent[i + 1]
    } ${points[i + 1].x},${points[i + 1].y}`
  }
  return d
}
