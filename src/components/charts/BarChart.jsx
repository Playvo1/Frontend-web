import { useId } from 'react'
import { useElementWidth } from '../../hooks/useElementWidth.js'
import { AXIS_WIDTH, PAD_END, categoryX, getPlotBox, ticks, valueY } from './chartGeometry.js'
import './charts.css'

// Vertical bar chart drawn in SVG at the container's real width.
// data: [{ label, value }] in natural order (first = start edge).
// formatTick formats the value-axis labels (e.g. currency).
function BarChart({ data, max, step, height = 340, isRtl, ariaLabel, formatTick = String }) {
  const [ref, width] = useElementWidth()
  const gradientId = useId()

  const box = width ? getPlotBox({ width, height, isRtl }) : null
  const band = box ? (box.right - box.left) / data.length : 0
  const barWidth = Math.min(72, band * 0.52)
  const axisX = box ? (isRtl ? box.right + AXIS_WIDTH - PAD_END : box.left - AXIS_WIDTH + PAD_END) : 0

  return (
    <div ref={ref} className="chart" style={{ height }}>
      {box && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#023d70" />
              <stop offset="100%" stopColor="var(--color-navy)" />
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
                  {formatTick(tick)}
                </text>
              </g>
            )
          })}

          {data.map((item, index) => {
            const cx = categoryX({ index, count: data.length, box, isRtl, mode: 'band' })
            const y = valueY({ value: item.value, max, box })
            return (
              <g key={item.label}>
                <line
                  className="chart-grid"
                  x1={cx - band / 2}
                  x2={cx - band / 2}
                  y1={box.top}
                  y2={box.bottom}
                />
                <rect
                  x={cx - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={box.bottom - y}
                  fill={`url(#${gradientId})`}
                />
                <text
                  className="chart-axis-label chart-axis-label-accent"
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            )
          })}

          <line className="chart-baseline" x1={box.left} x2={box.right} y1={box.bottom} y2={box.bottom} />
        </svg>
      )}
    </div>
  )
}

export default BarChart
