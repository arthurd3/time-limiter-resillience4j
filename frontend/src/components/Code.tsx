/**
 * A code sample. Deliberately not syntax-highlighted: the samples here are short, and the only
 * colour that matters is the marker on the line the surrounding prose is talking about.
 */
export function Code({
  children,
  mark,
  caption,
}: {
  children: string
  /** 0-based line indices to call out, with a tone. */
  mark?: Record<number, 'good' | 'bad'>
  caption?: string
}) {
  const lines = children.replace(/\n$/, '').split('\n')
  return (
    <figure className="overflow-hidden rounded-lg border border-hairline bg-surface">
      <pre className="overflow-x-auto py-3 font-mono text-[12.5px] leading-6">
        <code>
          {lines.map((line, i) => {
            const tone = mark?.[i]
            const bg =
              tone === 'good'
                ? 'color-mix(in oklab, var(--color-good) 12%, transparent)'
                : tone === 'bad'
                  ? 'color-mix(in oklab, var(--color-critical) 12%, transparent)'
                  : undefined
            const edge =
              tone === 'good' ? 'var(--color-good)' : tone === 'bad' ? 'var(--color-critical)' : 'transparent'
            return (
              <div
                key={i}
                className="px-4"
                style={{ background: bg, boxShadow: `inset 2px 0 0 ${edge}` }}
              >
                {line || ' '}
              </div>
            )
          })}
        </code>
      </pre>
      {caption && (
        <figcaption className="border-t border-hairline px-4 py-2 text-xs text-ink-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
