import { useMemo, useState } from 'react'
import { Panel, Section } from '../components/Section'
import { Toggle } from '../components/Controls'
import { Code } from '../components/Code'
import { CallTimeline } from '../components/CallTimeline'
import { simulateCall } from '../sim/timeLimiter'
import { ms } from '../lib/format'
import { useCopy } from '../i18n/locale'
import { P, RichText } from '../i18n/RichText'

export function CancelTrap() {
  const { t } = useCopy()
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
    <Section id="cancel-trap" eyebrow={t.cancel.eyebrow} title={t.cancel.title}>
      <P>{t.cancel.p1}</P>
      <p>
        <RichText values={{ wasted: ms(call.wastedWorkMs) }}>{t.cancel.p2}</RichText>
      </p>

      <Panel>
        <CallTimeline call={call} scaleMs={6000} loop autoPlay />
        <div className="mt-5 border-t border-hairline pt-4">
          <Toggle
            label={t.cancel.toggle}
            checked={cancel}
            onChange={setCancel}
            hint={t.cancel.toggleHint}
          />
        </div>
      </Panel>

      <P>{t.cancel.p3}</P>

      <Code caption={t.cancel.codeCaption} mark={{ 4: 'bad' }}>
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

      <P>{t.cancel.p4}</P>
      <P>{t.cancel.p5}</P>
    </Section>
  )
}
