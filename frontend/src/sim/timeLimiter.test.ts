import { describe, expect, it } from 'vitest'
import { frameAt, simulateCall, type CallConfig } from './timeLimiter'

const base: CallConfig = {
  upstreamLatencyMs: 5000,
  timeoutMs: 2000,
  hasFallback: true,
  cancelRunningFuture: true,
}

describe('simulateCall', () => {
  it('returns the upstream value when it beats the deadline', () => {
    const call = simulateCall({ ...base, upstreamLatencyMs: 100 })

    expect(call.timedOut).toBe(false)
    expect(call.caller.outcome).toBe('UPSTREAM')
    expect(call.caller.status).toBe(200)
    expect(call.caller.releasedAtMs).toBe(100)
    expect(call.wastedWorkMs).toBe(0)
    expect(call.worker.cancelSignalledAtMs).toBeNull()
  })

  it('serves the fallback at the deadline when the upstream is too slow', () => {
    const call = simulateCall(base)

    expect(call.timedOut).toBe(true)
    expect(call.caller.outcome).toBe('FALLBACK')
    expect(call.caller.status).toBe(200)
    expect(call.caller.releasedAtMs).toBe(2000)
  })

  it('surfaces a 504 when no fallback resolves', () => {
    // The project's original bug: a fallback existed, but its signature meant it was never found.
    const call = simulateCall({ ...base, hasFallback: false })

    expect(call.caller.outcome).toBe('ERROR')
    expect(call.caller.status).toBe(504)
    expect(call.caller.releasedAtMs).toBe(2000)
  })

  it('keeps the worker running past the caller being released', () => {
    const call = simulateCall(base)

    expect(call.caller.releasedAtMs).toBe(2000)
    expect(call.worker.finishedAtMs).toBe(5000)
    expect(call.worker.finishedAtMs).toBeGreaterThan(call.caller.releasedAtMs)
    expect(call.wastedWorkMs).toBe(3000)
    expect(call.spanMs).toBe(5000)
  })

  it('signals cancel without interrupting the work', () => {
    const call = simulateCall(base)

    expect(call.worker.cancelSignalledAtMs).toBe(2000)
    expect(call.worker.interrupted).toBe(false)
    // The decisive assertion: cancel changed nothing about when the thread came free.
    expect(call.worker.finishedAtMs).toBe(base.upstreamLatencyMs)
  })

  it('finishes at the same time whether or not cancel is enabled', () => {
    const withCancel = simulateCall({ ...base, cancelRunningFuture: true })
    const without = simulateCall({ ...base, cancelRunningFuture: false })

    expect(withCancel.worker.finishedAtMs).toBe(without.worker.finishedAtMs)
    expect(without.worker.cancelSignalledAtMs).toBeNull()
  })
})

describe('frameAt', () => {
  const call = simulateCall(base)

  it('withholds the outcome until the caller is released', () => {
    expect(frameAt(call, 1999).outcome).toBeNull()
    expect(frameAt(call, 2000).outcome).toBe('FALLBACK')
  })

  it('shows the caller done while the worker is still busy', () => {
    const frame = frameAt(call, 3500)

    expect(frame.callerDone).toBe(true)
    expect(frame.workerDone).toBe(false)
    expect(frame.callerElapsedMs).toBe(2000) // clamped at release
    expect(frame.workerElapsedMs).toBe(3500) // still climbing
    expect(frame.cancelSignalled).toBe(true)
  })

  it('clamps both tracks once settled', () => {
    const frame = frameAt(call, 99_999)

    expect(frame.callerElapsedMs).toBe(2000)
    expect(frame.workerElapsedMs).toBe(5000)
    expect(frame.callerDone && frame.workerDone).toBe(true)
  })

  it('is pure, so scrubbing backwards gives the same answer', () => {
    expect(frameAt(call, 1200)).toEqual(frameAt(call, 1200))
    expect(frameAt(call, 0).workerElapsedMs).toBe(0)
    expect(frameAt(call, -50).tMs).toBe(0)
  })
})
