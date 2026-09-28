import { useId } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth.js'
import {
  AXIS_WIDTH,
  PAD_END,
  categoryX,
  getPlotBox,
  monotonePath,
  ticks,
  valueY,
} from './chartGeometry.js'
import './charts.css'

// Smooth area line chart drawn in SVG at the container's real width.
// data: [{ label, value }] in natural order (first = start edge).
// referenceValue (optional): draws the horizontal reference line of the
// Figma design at that value, with a marker on every day column.
function LineChart({ data, max, step, height = 280, referenceValue, isRtl, ariaLabel }) {
  const [ref, width] = useElementWidth()
  const gradientId = useId()

  const box = width ? getPlotBox({ width, height, isRtl }) : null
  const points = box
    ? data.map((item, index) => ({
        x: categoryX({ index, count: data.length, box, isRtl, mode: 'edge' }),
        y: valueY({ value: item.value, max, box }),
        ...item,
      }))
    : []
  const sorted = [...points].sort((a, b) => a.x - b.x)
  const line = monotonePath(sorted)
  const area =
    sorted.length > 1
      ? `${line} L${sorted[sorted.length - 1].x},${box.bottom} L${sorted[0].x},${box.bottom} Z`
      : ''
  const referenceY =
    box && referenceValue != null ? valueY({ value: referenceValue, max, box }) : null
  const axisX = box ? (isRtl ? box.right + AXIS_WIDTH - PAD_END : box.left - AXIS_WIDTH + PAD_END) : 0

  return (
    <div ref={ref} className="chart" style={{ height }}>
      {box && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-orange)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-orange)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {ticks(max, step).map((tick) => {
            const y = valueY({ value: tick, max, box })
            return (
              <g key={tick}>
                <line className="chart-grid" x1={box.left} x2={box.right} y1={y} y2={y} />
                <text
                  className="chart-axis-label"
                  x={axisX}
                  y={y}
                  dy="0.32em"
                  textAnchor={isRtl ? 'end' : 'start'}
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {points.map((point) => (
            <line
              key={`v-${point.label}`}
              className="chart-grid"
              x1={point.x}
              x2={point.x}
              y1={box.top}
              y2={box.bottom}
            />
          ))}

          {referenceY != null && (
            <g>
              <line
                className="chart-reference"
                x1={box.left}
                x2={box.right}
                y1={referenceY}
                y2={referenceY}
              />
              {points.map((point) => (
                <circle
                  key={`r-${point.label}`}
                  className="chart-reference-point"
                  cx={point.x}
                  cy={referenceY}
                  r="3.5"
                />
              ))}
            </g>
          )}

          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} className="chart-line" />

          {points.map((point) => (
            <g key={point.label}>
              <circle className="chart-point" cx={point.x} cy={point.y} r="3.5" />
              <text
                className="chart-axis-label"
                x={point.x}
                y={height - 8}
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}

export default LineChart
