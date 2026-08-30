import { useMemo, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { Slider } from '../components/Controls'
import { CallTimeline } from '../components/CallTimeline'
import { Code } from '../components/Code'
import { simulateCall } from '../sim/timeLimiter'
import { ms } from '../lib/format'
import { useCopy } from '../i18n/locale'
import { P, RichText } from '../i18n/RichText'

const SCALE_MS = 6000

export function TheDeadline() {
  const { t } = useCopy()
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
    <Section id="deadline" eyebrow="§3" title={t.deadline.title}>
      <P>{t.deadline.p1}</P>

      <Panel>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Slider
            label={t.deadline.latency}
            value={latency}
            min={100}
            max={5800}
            step={100}
            onChange={setLatency}
            format={ms}
            accent="var(--color-worker)"
          />
          <Slider
            label={t.deadline.timeoutDuration}
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
            <RichText values={{ margin: ms(margin) }}>{t.deadline.race}</RichText>
          </p>
        )}
      </Panel>

      <P>{t.deadline.p2}</P>

      <Code caption={t.deadline.codeCaption} mark={{ 1: 'good' }}>
{`@TimeLimiter(name = "weatherForecast", fallbackMethod = "forecastFallback")
public CompletableFuture<ForecastResponse> fetchForecast(Duration upstreamDelay) {
    return CompletableFuture.supplyAsync(() -> { ... });
}`}
      </Code>

      <P>{t.deadline.p3}</P>
      <P>{t.deadline.p4}</P>
    </Section>
  )
}
