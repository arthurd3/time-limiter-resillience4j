import { useMemo, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { Slider, Stat } from '../components/Controls'
import { Sparkline } from '../components/Sparkline'
import { simulatePool } from '../sim/threadPool'
import { ms } from '../lib/format'

const DURATION_MS = 30_000

/**
 * The section that has to stay honest.
 *
 * It would be easy -- and wrong -- to show a timeout rescuing everything. It rescues the caller.
 * The `upstream in flight` figure is here to say the rest out loud: bounding your own wait does
 * nothing for the dependency, and can make its load worse.
 */
export function PoolExhaustion() {
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

  const capacityPerSec = (workers / (without.holdMs / 1000))
  const queueMax = Math.max(without.maxQueueDepth, with_.maxQueueDepth)
  const inFlightMax = Math.max(without.peakUpstreamInFlight, with_.peakUpstreamInFlight)

  return (
    <Section id="exhaustion" eyebrow="§2" title="Why one slow dependency takes everything down">
      <p>
        A pool of threads serves incoming requests. Each request calls the slow dependency and holds
        its thread until the call returns. Nothing here is failing &mdash; the dependency answers
        every time, just slowly.
      </p>
      <p>
        The arithmetic is unforgiving. A pool of {workers} threads, each held for {ms(without.holdMs)},
        retires <b className="text-ink tnum">{capacityPerSec.toFixed(1)}</b> requests per second. Ask
        for more than that and the queue does not stabilise &mdash; it grows for as long as the
        traffic lasts.
      </p>

      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Slider label="Pool size" value={workers} min={2} max={40} onChange={setWorkers} format={(v) => `${v} threads`} />
          <Slider label="Arrival rate" value={rate} min={1} max={60} onChange={setRate} format={(v) => `${v} req/s`} />
          <Slider label="Dependency latency" value={latency} min={100} max={8000} step={100} onChange={setLatency} format={ms} />
          <Slider label="Timeout" value={timeout_} min={100} max={4000} step={50} onChange={setTimeout_} format={ms} accent="var(--color-critical)" />
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-hairline pt-4">
          <Stat label="Offered" value={`${rate.toFixed(0)} req/s`} />
          <Stat label="Capacity (no timeout)" value={`${capacityPerSec.toFixed(1)} req/s`} />
          <Stat
            label="Verdict"
            value={without.saturated ? 'SATURATED' : 'keeping up'}
            tone={without.saturated ? 'critical' : 'good'}
            note={without.saturated ? 'arrivals exceed what the pool can retire' : undefined}
          />
        </div>
      </Panel>

      {guessed === null ? (
        <Panel>
          <p className="mb-3 text-sm font-medium text-ink">
            Before the answer: add a {ms(timeout_)} timeout. What happens to the load on the
            dependency itself?
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ['down', 'It drops — fewer calls get through'],
              ['same', 'Unchanged — same traffic either way'],
              ['up', 'It rises — more calls reach it'],
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
              <h3 className="mb-2 text-sm font-semibold text-critical">No timeout</h3>
              <div className="flex gap-5">
                <Stat label="p99 latency" value={ms(without.p99LatencyMs)} tone="critical" />
                <Stat label="Peak queue" value={`${without.maxQueueDepth}`} tone="critical" />
              </div>
              <div className="mt-3">
                <Sparkline
                  values={without.snapshots.map((s) => s.queueDepth)}
                  max={queueMax}
                  title="Queue depth"
                  peakLabel={`peak ${without.maxQueueDepth} waiting`}
                  tone="var(--color-critical)"
                />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-good">With a {ms(timeout_)} timeout</h3>
              <div className="flex gap-5">
                <Stat label="p99 latency" value={ms(with_.p99LatencyMs)} tone="good" />
                <Stat label="Peak queue" value={`${with_.maxQueueDepth}`} tone="good" />
              </div>
              <div className="mt-3">
                <Sparkline
                  values={with_.snapshots.map((s) => s.queueDepth)}
                  max={queueMax}
                  title="Queue depth"
                  peakLabel={`peak ${with_.maxQueueDepth} waiting`}
                  tone="var(--color-good)"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-hairline pt-4">
            <p className="mb-3 text-sm font-semibold text-ink">
              But look at the dependency, not at yourself.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <Sparkline
                values={without.snapshots.map((s) => s.upstreamInFlight)}
                max={inFlightMax}
                title="Calls in flight upstream — no timeout"
                peakLabel={`peak ${without.peakUpstreamInFlight} concurrent`}
                tone="var(--color-worker)"
              />
              <Sparkline
                values={with_.snapshots.map((s) => s.upstreamInFlight)}
                max={inFlightMax}
                title={`Calls in flight upstream — with timeout`}
                peakLabel={`peak ${with_.peakUpstreamInFlight} concurrent`}
                tone="var(--color-worker)"
              />
            </div>
            <p className="mt-3 text-sm text-ink-2">
              {with_.peakUpstreamInFlight > without.peakUpstreamInFlight ? (
                <>
                  The timeout <b className="text-ink">increased</b> the load on the struggling
                  dependency, from {without.peakUpstreamInFlight} concurrent calls to{' '}
                  {with_.peakUpstreamInFlight}. Without a timeout the saturated pool was acting as
                  an accidental throttle: at most {workers} calls could be in flight, because there
                  were only {workers} threads to make them. Retiring requests faster just means
                  making new calls faster.
                </>
              ) : (
                <>
                  At these settings the pool is not saturated, so the timeout changes little. Push
                  the arrival rate up until the verdict reads SATURATED and compare again.
                </>
              )}
            </p>
            {guessed !== 'up' && with_.peakUpstreamInFlight > without.peakUpstreamInFlight && (
              <p className="mt-2 text-sm text-ink-muted">
                Worth sitting with if that is not what you picked. It is the single most common
                misconception about timeouts.
              </p>
            )}
          </div>
        </Panel>
      )}

      <p>
        So a timeout protects <b className="text-ink">the caller</b>, and only the caller. It bounds
        what you are willing to wait; it cannot reach across the network and stop work already
        running. If the dependency is failing rather than merely slow, you need something that stops
        calling it &mdash; which is the argument for pairing a TimeLimiter with a circuit breaker or
        a bulkhead, not treating it as the whole answer.
      </p>
    </Section>
  )
}
