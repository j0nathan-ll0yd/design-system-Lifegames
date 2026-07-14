import { createHealthFixture } from '../factories/health';
import { DEFAULT_QUANTITIES } from '../factories/health';
import type { HealthExport } from '@lifegames/portal-contract/schemas';
import { isoTimestamp } from '../factories/helpers';

export const baseline: HealthExport = createHealthFixture();

export const bradycardia: HealthExport = createHealthFixture({
  quantities: { heartRate: { value: 42, unit: 'count/min' } },
});

export const resting: HealthExport = createHealthFixture({
  quantities: { heartRate: { value: 55, unit: 'count/min' } },
});

export const normal: HealthExport = createHealthFixture({
  quantities: { heartRate: { value: 72, unit: 'count/min' } },
});

export const fatBurn: HealthExport = createHealthFixture({
  quantities: { heartRate: { value: 125, unit: 'count/min' } },
});

export const peak: HealthExport = createHealthFixture({
  quantities: { heartRate: { value: 165, unit: 'count/min' } },
});

export const hrvGreen: HealthExport = createHealthFixture({
  quantities: { heartRateVariabilitySDNN: { value: 58, unit: 'ms' } },
});

export const hrvAmber: HealthExport = createHealthFixture({
  quantities: { heartRateVariabilitySDNN: { value: 25, unit: 'ms' } },
});

export const hrvRed: HealthExport = createHealthFixture({
  quantities: { heartRateVariabilitySDNN: { value: 12, unit: 'ms' } },
});

export const missingOptional: HealthExport = createHealthFixture({}, [
  'exerciseTime',
  'dietaryWater',
  'dietaryCaffeine',
]);

export const zeroHydration: HealthExport = createHealthFixture({
  quantities: {
    dietaryWater: { value: 0, unit: 'mL' },
    dietaryCaffeine: { value: 0, unit: 'g' },
  },
});

export const maxHydration: HealthExport = createHealthFixture({
  quantities: {
    dietaryWater: { value: 4140.3, unit: 'mL' },
    dietaryCaffeine: { value: 0.5, unit: 'g' },
  },
});

// Truly empty: no quantities at all. The factory MERGES quantities by default, so
// we must remove every default key via the removeKeys arg to get `quantities: {}`.
export const empty: HealthExport = createHealthFixture({}, Object.keys(DEFAULT_QUANTITIES));

// Maximally populated: all 10 default quantities at realistic highs, plus all
// optional top-level keys (lastSync, goals, solar) with every nullable goals field
// set to non-null values.
export const full: HealthExport = createHealthFixture({
  lastSync: isoTimestamp(),
  quantities: {
    heartRate: { value: 185, unit: 'count/min' },
    heartRateVariabilitySDNN: { value: 92, unit: 'ms' },
    stepCount: { value: 24500, unit: 'count' },
    distanceWalkingRunning: { value: 18200, unit: 'm' },
    appleExerciseTime: { value: 120, unit: 'min' },
    activeEnergyBurned: { value: 1250, unit: 'kcal' },
    basalEnergyBurned: { value: 2100, unit: 'kcal' },
    dietaryWater: { value: 4800, unit: 'mL' },
    dietaryCaffeine: { value: 0.6, unit: 'g' },
    appleSleepingWristTemperature: { value: 0.8, unit: 'degC' },
  },
  goals: {
    moveKcal: 750,
    exerciseMin: 60,
    standHr: 14,
    daylightMin: 30,
  },
  solar: {
    sunriseHHmm: '05:48',
    sunsetHHmm: '20:42',
    currentProgressPct: 85,
  },
  // watch: optional server-computed worn verdict. Present in `full` so
  // check:full-coverage verifies both the `watch` key and `watch.since`.
  watch: {
    worn: false,
    since: isoTimestamp(),
    source: 'hrGap' as const,
  },
});

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
  full,
};
