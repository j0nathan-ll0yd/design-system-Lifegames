import type {SleepExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {isoDate, isoTimestamp} from './helpers'

export function createSleepFixture(overrides?: Partial<SleepExport>): SleepExport {
  return {
    date: isoDate(1),
    generatedAt: isoTimestamp(),
    core: {seconds: 17500},
    deep: {seconds: 5500},
    rem: {seconds: 5500},
    awake: {seconds: 1950},
    ...overrides
  }
}
