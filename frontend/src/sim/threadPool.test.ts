import { describe, expect, it } from 'vitest'
import { percentile, simulatePool, type PoolConfig } from './threadPool'

/** 10 threads, 20 req/s, a dependency that takes 3s. Comfortably more than the pool can absorb. */
const overloaded: PoolConfig = {
  workers: 10,
  arrivalRatePerSec: 20,
  upstreamLatencyMs: 3000,
  timeoutMs: null,
  durationMs: 10_000,
}

describe('percentile', () => {
  it('picks the expected ranks', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(percentile(xs, 50)).toBe(5)
    expect(percentile(xs, 99)).toBe(10)
    expect(percentile([], 50)).toBe(0)
  })
})

describe('simulatePool', () => {
  it('holds a thread for the full dependency latency when there is no timeout', () => {
    const result = simulatePool(overloaded)
    expect(result.holdMs).toBe(3000)
    expect(result.saturated).toBe(true)
  })

  it('collapses under load without a timeout', () => {
    const result = simulatePool(overloaded)

    // Queue grows without bound and latency is dominated by waiting, not by the dependency.
    expect(result.maxQueueDepth).toBeGreaterThan(50)
    expect(result.p99LatencyMs).toBeGreaterThan(overloaded.upstreamLatencyMs * 5)
  })

  it('stays healthy once a timeout caps how long a thread is held', () => {
    const result = simulatePool({ ...overloaded, timeoutMs: 400 })

    expect(result.holdMs).toBe(400)
    expect(result.saturated).toBe(false)
    expect(result.maxQueueDepth).toBe(0)
    // Nobody waits for a thread, so felt latency is just the timeout.
    expect(result.p99LatencyMs).toBe(400)
  })

  it('is the queueing, not the dependency, that explodes latency', () => {
    const unbounded = simulatePool(overloaded)
    const bounded = simulatePool({ ...overloaded, timeoutMs: 400 })

    expect(unbounded.p99LatencyMs / bounded.p99LatencyMs).toBeGreaterThan(10)
  })

  it('never runs more concurrent work than it has threads', () => {
    const result = simulatePool(overloaded)
    for (const s of result.snapshots) {
      expect(s.busyWorkers).toBeLessThanOrEqual(overloaded.workers)
    }
  })

  it('does not reduce the load on the struggling dependency -- it increases it', () => {
    // The lesson that keeps this widget honest. Without a timeout the saturated pool acts as an
    // accidental throttle: at most `workers` calls can be in flight upstream. Add a timeout and
    // the pool retires requests fast enough to keep accepting new ones, so *more* work piles up
    // on the dependency, not less. A timeout protects the caller, never the callee -- which is
    // the argument for pairing it with a circuit breaker.
    const unbounded = simulatePool(overloaded)
    const bounded = simulatePool({ ...overloaded, timeoutMs: 400 })

    expect(unbounded.peakUpstreamInFlight).toBeLessThanOrEqual(overloaded.workers)
    expect(bounded.peakUpstreamInFlight).toBeGreaterThan(unbounded.peakUpstreamInFlight)
  })

  it('keeps upstream work running past the thread being released', () => {
    const bounded = simulatePool({ ...overloaded, timeoutMs: 400 })
    const r = bounded.requests[0]

    expect(r.releasedAtMs).toBe(400)
    expect(r.upstreamDoneAtMs).toBe(3000)
  })

  it('does not time out when the dependency beats the deadline', () => {
    const result = simulatePool({ ...overloaded, upstreamLatencyMs: 200, timeoutMs: 2000 })

    expect(result.holdMs).toBe(200)
    expect(result.requests.every((r) => !r.timedOut)).toBe(true)
  })
})
