// Per-widget state rules and shared value formatting (atlas decision 0160).
//
// One owner for each widget's final render state: the view models
// (toDashboardViewModels) and the .astro templates call the SAME function, so
// the state a loader reports (data-ssr-state, the ssr-data meta, the
// X-SSR-Data header) always matches the markup. Each rule starts from the
// compatibility mapper (resolveWidgetState) and adds only the widget's own
// downgrades. The formatting helpers are shared by templates and updaters so
// server and client render the same text for the same input.
import {NO_READING, rendersData, resolveWidgetState, type WidgetState} from './widget-state'
import type {BookshelfProps} from '../widgets/reading/Bookshelf.types'
import type {DevActivityLogProps} from '../widgets/github/DevActivityLog.types'
import type {HeartRateProps} from '../widgets/health/HeartRate.types'
import type {HydrationProps} from '../widgets/health/Hydration.types'
import type {MovementRingsProps} from '../widgets/health/MovementRings.types'
import type {NightSummaryProps} from '../widgets/health/NightSummary.types'
import type {ReadingFeedProps} from '../widgets/reading/ReadingFeed.types'
import type {StarredRepoListProps} from '../widgets/github/StarredRepoList.types'
import type {TheatreReviewsProps} from '../widgets/reading/TheatreReviews.types'
import type {WorkoutsProps} from '../widgets/health/Workouts.types'

// ── Value predicates and formatting ─────────────────────────────────

/** True for a finite number: the export carried this measurement. */
export function isReading(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * A vital that is never physiologically 0 (heart rate, resting heart rate,
 * respiratory rate): a recorded 0 means no reading, on server and client.
 */
export function formatPositiveVital(v: number | null | undefined): string {
  return isReading(v) && v > 0 ? String(Math.round(v)) : NO_READING
}

/** HRV in ms: any finite value is a reading. */
export function formatHrv(v: number | null | undefined): string {
  return isReading(v) ? String(Math.round(v)) : NO_READING
}

/** Signed wrist-temperature delta to one decimal place (e.g. +0.2, -0.1). */
export function formatTempDelta(v: number | null | undefined): string {
  return isReading(v) ? (v > 0 ? '+' : '') + v.toFixed(1) : NO_READING
}

/** A workout duration in seconds as "1h 5m" or "42m 10s". */
export function formatWorkoutDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) {
    return h + 'h ' + m + 'm'
  }
  return m + 'm' + (s > 0 ? ' ' + s + 's' : '')
}

type Quantity = {value: number; unit: string} | undefined

/**
 * Achieved stand hours: the watch ring's own count (`standHours`) when
 * present, else `standTime` converted from minutes when HealthKit shipped
 * minutes. Null when the export carried neither.
 */
export function standHoursFrom(standHours: Quantity, standTime: Quantity): number | null {
  if (standHours) {
    return Math.floor(standHours.value)
  }
  if (standTime) {
    return standTime.unit === 'min' ? Math.floor(standTime.value / 60) : Math.floor(standTime.value)
  }
  return null
}

// ── State rules ─────────────────────────────────────────────────────

/** A list widget: data state when it has items, else empty. */
function listState(state: WidgetState | null | undefined, items: readonly unknown[] | undefined): WidgetState {
  return resolveWidgetState(state, (items?.length ?? 0) > 0)
}

/**
 * HeartRate: a data state without a heart-rate reading is `unavailable`
 * (the primary measurement); a recorded 0 for both heart rate and HRV is
 * `empty`.
 */
export function heartRateState(p: HeartRateProps): WidgetState {
  const state = resolveWidgetState(p.state, p.health != null)
  if (!rendersData(state)) {
    return state
  }
  const quantities = p.health?.quantities ?? {}
  const hr = quantities.heartRate?.value
  const hrv = quantities.hrvSDNN?.value
  if (!isReading(hr)) {
    // A readable export that carries no quantity at all is empty ("No heart
    // rate data"); one that carries other readings but no heart rate cannot
    // render its primary measurement: unavailable.
    return Object.keys(quantities).length === 0 ? 'empty' : 'unavailable'
  }
  if (hr === 0 && (!isReading(hrv) || hrv === 0)) {
    return 'empty'
  }
  return state
}

type MovementHealth = NonNullable<MovementRingsProps['health']>

/**
 * The flat Swift-fixture shape (`health.movement.*`) normalized to the nested
 * HealthKit shape (`health.quantities.*`). A flat field the fixture omits
 * stays absent, never 0.
 */
