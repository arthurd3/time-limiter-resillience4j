/**
 * A deterministic model of a fixed thread pool serving requests that call one slow dependency.
 *
 * This models the *common* shape, not the shape of the demo app: a service that calls its
 * dependency synchronously, on the thread serving the request. That is where a missing timeout
 * does its damage, because the serving thread is held for as long as the dependency takes.
 *
 * The lesson it exists to show: the dependency being slow is not what takes the service down.
 * The service goes down because every serving thread ends up parked on that dependency, so
 * requests that never touch it cannot get a thread either.
 *
 * Arrivals are evenly spaced rather than random, so the simulation is reproducible and a reader
 * moving a slider sees a change caused by the slider and not by noise.
 */

export interface PoolConfig {
  /** Threads available to serve requests. */
  workers: number
  /** Steady arrival rate, requests per second. */
  arrivalRatePerSec: number
  /** How long the dependency takes to answer, in ms. */
  upstreamLatencyMs: number
  /** `null` models an unbounded wait — no timeout at all. */
  timeoutMs: number | null
  /** How long to simulate, in ms. */
  durationMs: number
}

export interface PoolRequest {
  id: number
  arrivedAtMs: number
  /** When a thread picked it up. Equal to arrival only when a thread was free. */
  startedAtMs: number
  /** When the client got its answer. */
  releasedAtMs: number
  /** Time spent waiting for a thread — the cost paid by requests that did nothing wrong. */
  queuedMs: number
  /** Arrival to answer. This is the latency a user actually feels. */
  latencyMs: number
  /**
   * When the upstream work actually ends. A timeout releases the serving thread at `releasedAtMs`,
   * but it does not reach across the network and stop the dependency: that work runs its course.
   */
  upstreamDoneAtMs: number
  timedOut: boolean
}

export interface PoolSnapshot {
  tMs: number
  busyWorkers: number
  queueDepth: number
  /**
   * Work still in flight at the dependency. A timeout does nothing to this number -- which is the
   * point. A timeout protects the caller; it does not protect the callee. If the dependency is
   * failing rather than merely slow, bounding your own wait is necessary but not sufficient.
   */
  upstreamInFlight: number
}

export interface PoolResult {
  requests: PoolRequest[]
  snapshots: PoolSnapshot[]
  /** How long a serving thread is held per request. The whole point of a timeout. */
  holdMs: number
  p50LatencyMs: number
  p99LatencyMs: number
  maxQueueDepth: number
  /** Peak concurrent work at the dependency. A timeout does not reduce this. */
  peakUpstreamInFlight: number
  /** True once the queue grows without bound — arrivals outpace what the pool can retire. */
  saturated: boolean
}

const SNAPSHOT_STEP_MS = 50

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

export function simulatePool(config: PoolConfig): PoolResult {
  const { workers, arrivalRatePerSec, upstreamLatencyMs, timeoutMs, durationMs } = config

  // A timeout caps how long the thread is held; without one it is held for the full latency.
  const holdMs = timeoutMs === null ? upstreamLatencyMs : Math.min(upstreamLatencyMs, timeoutMs)
  const timedOut = timeoutMs !== null && upstreamLatencyMs > timeoutMs

  const intervalMs = 1000 / arrivalRatePerSec
  const requests: PoolRequest[] = []

  // freeAt[i] is when thread i next becomes available.
  const freeAt = new Array<number>(workers).fill(0)

  for (let id = 0, arrivedAtMs = 0; arrivedAtMs < durationMs; id++, arrivedAtMs += intervalMs) {
    let idx = 0
    for (let i = 1; i < workers; i++) if (freeAt[i] < freeAt[idx]) idx = i

    const startedAtMs = Math.max(arrivedAtMs, freeAt[idx])
    const releasedAtMs = startedAtMs + holdMs
    freeAt[idx] = releasedAtMs

    requests.push({
      id,
      arrivedAtMs,
      startedAtMs,
      releasedAtMs,
      queuedMs: startedAtMs - arrivedAtMs,
      latencyMs: releasedAtMs - arrivedAtMs,
      upstreamDoneAtMs: startedAtMs + upstreamLatencyMs,
      timedOut,
    })
  }

  const snapshots: PoolSnapshot[] = []
  let maxQueueDepth = 0
  for (let t = 0; t <= durationMs; t += SNAPSHOT_STEP_MS) {
    let busy = 0
    let queued = 0
    let inFlight = 0
    for (const r of requests) {
      if (r.arrivedAtMs > t) break // arrivals are ordered, so nothing later can qualify
      if (r.startedAtMs <= t && t < r.releasedAtMs) busy++
      else if (t < r.startedAtMs) queued++
      if (r.startedAtMs <= t && t < r.upstreamDoneAtMs) inFlight++
    }
    maxQueueDepth = Math.max(maxQueueDepth, queued)
    snapshots.push({ tMs: t, busyWorkers: busy, queueDepth: queued, upstreamInFlight: inFlight })
  }

  const latencies = requests.map((r) => r.latencyMs).sort((a, b) => a - b)

  // Capacity check: a pool of N threads each held for holdMs retires N/holdMs requests per ms.
  const serviceRatePerSec = (workers / holdMs) * 1000

  return {
    requests,
    snapshots,
    holdMs,
    p50LatencyMs: percentile(latencies, 50),
    p99LatencyMs: percentile(latencies, 99),
    maxQueueDepth,
    peakUpstreamInFlight: snapshots.reduce((m, s) => Math.max(m, s.upstreamInFlight), 0),
    saturated: arrivalRatePerSec > serviceRatePerSec,
  }
}
