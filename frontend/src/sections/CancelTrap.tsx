import { useMemo, useState } from 'react'
import { Panel, Section, Tok } from '../components/Section'
import { Toggle } from '../components/Controls'
import { Code } from '../components/Code'
import { CallTimeline } from '../components/CallTimeline'
import { simulateCall } from '../sim/timeLimiter'
import { ms } from '../lib/format'

export function CancelTrap() {
  const [cancel, setCancel] = useState(true)

  const call = useMemo(
    () =>
      simulateCall({
        upstreamLatencyMs: 5000,
        timeoutMs: 2000,
        hasFallback: true,
        cancelRunningFuture: cancel,
      }),
    [cancel],
  )

  return (
    <Section id="cancel-trap" eyebrow="§5 · Trap 2" title="Cancelling is not interrupting">
      <p>
        The setting is called <code className="font-mono text-[13px]">cancel-running-future</code>,
        and it is on by default. It reads like a promise that the slow work stops. It is not.
      </p>
      <p>
        Watch the second lane. At the deadline the <Tok as="caller">caller</Tok> is released and
        gets its answer &mdash; but the <Tok as="worker">worker</Tok> keeps going, hollow, for
        another {ms(call.wastedWorkMs)}, and only then produces a value that nobody is waiting for
        any more.
      </p>

      <Panel>
        <CallTimeline call={call} scaleMs={6000} loop autoPlay />
        <div className="mt-5 border-t border-hairline pt-4">
          <Toggle
            label="cancel-running-future"
            checked={cancel}
            onChange={setCancel}
            hint="Toggle it. The worker lane does not change — that is the entire point."
          />
        </div>
      </Panel>

      <p>
        The reason is a detail of the JDK, not of Resilience4j.{' '}
        <code className="font-mono text-[13px]">CompletableFuture.cancel()</code> takes a{' '}
        <code className="font-mono text-[13px]">mayInterruptIfRunning</code> flag and{' '}
        <b className="text-ink">ignores it</b>. Unlike{' '}
        <code className="font-mono text-[13px]">FutureTask</code>, a{' '}
        <code className="font-mono text-[13px]">CompletableFuture</code> has no thread of its own to
        interrupt; cancelling only completes the wrapper exceptionally. Whatever is running on the
        pool runs to its natural end.
      </p>

      <Code caption="The interrupt branch here is unreachable in practice" mark={{ 4: 'bad' }}>
{`return CompletableFuture.supplyAsync(() -> {
    try {
        Thread.sleep(upstreamDelay);
    } catch (InterruptedException e) {
        // Never reached by a TimeLimiter cancellation.
        Thread.currentThread().interrupt();
    }
    return ForecastResponse.fromUpstream("Sunny, 24 °C");
});`}
      </Code>

      <p>
        So the honest summary is that a timeout frees <b className="text-ink">the caller</b>, never
        the resource. If you need the work itself to stop, the cancellation has to be cooperative:
        a flag the task actually checks between steps, or &mdash; far more usefully &mdash; a real
        client whose own socket and read timeouts sit below the TimeLimiter&rsquo;s, so the I/O
        gives up on its own.
      </p>
      <p>
        This is also the sharpest argument for a bulkhead. If the work cannot be stopped, the only
        remaining lever is to cap how much of it can exist at once.
      </p>
    </Section>
  )
}
