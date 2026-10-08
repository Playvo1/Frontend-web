import { useId } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth.js'
import { PAD_TOP, categoryX, monotonePath, ticks, valueY } from '../../components/charts/chartGeometry.js'
import '../../components/charts/charts.css'

// "Bookings & revenue" chart (design): two smooth lines over the same dates,
// bookings (navy) on the start-side axis and revenue (orange, with a soft
// area) on the end-side axis. Drawn in SVG at the container's real width,
// with the shared dashboard chart geometry.
//
// data: [{ label, bookings, revenue }] in natural order (first = start edge).
const MIN_LABEL_GAP = 64 // px between x labels before every other one is hidden

// Plot margins from the design (1440px): room for the bookings axis on the
// start side and the wider revenue axis (₪1600) on the end side; smaller on
// narrow cards. Value labels sit this far from the plot edge.
const WIDE_MARGINS = { start: 68, end: 84 }
const NARROW_MARGINS = { start: 32, end: 50 }
const NARROW_WIDTH = 560
const START_LABEL_GAP = 11
const END_LABEL_GAP = 17
const PAD_BOTTOM = 22 // date labels right under the plot (design)

function AnalyticsTrendChart({ data, bookingsAxis, revenueAxis, formatRevenue, height = 221, isRtl, ariaLabel }) {
  const [ref, width] = useElementWidth()
  const gradientId = useId()

  // Value axes on both sides: bookings at the start edge, revenue at the end.
  const margins = width < NARROW_WIDTH ? NARROW_MARGINS : WIDE_MARGINS
  const box = width
    ? {
        left: isRtl ? margins.end : margins.start,
        right: width - (isRtl ? margins.start : margins.end),
        top: PAD_TOP,
        bottom: height - PAD_BOTTOM,
      }
    : null
  // Physical positions (the value labels are drawn left-to-right): start-side
  // labels read away from the plot, end-side labels toward it.
  const startAxis = box
    ? isRtl
      ? { x: box.right + START_LABEL_GAP, anchor: 'start' }
      : { x: box.left - START_LABEL_GAP, anchor: 'end' }
    : null
  const endAxis = box
    ? isRtl
      ? { x: box.left - END_LABEL_GAP, anchor: 'end' }
      : { x: box.right + END_LABEL_GAP, anchor: 'start' }
    : null

  const toPoints = (key, axis) =>
    box
      ? data
          .map((item, index) => ({
            x: categoryX({ index, count: data.length, box, isRtl, mode: 'edge' }),
            y: valueY({ value: item[key], max: axis.max, box }),
          }))
          .sort((a, b) => a.x - b.x)
      : []

  const bookingsPoints = toPoints('bookings', bookingsAxis)
  const revenuePoints = toPoints('revenue', revenueAxis)
  const bookingsLine = monotonePath(bookingsPoints)
  const revenueLine = monotonePath(revenuePoints)
  const revenueArea =
    revenuePoints.length > 1
      ? `${revenueLine} L${revenuePoints[revenuePoints.length - 1].x},${box.bottom} L${revenuePoints[0].x},${box.bottom} Z`
      : ''

  const labelGap = box && data.length > 1 ? (box.right - box.left) / (data.length - 1) : Infinity
  const labelEvery = labelGap < MIN_LABEL_GAP ? 2 : 1

  return (
    <div ref={ref} className="chart" style={{ height }}>
      {box && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-orange)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-orange)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Design: dashed lines at the top and bottom of the plot only. */}
          {[box.top, box.bottom].map((y) => (
            <line key={y} className="chart-grid" x1={box.left} x2={box.right} y1={y} y2={y} />
          ))}

          {/* Same number of ticks on both axes, so their labels line up. */}
          {ticks(bookingsAxis.max, bookingsAxis.step).map((tick, index) => {
            const y = valueY({ value: tick, max: bookingsAxis.max, box })
            const revenueTick = index * revenueAxis.step
            return (
              <g key={tick}>
                <text
                  className="chart-axis-label"
                  x={startAxis.x}
                  y={y}
                  dy="0.32em"
                  direction="ltr"
                  textAnchor={startAxis.anchor}
                >
                  {tick}
                </text>
                <text
                  className="chart-axis-label"
                  x={endAxis.x}
                  y={y}
                  dy="0.32em"
                  direction="ltr"
                  textAnchor={endAxis.anchor}
                >
                  {formatRevenue(revenueTick)}
                </text>
              </g>
            )
          })}

          <path d={revenueArea} fill={`url(#${gradientId})`} />
          <path d={bookingsLine} className="atc-line atc-line-bookings" />
          <path d={revenueLine} className="atc-line atc-line-revenue" />

          {data.map((item, index) =>
            index % labelEvery === 0 ? (
              <text
                key={item.label}
                className="chart-axis-label"
                x={categoryX({ index, count: data.length, box, isRtl, mode: 'edge' })}
                y={box.bottom + 16}
                textAnchor="middle"
              >
                {item.label}
              </text>
            ) : null,
          )}
        </svg>
      )}
    </div>
  )
}

export default AnalyticsTrendChart
