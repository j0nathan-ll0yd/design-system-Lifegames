// Drift gate for the showcase-only health fixture (atlas decision 0160, Q1).
//
// post-adapter/health.ts is hand-written in the DashboardHealth shape, which is
// richer than adapter output. Production renders health from adaptHealth()
// output instead. Every field the two shapes SHARE must keep the adapter's name
// and type, so the showcase renders the same fields production renders: a
// renamed quantity (heartRateVariabilitySDNN vs hrvSDNN), a hydration key the
// adapter dropped, or a derived share the adapter no longer emits fails here.
import {adaptHealth} from '@j0nathan-ll0yd/web/runtime/adapters'
import {describe, expect, it} from 'vitest'
import {baseline, full} from '../src/post-adapter/health'
import {rawFixtures} from '../src/raw'

const adapted = adaptHealth(rawFixtures.health.full!, rawFixtures.sleep.full!)
const keys = (o: object | null | undefined): string[] => Object.keys(o ?? {}).sort()
const isNumberOrNull = (v: unknown): boolean => v === null || typeof v === 'number'

describe.each([
  ['baseline', baseline],
  ['full', full]
])('post-adapter health %s shares adapter field names and types', (_name, authored) => {
  it('every authored quantity key keeps its adapter name, as {value, unit}', () => {
    // The export's quantity keys are open (any HealthKit identifier), so the
    // check is per key: adaptHealth must emit the authored key unchanged. A
    // pre-rename name such as heartRateVariabilitySDNN (emitted as hrvSDNN) fails.
    for (const [key, q] of Object.entries(authored.quantities)) {
      const out = adaptHealth({date: '2026-01-01', generatedAt: '2026-01-01T00:00:00Z', quantities: {[key]: q}} as never, null)
      expect(Object.keys(out.quantities), `quantities.${key}`).toEqual([key])
      expect(typeof q?.value, `quantities.${key}.value`).toBe('number')
      expect(typeof q?.unit, `quantities.${key}.unit`).toBe('string')
    }
  })

  it('carries every derived share the adapter emits, as numbers', () => {
    for (const key of keys(adapted.derived)) {
      expect(authored.derived, `derived.${key}`).toHaveProperty(key)
      expect(isNumberOrNull((authored.derived as Record<string, unknown>)[key]), `derived.${key}`).toBe(true)
    }
  })

  it('a pre-rename quantity name fails the check (the gate can fail)', () => {
    const out = adaptHealth(
      {date: '2026-01-01', generatedAt: '2026-01-01T00:00:00Z', quantities: {heartRateVariabilitySDNN: {value: 40, unit: 'ms'}}} as never,
      null
    )
    expect(Object.keys(out.quantities)).not.toEqual(['heartRateVariabilitySDNN'])
  })

  it('hydration has exactly the adapter hydration keys', () => {
    expect(keys(authored.hydration)).toEqual(keys(adapted.hydration))
  })

  it('sleep fields keep the adapter types', () => {
    expect(isNumberOrNull(authored.sleepScore)).toBe(true)
    expect(typeof authored.sleepDurationFormatted).toBe('string')
    expect(keys(authored.sleepPhaseFormatted)).toEqual(keys(adapted.sleepPhaseFormatted))
  })

  it('goals and solar, when present, use only adapter keys', () => {
    if (authored.goals) {
      expect(keys(authored.goals).filter((k) => !keys(adapted.goals).includes(k))).toEqual([])
    }
    if (authored.solar) {
      expect(keys(authored.solar)).toEqual(keys(adapted.solar))
    }
  })
})
