import { useMemo, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { Choice } from '../components/Controls'
import { Code } from '../components/Code'
import { CallTimeline } from '../components/CallTimeline'
import { simulateCall } from '../sim/timeLimiter'
import { useCopy } from '../i18n/locale'
import { P, RichText } from '../i18n/RichText'

type Shape = 'missing' | 'matched'

export function FallbackTrap() {
  const { t } = useCopy()
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
    <Section id="fallback-trap" eyebrow={t.fallback.eyebrow} title={t.fallback.title}>
      <P>{t.fallback.p1}</P>
      <P>{t.fallback.p2}</P>

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
          <Code caption={t.fallback.captionBad} mark={{ 3: 'bad' }}>
{`@TimeLimiter(name = "weatherForecastLimiter", fallbackMethod = "fallback")
public CompletableFuture<String> getWeatherForecast() { ... }

public CompletableFuture<String> fallback() { ... }`}
          </Code>
        ) : (
          <Code caption={t.fallback.captionGood} mark={{ 3: 'good', 4: 'good' }}>
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

      <P>{shape === 'missing' ? t.fallback.explainBad : t.fallback.explainGood}</P>
      <p className="text-sm text-ink-muted">
        <RichText>{t.fallback.note}</RichText>
      </p>
    </Section>
  )
}
