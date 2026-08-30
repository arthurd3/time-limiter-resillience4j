import type { CallOutcome } from '../sim/timeLimiter'

/**
 * An outcome badge. The colour is never the only signal.
 *
 * The palette validator puts `good` and `critical` at ΔE 4.1 under deuteranopia -- effectively
 * the same colour for a red-green reader -- and `warning` at 1.79:1 on the light surface. So each
 * badge carries a glyph and a word, and the colour is decoration on top of a signal that already
 * works without it.
 */
const SPEC: Record<CallOutcome, { glyph: string; label: string; cls: string; note: string }> = {
  UPSTREAM: {
    glyph: '●',
    label: 'UPSTREAM',
    cls: 'text-good border-good',
    note: 'the dependency answered in time',
  },
  FALLBACK: {
    glyph: '▲',
    label: 'FALLBACK',
    cls: 'text-warning border-warning',
    note: 'the deadline fired and the fallback answered',
  },
  ERROR: {
    glyph: '✕',
    label: '504',
    cls: 'text-critical border-critical',
    note: 'the deadline fired and no fallback resolved',
  },
}

export function Outcome({ outcome, showNote = false }: { outcome: CallOutcome; showNote?: boolean }) {
  const spec = SPEC[outcome]
  return (
    <span className="inline-flex items-baseline gap-2">
      <span
        className={`inline-flex items-baseline gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide ${spec.cls}`}
      >
        <span aria-hidden="true">{spec.glyph}</span>
        {spec.label}
      </span>
      {showNote && <span className="text-sm text-ink-2">{spec.note}</span>}
    </span>
  )
}