export function normalizeMovementHealth(raw: unknown): MovementHealth | undefined {
  if (raw == null || typeof raw !== 'object') {
    return undefined
  }
  const r = raw as Record<string, unknown>
  if (r.quantities) {
    return raw as MovementHealth
  }
  const m = r.movement as
    | {
      moveKcal?: number
      exerciseMin?: number
      standHr?: number
      steps?: number
      distanceMeters?: number
      flights?: number
      daylightMin?: number
      goals?: MovementHealth['goals']
      solar?: MovementHealth['solar']
    }
    | undefined
  const qty = (value: number | undefined, unit: string) => (typeof value === 'number' ? {value, unit} : undefined)
  return {
    quantities: {
      stepCount: qty(m?.steps, 'count'),
      distanceWalkingRunning: qty(m?.distanceMeters, 'm'),
      flightsClimbed: qty(m?.flights, 'count'),
      activeEnergyBurned: qty(m?.moveKcal, 'kcal'),
      exerciseTime: qty(m?.exerciseMin, 'min'),
      standTime: qty(m?.standHr, 'hr'),
      // Flat-shape standHr is achieved hours, exactly what standHours carries.
      standHours: qty(m?.standHr, 'count'),
      timeInDaylight: qty(m?.daylightMin, 'min')
    },
    goals: m?.goals,
    solar: m?.solar,
    watch: r.watch as MovementHealth['watch']
  }
}

/** True when no movement was measured, or every measurement is a recorded 0. */
export function isMovementEmpty(health: MovementHealth | undefined): boolean {
  const q = health?.quantities
  const measured = [q?.stepCount, q?.distanceWalkingRunning, q?.activeEnergyBurned, q?.exerciseTime].filter((m) => m != null)
  return measured.every((m) => m?.value === 0)
}

/** MovementRings: a data state with no movement measured (or all zero) is `empty`. */
export function movementRingsState(p: MovementRingsProps): WidgetState {
  const health = normalizeMovementHealth(p.health)
  const state = resolveWidgetState(p.state, health != null)
  return rendersData(state) && isMovementEmpty(health) ? 'empty' : state
}

/** Hydration: a data state needs the hydration object. */
export function hydrationState(p: HydrationProps): WidgetState {
  return resolveWidgetState(p.state, p.health?.hydration != null)
}

/**
 * NightSummary: zero recorded sleep is `empty`. `isEmpty` (from the adapter)
 * decides when present; a pre-0160 caller without it signals no sleep with an
 * empty duration string.
 */
export function nightSummaryState(p: NightSummaryProps): WidgetState {
  const h = p.health
  const noSleep = h != null && (h.isEmpty !== undefined ? h.isEmpty : h.sleepDurationFormatted.trim() === '')
  return resolveWidgetState(p.state, h != null && !noSleep)
}

// ── NightSummary's two inputs (owner decision Q3, 2026-10-08) ─────────

/** A domain as the page loader resolved it: its state and its export timestamp. */
export interface DomainState {
  state: WidgetState
  generatedAt: string | null
}

/**
 * NightSummary's state and "as of" time follow the SLEEP export alone. The
 * health export lends only the sleep score (see sleepScoreSource); its
 * unavailability or staleness never takes the card down. Suppression still
 * covers the whole card: both exports sit behind the same focus gate. This
 * replaces the worst-state, oldest-timestamp rule for NightSummary only.
 */
export function nightSummaryDomain(sleep: DomainState, health: DomainState): DomainState {
  if (sleep.state === 'suppressed' || health.state === 'suppressed') {
    return {state: 'suppressed', generatedAt: null}
  }
  return {state: sleep.state, generatedAt: rendersData(sleep.state) ? sleep.generatedAt : null}
}

/**
 * The health export behind NightSummary's sleep score: only a LIVE health
 * export lends it. Unavailable, missing or stale health yields null, and the
 * score slot renders the no-reading mark. Shared by the server view model and
 * the client path (adaptSleep(sleep, sleepScoreSource(health, healthState))).
 */
export function sleepScoreSource<T>(health: T | null | undefined, healthState: WidgetState): T | null {
  return health != null && healthState === 'live' ? health : null
}

/** Workouts: no workouts is the recovery-day empty state. */
export function workoutsState(p: WorkoutsProps): WidgetState {
  return listState(p.state, p.health?.workouts)
}

export function devActivityLogState(p: DevActivityLogProps): WidgetState {
  return listState(p.state, p.events)
}

export function starredRepoListState(p: StarredRepoListProps): WidgetState {
  return listState(p.state, p.repos)
}

export function readingFeedState(p: ReadingFeedProps): WidgetState {
  return listState(p.state, p.reading?.articles)
}

export function bookshelfState(p: BookshelfProps): WidgetState {
  return listState(p.state, p.books?.books)
}

export function theatreReviewsState(p: TheatreReviewsProps): WidgetState {
  return listState(p.state, p.reviews)
}
