// Post-adapter display fixtures for the health widgets (HeartRate, MovementRings,
// Workouts, Hydration, NightSummary).
//
// DashboardHealth is a DS-owned display shape that is RICHER than the runtime
// adapter output: it carries ranges, derived metrics, hydration ranges, and
// sampleWorkouts that adaptHealth() does NOT produce (adaptHealth feeds the runtime
// updater with a narrower AdaptedHealth shape — though goals/solar DO pass through
// it now that the live movement widget renders them). The SSR shell therefore reads
// this authored display shape, not adapter output. Authored against `@lifegames/schemas`
// `DashboardHealth` (generated/dashboard-health.schema.json). All values are
// absolute (no relative timestamps), so this domain is inherently deterministic.
import type {DashboardHealth} from '@lifegames/schemas'
import {authored} from './branded'

export const baseline = authored<DashboardHealth>({
  date: '2026-01-01',
  quantities: {
    activeEnergyBurned: {value: 310.5, unit: 'kcal'},
    exerciseTime: {value: 35, unit: 'min'},
    standTime: {value: 65, unit: 'min'},
    standHours: {value: 9, unit: 'count'},
    basalEnergyBurned: {value: 1820.0, unit: 'kcal'},
    distanceWalkingRunning: {value: 6200.0, unit: 'm'},
    heartRate: {value: 72, unit: 'count/min'},
    hrvSDNN: {value: 45.0, unit: 'ms'},
    respiratoryRate: {value: 14.5, unit: 'count/min'},
    restingHeartRate: {value: 58, unit: 'count/min'},
    stepCount: {value: 8200, unit: 'count'},
    wristTemperatureDelta: {value: 0.2, unit: '°C'},
    timeInDaylight: {value: 48, unit: 'min'},
    flightsClimbed: {value: 4, unit: 'count'}
  },
  sleep: {awake: {seconds: 900}, core: {seconds: 14400}, deep: {seconds: 3600}, rem: {seconds: 6300}},
  workouts: [{activity_type: 'Outdoor Walk', duration: 1800, energy_burned: 180, distance: 2400}],
  goals: {moveKcal: 500, exerciseMin: 30, standHr: 12, daylightMin: 20},
  solar: {sunriseHHmm: '06:30', sunsetHHmm: '20:15', currentProgressPct: 60},
  ranges: {
    heartRate: {low: 50, normal: [60, 100], high: 120, unit: 'bpm'},
    restingHeartRate: {excellent: [0, 60], good: [60, 70], fair: [70, 80], poor: [80, 200]},
    hrvSDNN: {poor: [0, 20], fair: [20, 40], good: [40, 60], excellent: [60, 200]},
    respiratoryRate: {low: [0, 12], normal: [12, 20], high: [20, 40]},
    stepCount: {goal: 10000},
    activeEnergy: {goal: 300},
    exerciseTime: {goal: 30},
    standTime: {goal: 60},
    sleep: {targetHours: 7, deepPctIdeal: [13, 23], remPctIdeal: [20, 25], efficiencyGood: 85}
  },
  derived: {
    totalSleepSeconds: 24300,
    timeInBedSeconds: 25200,
    sleepEfficiency: 96.4,
    totalCalories: 2130.5,
    distanceKm: 6.2,
    deepPct: 14.8,
    remPct: 25.9,
    corePct: 59.3
  },
  sleepScore: 82,
  sleepDurationFormatted: '6h 45m',
  sleepPhaseFormatted: {deep: '1h 0m', rem: '1h 45m', core: '4h 0m', awake: '15m'},
  sampleWorkouts: [
    {activity_type: 'Outdoor Walk', duration: 1800, energy_burned: 180, distance: 2400},
    {activity_type: 'Cycling', duration: 3600, energy_burned: 420, distance: 18000}
  ],
  hydration: {waterOz: 80, caffeineMg: 200, waterMax: 140, caffeineMax: 500, waterRangeLo: 74, waterRangeHi: 125, caffeineRangeLo: 200, caffeineRangeHi: 400}
})

// Empty: only the schema-required fields (date, quantities, sleep, workouts) with
// zeroed quantities and no workouts. Exercises the skeleton/no-data health path.
export const empty = authored<DashboardHealth>({
  date: '2026-01-01',
  quantities: {},
  sleep: {awake: {seconds: 0}, core: {seconds: 0}, deep: {seconds: 0}, rem: {seconds: 0}},
  workouts: []
})

