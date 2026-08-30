import { Panel, Section } from '../components/Section'
import { Code } from '../components/Code'
import { useCopy } from '../i18n/locale'
import { P, RichText } from '../i18n/RichText'

export function Closing() {
  const { t } = useCopy()
  const sources = [t.closing.src1, t.closing.src2, t.closing.src3, t.closing.src4, t.closing.src5, t.closing.src6]

  return (
    <Section id="choosing" eyebrow="§7" title={t.closing.title}>
      <P>{t.closing.p1}</P>
      <P>{t.closing.p2}</P>
      <P>{t.closing.p3}</P>
      <P>{t.closing.p4}</P>

      <h3 className="mt-4 text-lg font-semibold text-ink">{t.closing.orderHeading}</h3>
      <P>{t.closing.p5}</P>
      <Code caption={t.closing.orderCaption}>
{`Retry ( CircuitBreaker ( RateLimiter ( TimeLimiter ( Bulkhead ( call ) ) ) ) )`}
      </Code>
      <P>{t.closing.p6}</P>

      <Panel>
        <h3 className="mb-2 text-sm font-semibold text-ink">{t.closing.disagreeHeading}</h3>
        <p className="mb-3 text-sm text-ink-2">
          <RichText>{t.closing.fallbacks}</RichText>
        </p>
        <p className="text-sm text-ink-2">
          <RichText>{t.closing.breakers}</RichText>
        </p>
      </Panel>

      <h3 className="mt-4 text-lg font-semibold text-ink">{t.closing.sourcesHeading}</h3>
      <ul className="list-disc space-y-1.5 pl-5 text-sm">
        {sources.map((src, i) => (
          <li key={i}>
            <RichText>{src}</RichText>
          </li>
        ))}
      </ul>

      <footer className="mt-10 border-t border-hairline pt-6 text-sm text-ink-muted">
        <p>
          <RichText>{t.closing.footer}</RichText>
        </p>
      </footer>
    </Section>
  )
}
