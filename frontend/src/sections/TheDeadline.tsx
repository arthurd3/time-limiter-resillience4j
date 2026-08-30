import { useMemo, useState } from 'react'
import { Panel, Section, Tok } from '../components/Section'
import { Slider } from '../components/Controls'
import { CallTimeline } from '../components/CallTimeline'
import { Code } from '../components/Code'
import { simulateCall } from '../sim/timeLimiter'
import { ms } from '../lib/format'

const SCALE_MS = 6000

export function TheDeadline() {
  const [latency, setLatency] = useState(900)
  const [timeoutMs, setTimeoutMs] = useState(2000)

  const call = useMemo(
    () =>
      simulateCall({
        upstreamLatencyMs: latency,
        timeoutMs,
        hasFallback: true,
        cancelRunningFuture: true,
      }),
    [latency, timeoutMs],
  )

  const margin = Math.abs(latency - timeoutMs)

  return (
    <Section id="deadline" eyebrow="§3" title="The deadline">
      <p>
        A TimeLimiter is a race between two clocks. The <Tok as="worker">worker</Tok> is trying to
        produce a value; the <Tok as="deadline">deadline</Tok> is counting down. Whichever finishes
        first decides what the <Tok as="caller">caller</Tok> gets.
      </p>

      <Panel>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Slider
            label="Dependency latency"
            value={latency}
            min={100}
            max={5800}
            step={100}
            onChange={setLatency}
            format={ms}
            accent="var(--color-worker)"
          />
          <Slider
            label="timeout-duration"
            value={timeoutMs}
            min={300}
            max={5000}
            step={100}
            onChange={setTimeoutMs}
            format={ms}
            accent="var(--color-critical)"
          />
        </div>
        <CallTimeline call={call} scaleMs={SCALE_MS} loop />
        {margin < 150 && (
          <p className="mt-4 border-t border-hairline pt-3 text-xs text-ink-muted">
            The two are within {ms(margin)} of each other. Real calls do not resolve this cleanly:
            around the deadline the outcome is a genuine race, and the same request can land either
            way from one run to the next.
          </p>
        )}
      </Panel>

      <p>
        Two things about the annotation are not optional, and both are easy to get wrong without
        anything telling you.
      </p>

      <Code
        caption="SlowWeatherApiClient.java — the return type and the bean boundary both matter"
        mark={{ 1: 'good' }}
      >
{`@TimeLimiter(name = "weatherForecast", fallbackMethod = "forecastFallback")
public CompletableFuture<ForecastResponse> fetchForecast(Duration upstreamDelay) {
    return CompletableFuture.supplyAsync(() -> { ... });
}`}
      </Code>

      <p>
        The return type has to be a <code className="font-mono text-[13px]">CompletionStage</code>.
        A deadline is only enforceable against a value that is still pending &mdash; hand the aspect
        a value that has already been computed and there is nothing left to time out. This is why
        wrapping a blocking call in{' '}
        <code className="font-mono text-[13px]">CompletableFuture.completedFuture(...)</code> is a
        silent no-op: the blocking already happened before the aspect ever saw it.
      </p>
      <p>
        And the annotation is applied by a proxy, so the call has to arrive from outside the bean.
        A method calling its own annotated method goes straight down the inside of the object and
        never touches the proxy &mdash; no deadline, no warning, no error. Here that is why the
        client is a separate bean from the service rather than one class with two methods.
      </p>
    </Section>
  )
}
