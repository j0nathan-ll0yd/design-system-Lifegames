import {describe, expect, it} from 'vitest'
import {
  formatAsOf,
  formatMeasurement,
  formatMonthYear,
  isHidingFocus,
  isScaffoldHidden,
  NO_READING,
  oldestGeneratedAt,
  rendersData,
  resolveWidgetState,
  stateRootAttrs,
  toEpochMs,
  WIDGET_STATES,
  worstState
} from '../../src/runtime/widget-state'

describe('resolveWidgetState (the compatibility mapper)', () => {
  it('keeps the pre-0160 signature: no state + data → live, no state + no data → empty', () => {
    expect(resolveWidgetState(undefined, true)).toBe('live')
    expect(resolveWidgetState(null, false)).toBe('empty')
  })

  it('an explicit non-data state always wins, data or not', () => {
    for (const s of ['unavailable', 'suppressed', 'loading', 'empty'] as const) {
      expect(resolveWidgetState(s, true)).toBe(s)
      expect(resolveWidgetState(s, false)).toBe(s)
    }
  })

  it('an explicit data state without data degrades to empty', () => {
    expect(resolveWidgetState('live', false)).toBe('empty')
    expect(resolveWidgetState('stale', false)).toBe('empty')
    expect(resolveWidgetState('stale', true)).toBe('stale')
  })
})

describe('state predicates', () => {
  it('rendersData is true only for live and stale', () => {
    expect(WIDGET_STATES.filter(rendersData)).toEqual(['live', 'stale'])
  })

  it('isScaffoldHidden is true only for unavailable and suppressed', () => {
    expect(WIDGET_STATES.filter(isScaffoldHidden)).toEqual(['unavailable', 'suppressed'])
  })

  it('isHidingFocus matches the hiding focus modes only', () => {
    expect(isHidingFocus('Work')).toBe(true)
    expect(isHidingFocus('Do Not Disturb')).toBe(true)
    expect(isHidingFocus('Personal')).toBe(false)
    expect(isHidingFocus(null)).toBe(false)
    expect(isHidingFocus(undefined)).toBe(false)
  })
})

describe('worstState and oldestGeneratedAt (multi-export cards)', () => {
  it('orders suppressed > unavailable > loading > stale > empty > live', () => {
    expect(worstState('live', 'stale')).toBe('stale')
    expect(worstState('stale', 'unavailable')).toBe('unavailable')
    expect(worstState('unavailable', 'suppressed', 'live')).toBe('suppressed')
    expect(worstState('live', 'empty')).toBe('empty')
    expect(worstState()).toBe('live')
    expect(worstState(null, undefined)).toBe('live')
  })

  it('picks the oldest valid timestamp and ignores missing or invalid ones', () => {
    expect(oldestGeneratedAt('2026-03-18T12:00:00Z', '2026-03-17T08:00:00Z')).toBe('2026-03-17T08:00:00Z')
    expect(oldestGeneratedAt(null, 'not a date', '2026-03-18T12:00:00Z')).toBe('2026-03-18T12:00:00Z')
    expect(oldestGeneratedAt()).toBeNull()
    expect(oldestGeneratedAt(undefined, '')).toBeNull()
  })
})

describe('formatting', () => {
  it('formatMeasurement renders the no-reading mark for null, undefined and NaN, and keeps a measured 0', () => {
    expect(formatMeasurement(null)).toBe(NO_READING)
    expect(formatMeasurement(undefined)).toBe(NO_READING)
    expect(formatMeasurement(Number.NaN)).toBe(NO_READING)
    expect(formatMeasurement(0)).toBe('0')
    expect(formatMeasurement(61.6)).toBe('62')
    expect(formatMeasurement(1774, (n) => `${n} oz`)).toBe('1774 oz')
  })

  it('formatAsOf uses the owner time zone, not the host', () => {
    // 2026-10-07T21:05Z is 2:05 PM PDT.
    expect(formatAsOf('2026-10-07T21:05:00Z')).toBe('Oct 7, 2:05 PM PDT')
    // 2026-01-10T07:30Z is still Jan 9 in Los Angeles (11:30 PM PST).
    expect(formatAsOf('2026-01-10T07:30:00Z')).toBe('Jan 9, 11:30 PM PST')
    expect(formatAsOf(null)).toBeNull()
    expect(formatAsOf('garbage')).toBeNull()
  })

  it('formatMonthYear crosses a month boundary in the owner time zone', () => {
    // 2026-04-01T03:00Z is March 31 in Los Angeles.
    expect(formatMonthYear('2026-04-01T03:00:00Z')).toBe('Mar 2026')
  })

  it('toEpochMs accepts a number, an ISO string or a Date', () => {
    const ms = Date.parse('2026-03-18T12:00:00.000Z')
    expect(toEpochMs(ms)).toBe(ms)
    expect(toEpochMs('2026-03-18T12:00:00.000Z')).toBe(ms)
    expect(toEpochMs(new Date(ms))).toBe(ms)
  })

  it('stateRootAttrs omits data-generated-at when unknown', () => {
    expect(stateRootAttrs('live', '2026-03-18T12:00:00Z')).toEqual({'data-ssr-state': 'live', 'data-generated-at': '2026-03-18T12:00:00Z'})
    expect(stateRootAttrs('unavailable', null)).toEqual({'data-ssr-state': 'unavailable', 'data-generated-at': undefined})
  })
})
