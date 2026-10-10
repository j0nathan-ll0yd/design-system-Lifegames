// Per-card render views (atlas decision 0160): every value a health card shows,
// computed once from its props. The `.astro` template renders the view, and the
// browser updater writes the same view into the DOM, so server and client show
// the same text and record the same state for the same input. Pure, DOM-free.
import {a11y, widgets} from '@j0nathan-ll0yd/copy'
import type {AdaptedSleep} from './adapters'
import {HYDRATION} from './constants'
import {classifyHeartRate, classifyHRV, type HeartRateZone, type HRVColor} from './heart-rate'
import {
  formatHrv,
  formatPositiveVital,
  formatTempDelta,
  heartRateState,
  hydrationState,
  isReading,
  isWatchPaused,
  movementRingsState,
  nightSummaryState,
  normalizeMovementHealth,
  standHoursFrom
} from './widget-rules'
import {formatMeasurement, isScaffoldHidden, NO_READING, rendersData, type WidgetState} from './widget-state'
import type {HeartRateProps} from '../widgets/health/HeartRate.types'
import type {HydrationProps} from '../widgets/health/Hydration.types'
import type {MovementRingsProps} from '../widgets/health/MovementRings.types'
import type {NightSummaryProps} from '../widgets/health/NightSummary.types'

// ── HeartRate ───────────────────────────────────────────────────────

export interface HeartRateView {
  state: WidgetState
  /** The watch is off the wrist or charging: paused copy, no value. */
  paused: boolean
  /** Values render: a data state with a watch on the wrist. */
  showData: boolean
  /** The value scaffold renders hidden (unavailable, suppressed, empty). */
  scaffoldHidden: boolean
  /** Rounded heart rate, 0 when there is no reading or no value shows. */
  hr: number
  /** Rounded HRV, 0 when there is no reading or no value shows. */
  hrv: number
  hasHrv: boolean
  zone: HeartRateZone
  hrvColor: HRVColor
  bpmText: string
  zoneText: string
  hrvText: string
  rhrText: string
  rrText: string
  tempText: string
  pausedLabel: string
  pausedDescription: string
}

export function heartRateView(props: HeartRateProps): HeartRateView {
  const state = heartRateState(props)
  const data = rendersData(state)
  const q = data ? props.health?.quantities : undefined
  const watch = data ? props.health?.watch : undefined
  const paused = data && isWatchPaused(props.health)
  const charging = watch?.source === 'charging'
  const showData = data && !paused
  const hrRaw = showData ? q?.heartRate?.value : undefined
  const hrvRaw = showData ? q?.hrvSDNN?.value : undefined
  // A heart rate of 0 is no reading (formatPositiveVital).
  const hr = isReading(hrRaw) && hrRaw > 0 ? Math.round(hrRaw) : 0
  const hasHrv = isReading(hrvRaw)
  const hrv = hasHrv ? Math.round(hrvRaw) : 0
  // Every slot: the reading, the no-reading mark, or '' when no value shows.
  const slot = (text: string): string => (showData ? text : '')
  return {
    state,
    paused,
    showData,
    scaffoldHidden: isScaffoldHidden(state) || state === 'empty',
    hr,
    hrv,
    hasHrv,
    zone: classifyHeartRate(hr),
    hrvColor: classifyHRV(hrv),
    bpmText: slot(formatPositiveVital(hrRaw)),
    zoneText: slot(hr > 0 ? classifyHeartRate(hr).zone : NO_READING),
    hrvText: slot(formatHrv(hrvRaw)),
    rhrText: slot(formatPositiveVital(q?.restingHeartRate?.value)),
    rrText: slot(formatPositiveVital(q?.respiratoryRate?.value)),
    tempText: slot(formatTempDelta(q?.wristTemperatureDelta?.value)),
    pausedLabel: paused ? (charging ? widgets.heartRate.paused.labelCharging : widgets.heartRate.paused.label) : '',
    pausedDescription: paused ? (charging ? widgets.heartRate.paused.descriptionCharging : widgets.heartRate.paused.description) : ''
  }
}

