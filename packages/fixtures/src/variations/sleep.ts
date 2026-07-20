import {createSleepFixture} from '../factories/sleep'
import type {SleepExport} from '@lifegames/portal-contract/schemas'

export const baseline: SleepExport = createSleepFixture()

export const empty: SleepExport = createSleepFixture({core: {seconds: 0}, deep: {seconds: 0}, rem: {seconds: 0}, awake: {seconds: 0}})

// ~3 hours deep sleep, total ~8h
export const deepDominant: SleepExport = createSleepFixture({core: {seconds: 14400}, deep: {seconds: 10800}, rem: {seconds: 3600}, awake: {seconds: 1200}})

// ~2.5 hours REM sleep, total ~8h
export const remDominant: SleepExport = createSleepFixture({core: {seconds: 14400}, deep: {seconds: 3600}, rem: {seconds: 9000}, awake: {seconds: 1800}})

// ~3 hours total sleep
export const shortSleep: SleepExport = createSleepFixture({core: {seconds: 7200}, deep: {seconds: 1800}, rem: {seconds: 1200}, awake: {seconds: 600}})

// ~9 hours total sleep
export const longSleep: SleepExport = createSleepFixture({core: {seconds: 21600}, deep: {seconds: 7200}, rem: {seconds: 3600}, awake: {seconds: 900}})

// Maximally populated: ~10h total with all truly-optional stage keys present
// (awake, core, deep, rem are NOT in the schema's required[] — only date and
// generatedAt are required). All stages at realistic high durations.
export const full: SleepExport = createSleepFixture({awake: {seconds: 2400}, core: {seconds: 18000}, deep: {seconds: 9000}, rem: {seconds: 7200}})

export const sleepVariations = {baseline, empty, deepDominant, remDominant, shortSleep, longSleep, full}
