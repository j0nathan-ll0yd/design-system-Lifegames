import {createWorkout, createWorkoutsFixture} from '../factories/workouts'
import type {WorkoutsExport} from '@j0nathan-ll0yd/portal-contract/schemas'

export const baseline: WorkoutsExport = createWorkoutsFixture()

export const empty: WorkoutsExport = createWorkoutsFixture({workouts: []})

export const barrysBootcamp: WorkoutsExport = createWorkoutsFixture({
  workouts: [
    createWorkout({activityType: 'Other', duration: 3600, energyBurned: 450, distance: null})
  ]
})

export const multiWorkout: WorkoutsExport = createWorkoutsFixture({
  workouts: [
    createWorkout({activityType: 'Walking', duration: 965, energyBurned: 72, distance: 1135}),
    createWorkout({activityType: 'Cycling', duration: 2700, energyBurned: 320, distance: 12000}),
    createWorkout({activityType: 'Running', duration: 1800, energyBurned: 280, distance: 4500})
  ]
})

export const noDistance: WorkoutsExport = createWorkoutsFixture({workouts: [createWorkout({distance: null})]})

// Maximally populated: multiple workout types, ALL nullable item fields set to
// non-null values (duration, energyBurned, distance), max-count array.
export const full: WorkoutsExport = createWorkoutsFixture({
  workouts: [
    createWorkout({activityType: 'Running', duration: 3600, energyBurned: 680, distance: 10500, source: "Jonathan's Apple Watch"}),
    createWorkout({activityType: 'Cycling', duration: 5400, energyBurned: 520, distance: 25000, source: "Jonathan's Apple Watch"}),
    createWorkout({activityType: 'Walking', duration: 2700, energyBurned: 185, distance: 3200, source: "Jonathan's Apple Watch"}),
    createWorkout({activityType: 'Swimming', duration: 2400, energyBurned: 420, distance: 1800, source: "Jonathan's Apple Watch"}),
    createWorkout({activityType: 'Strength Training', duration: 3000, energyBurned: 350, distance: 0, source: "Jonathan's Apple Watch"}),
    createWorkout({activityType: 'Yoga', duration: 3600, energyBurned: 180, distance: 0, source: "Jonathan's Apple Watch"})
  ]
})

export const workoutsVariations = {baseline, empty, barrysBootcamp, multiWorkout, noDistance, full}
