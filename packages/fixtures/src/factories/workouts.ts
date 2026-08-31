import type {WorkoutsExport} from '@j0nathan-ll0yd/portal-contract/schemas'
import {isoDate, isoTimestamp} from './helpers'

type Workout = WorkoutsExport['workouts'][number]

// `source` mirrors the LP export, which coarsens the HealthKit device name to a
// generic device class rather than the owner's personal device name (decision 0096 HF8).
const DEFAULT_WORKOUT: Workout = {activityType: 'Walking', duration: 965, energyBurned: 72, distance: 1135, source: 'Apple Watch'}

export function createWorkout(overrides?: Partial<Workout>): Workout {
  return {...DEFAULT_WORKOUT, ...overrides}
}

export function createWorkoutsFixture(overrides?: Partial<WorkoutsExport>): WorkoutsExport {
  return {date: isoDate(1), generatedAt: isoTimestamp(), workouts: [createWorkout()], ...overrides}
}