// Maximally populated: all optional top-level keys present (lastSync, goals, solar,
// ranges, derived, sleepScore, sleepDurationFormatted, sleepPhaseFormatted,
// sampleWorkouts, hydration), all nullable goals fields non-null, max quantities,
// multiple workouts, richest realistic values.
export const full = authored<DashboardHealth>({
  date: '2026-01-01',
  lastSync: '2026-01-01T23:45:00.000Z',
  quantities: {
    activeEnergyBurned: {value: 1250, unit: 'kcal'},
    exerciseTime: {value: 120, unit: 'min'},
    standTime: {value: 180, unit: 'min'},
    standHours: {value: 13, unit: 'count'},
    basalEnergyBurned: {value: 2100, unit: 'kcal'},
    distanceWalkingRunning: {value: 18200, unit: 'm'},
    heartRate: {value: 185, unit: 'count/min'},
    hrvSDNN: {value: 92, unit: 'ms'},
    respiratoryRate: {value: 18, unit: 'count/min'},
    restingHeartRate: {value: 48, unit: 'count/min'},
    stepCount: {value: 24500, unit: 'count'},
    wristTemperatureDelta: {value: 0.8, unit: '°C'},
    timeInDaylight: {value: 180, unit: 'min'},
    flightsClimbed: {value: 22, unit: 'count'}
  },
  sleep: {awake: {seconds: 1800}, core: {seconds: 18000}, deep: {seconds: 9000}, rem: {seconds: 7200}},
  workouts: [
    {activity_type: 'Running', duration: 3600, energy_burned: 680, distance: 10500},
    {activity_type: 'Cycling', duration: 5400, energy_burned: 520, distance: 25000},
    {activity_type: 'Swimming', duration: 2400, energy_burned: 420, distance: 1800},
    {activity_type: 'Strength Training', duration: 3000, energy_burned: 350, distance: 0}
  ],
  goals: {moveKcal: 750, exerciseMin: 60, standHr: 14, daylightMin: 30},
  solar: {sunriseHHmm: '05:48', sunsetHHmm: '20:42', currentProgressPct: 85},
  ranges: {
    heartRate: {low: 50, normal: [60, 100], high: 120, unit: 'bpm'},
    restingHeartRate: {excellent: [0, 60], good: [60, 70], fair: [70, 80], poor: [80, 200]},
    hrvSDNN: {poor: [0, 20], fair: [20, 40], good: [40, 60], excellent: [60, 200]},
    respiratoryRate: {low: [0, 12], normal: [12, 20], high: [20, 40]},
    stepCount: {goal: 15000},
    activeEnergy: {goal: 500},
    exerciseTime: {goal: 60},
    standTime: {goal: 120},
    sleep: {targetHours: 8, deepPctIdeal: [13, 23], remPctIdeal: [20, 25], efficiencyGood: 85}
  },
  derived: {
    totalSleepSeconds: 34200,
    timeInBedSeconds: 36000,
    sleepEfficiency: 95.0,
    totalCalories: 3350,
    distanceKm: 18.2,
    deepPct: 26.3,
    remPct: 21.1,
    corePct: 52.6
  },
  sleepScore: 94,
  sleepDurationFormatted: '9h 30m',
  sleepPhaseFormatted: {deep: '2h 30m', rem: '2h 0m', core: '5h 0m', awake: '30m'},
  sampleWorkouts: [
    {activity_type: 'Running', duration: 3600, energy_burned: 680, distance: 10500},
    {activity_type: 'Cycling', duration: 5400, energy_burned: 520, distance: 25000},
    {activity_type: 'Swimming', duration: 2400, energy_burned: 420, distance: 1800},
    {activity_type: 'Strength Training', duration: 3000, energy_burned: 350, distance: 0}
  ],
  hydration: {
    waterOz: 140,
    caffeineMg: 480,
    waterMax: 140,
    caffeineMax: 500,
    waterRangeLo: 74,
    waterRangeHi: 125,
    caffeineRangeLo: 200,
    caffeineRangeHi: 400
  }
})

export const healthPostAdapter = {baseline, empty, full}
