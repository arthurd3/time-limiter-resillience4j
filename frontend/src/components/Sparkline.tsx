/**
 * A single-series area chart. One series means no legend is needed -- the title names it -- and
 * two of these side by side on a shared scale compare better than one chart with two colours.
 */
export function Sparkline({
  values,
  max,
  title,
  peakLabel,
  tone = 'var(--color-ink-2)',
  height = 56,
}: {
  values: number[]
  max: number
  title: string
  peakLabel: string
  tone?: string
  height?: number
}) {
  const w = 240
  const safeMax = Math.max(max, 1)
  const step = values.length > 1 ? w / (values.length - 1) : w
  const y = (v: number) => height - (Math.min(v, safeMax) / safeMax) * (height - 4) - 2
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${w},${height} L0,${height} Z`

  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-xs font-medium">{title}</figcaption>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full"
        role="img"
        aria-label={`${title}. ${peakLabel}`}
        preserveAspectRatio="none"
      >
        <line x1="0" y1={height - 2} x2={w} y2={height - 2} stroke="var(--color-axis)" strokeWidth="1" />
        <path d={area} fill={tone} opacity="0.14" />
        <path d={line} fill="none" stroke={tone} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="tnum mt-1 text-[11px] text-ink-muted">{peakLabel}</p>
    </figure>
  )
}
