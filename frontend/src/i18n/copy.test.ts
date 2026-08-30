import { describe, expect, it } from 'vitest'
import { COPY, type Locale } from './copy'

/**
 * TypeScript already guarantees both locales have the same keys. What it cannot check is that the
 * translated strings kept the markup and placeholders the components rely on -- a dropped {token}
 * renders as nothing and a stray one renders as literal braces, neither of which fails a build.
 */
function leaves(obj: unknown, path = ''): [string, string][] {
  if (typeof obj === 'string') return [[path, obj]]
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
  }
  return []
}

const PLACEHOLDER = /\{[a-zA-Z0-9_]+\}/g
const LANE = /<(caller|worker|deadline)>/g

describe('copy dictionaries', () => {
  const en = new Map(leaves(COPY.en))
  const pt = new Map(leaves(COPY.pt))

  it('cover the same keys', () => {
    expect([...pt.keys()].sort()).toEqual([...en.keys()].sort())
  })

  it('are actually translated', () => {
    // Allow identical strings only where they are terms both languages share, or literal
    // identifiers -- a config key is not prose and must not be translated.
    const shared = new Set([
      'ui.worker',
      'pool.threads',
      'pool.reqPerSec',
      'cancel.toggle',
      'hero.eyebrow',
      'deadline.timeoutDuration',
    ])
    const untranslated = [...en.entries()].filter(
      ([k, v]) => pt.get(k) === v && v.length > 12 && !shared.has(k),
    )
    expect(untranslated.map(([k]) => k)).toEqual([])
  })

  it.each(['en', 'pt'] as Locale[])('%s keeps every placeholder its component passes', (locale) => {
    const dict = locale === 'en' ? en : pt
    for (const [key, value] of dict) {
      const mine = (value.match(PLACEHOLDER) ?? []).sort()
      const theirs = ((locale === 'en' ? pt : en).get(key)?.match(PLACEHOLDER) ?? []).sort()
      expect({ key, mine }).toEqual({ key, mine: theirs })
    }
  })

  it('keeps lane tokens balanced', () => {
    for (const [key, value] of [...en, ...pt]) {
      const opens = value.match(LANE) ?? []
      for (const open of opens) {
        const name = open.slice(1, -1)
        expect(`${key}:${value.includes(`</${name}>`)}`).toBe(`${key}:true`)
      }
    }
  })
})
