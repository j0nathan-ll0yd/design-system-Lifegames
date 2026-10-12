import {createHealthFixture} from '../factories/health'
import {DEFAULT_QUANTITIES} from '../factories/health'
import type {HealthExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {isoTimestamp} from '../factories/helpers'

export const baseline: HealthExport = createHealthFixture()

export const bradycardia: HealthExport = createHealthFixture({quantities: {heartRate: {value: 42, unit: 'count/min'}}})

export const resting: HealthExport = createHealthFixture({quantities: {heartRate: {value: 55, unit: 'count/min'}}})

export const normal: HealthExport = createHealthFixture({quantities: {heartRate: {value: 72, unit: 'count/min'}}})

export const fatBurn: HealthExport = createHealthFixture({quantities: {heartRate: {value: 125, unit: 'count/min'}}})

export const peak: HealthExport = createHealthFixture({quantities: {heartRate: {value: 165, unit: 'count/min'}}})

export const hrvGreen: HealthExport = createHealthFixture({quantities: {heartRateVariabilitySDNN: {value: 58, unit: 'ms'}}})

export const hrvAmber: HealthExport = createHealthFixture({quantities: {heartRateVariabilitySDNN: {value: 25, unit: 'ms'}}})

export const hrvRed: HealthExport = createHealthFixture({quantities: {heartRateVariabilitySDNN: {value: 12, unit: 'ms'}}})

export const missingOptional: HealthExport = createHealthFixture({}, [
  'exerciseTime',
  'dietaryWater',
  'dietaryCaffeine'
])

export const zeroHydration: HealthExport = createHealthFixture({quantities: {dietaryWater: {value: 0, unit: 'mL'}, dietaryCaffeine: {value: 0, unit: 'g'}}})

export const maxHydration: HealthExport = createHealthFixture({
  quantities: {dietaryWater: {value: 4140.3, unit: 'mL'}, dietaryCaffeine: {value: 0.5, unit: 'g'}}
})

// Truly empty: no quantities at all. The factory MERGES quantities by default, so
// we must remove every default key via the removeKeys arg to get `quantities: {}`.
export const empty: HealthExport = createHealthFixture({}, Object.keys(DEFAULT_QUANTITIES))

// Paused — watch off wrist, HR gap detected. Typical quantities + watch.worn=false.
export const pausedHrGap: HealthExport = createHealthFixture({watch: {worn: false, since: isoTimestamp(), source: 'hrGap' as const}})

// Paused — watch on charger. Same quantities + watch.source='charging'.
export const pausedCharging: HealthExport = createHealthFixture({watch: {worn: false, since: isoTimestamp(), source: 'charging' as const}})

// Maximally populated: all 10 default quantities at realistic highs, plus all
// optional top-level keys (lastSync, goals, solar) with every nullable goals field
// set to non-null values.
export const full: HealthExport = createHealthFixture({
  lastSync: isoTimestamp(),
  quantities: {
    heartRate: {value: 185, unit: 'count/min'},
    heartRateVariabilitySDNN: {value: 92, unit: 'ms'},
    stepCount: {value: 24500, unit: 'count'},
    distanceWalkingRunning: {value: 18200, unit: 'm'},
    exerciseTime: {value: 120, unit: 'min'},
    activeEnergyBurned: {value: 1250, unit: 'kcal'},
    basalEnergyBurned: {value: 2100, unit: 'kcal'},
    dietaryWater: {value: 4800, unit: 'mL'},
    dietaryCaffeine: {value: 0.6, unit: 'g'},
    wristTemperatureDelta: {value: 0.8, unit: 'degC'}
  },
  goals: {moveKcal: 750, exerciseMin: 60, standHr: 14, daylightMin: 30},
  solar: {sunriseHHmm: '05:48', sunsetHHmm: '20:42', currentProgressPct: 85},
  // watch: optional server-computed worn verdict. Present in `full` so
  // check:full-coverage verifies both the `watch` key and `watch.since`.
  watch: {worn: false, since: isoTimestamp(), source: 'hrGap' as const}
})

// The movement widget's active-state regression fixture — the exact data from
// the 2026-07-17 goals/stand/daylight incident: server goals 650/40/12 (web
// hardcoded 500/30/12), standHours 4 vs floor(4 standTime-min / 60) = 0, and
// live solar 05:39/20:24 vs frozen SSR 06:30/20:15. Uses the live export's
// short quantity keys (exerciseTime, not appleExerciseTime).
export const movementActive: HealthExport = createHealthFixture({
  quantities: {
    stepCount: {value: 324, unit: 'count'},
    distanceWalkingRunning: {value: 259.8, unit: 'm'},
    activeEnergyBurned: {value: 103.4, unit: 'kcal'},
    basalEnergyBurned: {value: 1148, unit: 'kcal'},
    exerciseTime: {value: 0, unit: 'min'},
    standTime: {value: 4, unit: 'min'},
    standHours: {value: 4, unit: 'count'},
    timeInDaylight: {value: 48, unit: 'min'},
    flightsClimbed: {value: 0, unit: 'count'}
  },
  goals: {moveKcal: 650, exerciseMin: 40, standHr: 12, daylightMin: 20},
  solar: {sunriseHHmm: '05:39', sunsetHHmm: '20:24', currentProgressPct: 81.6}
})

// Sparse: the producer measured only heart rate, HRV, steps, distance and wrist
// temperature. dietaryWater, dietaryCaffeine, exerciseTime, activeEnergyBurned,
// basalEnergyBurned and sleepScore are ABSENT (not zero). sleepScore is not in
// DEFAULT_QUANTITIES, so it is absent by construction. Decision 0160: a missing
// measurement must render differently from a measured zero.
export const sparse: HealthExport = createHealthFixture({}, [
  'dietaryWater',
  'dietaryCaffeine',
  'exerciseTime',
  'activeEnergyBurned',
  'basalEnergyBurned',
  'sleepScore'
])

// SSR known answer (decision 0160): every distinctive value is unique across all
// fixtures, so a rendered value proves SSR read this payload. Synthetic values only.
// 1774 mL = 60 oz (rounded); 0.153 g = 153 mg. standHr is 7 on purpose: every integer
// from 10 to 32 already appears in another fixture.
export const ssrKnownAnswer: HealthExport = createHealthFixture({
  quantities: {
    heartRate: {value: 97, unit: 'count/min'},
    heartRateVariabilitySDNN: {value: 69, unit: 'ms'},
    stepCount: {value: 12345, unit: 'count'},
    distanceWalkingRunning: {value: 8765, unit: 'm'},
    exerciseTime: {value: 53, unit: 'min'},
    activeEnergyBurned: {value: 613, unit: 'kcal'},
    basalEnergyBurned: {value: 1721, unit: 'kcal'},
    dietaryWater: {value: 1774, unit: 'mL'},
    dietaryCaffeine: {value: 0.153, unit: 'g'},
    wristTemperatureDelta: {value: -0.4, unit: 'degC'},
    sleepScore: {value: 83, unit: 'score'}
  },
  goals: {moveKcal: 637, exerciseMin: 57, standHr: 7, daylightMin: 33},
  solar: {sunriseHHmm: '05:41', sunsetHHmm: '20:19', currentProgressPct: 63.7}
})

export const healthVariations = {
  baseline,
  bradycardia,
  resting,
  normal,
  fatBurn,
  peak,
  hrvGreen,
  hrvAmber,
  hrvRed,
  missingOptional,
  zeroHydration,
  maxHydration,
  empty,
  pausedHrGap,
  pausedCharging,
  full,
  movementActive,
  sparse,
  ssrKnownAnswer
}
