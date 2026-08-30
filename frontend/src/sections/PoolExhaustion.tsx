import { useMemo, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { Slider, Stat } from '../components/Controls'
import { Sparkline } from '../components/Sparkline'
import { simulatePool } from '../sim/threadPool'
import { ms } from '../lib/format'
import { useCopy } from '../i18n/locale'
import { P, RichText } from '../i18n/RichText'

const DURATION_MS = 30_000

/**
 * The section that has to stay honest.
 *
 * It would be easy -- and wrong -- to show a timeout rescuing everything. It rescues the caller.
 * The upstream-in-flight figures are here to say the rest out loud: bounding your own wait does
 * nothing for the dependency, and at saturation it makes that dependency's load worse.
 */
export function PoolExhaustion() {
  const { t } = useCopy()
  const [workers, setWorkers] = useState(10)
  const [rate, setRate] = useState(20)
  const [latency, setLatency] = useState(3000)
  const [timeout_, setTimeout_] = useState(400)
  const [guessed, setGuessed] = useState<string | null>(null)

  const base = { workers, arrivalRatePerSec: rate, upstreamLatencyMs: latency, durationMs: DURATION_MS }
  const without = useMemo(() => simulatePool({ ...base, timeoutMs: null }), [workers, rate, latency])
  const with_ = useMemo(
    () => simulatePool({ ...base, timeoutMs: timeout_ }),
    [workers, rate, latency, timeout_],
  )

  const capacityPerSec = workers / (without.holdMs / 1000)
  const queueMax = Math.max(without.maxQueueDepth, with_.maxQueueDepth)
  const inFlightMax = Math.max(without.peakUpstreamInFlight, with_.peakUpstreamInFlight)
  const worse = with_.peakUpstreamInFlight > without.peakUpstreamInFlight

  return (
    <Section id="exhaustion" eyebrow="§2" title={t.pool.title}>
      <P>{t.pool.p1}</P>
      <p>
        <RichText
          values={{
            workers: String(workers),
            hold: ms(without.holdMs),
            capacity: capacityPerSec.toFixed(1),
          }}
        >
          {t.pool.p2}
        </RichText>
      </p>

      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label={t.pool.poolSize} value={workers} min={2} max={40} onChange={setWorkers} format={(v) => `${v} ${t.pool.threads}`} />
          <Slider label={t.pool.arrivalRate} value={rate} min={1} max={60} onChange={setRate} format={(v) => `${v} ${t.pool.reqPerSec}`} />
          <Slider label={t.pool.latency} value={latency} min={100} max={8000} step={100} onChange={setLatency} format={ms} />
          <Slider label={t.pool.timeout} value={timeout_} min={100} max={4000} step={50} onChange={setTimeout_} format={ms} accent="var(--color-critical)" />
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-hairline pt-4">
          <Stat label={t.pool.offered} value={`${rate.toFixed(0)} ${t.pool.reqPerSec}`} />
          <Stat label={t.pool.capacity} value={`${capacityPerSec.toFixed(1)} ${t.pool.reqPerSec}`} />
          <Stat
            label={t.pool.verdict}
            value={without.saturated ? t.pool.saturated : t.pool.keepingUp}
            tone={without.saturated ? 'critical' : 'good'}
            note={without.saturated ? t.pool.saturatedNote : undefined}
          />
        </div>
      </Panel>

      {guessed === null ? (
        <Panel>
          <p className="mb-3 text-sm font-medium text-ink">
            <RichText values={{ timeout: ms(timeout_) }}>{t.pool.question}</RichText>
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ['down', t.pool.guessDown],
              ['same', t.pool.guessSame],
              ['up', t.pool.guessUp],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setGuessed(k)}
                className="rounded-lg border border-hairline px-3 py-2 text-xs font-medium hover:bg-grid/50"
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-critical">{t.pool.noTimeout}</h3>
              <div className="flex gap-5">
                <Stat label={t.pool.p99} value={ms(without.p99LatencyMs)} tone="critical" />
                <Stat label={t.pool.peakQueue} value={`${without.maxQueueDepth}`} tone="critical" />
              </div>
              <div className="mt-3">
                <Sparkline
                  values={without.snapshots.map((s) => s.queueDepth)}
                  max={queueMax}
                  title={t.pool.queueDepth}
                  peakLabel={t.pool.peakWaiting.replace('{n}', String(without.maxQueueDepth))}
                  tone="var(--color-critical)"
                />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-good">
                {t.pool.withTimeout.replace('{timeout}', ms(timeout_))}
              </h3>
              <div className="flex gap-5">
                <Stat label={t.pool.p99} value={ms(with_.p99LatencyMs)} tone="good" />
                <Stat label={t.pool.peakQueue} value={`${with_.maxQueueDepth}`} tone="good" />
              </div>
              <div className="mt-3">
                <Sparkline
                  values={with_.snapshots.map((s) => s.queueDepth)}
                  max={queueMax}
                  title={t.pool.queueDepth}
                  peakLabel={t.pool.peakWaiting.replace('{n}', String(with_.maxQueueDepth))}
                  tone="var(--color-good)"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-hairline pt-4">
            <p className="mb-3 text-sm font-semibold text-ink">{t.pool.lookAtDependency}</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <Sparkline
                values={without.snapshots.map((s) => s.upstreamInFlight)}
                max={inFlightMax}
                title={t.pool.inFlightNo}
                peakLabel={t.pool.peakConcurrent.replace('{n}', String(without.peakUpstreamInFlight))}
                tone="var(--color-worker)"
              />
              <Sparkline
                values={with_.snapshots.map((s) => s.upstreamInFlight)}
                max={inFlightMax}
                title={t.pool.inFlightYes}
                peakLabel={t.pool.peakConcurrent.replace('{n}', String(with_.peakUpstreamInFlight))}
                tone="var(--color-worker)"
              />
            </div>
            <p className="mt-3 text-sm text-ink-2">
              {worse ? (
                <RichText
                  values={{
                    before: String(without.peakUpstreamInFlight),
                    after: String(with_.peakUpstreamInFlight),
                    workers: String(workers),
                  }}
                >
                  {t.pool.increased}
                </RichText>
              ) : (
                t.pool.notSaturated
              )}
            </p>
            {guessed !== 'up' && worse && (
              <p className="mt-2 text-sm text-ink-muted">{t.pool.misconception}</p>
            )}
          </div>
        </Panel>
      )}

      <P>{t.pool.p3}</P>
    </Section>
  )
}
