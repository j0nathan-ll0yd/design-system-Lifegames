// The browser's relative-label pass (atlas decision 0164 D5): DOM-level
// assertions that the absolute server text becomes the relative label.
import {afterEach, describe, expect, it, vi} from 'vitest'
import {absoluteTimeText} from '../../src/runtime/relative-time'
import {fillRelativeTimes} from '../../src/runtime/relative-time-fill'
import {timeHtml} from '../../src/runtime/widget-markup'

const NOW = Date.parse('2026-01-15T12:00:00Z')
const before = (ms: number): string => new Date(NOW - ms).toISOString()
const M = 60_000
const H = 60 * M
const D = 24 * H

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('fillRelativeTimes', () => {
  it('replaces the absolute server text with the relative label at now', () => {
    document.body.innerHTML = `
      <time id="a" datetime="${before(15 * M)}" data-relative="compact">${absoluteTimeText(before(15 * M))}</time>
      <time id="b" datetime="${before(14 * D)}" data-relative="long">${absoluteTimeText(before(14 * D))}</time>
      <time id="c" datetime="${before(2 * H)}" data-relative="age">${absoluteTimeText(before(2 * H))}</time>`
    expect(document.getElementById('a')!.textContent).toBe('2026-01-15 11:45 UTC')
    fillRelativeTimes(document, NOW)
    expect(document.getElementById('a')!.textContent).toBe('15m ago')
    expect(document.getElementById('b')!.textContent).toBe('2 weeks ago')
    expect(document.getElementById('c')!.textContent).toBe('2h ago')
  })

  it('defaults to the whole document at Date.now()', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    document.body.innerHTML = `<time id="a" datetime="${before(3 * H)}" data-relative="compact">x</time>`
    fillRelativeTimes()
    expect(document.getElementById('a')!.textContent).toBe('3h ago')
  })

  it('fills only under the root it is given', () => {
    document.body.innerHTML = `
      <div id="in"><time datetime="${before(3 * H)}" data-relative="compact">in</time></div>
      <div id="out"><time datetime="${before(3 * H)}" data-relative="compact">out</time></div>`
    fillRelativeTimes(document.getElementById('in')!, NOW)
    expect(document.querySelector('#in time')!.textContent).toBe('3h ago')
    expect(document.querySelector('#out time')!.textContent).toBe('out')
  })

  it('leaves a <time> without data-relative, with an unknown style, or with an unparseable datetime as it is', () => {
    document.body.innerHTML = `
      <time id="none" datetime="${before(3 * H)}">as of 3:00 AM</time>
      <time id="event" datetime="2026-01-12">2026-01-12</time>
      <time id="style" datetime="${before(3 * H)}" data-relative="fancy">kept</time>
      <time id="bad" datetime="soon" data-relative="compact">kept</time>`
    fillRelativeTimes(document, NOW)
    expect(document.getElementById('none')!.textContent).toBe('as of 3:00 AM')
    // A date-only GitHub event carries no data-relative: it keeps its ISO date.
    expect(document.getElementById('event')!.textContent).toBe('2026-01-12')
    expect(document.getElementById('style')!.textContent).toBe('kept')
    expect(document.getElementById('bad')!.textContent).toBe('kept')
  })

  it('labels a date-only datetime that carries data-relative (a date-only savedAt or starredAt)', () => {
    document.body.innerHTML = `<time id="d" datetime="2026-01-12" data-relative="long">2026-01-12</time>`
    fillRelativeTimes(document, NOW)
    expect(document.getElementById('d')!.textContent).toBe('3 days ago')
  })

  it('moves with the clock on a later pass', () => {
    document.body.innerHTML = `<time id="a" datetime="${before(59 * M)}" data-relative="compact">x</time>`
    fillRelativeTimes(document, NOW)
    expect(document.getElementById('a')!.textContent).toBe('59m ago')
    fillRelativeTimes(document, NOW + 10 * M)
    expect(document.getElementById('a')!.textContent).toBe('1h ago')
  })
})

describe('timeHtml writes data-relative for the browser pass', () => {
  it('a timestamp and a date-only value with a style carry data-relative; no style, no attribute', () => {
    expect(timeHtml('d', '2026-01-15 10:00 UTC', '2026-01-15T10:00:00Z', 'compact')).toBe(
      '<time class="d" datetime="2026-01-15T10:00:00Z" data-relative="compact">2026-01-15 10:00 UTC</time>'
    )
    expect(timeHtml('d', '2026-01-12', '2026-01-12', 'long')).toBe('<time class="d" datetime="2026-01-12" data-relative="long">2026-01-12</time>')
    expect(timeHtml('d', '2026-01-12', '2026-01-12')).toBe('<time class="d" datetime="2026-01-12">2026-01-12</time>')
    expect(timeHtml('d', 'x', undefined, 'compact')).toBe('<span class="d">x</span>')
  })

  it('escapes the datetime and the label', () => {
    expect(timeHtml('d', '<b>', '2026-01-15T10:00:00Z"><i>', 'compact')).not.toMatch(/<b>|<i>/)
  })
})
