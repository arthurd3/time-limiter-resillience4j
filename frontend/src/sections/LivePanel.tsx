import { useCallback, useEffect, useRef, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { Choice, Stat } from '../components/Controls'
import { Outcome } from '../components/Outcome'
import { subscribeToFrames } from '../lib/clock'
import { ms, msTicking } from '../lib/format'
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

const PRESETS = [
  { value: '100', label: '100 ms' },
  { value: '1900', label: '1900 ms' },
  { value: '2100', label: '2100 ms' },
  { value: '5000', label: '5000 ms' },
  { value: 'omit', label: 'omit param' },
  { value: '40000', label: '40000 (invalid)' },
] as const

type Preset = (typeof PRESETS)[number]['value']

export function LivePanel() {
  const [up, setUp] = useState<boolean | null>(null)
  const [preset, setPreset] = useState<Preset>('5000')
  const [inFlight, setInFlight] = useState(false)
  const [result, setResult] = useState<LiveResult | null>(null)
  const [delta, setDelta] = useState<TimeLimiterCounts | null>(null)
  const ticker = useRef<HTMLSpanElement>(null)

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

  return (
    <Section id="live" eyebrow="§6" title="Now against a real server">
      <p>
        Everything above was a model. This section calls the actual Spring Boot app in this
        repository and times it in your browser with{' '}
        <code className="font-mono text-[13px]">performance.now()</code> &mdash; so the number below
        is what you would have waited, not what the server claims.
      </p>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Choice value={preset} onChange={setPreset} options={PRESETS.map((p) => ({ ...p }))} />
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
              {up === null ? 'checking API…' : up ? 'API reachable' : 'API not reachable'}
            </span>
          </span>
        </div>

        {up === false && (
          <div className="mb-4 rounded-lg border border-hairline bg-plane p-3 text-sm text-ink-2">
            <p className="mb-2">Start the API, then press Run:</p>
            <pre className="overflow-x-auto font-mono text-[12px]">
{`JAVA_HOME=/usr/lib/jvm/java-25-openjdk ./mvnw spring-boot:run`}
            </pre>
            <p className="mt-2 text-xs text-ink-muted">
              Everything above this section works without it.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={run}
            disabled={inFlight}
            className="rounded-lg bg-caller px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {inFlight ? 'Running…' : 'Send a real request'}
          </button>
          {inFlight && (
            <span className="tnum font-mono text-sm text-ink-2">
              elapsed <span ref={ticker}>0.00 s</span>
            </span>
          )}
        </div>

        {result && (
          <div className="mt-5 border-t border-hairline pt-4">
            {/* Two bars on the page's usual scale: one measured, one inferred. */}
            <div className="relative mb-4 flex flex-col gap-2">
              <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                <div className="text-right text-xs font-semibold">caller</div>
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
                  <div className="text-xs font-semibold">worker</div>
                  <div className="text-[11px] text-ink-muted">inferred</div>
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
              <Stat
                label="Measured"
                value={ms(observed)}
                note="browser wall clock, incl. network"
              />
              <Stat label="HTTP" value={result.httpStatus ? String(result.httpStatus) : '—'} />
              {isForecast(result.body) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-muted">Outcome</div>
                  <Outcome outcome={result.body.source} />
                </div>
              )}
            </div>

            {result.failure ? (
              <p className="text-sm text-critical">
                {result.failure.kind === 'unreachable' ? result.failure.hint : `Request ${result.failure.kind}.`}
              </p>
            ) : (
              <pre className="overflow-x-auto rounded-lg border border-hairline bg-plane p-3 font-mono text-[12px] leading-5">
{JSON.stringify(result.body, null, 2)}
              </pre>
            )}

            {delta && (delta.successful || delta.timeout || delta.failed) ? (
              <p className="mt-3 text-sm text-ink-2">
                The server agrees. Its own{' '}
                <code className="font-mono text-[12px]">resilience4j.timelimiter.calls</code> counter
                moved by{' '}
                <b className="text-ink">
                  {delta.timeout ? `+${delta.timeout} timeout` : `+${delta.successful} successful`}
                </b>{' '}
                while you were reading this.
              </p>
            ) : null}

            <p className="mt-3 text-xs text-ink-muted">
              The worker bar is dashed because it is inferred, not observed: it is the delay you
              asked the server for. A browser cannot see what a thread on the server is doing, and
              drawing it as though it could would be a lie in a page about honesty with timing.
              {observed > DEADLINE_MS && observed < DEADLINE_MS + 400 && (
                <> The measured value sits a little above {ms(DEADLINE_MS)} &mdash; scheduling and
                network, not a misconfigured deadline.</>
              )}
            </p>
          </div>
        )}
      </Panel>
    </Section>
  )
}
