/**
 * The live-call client.
 *
 * Latency is measured in the browser with `performance.now()` rather than taken from anything the
 * server reports, because the number the page shows should be the number the reader would have
 * felt. It will land a little above the configured deadline -- network and scheduling -- and the
 * page says so instead of rounding to a tidier lie.
 */

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? ''

export interface ForecastBody {
  forecast: string
  source: 'UPSTREAM' | 'FALLBACK'
  retrievedAt: string
}

export interface ProblemBody {
  type?: string
  title?: string
  status: number
  detail?: string
  instance?: string
}

export type LiveFailure =
  | { kind: 'unreachable'; hint: string }
  | { kind: 'aborted' }
  | { kind: 'badPayload'; detail: string }

export interface LiveResult {
  httpStatus: number | null
  /** Wall-clock time the browser waited. */
  observedLatencyMs: number
  body: ForecastBody | ProblemBody | null
  raw: string
  failure: LiveFailure | null
}

export async function callForecast(args: {
  delayMs: number | null
  signal?: AbortSignal
}): Promise<LiveResult> {
  const qs = args.delayMs === null ? '' : `?delayMs=${args.delayMs}`
  const startedAt = performance.now()

  try {
    const res = await fetch(`${API_BASE}/api/v1/weather/forecast${qs}`, { signal: args.signal })
    const raw = await res.text()
    const observedLatencyMs = performance.now() - startedAt

    let body: ForecastBody | ProblemBody | null = null
    try {
      body = raw ? JSON.parse(raw) : null
    } catch {
      return {
        httpStatus: res.status,
        observedLatencyMs,
        body: null,
        raw,
        failure: { kind: 'badPayload', detail: 'Response was not JSON.' },
      }
    }
    return { httpStatus: res.status, observedLatencyMs, body, raw, failure: null }
  } catch (err) {
    const observedLatencyMs = performance.now() - startedAt
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    return {
      httpStatus: null,
      observedLatencyMs,
      body: null,
      raw: '',
      failure: aborted
        ? { kind: 'aborted' }
        : {
            kind: 'unreachable',
            // A blocked cross-origin request and a stopped server are indistinguishable to fetch,
            // so the hint covers both rather than guessing at one.
            hint: 'The API did not respond. Start it with ./mvnw spring-boot:run, or check that the origin is allowed.',
          },
    }
  }
}

export function isForecast(body: unknown): body is ForecastBody {
  return typeof body === 'object' && body !== null && 'source' in body
}

export async function probeHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/actuator/health`, { signal })
    return res.ok
  } catch {
    return false
  }
}

export interface TimeLimiterCounts {
  successful: number
  timeout: number
  failed: number
}

/** Reads the server's own view of what happened. Best-effort: null means "do not show the card". */
export async function fetchTimeLimiterCounts(signal?: AbortSignal): Promise<TimeLimiterCounts | null> {
  const kinds = ['successful', 'timeout', 'failed'] as const
  try {
    const values = await Promise.all(
      kinds.map(async (kind) => {
        const url = `${API_BASE}/actuator/metrics/resilience4j.timelimiter.calls?tag=name:weatherForecast&tag=kind:${kind}`
        const res = await fetch(url, { signal })
        if (!res.ok) return 0
        const json = (await res.json()) as { measurements?: { statistic: string; value: number }[] }
        // A kind that has never occurred has no measurement yet. That is zero, not an error.
        return json.measurements?.find((m) => m.statistic === 'COUNT')?.value ?? 0
      }),
    )
    return { successful: values[0], timeout: values[1], failed: values[2] }
  } catch {
    return null
  }
}
