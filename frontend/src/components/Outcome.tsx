import type { CallOutcome } from '../sim/timeLimiter'
import { useCopy } from '../i18n/locale'

/**
 * An outcome badge. The colour is never the only signal.
 *
 * The palette validator puts `good` and `critical` at ΔE 4.1 under deuteranopia -- effectively
 * the same colour for a red-green reader -- and `warning` at 1.79:1 on the light surface. So each
 * badge carries a glyph and a word, and the colour is decoration on top of a signal that already
 * works without it.
 *
 * The labels stay in English in every locale: they are the literal values the API returns.
 */
const SPEC: Record<CallOutcome, { glyph: string; label: string; cls: string }> = {
  UPSTREAM: { glyph: '●', label: 'UPSTREAM', cls: 'text-good border-good' },
  FALLBACK: { glyph: '▲', label: 'FALLBACK', cls: 'text-warning border-warning' },
  ERROR: { glyph: '✕', label: '504', cls: 'text-critical border-critical' },
}

export function Outcome({ outcome, showNote = false }: { outcome: CallOutcome; showNote?: boolean }) {
  const { t } = useCopy()
  const spec = SPEC[outcome]
  return (
    <span className="inline-flex items-baseline gap-2">
      <span
        className={`inline-flex items-baseline gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide ${spec.cls}`}
      >
        <span aria-hidden="true">{spec.glyph}</span>
        {spec.label}
      </span>
      {showNote && <span className="text-sm text-ink-2">{t.ui.outcomeNotes[outcome]}</span>}
    </span>
  )
}
