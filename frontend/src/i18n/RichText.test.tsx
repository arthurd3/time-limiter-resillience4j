import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RichText } from './RichText'

const render = (s: string, values?: Record<string, string>) =>
  renderToStaticMarkup(<RichText values={values}>{s}</RichText>)

describe('RichText', () => {
  it('substitutes a placeholder', () => {
    expect(render('holds {n} threads', { n: '10' })).toContain('10')
  })

  it('substitutes a placeholder nested inside bold', () => {
    // The tokenizer matches the wrapper before the placeholder, so without recursion this
    // rendered the literal text "{capacity}" in bold. Two real strings depend on it.
    const html = render('retires **{capacity}** per second', { capacity: '3.3' })
    expect(html).toContain('3.3')
    expect(html).not.toContain('{capacity}')
  })

  it('renders an unknown placeholder as nothing rather than braces', () => {
    expect(render('a {missing} b')).not.toContain('{missing}')
  })

  it('renders code, links and lane tokens', () => {
    expect(render('use `foo()`')).toContain('<code')
    expect(render('[label](https://example.com)')).toContain('href="https://example.com"')
    expect(render('the <worker>worker</worker>')).toContain('text-worker')
  })

  it('leaves plain prose untouched', () => {
    expect(render('nothing special here')).toContain('nothing special here')
  })
})
