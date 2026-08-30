export function Hero() {
  return (
    <header className="mx-auto w-full max-w-3xl px-5 pt-20 pb-4 sm:pt-28">
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
        Resilience4j · TimeLimiter
      </p>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        A call with no deadline doesn&rsquo;t fail slowly.
        <br />
        It turns latency into concurrency.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-ink-2">
        That trade is the whole problem. Every request still waiting is a thread still held, so when
        a dependency slows down by 100&times;, you need 100&times; the threads to serve the same
        traffic. You don&rsquo;t have them. The service stops answering &mdash; including for
        requests that never touched the slow dependency at all.
      </p>
      <p className="mt-4 max-w-2xl text-base leading-7 text-ink-2">
        A <b className="text-ink">TimeLimiter</b> is how you refuse that trade. This page shows what
        it does, what it deliberately does <em>not</em> do, and the two ways it fails silently.
      </p>
      <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {[
          ['the-hang', 'The hang'],
          ['exhaustion', 'Why it spreads'],
          ['deadline', 'The deadline'],
          ['fallback-trap', 'Trap 1'],
          ['cancel-trap', 'Trap 2'],
          ['live', 'Try it live'],
          ['choosing', 'Choosing a value'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-caller underline-offset-4 hover:underline">
            {label}
          </a>
        ))}
      </nav>
    </header>
  )
}
