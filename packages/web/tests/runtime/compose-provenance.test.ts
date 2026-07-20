import {describe, expect, it} from 'vitest'
import {composeProvenance} from '../../src/runtime/compose-provenance'

describe('composeProvenance', () => {
  it('substitutes a single {phKey} with an anchor element', () => {
    const result = composeProvenance('Powered by {feedly} daily.', {feedly: {label: 'Feedly', href: 'https://feedly.com'}})
    expect(result).toBe('Powered by <a href="https://feedly.com" target="_blank" rel="noopener noreferrer">Feedly</a> daily.')
  })

  it('substitutes multiple placeholders in one body', () => {
    const result = composeProvenance('Water by {water}. Caffeine by {coffee}', {
      water: {label: 'Larq', href: 'https://www.livelarq.com'},
      coffee: {label: 'Acaia', href: 'https://acaia.co/products/pearl'}
    })
    expect(result).toBe(
      'Water by <a href="https://www.livelarq.com" target="_blank" rel="noopener noreferrer">Larq</a>. ' +
        'Caffeine by <a href="https://acaia.co/products/pearl" target="_blank" rel="noopener noreferrer">Acaia</a>'
    )
  })

  it('is byte-identical to the prior markdown rendering for the Health body', () => {
    const result = composeProvenance('Activity by my {watch} every ~15 minutes. Water powered by {water}. Caffeine powered by {coffee}.', {
      watch: {label: 'Apple Watch 11', href: 'https://www.apple.com/apple-watch-series-11/'},
      water: {label: 'Larq', href: 'https://www.livelarq.com'},
      coffee: {label: 'Acaia', href: 'https://acaia.co/products/pearl'}
    })
    expect(result).toBe(
      'Activity by my <a href="https://www.apple.com/apple-watch-series-11/" target="_blank" rel="noopener noreferrer">Apple Watch 11</a> ' +
        'every ~15 minutes. Water powered by <a href="https://www.livelarq.com" target="_blank" rel="noopener noreferrer">Larq</a>. ' +
        'Caffeine powered by <a href="https://acaia.co/products/pearl" target="_blank" rel="noopener noreferrer">Acaia</a>.'
    )
  })

  it('HTML-escapes < & > and " in literal body text', () => {
    expect(composeProvenance('a < b', {})).toBe('a &lt; b')
    expect(composeProvenance('a & b', {})).toBe('a &amp; b')
    expect(composeProvenance('a > b', {})).toBe('a &gt; b')
    expect(composeProvenance('say "hello"', {})).toBe('say &quot;hello&quot;')
  })

  it('HTML-escapes the ref label', () => {
    const result = composeProvenance('{x}', {x: {label: 'A & B', href: 'https://example.com'}})
    expect(result).toContain('>A &amp; B</a>')
    expect(result).toContain('<a ')
  })

  it('HTML-escapes the ref href', () => {
    const result = composeProvenance('{x}', {x: {label: 'x', href: 'https://example.com?a=1&b=2'}})
    expect(result).toContain('href="https://example.com?a=1&amp;b=2"')
  })

  it('scheme guard: an http: href renders the escaped label as plain text, no anchor', () => {
    const result = composeProvenance('{x}', {x: {label: 'Click', href: 'http://example.com'}})
    expect(result).toBe('Click')
    expect(result).not.toContain('<a ')
  })

  it('scheme guard: a javascript: href renders the escaped label as plain text, no anchor', () => {
    const result = composeProvenance('{x}', {x: {label: 'Evil <script>', href: 'javascript:alert(1)'}})
    expect(result).toBe('Evil &lt;script&gt;')
    expect(result).not.toContain('<a ')
  })

  it('renders a body with empty refs unchanged (escaping only)', () => {
    expect(composeProvenance('Powered by a custom iOS App, hosted on AWS.', {})).toBe('Powered by a custom iOS App, hosted on AWS.')
  })

  it('leaves an unknown/absent placeholder as escaped literal text', () => {
    expect(composeProvenance('Powered by {mystery}.', {})).toBe('Powered by {mystery}.')
    expect(composeProvenance('Powered by {mystery}.', {other: {label: 'x', href: 'https://x.io'}})).toBe('Powered by {mystery}.')
  })

  it('returns an empty string unchanged', () => {
    expect(composeProvenance('', {})).toBe('')
  })
})
