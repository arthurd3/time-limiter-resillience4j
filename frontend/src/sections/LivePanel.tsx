import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { Choice, Stat } from '../components/Controls'
import { Outcome } from '../components/Outcome'
import { subscribeToFrames } from '../lib/clock'
import { ms, msTicking } from '../lib/format'
import { useCopy } from '../i18n/locale'
import { P, RichText } from '../i18n/RichText'
import {
  callForecast,
  fetchTimeLimiterCounts,
  isForecast,
  probeHealth,
  type LiveResult,
  type TimeLimiterCounts,
} from '../lib/api'

const SCALE_MS = 6000
const DEADLINE_MS = 2000

type Preset = '100' | '1900' | '2100' | '5000' | 'omit' | '40000'

export function LivePanel() {
  const { t } = useCopy()
  const [up, setUp] = useState<boolean | null>(null)
  const [preset, setPreset] = useState<Preset>('5000')
  const [inFlight, setInFlight] = useState(false)
  const [result, setResult] = useState<LiveResult | null>(null)
  const [delta, setDelta] = useState<TimeLimiterCounts | null>(null)
  const ticker = useRef<HTMLSpanElement>(null)

  const presets: { value: Preset; label: string }[] = [
    { value: '100', label: '100 ms' },
    { value: '1900', label: '1900 ms' },
    { value: '2100', label: '2100 ms' },
    { value: '5000', label: '5000 ms' },
    { value: 'omit', label: t.live.omitParam },
    { value: '40000', label: t.live.invalid },
  ]

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const ok = await probeHealth()
      if (!cancelled) setUp(ok)
    }
    check()
    const id = setInterval(() => !document.hidden && check(), 15_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (!inFlight) return
    const startedAt = performance.now()
    return subscribeToFrames(() => {
      if (ticker.current) ticker.current.textContent = msTicking(performance.now() - startedAt)
    })
  }, [inFlight])

  const run = useCallback(async () => {
    setInFlight(true)
    setResult(null)
    setDelta(null)
    const before = await fetchTimeLimiterCounts()
    const delayMs = preset === 'omit' ? null : Number(preset)
    const res = await callForecast({ delayMs })
    const after = await fetchTimeLimiterCounts()
    setResult(res)
    if (before && after) {
      setDelta({
        successful: after.successful - before.successful,
        timeout: after.timeout - before.timeout,
        failed: after.failed - before.failed,
      })
    }
    setInFlight(false)
    setUp(res.failure?.kind !== 'unreachable')
  }, [preset])

  const requested = preset === 'omit' ? 5000 : Number(preset)
  const observed = result?.observedLatencyMs ?? 0
  const pct = (v: number) => `${Math.min(100, (v / SCALE_MS) * 100)}%`
  const deltaLabel = delta?.timeout
    ? t.live.timeoutDelta.replace('{n}', String(delta.timeout))
    : t.live.successDelta.replace('{n}', String(delta?.successful ?? 0))

  return (
    <Section id="live" eyebrow="§6" title={t.live.title}>
      <P>{t.live.p1}</P>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Choice value={preset} onChange={setPreset} options={presets} />
          <span className="flex items-center gap-2 text-xs">
            <span
              className="inline-block size-2 rounded-full"
              style={{
                background:
                  up === null ? 'var(--color-ink-muted)' : up ? 'var(--color-good)' : 'var(--color-critical)',
              }}
              aria-hidden="true"
            />
            <span className="text-ink-muted">
              {up === null ? t.live.checking : up ? t.live.reachable : t.live.unreachable}
            </span>
          </span>
        </div>

        {up === false && (
          <div className="mb-4 rounded-lg border border-hairline bg-plane p-3 text-sm text-ink-2">
            <p className="mb-2">{t.live.startPrompt}</p>
            <pre className="overflow-x-auto font-mono text-[12px]">
{`JAVA_HOME=/usr/lib/jvm/java-25-openjdk ./mvnw spring-boot:run`}
            </pre>
            <p className="mt-2 text-xs text-ink-muted">{t.live.worksWithout}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={run}
            disabled={inFlight}
            className="rounded-lg bg-caller px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {inFlight ? t.live.running : t.live.send}
          </button>
          {inFlight && (
            <span className="tnum font-mono text-sm text-ink-2">
              {t.hang.elapsed} <span ref={ticker}>0.00 s</span>
            </span>
          )}
        </div>

        {result && (
          <div className="mt-5 border-t border-hairline pt-4">
            {/* Two bars on the page's usual scale: one measured, one inferred. */}
            <div className="relative mb-4 flex flex-col gap-2">
              <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <div className="text-right text-xs font-semibold">{t.ui.caller}</div>
                <div className="relative h-6 overflow-hidden rounded-md bg-grid/50">
                  <div
                    className="absolute inset-y-1 left-0 rounded bg-caller"
                    style={{ width: pct(observed) }}
                  />
                  <div
                    className="absolute inset-y-0 w-px bg-critical"
                    style={{ left: pct(DEADLINE_MS) }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold">{t.ui.worker}</div>
                  <div className="text-[11px] text-ink-muted">{t.ui.inferred}</div>
                </div>
                <div className="relative h-6 overflow-hidden rounded-md bg-grid/50">
                  <div
                    className="absolute inset-y-1 left-0 rounded border border-dashed border-worker"
                    style={{ width: pct(requested) }}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <Stat label={t.live.measured} value={ms(observed)} note={t.live.measuredNote} />
              <Stat label={t.live.http} value={result.httpStatus ? String(result.httpStatus) : '—'} />
              {isForecast(result.body) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-muted">
                    {t.live.outcome}
                  </div>
                  <Outcome outcome={result.body.source} />
                </div>
              )}
            </div>

            {result.failure ? (
              <p className="text-sm text-critical">
                {result.failure.kind === 'unreachable'
                  ? result.failure.hint
                  : t.live.failed.replace('{kind}', result.failure.kind)}
              </p>
            ) : (
              <pre className="overflow-x-auto rounded-lg border border-hairline bg-plane p-3 font-mono text-[12px] leading-5">
{JSON.stringify(result.body, null, 2)}
              </pre>
            )}

            {delta && (delta.successful || delta.timeout || delta.failed) ? (
              <p className="mt-3 text-sm text-ink-2">
                <RichText values={{ delta: deltaLabel }}>{t.live.serverAgrees}</RichText>
              </p>
            ) : null}

            <p className="mt-3 text-xs text-ink-muted">
              {t.live.provenance}
              {observed > DEADLINE_MS && observed < DEADLINE_MS + 400 &&
                t.live.aboveDeadline.replace('{deadline}', ms(DEADLINE_MS))}
            </p>
          </div>
        )}
      </Panel>
    </Section>
  )
}
