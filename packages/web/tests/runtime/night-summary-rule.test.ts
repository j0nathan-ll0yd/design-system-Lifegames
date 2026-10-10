// NightSummary's shared input rule (owner decision Q3, 2026-10-08): the card
// follows the sleep export alone; the health export lends only a live score.
import {describe, expect, it} from 'vitest'
import {nightSummaryDomain, sleepScoreSource} from '../../src/runtime/widget-rules'

const SLEEP_AT = '2026-03-18T09:00:00.000Z'
const HEALTH_AT = '2026-03-17T01:00:00.000Z'

describe('nightSummaryDomain', () => {
  it.each(['live', 'stale', 'empty', 'unavailable', 'loading'] as const)('health %s never changes a live sleep card', (health) => {
    expect(nightSummaryDomain({state: 'live', generatedAt: SLEEP_AT}, {state: health, generatedAt: HEALTH_AT})).toEqual({
      state: 'live',
      generatedAt: SLEEP_AT
    })
  })

  it('a stale sleep export makes the card stale with the sleep timestamp, not the older health one', () => {
    expect(nightSummaryDomain({state: 'stale', generatedAt: SLEEP_AT}, {state: 'live', generatedAt: HEALTH_AT})).toEqual({
      state: 'stale',
      generatedAt: SLEEP_AT
    })
  })

  it('an unavailable sleep export makes the card unavailable, whatever health is', () => {
    expect(nightSummaryDomain({state: 'unavailable', generatedAt: null}, {state: 'live', generatedAt: HEALTH_AT})).toEqual({
      state: 'unavailable',
      generatedAt: null
    })
  })

  it('suppression covers the whole card, from either export', () => {
    expect(nightSummaryDomain({state: 'live', generatedAt: SLEEP_AT}, {state: 'suppressed', generatedAt: null})).toEqual({
      state: 'suppressed',
      generatedAt: null
    })
    expect(nightSummaryDomain({state: 'suppressed', generatedAt: null}, {state: 'live', generatedAt: HEALTH_AT})).toEqual({
      state: 'suppressed',
      generatedAt: null
    })
  })
})

describe('sleepScoreSource', () => {
  const health = {quantities: {sleepScore: {value: 83, unit: 'score'}}}
  it('lends the health export only while it is live', () => {
    expect(sleepScoreSource(health, 'live')).toBe(health)
    for (const state of ['stale', 'unavailable', 'empty', 'loading', 'suppressed'] as const) {
      expect(sleepScoreSource(health, state), state).toBeNull()
    }
    expect(sleepScoreSource(null, 'live')).toBeNull()
  })
})