// ── MovementRings ───────────────────────────────────────────────────

/** Default goals: configuration until the device's first goals sync. */
export const MOVEMENT_DEFAULT_GOALS = {moveKcal: 500, exerciseMin: 30, standHr: 12, daylightMin: 20} as const

/** SVG ring radii (r=60/44/28). */
export const MOVEMENT_RING_RADII = {move: 60, exercise: 44, stand: 28} as const

/** A ring's `stroke-dasharray` and `stroke-dashoffset`, as rendered. */
export interface RingStroke {
  dasharray: string
  dashoffset: string
}

function ringStroke(radius: number, pct: number): RingStroke {
  const circ = 2 * Math.PI * radius
  const visual = Math.min(1, Math.max(0, pct))
  return {dasharray: circ.toFixed(2), dashoffset: (circ * (1 - visual)).toFixed(2)}
}

export interface MovementView {
  state: WidgetState
  isEmpty: boolean
  paused: boolean
  /** Values render: a data state, not empty, watch on the wrist. */
  renderValues: boolean
  scaffoldHidden: boolean
  goals: {moveKcal: number; exerciseMin: number; standHr: number; daylightMin: number}
  rings: {move: RingStroke; exercise: RingStroke; stand: RingStroke}
  centerText: string
  /** The ring group's accessible name; null when no value shows (aria-hidden). */
  ringsLabel: string | null
  stepsText: string
  distanceText: string
  flightsText: string
  legendMove: string
  legendExercise: string
  legendStand: string
  sunrise: string
  sunset: string
  /** The sun dot's position (0–100), or null when it is not drawn. */
  sunPct: number | null
  daylightText: string
  daylightHit: boolean
  pausedLabel: string
  pausedDescription: string
}

export function movementView(props: MovementRingsProps): MovementView {
  const health = normalizeMovementHealth(props.health)
  const state = movementRingsState(props)
  const isEmpty = state === 'empty'
  const data = rendersData(state)
  const paused = data && isWatchPaused(health)
  const charging = data && health?.watch?.source === 'charging'
  const renderValues = data && !isEmpty && !paused
  const q = (renderValues ? health?.quantities : undefined) ?? {}
  // Goals are configuration; the owner's synced goals show only with values.
  const synced = renderValues ? health?.goals : undefined
  const goals = {
    moveKcal: synced?.moveKcal ?? MOVEMENT_DEFAULT_GOALS.moveKcal,
    exerciseMin: synced?.exerciseMin ?? MOVEMENT_DEFAULT_GOALS.exerciseMin,
    standHr: synced?.standHr ?? MOVEMENT_DEFAULT_GOALS.standHr,
    daylightMin: synced?.daylightMin ?? MOVEMENT_DEFAULT_GOALS.daylightMin
  }
  const round = (v: number | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)
  const moveVal = round(q.activeEnergyBurned?.value)
  const exerciseVal = round(q.exerciseTime?.value)
  const standHours = standHoursFrom(q.standHours, q.standTime)
  // A missing measurement draws an empty ring and reads as no reading.
  const frac = (v: number | null, goal: number): number => (v != null && goal > 0 ? v / goal : 0)
  const movePct = frac(moveVal, goals.moveKcal)
  const exercisePct = frac(exerciseVal, goals.exerciseMin)
  const standPct = frac(standHours, goals.standHr)
  const txt = (v: number | null, format: (n: number) => string = String): string => (renderValues ? formatMeasurement(v, format) : '')
  const legend = (v: number | null, goal: number): string => (renderValues ? formatMeasurement(v) + '/' + goal : '')
  // Unclamped, so the announced value stays truthful above 100%.
  const ringPart = (v: number | null, f: number): string => (v != null ? Math.round(f * 100) + '%' : widgets.widgetState.noReading)
  const solar = renderValues ? health?.solar : undefined
  const daylightMin = round(q.timeInDaylight?.value)
  return {
    state,
    isEmpty,
    paused,
    renderValues,
    scaffoldHidden: isScaffoldHidden(state) || isEmpty,
    goals,
    rings: {
      move: ringStroke(MOVEMENT_RING_RADII.move, movePct),
      exercise: ringStroke(MOVEMENT_RING_RADII.exercise, exercisePct),
      stand: ringStroke(MOVEMENT_RING_RADII.stand, standPct)
    },
    centerText: renderValues ? (moveVal != null ? Math.round(Math.min(movePct, 1) * 100) + '%' : NO_READING) : '',
    ringsLabel: renderValues
      ? a11y.movement.rings.replace('{calories}%', ringPart(moveVal, movePct)).replace('{exercise}%', ringPart(exerciseVal, exercisePct)).replace('{stand}%',
        ringPart(standHours, standPct))
      : null,
    stepsText: txt(round(q.stepCount?.value), (n) => n.toLocaleString('en-US')),
    distanceText: txt(q.distanceWalkingRunning?.value ?? null, (n) => (n / 1000).toFixed(1)),
    flightsText: txt(round(q.flightsClimbed?.value)),
    legendMove: legend(moveVal, goals.moveKcal),
    legendExercise: legend(exerciseVal, goals.exerciseMin),
    legendStand: legend(standHours, goals.standHr),
    // Solar facts are server-computed; absent solar invents nothing.
    sunrise: renderValues ? (solar?.sunriseHHmm ?? NO_READING) : '',
    sunset: renderValues ? (solar?.sunsetHHmm ?? NO_READING) : '',
    sunPct: solar ? Math.min(100, Math.max(0, solar.currentProgressPct)) : null,
    daylightText: renderValues ? formatMeasurement(daylightMin) : '',
    daylightHit: daylightMin != null && daylightMin >= goals.daylightMin,
    pausedLabel: paused ? (charging ? widgets.movement.paused.labelCharging : widgets.movement.paused.label) : '',
    pausedDescription: paused ? (charging ? widgets.movement.paused.descriptionCharging : widgets.movement.paused.description) : ''
  }
}

