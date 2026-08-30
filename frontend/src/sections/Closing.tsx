import { Panel, Section } from '../components/Section'
import { Code } from '../components/Code'

function Ref({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-caller underline-offset-4 hover:underline"
    >
      {children}
    </a>
  )
}

export function Closing() {
  return (
    <Section id="choosing" eyebrow="§7" title="Choosing a number">
      <p>
        The hardest part of a timeout is not configuring it. It is picking the value, and &ldquo;a
        few seconds&rdquo; is how most of them get chosen.
      </p>

      <p>
        <b className="text-ink">Start from an error budget, not from a round number.</b> Amazon&rsquo;s
        approach is to decide what rate of false timeouts is acceptable &mdash; say 0.1% &mdash; and
        then read the corresponding latency percentile off the dependency, p99.9 in that example.
        The number falls out of data you already have. Two caveats come with it: the method breaks
        down when the latency distribution is flat, because p99.9 sits almost on top of p50 and
        there is no headroom to buy; and a timeout often does not cover DNS resolution or the TLS
        handshake, so the wall-clock wait can exceed the number you configured.
      </p>

      <p>
        <b className="text-ink">A deadline far above the mean is not conservative, it is a
        liability.</b> Google&rsquo;s SRE book works the arithmetic: a server handling 50 QPS with a
        100-second deadline, where 5% of requests hit the slow path, needs 5,000 threads for that 5%
        alone. Against 1,000 available threads the result was an 80.4% error rate &mdash; caused by
        the deadline, not by the dependency.
      </p>

      <p>
        <b className="text-ink">Deadlines have to shrink as they propagate.</b> If your caller gives
        up after two seconds, work you start with a three-second budget is work nobody will ever
        receive. Pass the remaining budget down rather than configuring each hop independently.
      </p>

      <h3 className="mt-4 text-lg font-semibold text-ink">Where it sits among the others</h3>
      <p>
        Resilience4j applies its decorators in a fixed order regardless of how you write the
        annotations:
      </p>
      <Code caption="TimeLimiter sits inside Retry — so the deadline is per attempt, not per call">
{`Retry ( CircuitBreaker ( RateLimiter ( TimeLimiter ( Bulkhead ( call ) ) ) ) )`}
      </Code>
      <p>
        That nesting has a consequence worth internalising: a &ldquo;one second timeout&rdquo; with
        three retries and a 300 ms wait between them is a <b className="text-ink">3.6 second</b>{' '}
        worst case for the caller. The deadline bounds each attempt; nothing bounds the sum unless
        you add an outer budget.
      </p>

      <Panel>
        <h3 className="mb-2 text-sm font-semibold text-ink">Two things practitioners disagree about</h3>
        <p className="mb-3 text-sm text-ink-2">
          <b className="text-ink">Fallbacks.</b> Netflix built its tooling around them; Amazon
          argues against them in most cases, having watched a cache fallback turn a partial outage
          into a total one in 2001. Their objection is sharp: if the fallback path were reliable
          enough to carry production traffic, why is it not the primary path? A usable test &mdash;
          does the fallback consume a resource that the original failure has already made scarce? If
          it retries against the same struggling database, it is an amplifier. If it returns a
          cached, static or degraded answer that costs nothing, it is a genuine safety net. The one
          in this demo is the second kind.
        </p>
        <p className="text-sm text-ink-2">
          <b className="text-ink">Circuit breakers.</b> Resilience4j and Netflix treat them as the
          flagship pattern. Amazon largely does not use them, preferring token buckets, on the
          grounds that they add modal behaviour that is hard to test &mdash; and Marc Brooker puts
          it more bluntly: modern systems are built to fail partially, and a circuit breaker
          converts a partial failure into a complete one. Timeouts and bulkheads are uncontroversial.
          Circuit breakers are a real trade-off, not a default.
        </p>
      </Panel>

      <h3 className="mt-4 text-lg font-semibold text-ink">Sources</h3>
      <ul className="list-disc space-y-1.5 pl-5 text-sm">
        <li>
          <Ref href="https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/">
            Timeouts, retries and backoff with jitter
          </Ref>{' '}
          &mdash; Marc Brooker, AWS Builders&rsquo; Library. The percentile method, and why retries
          are &ldquo;selfish&rdquo;.
        </li>
        <li>
          <Ref href="https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/">
            Avoiding fallback in distributed systems
          </Ref>{' '}
          &mdash; Jacob Gabrielson, AWS. The 2001 outage and the case against fallbacks.
        </li>
        <li>
          <Ref href="https://sre.google/sre-book/addressing-cascading-failures/">
            Addressing cascading failures
          </Ref>{' '}
          &mdash; Google SRE book. The 5,000-thread worked example.
        </li>
        <li>
          <Ref href="https://brooker.co.za/blog/2022/02/16/circuit-breakers.html">
            Circuit breakers
          </Ref>{' '}
          &mdash; Marc Brooker&rsquo;s argument against them.
        </li>
        <li>
          <Ref href="https://resilience4j.readme.io/docs/getting-started-3">
            Resilience4j Spring Boot documentation
          </Ref>{' '}
          &mdash; the decorator order above.
        </li>
        <li>
          Michael Nygard, <i>Release It!</i> &mdash; the origin of the Timeout and Bulkhead
          patterns. &ldquo;Integration points are the number-one killer of systems.&rdquo;
        </li>
      </ul>

      <footer className="mt-10 border-t border-hairline pt-6 text-sm text-ink-muted">
        <p>
          The code behind every figure on this page lives in{' '}
          <Ref href="https://github.com/arthurd3/time-limiter-resillience4j">
            arthurd3/time-limiter-resillience4j
          </Ref>
          . The simulations are pure functions under{' '}
          <code className="font-mono text-[12px]">frontend/src/sim/</code>, unit-tested against the
          behaviour described here.
        </p>
      </footer>
    </Section>
  )
}
