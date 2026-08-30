import { LocaleToggle, useCopy } from '../i18n/locale'
import { RichText } from '../i18n/RichText'

export function Hero() {
  const { t } = useCopy()
  const nav = [
    ['the-hang', t.hero.nav.hang],
    ['exhaustion', t.hero.nav.exhaustion],
    ['deadline', t.hero.nav.deadline],
    ['fallback-trap', t.hero.nav.trap1],
    ['cancel-trap', t.hero.nav.trap2],
    ['live', t.hero.nav.live],
    ['choosing', t.hero.nav.choosing],
  ]

  return (
    <header className="mx-auto w-full max-w-3xl px-5 pt-14 pb-4 sm:pt-20">
      <div className="mb-8 flex justify-end">
        <LocaleToggle />
      </div>
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
        {t.hero.eyebrow}
      </p>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        {t.hero.titleA}
        <br />
        {t.hero.titleB}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-ink-2">{t.hero.p1}</p>
      <p className="mt-4 max-w-2xl text-base leading-7 text-ink-2">
        <RichText>{t.hero.p2}</RichText>
      </p>
      <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {nav.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-caller underline-offset-4 hover:underline">
            {label}
          </a>
        ))}
      </nav>
    </header>
  )
}
