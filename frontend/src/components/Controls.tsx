import { useId } from 'react'

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  accent = 'var(--color-caller)',
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format: (v: number) => string
  accent?: string
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-ink-2">{label}</span>
        <span className="tnum font-mono text-xs font-semibold" style={{ color: accent }}>
          {format(value)}
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-caller"
        style={{ accentColor: accent }}
      />
    </label>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-caller"
        />
        <span className="font-medium">{label}</span>
      </label>
      {hint && <p className="mt-1 pl-6 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}

export function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-hairline p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === o.value
              ? 'bg-caller text-white'
              : 'text-ink-2 hover:bg-grid/50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({
  label,
  value,
  tone = 'neutral',
  note,
}: {
  label: string
  value: string
  tone?: 'neutral' | 'good' | 'warning' | 'critical'
  note?: string
}) {
  const color = {
    neutral: 'var(--color-ink)',
    good: 'var(--color-good)',
    warning: 'var(--color-warning)',
    critical: 'var(--color-critical)',
  }[tone]
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-xl font-semibold" style={{ color }}>
        {value}
      </div>
      {note && <div className="text-[11px] leading-tight text-ink-muted">{note}</div>}
    </div>
  )
}
