// Export freshness: the one rule that decides `live` versus `stale` (atlas
// decision 0160, D8).
//
// A readable export is `live` while its age is at most the registry's
// `audit.warn` age for that export, and `stale` beyond it. Beyond
// `audit.error` it stays `stale`; `isFreshnessDegraded` reports that for a
// server log line, never for the markup. An export with a missing or invalid
// `generatedAt` has no provable age, so it is `stale`, and the card shows no
// "as of" label and no `data-generated-at` (stateRootAttrs, WidgetTimestamp).
//
// Callers: `toDashboardViewModels` (a domain the loader read without an
// explicit state), the server page loader, and every browser updater through
// `exportFreshness`. The ages restate `atlas/surfaces.yaml` (`export-*-json`
// `audit.warn` and `audit.error`); one table holds them.
import type {DomainState} from './widget-rules'
import type {WidgetState} from './widget-state'

/** An export whose age decides a card's state. */
export type FreshnessDomain = 'health' | 'sleep' | 'workouts' | 'books' | 'articles' | 'githubEvents' | 'starredRepos' | 'theatreReviews'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** `audit.warn` and `audit.error` ages per export, from `atlas/surfaces.yaml`. */
export const EXPORT_FRESHNESS: Readonly<Record<FreshnessDomain, {readonly warnMs: number; readonly errorMs: number}>> = {
  health: {warnMs: 45 * MINUTE, errorMs: 3 * HOUR},
  sleep: {warnMs: 12 * HOUR, errorMs: 24 * HOUR},
  workouts: {warnMs: 12 * HOUR, errorMs: 24 * HOUR},
  books: {warnMs: 7 * DAY, errorMs: 14 * DAY},
  articles: {warnMs: 7 * DAY, errorMs: 14 * DAY},
  githubEvents: {warnMs: 7 * DAY, errorMs: 14 * DAY},
  starredRepos: {warnMs: 18 * HOUR, errorMs: 36 * HOUR},
  theatreReviews: {warnMs: 18 * HOUR, errorMs: 36 * HOUR}
}

/** The two states a readable export can take. */
export type FreshnessState = Extract<WidgetState, 'live' | 'stale'>

/** A readable export's state and the timestamp a card names for it. */
export interface Freshness {
  state: FreshnessState
  generatedAt: string | null
}

function ageMs(generatedAt: string | null | undefined, nowMs: number): number | null {
  if (typeof generatedAt !== 'string') {
    return null
  }
  const ms = Date.parse(generatedAt)
  return Number.isFinite(ms) ? nowMs - ms : null
}

/**
 * `live` when the export's age at `nowMs` is at most its `audit.warn` age,
 * else `stale`. A missing or invalid `generatedAt` is `stale`. A timestamp
 * ahead of the clock (skew) is `live`.
 */
export function freshnessState(domain: FreshnessDomain, generatedAt: string | null | undefined, nowMs: number): FreshnessState {
  const age = ageMs(generatedAt, nowMs)
  return age !== null && age <= EXPORT_FRESHNESS[domain].warnMs ? 'live' : 'stale'
}

/** True when the export is older than its `audit.error` age, or has no provable age. */
export function isFreshnessDegraded(domain: FreshnessDomain, generatedAt: string | null | undefined, nowMs: number): boolean {
  const age = ageMs(generatedAt, nowMs)
  return age === null || age > EXPORT_FRESHNESS[domain].errorMs
}

/**
 * The browser's call: the freshness a data updater takes as its trailing
 * argument, for an export it read. `generatedAt` is the export's own, kept
 * verbatim; the card names it only when it parses.
 */
export function exportFreshness(domain: FreshnessDomain, data: {generatedAt?: string | null}, nowMs: number = Date.now()): Freshness {
  const generatedAt = typeof data.generatedAt === 'string' ? data.generatedAt : null
  return {state: freshnessState(domain, generatedAt, nowMs), generatedAt}
}

/**
 * A domain as read: `unavailable` when the export could not be read, else its
 * freshness. NightSummary's inputs (nightSummaryDomain, sleepScoreSource).
 */
export function exportDomainState(domain: FreshnessDomain, data: {generatedAt?: string | null} | null | undefined, nowMs: number = Date.now()): DomainState {
  return data == null ? {state: 'unavailable', generatedAt: null} : exportFreshness(domain, data, nowMs)
}
