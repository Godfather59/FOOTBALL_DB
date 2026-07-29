import { useMemo } from 'react'
import { formatDate, formatMarketValue } from '../api/utils'

const WIDTH = 820
const HEIGHT = 280
const PADDING = 34

export default function MarketValueChart({ history = [] }) {
  const points = useMemo(() => history
    .map(item => ({
      ...item,
      numericValue: Number(item.marketValue),
      timestamp: new Date(item.date).getTime()
    }))
    .filter(item => Number.isFinite(item.numericValue) && Number.isFinite(item.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp), [history])

  if (points.length < 2) return null

  const minValue = Math.min(...points.map(point => point.numericValue))
  const maxValue = Math.max(...points.map(point => point.numericValue))
  const valueRange = Math.max(1, maxValue - minValue)
  const xStep = (WIDTH - PADDING * 2) / (points.length - 1)
  const coordinates = points.map((point, index) => ({
    ...point,
    x: PADDING + index * xStep,
    y: HEIGHT - PADDING - ((point.numericValue - minValue) / valueRange) * (HEIGHT - PADDING * 2)
  }))
  const polyline = coordinates.map(point => `${point.x},${point.y}`).join(' ')
  const latest = points.at(-1)

  return (
    <div className="market-chart-card">
      <div className="chart-summary">
        <div><span>Latest</span><strong>{formatMarketValue(latest.numericValue)}</strong></div>
        <div><span>Peak</span><strong>{formatMarketValue(maxValue)}</strong></div>
        <div><span>Recorded points</span><strong>{points.length}</strong></div>
      </div>
      <div className="market-chart-scroll">
        <svg className="market-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Market value history chart">
          <defs>
            <linearGradient id="market-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} className="chart-axis" />
          <polygon points={`${PADDING},${HEIGHT - PADDING} ${polyline} ${WIDTH - PADDING},${HEIGHT - PADDING}`} fill="url(#market-area)" />
          <polyline points={polyline} className="chart-line" />
          {coordinates.map(point => (
            <g key={`${point.timestamp}-${point.numericValue}`} className="chart-point-group">
              <circle cx={point.x} cy={point.y} r="6" className="chart-point" />
              <title>{formatDate(point.date)} · {formatMarketValue(point.numericValue)}{point.clubName ? ` · ${point.clubName}` : ''}</title>
            </g>
          ))}
          <text x={PADDING} y={HEIGHT - 8} className="chart-label">{formatDate(points[0].date)}</text>
          <text x={WIDTH - PADDING} y={HEIGHT - 8} textAnchor="end" className="chart-label">{formatDate(latest.date)}</text>
        </svg>
      </div>
    </div>
  )
}
