// Honest widget states (atlas decision 0160, Phase 1).
//
// A live widget renders exactly one of these states, in server markup, with no
// client JavaScript:
//
//   live         the export was read and is current — render its values.
//   stale        the export was read but is old — render its values plus an
//                absolute "as of" time.
//   empty        the export was read and carries no items for this widget.
//   unavailable  the export could not be read (failure, malformed, missing
//                primary measurement) — render chrome and a notice, no values.
//   suppressed   a hiding focus mode is active — render chrome and a notice,
//                with NO data in the markup at all.
//   loading      the data-free page shell — the existing skeleton plus a
//                <noscript> note that live data needs JavaScript.
//
// Every live widget accepts `state` and `generatedAt` as OPTIONAL props. A
// caller that passes neither keeps the pre-0160 behavior through
// `resolveWidgetState`, the pure compatibility mapper: data present → live,
// no data → empty.
import {HIDING_FOCUS_MODES} from '@j0nathan-ll0yd/portal-contract/constants'

// A literal union (not `typeof` a const array): the widget schema generator
// (packages/schemas/scripts/generate-widget-schemas.mjs) resolves it to an enum.
export type WidgetState = 'live' | 'stale' | 'empty' | 'unavailable' | 'suppressed' | 'loading'
export const WIDGET_STATES: readonly WidgetState[] = ['live', 'stale', 'empty', 'unavailable', 'suppressed', 'loading']

/** The optional state inputs every live widget's Props interface adds. */
export interface WidgetStateProps {
  /** Render state. Omitted → derived from the data (see resolveWidgetState). */
  state?: WidgetState
  /** ISO-8601 `generatedAt` of the export (the OLDEST input for a multi-export card). */
  generatedAt?: string | null
}

/** The visible "no reading" mark for a measurement the export did not carry. Never `0`. */
export const NO_READING = '—'

/** Every rendered date and time uses the owner's time zone, never the host's. */
export const DISPLAY_TIME_ZONE = 'America/Los_Angeles'

const DATA_STATES: ReadonlySet<WidgetState> = new Set<WidgetState>(['live', 'stale'])

/** True when the state renders data values; false for every honest non-data state. */
export function rendersData(state: WidgetState): boolean {
  return DATA_STATES.has(state)
}

/**
 * True when the value-free scaffold renders hidden behind a notice
 * (unavailable, suppressed). The scaffold stays in the DOM so a later live
 * update can reveal it with `revealLiveData` instead of needing a reload.
 */
export function isScaffoldHidden(state: WidgetState): boolean {
  return state === 'unavailable' || state === 'suppressed'
}

/**
 * Compatibility mapper. An explicit non-data state always wins. An explicit
 * data state with no data degrades to `empty`. No explicit state keeps the
 * pre-0160 call signature: data present → `live`, otherwise `empty`.
 */
export function resolveWidgetState(explicit: WidgetState | null | undefined, hasData: boolean): WidgetState {
  if (explicit && !rendersData(explicit)) {
    return explicit
  }
  if (!hasData) {
    return 'empty'
  }
  return explicit ?? 'live'
}

// Severity for combining the states of a card that reads several exports.
const SEVERITY: Record<WidgetState, number> = {live: 0, empty: 1, stale: 2, loading: 3, unavailable: 4, suppressed: 5}

/** The worst of several input states (suppressed > unavailable > loading > stale > empty > live). */
export function worstState(...states: (WidgetState | null | undefined)[]): WidgetState {
  let worst: WidgetState = 'live'
  for (const s of states) {
    if (s && SEVERITY[s] > SEVERITY[worst]) {
      worst = s
    }
  }
  return worst
}

/** The oldest valid ISO timestamp among the inputs, or null when none is valid. */
export function oldestGeneratedAt(...isos: (string | null | undefined)[]): string | null {
  let oldest: string | null = null
  let oldestMs = Infinity
  for (const iso of isos) {
    if (!iso) {
      continue
    }
    const ms = Date.parse(iso)
    if (Number.isFinite(ms) && ms < oldestMs) {
      oldestMs = ms
      oldest = iso
    }
  }
  return oldest
}

/** True when `currentFocus` names a focus mode that hides the dashboard. */
export function isHidingFocus(currentFocus: string | null | undefined): boolean {
  return typeof currentFocus === 'string' && (HIDING_FOCUS_MODES as readonly string[]).includes(currentFocus)
}

/** Format a measurement, or the no-reading mark when it is absent or not finite. */
export function formatMeasurement(value: number | null | undefined, format: (n: number) => string = (n) => String(Math.round(n))): string {
  return typeof value === 'number' && Number.isFinite(value) ? format(value) : NO_READING
}

const AS_OF_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short'
})

/** Absolute time for the `stale` "as of" line, in the owner's time zone. Null for an invalid input. */
export function formatAsOf(iso: string | null | undefined): string | null {
  if (!iso) {
    return null
  }
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? AS_OF_FORMAT.format(new Date(ms)) : null
}

const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat('en-US', {timeZone: DISPLAY_TIME_ZONE, month: 'short', year: 'numeric'})

/** "Mon YYYY" in the owner's time zone (the bookshelf finished date). */
export function formatMonthYear(iso: string): string {
  return MONTH_YEAR_FORMAT.format(new Date(iso))
}

/** Milliseconds since the epoch for a `now` given as a number, ISO string or Date. */
export function toEpochMs(now: number | string | Date | null | undefined): number {
  if (now instanceof Date) {
    return now.getTime()
  }
  if (typeof now === 'string') {
    const ms = Date.parse(now)
    return Number.isFinite(ms) ? ms : Date.now()
  }
  return typeof now === 'number' && Number.isFinite(now) ? now : Date.now()
}

/** Root attributes every live card carries (spread onto the `.tri-card`). */
export function stateRootAttrs(state: WidgetState, generatedAt?: string | null): Record<string, string | undefined> {
  return {'data-ssr-state': state, 'data-generated-at': generatedAt || undefined}
}
