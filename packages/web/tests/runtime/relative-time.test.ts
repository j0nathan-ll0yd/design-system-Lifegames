// Relative-time labels (atlas decision 0164 D5): the pure half. The server
// writes absolute UTC text; relative-time-fill.test.ts covers the browser pass.
import {afterEach, describe, expect, it, vi} from 'vitest'
import {absoluteTimeText, formatAge, isIsoDate, isIsoTimestamp, relativeAttr, relativeTimeLabel} from '../../src/runtime/relative-time'

const NOW = Date.parse('2026-01-15T12:00:00Z')
const before = (ms: number): string => new Date(NOW - ms).toISOString()
const M = 60_000
const H = 60 * M
const D = 24 * H

afterEach(() => {
  vi.useRealTimers()
})

describe('isIsoTimestamp', () => {
  it('accepts a full timestamp that parses', () => {
    expect(isIsoTimestamp('2026-01-15T10:15:00Z')).toBe(true)
    expect(isIsoTimestamp('2026-01-15T02:15:00-08:00')).toBe(true)
  })

  it('rejects a date-only value, an unparseable value, null and undefined', () => {
    expect(isIsoTimestamp('2026-01-15')).toBe(false)
    expect(isIsoTimestamp('notTa-date')).toBe(false)
    expect(isIsoTimestamp(null)).toBe(false)
    expect(isIsoTimestamp(undefined)).toBe(false)
  })
})

describe('isIsoDate', () => {
  it('accepts an ISO date or timestamp that parses, and nothing else', () => {
    expect(isIsoDate('2026-01-15')).toBe(true)
    expect(isIsoDate('2026-01-15T10:15:00Z')).toBe(true)
    expect(isIsoDate('3d ago')).toBe(false)
    expect(isIsoDate('2026-13-45')).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })
})

describe('absoluteTimeText', () => {
  it('writes YYYY-MM-DD HH:MM UTC, seconds dropped', () => {
    expect(absoluteTimeText('2026-01-15T10:15:59.999Z')).toBe('2026-01-15 10:15 UTC')
  })

  it('normalizes an offset to UTC, across a date boundary', () => {
    expect(absoluteTimeText('2026-01-15T20:30:00-08:00')).toBe('2026-01-16 04:30 UTC')
  })

  it('returns a date-only or unparseable value unchanged', () => {
    expect(absoluteTimeText('2026-01-15')).toBe('2026-01-15')
    expect(absoluteTimeText('3d ago')).toBe('3d ago')
  })

  it('reads no clock: the same instant gives the same text at any time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const first = absoluteTimeText('2026-01-15T10:15:00Z')
    vi.setSystemTime(NOW + 10 * M)
    expect(absoluteTimeText('2026-01-15T10:15:00Z')).toBe(first)
  })
})

// The forms each widget showed before decision 0164 (moved from adapters.test.ts).
describe('relativeTimeLabel', () => {
  it('compact: minutes, hours, days, weeks', () => {
    expect(relativeTimeLabel(before(15 * M), 'compact', NOW)).toBe('15m ago')
    expect(relativeTimeLabel(before(3 * H + 30 * M), 'compact', NOW)).toBe('3h ago')
    expect(relativeTimeLabel(before(3 * D), 'compact', NOW)).toBe('3d ago')
    expect(relativeTimeLabel(before(21 * D), 'compact', NOW)).toBe('3w ago')
  })

  it('long: spelled weeks and days, singular and plural, then hours', () => {
    expect(relativeTimeLabel(before(14 * D), 'long', NOW)).toBe('2 weeks ago')
    expect(relativeTimeLabel(before(7 * D), 'long', NOW)).toBe('1 week ago')
    expect(relativeTimeLabel(before(3 * D), 'long', NOW)).toBe('3 days ago')
    expect(relativeTimeLabel(before(1 * D), 'long', NOW)).toBe('1 day ago')
    expect(relativeTimeLabel(before(5 * H), 'long', NOW)).toBe('5h ago')
  })

  // Exact bucket edges: the wording each widget showed before decision 0164.
  it('compact: bucket boundaries, and an unclamped future instant', () => {
    expect(relativeTimeLabel(before(59 * M + 59_000), 'compact', NOW)).toBe('59m ago')
    expect(relativeTimeLabel(before(60 * M), 'compact', NOW)).toBe('1h ago')
    expect(relativeTimeLabel(before(23 * H + 59 * M), 'compact', NOW)).toBe('23h ago')
    expect(relativeTimeLabel(before(24 * H), 'compact', NOW)).toBe('1d ago')
    expect(relativeTimeLabel(before(6 * D + 23 * H), 'compact', NOW)).toBe('6d ago')
    expect(relativeTimeLabel(before(7 * D), 'compact', NOW)).toBe('1w ago')
    expect(relativeTimeLabel(before(-5 * M), 'compact', NOW)).toBe('-5m ago')
  })

  it('long: bucket boundaries', () => {
    expect(relativeTimeLabel(before(23 * H), 'long', NOW)).toBe('23h ago')
    expect(relativeTimeLabel(before(24 * H), 'long', NOW)).toBe('1 day ago')
    expect(relativeTimeLabel(before(13 * D), 'long', NOW)).toBe('1 week ago')
    expect(relativeTimeLabel(before(14 * D), 'long', NOW)).toBe('2 weeks ago')
  })

  it('age: days, hours, minutes, clamped at 0m ago', () => {
    expect(relativeTimeLabel(before(2 * D), 'age', NOW)).toBe('2d ago')
    expect(relativeTimeLabel(before(2 * H), 'age', NOW)).toBe('2h ago')
    expect(relativeTimeLabel(before(5 * M), 'age', NOW)).toBe('5m ago')
    expect(relativeTimeLabel(before(-5 * M), 'age', NOW)).toBe('0m ago')
    expect(formatAge(before(-5 * M), NOW)).toBe('0m ago')
  })
})

describe('relativeAttr', () => {
  it('names the style for an ISO date or timestamp that parses', () => {
    expect(relativeAttr('2026-01-15T10:15:00Z', 'long')).toBe('long')
    // A date-only savedAt or starredAt kept its relative label before decision 0164.
    expect(relativeAttr('2026-01-15', 'long')).toBe('long')
    expect(relativeAttr('soon', 'compact')).toBeUndefined()
    expect(relativeAttr('2026-13-45', 'compact')).toBeUndefined()
    expect(relativeAttr(undefined, 'compact')).toBeUndefined()
  })
})
