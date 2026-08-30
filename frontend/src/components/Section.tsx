import type { ReactNode } from 'react'

export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-3xl scroll-mt-16 px-5 py-16 sm:py-24">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
        {eyebrow}
      </p>
      <h2 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <div className="flex flex-col gap-5 text-[15px] leading-7 text-ink-2">{children}</div>
    </section>
  )
}

/** A figure surface. Everything interactive on the page sits on one of these. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-hairline bg-surface p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Inline tokens that let a sentence use the same colours as the figure beside it, so the prose and
 * the picture share one vocabulary rather than two.
 */
export function Tok({ as, children }: { as: 'caller' | 'worker' | 'deadline'; children: ReactNode }) {
  const cls = {
    caller: 'text-caller',
    worker: 'text-worker',
    deadline: 'text-critical',
  }[as]
  return <b className={`font-semibold ${cls}`}>{children}</b>
}
