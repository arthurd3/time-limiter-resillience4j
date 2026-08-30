import { useRef, useState } from 'react'
import { frameAt, type SimulatedCall } from '../sim/timeLimiter'
import { useTimeline } from '../lib/useTimeline'
import { msTicking } from '../lib/format'
import { Outcome } from './Outcome'
import { useCopy } from '../i18n/locale'

/**
 * The page's one timeline. Every other time-based figure reuses it, so a bar of a given length
 * always means the same duration and the deadline is always the same vertical rule.
 *
 * Bars are positioned with `translateX(start) scaleX(extent)` against a fixed ms-to-fraction scale.
 * Transform rather than width keeps a 60fps tick off the layout path, and no bar contains text --
 * scaleX would stretch the glyphs.
 */

interface BarStyle {
  fill: string
  /** Hollow bars are the visual for work nobody is waiting for any more. */
  hollow?: boolean
}

function setBar(el: HTMLElement | null, startMs: number, endMs: number, scaleMs: number) {
  if (!el) return
  const extent = Math.max(0, endMs - startMs) / scaleMs
  el.style.transform = `translateX(${(startMs / scaleMs) * 100}%) scaleX(${extent})`
  el.style.opacity = extent <= 0 ? '0' : '1'
}

/** One lane. Renders as two grid cells so the deadline overlay can span the track column alone. */
function Track({
  label,
  sub,
  row,
  children,
}: {
  label: string
  sub?: string
  row: number
  children: React.ReactNode
}) {
  return (
    <>
      <div className="self-center text-right" style={{ gridRow: row, gridColumn: 1 }}>
        <div className="text-xs font-semibold">{label}</div>
        {sub && <div className="text-[11px] leading-tight text-ink-muted">{sub}</div>}
      </div>
      <div
        className="relative h-7 overflow-hidden rounded-md bg-grid/50"
        style={{ gridRow: row, gridColumn: 2 }}
      >
        {children}
      </div>
    </>
  )
}

function Bar({
  refEl,
  style,
}: {
  refEl: React.RefObject<HTMLDivElement | null>
  style: BarStyle
}) {
  return (
    <div
      ref={refEl}
      className="bar-scale absolute inset-y-1 left-0 w-full rounded"
      style={
        style.hollow
          ? {
              border: `1.5px solid ${style.fill}`,
              backgroundImage: `repeating-linear-gradient(45deg, ${style.fill}33 0 5px, transparent 5px 10px)`,
              transform: 'scaleX(0)',
            }
          : { background: style.fill, transform: 'scaleX(0)' }
      }
    />
  )
}

export function CallTimeline({
  call,
  scaleMs,
  autoPlay = false,
  loop = false,
}: {
  call: SimulatedCall
  scaleMs: number
  autoPlay?: boolean
  loop?: boolean
}) {
  const { t } = useCopy()
  const callerBar = useRef<HTMLDivElement>(null)
  const workerBar = useRef<HTMLDivElement>(null)
  const orphanBar = useRef<HTMLDivElement>(null)
  const playhead = useRef<HTMLDivElement>(null)
  const readout = useRef<HTMLSpanElement>(null)

  // Only discrete changes go through React. The bars are written to directly, every frame.
  const [settled, setSettled] = useState(false)

  const controls = useTimeline(
    scaleMs,
    (t) => {
      const f = frameAt(call, t)
      setBar(callerBar.current, 0, f.callerElapsedMs, scaleMs)
      setBar(workerBar.current, 0, Math.min(f.workerElapsedMs, call.caller.releasedAtMs), scaleMs)
      setBar(orphanBar.current, call.caller.releasedAtMs, f.workerElapsedMs, scaleMs)
      if (playhead.current) playhead.current.style.transform = `translateX(${(t / scaleMs) * 100}%)`
      if (readout.current) readout.current.textContent = msTicking(t)
      setSettled((prev) => (prev === f.callerDone ? prev : f.callerDone))
    },
    { autoPlay, loop },
  )

  const deadlinePct = (call.config.timeoutMs / scaleMs) * 100

  return (
    <div>
      <div className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2">
        <Track label={t.ui.caller} sub={t.ui.callerSub} row={1}>
          <Bar refEl={callerBar} style={{ fill: 'var(--color-caller)' }} />
          <div
            ref={playhead}
            className="bar-scale pointer-events-none absolute inset-y-0 left-0 w-px bg-ink/25"
            aria-hidden="true"
          />
        </Track>
        <Track label={t.ui.worker} sub={t.ui.workerSub} row={2}>
          <Bar refEl={workerBar} style={{ fill: 'var(--color-worker)' }} />
          <Bar refEl={orphanBar} style={{ fill: 'var(--color-warning)', hollow: true }} />
        </Track>

        {/* The deadline, drawn once across the track column. Same rule, same colour, every figure. */}
        <div
          className="pointer-events-none relative"
          style={{ gridColumn: 2, gridRow: '1 / -1' }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 w-px bg-critical"
            style={{ left: `${deadlinePct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[7.5rem_1fr] gap-3">
        <div />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={controls.replay}
            className="rounded-md border border-hairline px-3 py-1 text-xs font-medium hover:bg-grid/40"
          >
            {controls.playing ? t.ui.replay : t.ui.play}
          </button>
          <span className="tnum font-mono text-xs text-ink-muted">
            t = <span ref={readout}>0.00 s</span>
          </span>
          {settled && <Outcome outcome={call.caller.outcome} />}
        </div>
      </div>
    </div>
  )
}
