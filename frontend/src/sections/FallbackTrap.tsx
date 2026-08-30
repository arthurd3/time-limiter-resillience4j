import { useMemo, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { Choice } from '../components/Controls'
import { Code } from '../components/Code'
import { CallTimeline } from '../components/CallTimeline'
import { simulateCall } from '../sim/timeLimiter'

type Shape = 'missing' | 'matched'

export function FallbackTrap() {
  const [shape, setShape] = useState<Shape>('missing')

  const call = useMemo(
    () =>
      simulateCall({
        upstreamLatencyMs: 5000,
        timeoutMs: 2000,
        hasFallback: shape === 'matched',
        cancelRunningFuture: true,
      }),
    [shape],
  )

  return (
    <Section id="fallback-trap" eyebrow="§4 · Trap 1" title="The fallback that is never called">
      <p>
        Resilience4j resolves <code className="font-mono text-[13px]">fallbackMethod</code> by
        reflection, and it looks for one exact shape: <b className="text-ink">the guarded
        method&rsquo;s own parameters, plus a trailing exception</b>. A method with the right name
        and the wrong signature is not a fallback with a problem &mdash; it is not found at all.
      </p>
      <p>
        This project shipped with that bug. Flip between the two signatures and watch what the
        caller gets.
      </p>

      <Panel>
        <div className="mb-4">
          <Choice
            value={shape}
            onChange={setShape}
            options={[
              { value: 'missing', label: 'fallback()' },
              { value: 'matched', label: 'fallback(…, TimeoutException)' },
            ]}
          />
        </div>

        {shape === 'missing' ? (
          <Code caption="No trailing Throwable — never matched" mark={{ 3: 'bad' }}>
{`@TimeLimiter(name = "weatherForecastLimiter", fallbackMethod = "fallback")
public CompletableFuture<String> getWeatherForecast() { ... }

public CompletableFuture<String> fallback() { ... }`}
          </Code>
        ) : (
          <Code caption="Guarded method's parameters, then the exception" mark={{ 3: 'good', 4: 'good' }}>
{`@TimeLimiter(name = "weatherForecast", fallbackMethod = "forecastFallback")
public CompletableFuture<ForecastResponse> fetchForecast(Duration upstreamDelay) { ... }

private CompletableFuture<ForecastResponse> forecastFallback(
        Duration upstreamDelay, TimeoutException e) { ... }`}
          </Code>
        )}

        <div className="mt-5">
          <CallTimeline call={call} scaleMs={6000} loop />
        </div>

        {shape === 'missing' && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-hairline bg-plane p-3">
            <pre className="font-mono text-[11.5px] leading-5 text-ink-2">
{`WARN  i.g.r.spring6.fallback.FallbackExecutor : No fallback method match found
java.lang.NoSuchMethodException:
    ...WeatherClient.fallback(, class java.lang.Throwable)`}
            </pre>
          </div>
        )}
      </Panel>

      <p>
        {shape === 'missing' ? (
          <>
            A <code className="font-mono text-[13px]">WARN</code>. That is the entire signal. The
            application starts, the endpoint responds, the metrics record a timeout &mdash; and
            every caller gets an error where the fallback was supposed to be. Nothing in the type
            system could have caught it, because the method name is a string.
          </>
        ) : (
          <>
            With the trailing exception present the method resolves and the caller gets a real
            answer at the deadline. Prefer the narrowest exception type that makes sense &mdash;{' '}
            <code className="font-mono text-[13px]">TimeoutException</code> here rather than{' '}
            <code className="font-mono text-[13px]">Throwable</code>, which would also quietly
            swallow genuine upstream failures and report them as a healthy fallback.
          </>
        )}
      </p>
      <p className="text-sm text-ink-muted">
        The 504 above comes from this project&rsquo;s exception handler mapping an escaped{' '}
        <code className="font-mono text-[12px]">TimeoutException</code> to a gateway timeout. Before
        that handler existed &mdash; the state the project originally shipped in &mdash; the same
        failure surfaced as a bare 500.
      </p>
    </Section>
  )
}
