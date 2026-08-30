import { useEffect, useRef, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { subscribeToFrames } from '../lib/clock'
import { msTicking } from '../lib/format'
import { Outcome } from '../components/Outcome'
import { useCopy } from '../i18n/locale'

const REAL_WAIT_MS = 5000

/**
 * The reader waits five real seconds. Once.
 *
 * Every instinct says to fake this -- shrink it, speed it up, show a progress bar. All of those
 * destroy the point. Five seconds is long enough to be genuinely uncomfortable and short enough
 * that nobody leaves, and the discomfort is the argument. Nielsen's threshold for "I have lost my
 * train of thought" is one second; this sits five times past it.
 */
export function TheHang() {
  const { t } = useCopy()
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'done'>('idle')
  const readout = useRef<HTMLSpanElement>(null)
  const startedAt = useRef(0)

  useEffect(() => {
    if (phase !== 'waiting') return
    startedAt.current = performance.now()
    return subscribeToFrames(() => {
      const elapsed = performance.now() - startedAt.current
      if (readout.current) readout.current.textContent = msTicking(Math.min(elapsed, REAL_WAIT_MS))
      if (elapsed >= REAL_WAIT_MS) setPhase('done')
    })
  }, [phase])

  return (
    <Section id="the-hang" eyebrow="§1" title={t.hang.title}>
      <p>{t.hang.p1}</p>
      <p>{t.hang.p2}</p>

      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => phase !== 'waiting' && setPhase('waiting')}
            disabled={phase === 'waiting'}
            className="rounded-lg bg-caller px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {phase === 'idle' ? t.hang.idle : phase === 'waiting' ? t.hang.waiting : t.hang.again}
          </button>

          {phase !== 'idle' && (
            <span className="tnum font-mono text-sm text-ink-2">
              {t.hang.elapsed} <span ref={readout}>0.00 s</span>
            </span>
          )}
          {phase === 'done' && <Outcome outcome="UPSTREAM" />}
        </div>

        {phase === 'done' && (
          <p className="mt-4 border-t border-hairline pt-4 text-sm text-ink-2">{t.hang.after}</p>
        )}
      </Panel>

      <p>{t.hang.p3}</p>
    </Section>
  )
}