// ── Hydration ───────────────────────────────────────────────────────

/** A target-range band on a vessel, as percentages of the vessel's scale. */
export interface RangeBand {
  /** `bottom`, in percent of the vessel height. */
  bottomPct: number
  /** `height`, in percent of the vessel height. */
  heightPct: number
  lo: string
  hi: string
}

/** The band for `lo`–`hi` on a scale of `max`; null when the scale is not positive. */
export function rangeBand(lo: number, hi: number, max: number): RangeBand | null {
  if (!(max > 0)) {
    return null
  }
  return {bottomPct: (lo / max) * 100, heightPct: ((hi - lo) / max) * 100, lo: String(lo), hi: String(hi)}
}

export interface HydrationView {
  state: WidgetState
  showData: boolean
  scaffoldHidden: boolean
  waterText: string
  caffeineText: string
  /** Liquid fill, 0–100. */
  waterPct: number
  caffeinePct: number
  /** Target-range bands: drawn only in a data state. */
  waterBand: RangeBand | null
  caffeineBand: RangeBand | null
}

export function hydrationView(props: HydrationProps): HydrationView {
  const state = hydrationState(props)
  const showData = rendersData(state)
  // Hydration's empty state shows the vessels with the no-reading mark.
  const emptyMarks = state === 'empty'
  const h = showData ? props.health?.hydration : undefined
  // Scale configuration falls back to the design-system constants; a
  // measurement never falls back to a number.
  const waterMax = h?.waterMax ?? HYDRATION.waterMax
  const caffeineMax = h?.caffeineMax ?? HYDRATION.caffeineMax
  const waterOz = h?.waterOz ?? null
  const caffeineMg = h?.caffeineMg ?? null
  const fill = (value: number | null, max: number): number => (value != null && max > 0 ? Math.min(Math.max(value / max, 0), 1) * 100 : 0)
  const text = (value: number | null, unit: string): string => showData ? formatMeasurement(value, (n) => n + ' ' + unit) : emptyMarks ? NO_READING : ''
  return {
    state,
    showData,
    scaffoldHidden: isScaffoldHidden(state),
    waterText: text(waterOz, 'oz'),
    caffeineText: text(caffeineMg, 'mg'),
    waterPct: fill(waterOz, waterMax),
    caffeinePct: fill(caffeineMg, caffeineMax),
    waterBand: showData ? rangeBand(h?.waterRangeLo ?? HYDRATION.waterRangeLo, h?.waterRangeHi ?? HYDRATION.waterRangeHi, waterMax) : null,
    caffeineBand: showData
      ? rangeBand(h?.caffeineRangeLo ?? HYDRATION.caffeineRangeLo, h?.caffeineRangeHi ?? HYDRATION.caffeineRangeHi, caffeineMax)
      : null
  }
}

