import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { COPY, type Copy, type Locale } from './copy'

const STORAGE_KEY = 'timelimiter-locale'

function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'pt') return stored
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (l: Locale) => void
  t: Copy
}>({ locale: 'en', setLocale: () => {}, t: COPY.en })

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en'
    document.title = COPY[locale].meta.title
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLocaleState(l)
  }, [])

  const value = useMemo(() => ({ locale, setLocale, t: COPY[locale] }), [locale, setLocale])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useCopy() {
  return useContext(LocaleContext)
}

export function LocaleToggle() {
  const { locale, setLocale } = useCopy()
  return (
    <div
      className="inline-flex gap-1 rounded-lg border border-hairline p-1"
      role="group"
      aria-label="Language"
    >
      {(['en', 'pt'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          lang={l === 'pt' ? 'pt-BR' : 'en'}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            locale === l ? 'bg-caller text-white' : 'text-ink-2 hover:bg-grid/50'
          }`}
        >
          {l === 'en' ? 'English' : 'Português'}
        </button>
      ))}
    </div>
  )
}
