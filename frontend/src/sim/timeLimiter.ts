/**
 * A deterministic model of one `@TimeLimiter`-guarded call.
 *
 * No wall-clock is read in here. Time is stepped in by the caller, so the same model drives a
 * 60fps animation, a scrubbable timeline, and a unit test that asserts exact millisecond values.
 *
 * The model deliberately keeps two independent tracks:
 *
 *   caller  — the thread waiting for a response. A timeout releases this one.
 *   worker  — the thread actually doing the upstream work. A timeout does NOT release this one.
 *
 * That gap is the least intuitive thing about TimeLimiter and the reason the tracks are modelled
 * separately rather than as a single duration.
 */

export type CallOutcome = 'UPSTREAM' | 'FALLBACK' | 'ERROR'

export interface CallConfig {
  /** How long the upstream takes to produce a value, in ms. */
  upstreamLatencyMs: number
  /** The configured `timeout-duration`, in ms. */
  timeoutMs: number
  /**
   * Whether a *correctly signed* fallback exists — parameters of the guarded method plus a
   * trailing Throwable. A wrongly signed one is not found at all, which is not the same as
   * having none: Resilience4j logs a warning and rethrows.
   */
  hasFallback: boolean
  /**
   * `cancel-running-future`. Cancels the wrapper future on timeout. It does not interrupt work
   * already running, because `CompletableFuture.cancel()` ignores `mayInterruptIfRunning`.
   */
  cancelRunningFuture: boolean
}

export interface CallerTrack {
  /** min(upstreamLatencyMs, timeoutMs) — when the client gets a response. */
  releasedAtMs: number
  outcome: CallOutcome
  /** The status the HTTP client observes: 200, or 504 when a timeout escapes with no fallback. */
  status: number
}

export interface WorkerTrack {
  /**
   * Always `upstreamLatencyMs`. The work runs to completion whether or not the caller is still
   * waiting for it and whether or not cancel was signalled.
   */
  finishedAtMs: number
  /** True when `cancel-running-future` fired — which is not the same as the work stopping. */
  cancelSignalledAtMs: number | null
  /** Always false for `CompletableFuture.supplyAsync`. Kept explicit so the UI can say so. */
  interrupted: boolean
}

export interface SimulatedCall {
  config: CallConfig
  caller: CallerTrack
  worker: WorkerTrack
  timedOut: boolean
  /** Wall time until *both* tracks are done — usually longer than the caller ever sees. */
  spanMs: number
  /** How long the worker stays busy after the caller has already been answered. */
  wastedWorkMs: number
}

export function simulateCall(config: CallConfig): SimulatedCall {
  const { upstreamLatencyMs, timeoutMs, hasFallback, cancelRunningFuture } = config
  const timedOut = upstreamLatencyMs > timeoutMs

  const releasedAtMs = timedOut ? timeoutMs : upstreamLatencyMs

  let outcome: CallOutcome
  let status: number
  if (!timedOut) {
    outcome = 'UPSTREAM'
    status = 200
  } else if (hasFallback) {
    outcome = 'FALLBACK'
    status = 200
  } else {
    // No resolvable fallback: the TimeoutException propagates out of the aspect.
    // GlobalExceptionHandler maps it to 504 Gateway Timeout. Before that advice existed --
    // which is the state this project originally shipped in -- the same failure surfaced as a
    // bare 500 from Spring's default error handling.
    outcome = 'ERROR'
    status = 504
  }

  return {
    config,
    timedOut,
    caller: { releasedAtMs, outcome, status },
    worker: {
      finishedAtMs: upstreamLatencyMs,
      cancelSignalledAtMs: timedOut && cancelRunningFuture ? timeoutMs : null,
      interrupted: false,
    },
    spanMs: Math.max(releasedAtMs, upstreamLatencyMs),
    wastedWorkMs: Math.max(0, upstreamLatencyMs - releasedAtMs),
  }
}

export interface CallFrame {
  tMs: number
  /** Progress of each track, clamped once that track is done. */
  callerElapsedMs: number
  workerElapsedMs: number
  callerDone: boolean
  workerDone: boolean
  /** Null until the caller is released — the outcome is not knowable before then. */
  outcome: CallOutcome | null
  /** True from the instant cancel is signalled, so the UI can mark it and show it changed nothing. */
  cancelSignalled: boolean
}

/** Samples a call at time `tMs`. Pure — safe to call at any t, in any order. */
export function frameAt(call: SimulatedCall, tMs: number): CallFrame {
  const t = Math.max(0, tMs)
  const callerDone = t >= call.caller.releasedAtMs
  const workerDone = t >= call.worker.finishedAtMs
  const cancelAt = call.worker.cancelSignalledAtMs

  return {
    tMs: t,
    callerElapsedMs: Math.min(t, call.caller.releasedAtMs),
    workerElapsedMs: Math.min(t, call.worker.finishedAtMs),
    callerDone,
    workerDone,
    outcome: callerDone ? call.caller.outcome : null,
    cancelSignalled: cancelAt !== null && t >= cancelAt,
  }
}