// ── NightSummary ────────────────────────────────────────────────────

/** Adapter output → NightSummary's `health` prop (toDashboardViewModels and updateNightSummary). */
export function toNightSummaryHealth(s: AdaptedSleep): NonNullable<NightSummaryProps['health']> {
  return {
    sleepScore: s.sleepScore,
    sleepDurationFormatted: s.isEmpty ? '' : s.sleepDurationFormatted,
    sleepPhaseFormatted: {
      deep: s.sleepPhaseFormatted.deep ?? '',
      rem: s.sleepPhaseFormatted.rem ?? '',
      core: s.sleepPhaseFormatted.core ?? '',
      awake: s.sleepPhaseFormatted.awake ?? ''
    },
    derived: {deepPct: s.derived.deepPct, remPct: s.derived.remPct},
    isEmpty: s.isEmpty
  }
}

export const SLEEP_PHASES = ['deep', 'rem', 'core', 'awake'] as const
export type SleepPhase = (typeof SLEEP_PHASES)[number]

/** The empty state's mark in every NightSummary slot. */
export const NIGHT_SUMMARY_EMPTY_MARK = '--'

export interface NightSummaryView {
  state: WidgetState
  showData: boolean
  isEmpty: boolean
  scaffoldHidden: boolean
  durationText: string
  scoreText: string
  /** The score bar's width, 0–100. */
  scoreWidth: number
  phases: Record<SleepPhase, string>
  /** The restorative caption's three clauses; null when it is not shown. */
  caption: {deep: string; rem: string; tail: string} | null
}

export function nightSummaryView(props: NightSummaryProps): NightSummaryView {
  const state = nightSummaryState(props)
  const showData = rendersData(state)
  const isEmpty = state === 'empty'
  const h = showData ? props.health : undefined
  const sleepScore = h?.sleepScore ?? null
  const deepPct = h?.derived.deepPct ?? null
  const remPct = h?.derived.remPct ?? null
  // The caption template is em-dash separated: "{deep}% deep — {rem}% REM — …".
  const clauses = widgets.nightSummary.restorative.split('—').map((c) => c.trim())
  const phase = (p: SleepPhase): string => (isEmpty ? NIGHT_SUMMARY_EMPTY_MARK : showData ? h?.sleepPhaseFormatted[p] || NO_READING : '')
  return {
    state,
    showData,
    isEmpty,
    scaffoldHidden: isScaffoldHidden(state),
    // '' is a total the export did not carry (a missing stage): no reading.
    durationText: isEmpty ? NIGHT_SUMMARY_EMPTY_MARK : showData ? h?.sleepDurationFormatted || NO_READING : '',
    scoreText: isEmpty ? NIGHT_SUMMARY_EMPTY_MARK : showData ? formatMeasurement(sleepScore) : '',
    scoreWidth: sleepScore != null ? Math.min(Math.max(sleepScore, 0), 100) : 0,
    phases: {deep: phase('deep'), rem: phase('rem'), core: phase('core'), awake: phase('awake')},
    caption: showData && deepPct != null && remPct != null
      ? {deep: (clauses[0] ?? '').replace('{deep}', String(deepPct)), rem: (clauses[1] ?? '').replace('{rem}', String(remPct)), tail: clauses[2] ?? ''}
      : null
  }
}
