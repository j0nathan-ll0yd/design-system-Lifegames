// Pure view models from export data to widget props (atlas decision 0160, Step 1.1).
//
// The server renders `/` from live exports through these functions; the client
// runtime uses the same pieces (composeSystemLines) so the two never disagree.
// Every function is pure and DOM-free. None invents a field: a value the
// export did not carry stays null or absent, and a domain that could not be
// read becomes an honest state.
import {
  adaptArticles,
  adaptBooks,
  type AdaptedArticle,
  adaptGithubEvents,
  adaptHealth,
  adaptSleep,
  adaptStarredRepos,
  adaptWorkouts,
  type WorkoutEntry
} from './adapters'
import {esc} from './html-utils'
import {
  bookshelfState,
  devActivityLogState,
  heartRateState,
  hydrationState,
  movementRingsState,
  nightSummaryDomain,
  nightSummaryState,
  readingFeedState,
  sleepScoreSource,
  starredRepoListState,
  theatreReviewsState,
  workoutsState
} from './widget-rules'
import {isHidingFocus, NO_READING, rendersData, toEpochMs, type WidgetState, type WidgetStateProps} from './widget-state'
import {widgets} from '@j0nathan-ll0yd/copy'
import type {
  ArticlesExport,
  BooksExport,
  FocusExport,
  GithubEventsExport,
  GithubStarredReposExport,
  HealthExport,
  SleepExport,
  TheatreReviewsExport,
  WorkoutsExport
} from '@j0nathan-ll0yd/portal-contract/schemas'
import type {BookshelfProps} from '../widgets/reading/Bookshelf.types'
import type {DevActivityLogProps} from '../widgets/github/DevActivityLog.types'
import type {HeartRateProps} from '../widgets/health/HeartRate.types'
import type {HydrationProps} from '../widgets/health/Hydration.types'
import type {MovementRingsProps} from '../widgets/health/MovementRings.types'
import type {NightSummaryProps} from '../widgets/health/NightSummary.types'
import type {Article, ReadingFeedProps} from '../widgets/reading/ReadingFeed.types'
import type {StarredRepoListProps} from '../widgets/github/StarredRepoList.types'
import type {SystemLine, SystemStatusProps} from '../widgets/other/SystemStatus.types'
import type {TheatreReviewsProps} from '../widgets/reading/TheatreReviews.types'
import type {Workout, WorkoutsProps} from '../widgets/health/Workouts.types'

// ── Workouts ────────────────────────────────────────────────────────

/**
 * Adapter entries → widget workouts. Renames camelCase to the widget's
 * snake_case fields and coalesces `activityUrl` into `link`. A measurement the
 * export did not carry stays null (the widget renders the no-reading mark).
 */
export function toWorkoutsList(entries: readonly WorkoutEntry[] | null): Workout[] {
  return (entries ?? []).map((w) => ({
    activity_type: w.activityType,
    duration: w.duration,
    energy_burned: w.energyBurned,
    distance: w.distance,
    link: w.activityUrl ?? null
  }))
}

// ── Reading ─────────────────────────────────────────────────────────

/** Articles the server renders: one client page. */
export const READING_SERVER_PAGE_SIZE = 10

/** Adapter articles → widget articles: title, source, date (+ ISO datetime), at most 10. */
export function toReadingArticles(articles: readonly AdaptedArticle[]): Article[] {
  return articles.slice(0, READING_SERVER_PAGE_SIZE).map((a) => ({title: a.title, source: a.source, date: a.date, datetime: a.datetime}))
}

// ── System status ───────────────────────────────────────────────────

/** System Status rows, in display order. Location is retired (atlas decision 0012). */
export const SYSTEM_SOURCES = [
  {source: 'health', key: 'Health', color: 'red'},
  {source: 'sleep', key: 'Sleep', color: 'purple'},
  {source: 'books', key: 'Books', color: 'amber'},
  {source: 'articles', key: 'Articles', color: 'amber'},
  {source: 'githubEvents', key: 'Github Events', color: 'green'},
  {source: 'starredRepos', key: 'Github Stars', color: 'green'},
  {source: 'theatreReviews', key: widgets.theatreReviews.title, color: 'yellow'}
] as const

export type SystemSource = (typeof SYSTEM_SOURCES)[number]['source']

/** Compact relative age ("5m ago", "3h ago", "2d ago") of `iso` at `now`. */
export function formatAge(iso: string, now: number): string {
  const minutesAgo = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  const hoursAgo = Math.floor(minutesAgo / 60)
  const daysAgo = Math.floor(hoursAgo / 24)
  if (daysAgo > 0) {
    return daysAgo + 'd ago'
  }
  if (hoursAgo > 0) {
    return hoursAgo + 'h ago'
  }
  return minutesAgo + 'm ago'
}

/**
 * System Status rows from each export's `generatedAt`, shared by the
 * SystemStatus template and `updateSystemStatus`. A source with a timestamp is
 * ACTIVE with its age in <time datetime>; a source without one is OFFLINE.
 */
export function composeSystemLines(
  timestamps: Partial<Record<string, string | null>>,
  now: number | string | Date,
  opts: {suppressed?: boolean} = {}
): SystemLine[] {
  const nowMs = toEpochMs(now)
  return SYSTEM_SOURCES.map(({source, key, color}) => {
    if (opts.suppressed) {
      // A hiding focus mode: every row stays (so a later update can fill it)
      // but names no timestamp, age or status — the gate wins.
      return {key, source, dotClass: '', keyClass: 'sys-key', valClass: 'sys-val', value: esc(NO_READING), suppressed: true}
    }
    const ts = timestamps[source]
    const valid = typeof ts === 'string' && Number.isFinite(Date.parse(ts))
    if (valid) {
      // Copy stores natural case ('Active'); the site renders all-caps with no
      // CSS transform, so uppercase here to preserve the pixels.
      return {
        key,
        source,
        dotClass: 'sys-dot-' + color,
        keyClass: 'sys-key sys-key-' + color,
        valClass: 'sys-val-green',
        value: esc(widgets.systemStatus.valueActive.toUpperCase()) +
          ' <span class="sys-val">(<time datetime="' +
          esc(ts) +
          '">' +
          esc(formatAge(ts, nowMs)) +
          '</time>)</span>'
      }
    }
    return {key, source, dotClass: 'sys-dot-red', keyClass: 'sys-key', valClass: 'sys-val-red', value: esc(widgets.systemStatus.valueOffline.toUpperCase())}
  })
}

// ── Dashboard ───────────────────────────────────────────────────────

/** One export as the page loader read it. */
export interface DomainInput<T> {
  /** The decoded export, or null when it could not be read. */
  data: T | null
  /**
   * The loader's verdict (freshness against the registry thresholds, the
   * focus gate). Omitted → `live` when data is present, `unavailable` when not.
   */
  state?: WidgetState
}

export interface DashboardExports {
  focus?: DomainInput<FocusExport>
  health?: DomainInput<HealthExport>
  sleep?: DomainInput<SleepExport>
  workouts?: DomainInput<WorkoutsExport>
  githubEvents?: DomainInput<GithubEventsExport>
  starredRepos?: DomainInput<GithubStarredReposExport>
  articles?: DomainInput<ArticlesExport>
  books?: DomainInput<BooksExport>
  theatreReviews?: DomainInput<TheatreReviewsExport>
}

export interface DashboardViewModels {
  /** True when a hiding focus mode suppresses every gated domain. */
  suppressed: boolean
  heartRate: HeartRateProps
  movementRings: MovementRingsProps
  hydration: HydrationProps
  nightSummary: NightSummaryProps
  workouts: WorkoutsProps
  devActivityLog: DevActivityLogProps
  starredRepoList: StarredRepoListProps
  readingFeed: ReadingFeedProps
  bookshelf: BookshelfProps
  theatreReviews: TheatreReviewsProps
  systemStatus: SystemStatusProps
  focusOverlay: {currentFocus: string | null; now: string}
  dndOverlay: {currentFocus: string | null; now: string}
}

interface Resolved<T> {
  data: T | null
  state: WidgetState
  generatedAt: string | null
}

function resolveDomain<T extends {generatedAt?: string}>(input: DomainInput<T> | undefined, suppressed: boolean): Resolved<T> {
  if (suppressed) {
    // The gate wins: no gated value survives into a view model.
    return {data: null, state: 'suppressed', generatedAt: null}
  }
  const data = input?.data ?? null
  const state: WidgetState = input?.state ?? (data ? 'live' : 'unavailable')
  if (!data || !rendersData(state)) {
    return {data: null, state: rendersData(state) ? 'unavailable' : state, generatedAt: null}
  }
  return {data, state, generatedAt: data.generatedAt ?? null}
}

function stateProps(r: {state: WidgetState; generatedAt: string | null}): WidgetStateProps {
  return {state: r.state, generatedAt: r.generatedAt}
}

/**
 * Every live widget's props from the decoded exports, rendered at `now`.
 *
 * Disclosure: a hiding `currentFocus` suppresses every gated domain and drops
 * its data. An unreadable focus export does NOT decide suppression here — the
 * loader owns that rule and passes `state: 'unavailable'` (or 'suppressed')
 * per domain. Freshness (`stale`) is likewise the loader's verdict.
 *
 * NightSummary reads two exports but follows the sleep export alone: its
 * state and `generatedAt` are the sleep export's, and the health export lends
 * only the sleep score while it is live (nightSummaryDomain, sleepScoreSource;
 * owner decision Q3, 2026-10-08).
 */
export function toDashboardViewModels(exports: DashboardExports, now: number | string | Date): DashboardViewModels {
  const nowMs = toEpochMs(now)
  const nowIso = new Date(nowMs).toISOString()
  const currentFocus = exports.focus?.data?.currentFocus ?? null
  const suppressed = isHidingFocus(currentFocus)

  const health = resolveDomain(exports.health, suppressed)
  const sleep = resolveDomain(exports.sleep, suppressed)
  const workouts = resolveDomain(exports.workouts, suppressed)
  const events = resolveDomain(exports.githubEvents, suppressed)
  const starred = resolveDomain(exports.starredRepos, suppressed)
  const articles = resolveDomain(exports.articles, suppressed)
  const books = resolveDomain(exports.books, suppressed)
  const theatre = resolveDomain(exports.theatreReviews, suppressed)

  const adaptedHealth = health.data ? adaptHealth(health.data, sleep.data) : null

  // NightSummary follows the sleep export alone (owner decision Q3): the
  // health export lends only the score, and only while it is live.
  const night = nightSummaryDomain(sleep, health)
  const adaptedSleep = sleep.data && rendersData(night.state) ? adaptSleep(sleep.data, sleepScoreSource(health.data, health.state)) : null

  const adaptedEvents = events.data ? adaptGithubEvents(events.data, nowMs) : []
  const adaptedStarred = starred.data ? adaptStarredRepos(starred.data, nowMs) : []
  const adaptedArticles = articles.data ? adaptArticles(articles.data, nowMs) : []
  const adaptedBooks = books.data ? adaptBooks(books.data) : null

  const timestamps: Record<SystemSource, string | null> = {
    health: health.generatedAt,
    sleep: sleep.generatedAt,
    books: books.generatedAt,
    articles: articles.generatedAt,
    githubEvents: events.generatedAt,
    starredRepos: starred.generatedAt,
    theatreReviews: theatre.generatedAt
  }

  const vm: DashboardViewModels = {
    suppressed,
    heartRate: {...stateProps(health), ...(adaptedHealth ? {health: {quantities: adaptedHealth.quantities, watch: adaptedHealth.watch}} : {})},
    movementRings: {
      ...stateProps(health),
      ...(adaptedHealth
        ? {health: {quantities: adaptedHealth.quantities, goals: adaptedHealth.goals, solar: adaptedHealth.solar, watch: adaptedHealth.watch}}
        : {})
    },
    hydration: {...stateProps(health), ...(adaptedHealth ? {health: {hydration: adaptedHealth.hydration}} : {})},
    nightSummary: {
      ...stateProps(night),
      ...(adaptedSleep
        ? {
          health: {
            sleepScore: adaptedSleep.sleepScore,
            sleepDurationFormatted: adaptedSleep.isEmpty ? '' : adaptedSleep.sleepDurationFormatted,
            sleepPhaseFormatted: {
              deep: adaptedSleep.sleepPhaseFormatted.deep ?? '',
              rem: adaptedSleep.sleepPhaseFormatted.rem ?? '',
              core: adaptedSleep.sleepPhaseFormatted.core ?? '',
              awake: adaptedSleep.sleepPhaseFormatted.awake ?? ''
            },
            derived: {deepPct: adaptedSleep.derived.deepPct, remPct: adaptedSleep.derived.remPct},
            isEmpty: adaptedSleep.isEmpty
          }
        }
        : {})
    },
    workouts: {...stateProps(workouts), ...(workouts.data ? {health: {workouts: toWorkoutsList(adaptWorkouts(workouts.data))}} : {})},
    devActivityLog: {
      ...stateProps(events),
      ...(events.data
        ? {
          events: adaptedEvents.map((e) => ({
            type: e.type,
            repo: e.repo,
            title: e.title,
            date: e.date,
            datetime: e.datetime,
            hash: e.hash ?? '',
            // Absent counts stay absent (the widget renders no "+0 -0").
            ...(typeof e.additions === 'number' ? {additions: e.additions} : {}),
            ...(typeof e.deletions === 'number' ? {deletions: e.deletions} : {}),
            ...(e.number !== undefined ? {number: e.number} : {}),
            url: e.url
          }))
        }
        : {})
    },
    starredRepoList: {...stateProps(starred), ...(starred.data ? {repos: adaptedStarred} : {})},
    readingFeed: {...stateProps(articles), ...(articles.data ? {reading: {articles: toReadingArticles(adaptedArticles)}} : {})},
    bookshelf: {...stateProps(books), ...(adaptedBooks ? {books: toBookshelfBooks(adaptedBooks)} : {})},
    theatreReviews: {...stateProps(theatre), ...(theatre.data ? {reviews: theatre.data.reviews, totalReviews: theatre.data.totalReviews} : {})},
    systemStatus: {system: {lines: composeSystemLines(timestamps, nowMs, {suppressed})}},
    focusOverlay: {currentFocus, now: nowIso},
    dndOverlay: {currentFocus, now: nowIso}
  }

  // The final state of each card comes from the same rule its template
  // applies, so data-ssr-state, the ssr-data meta and the X-SSR-Data header
  // always agree with the markup. A card the rule moves out of a data state
  // carries no data and no timestamp.
  return {
    ...vm,
    heartRate: finalize(vm.heartRate, heartRateState),
    movementRings: finalize(vm.movementRings, movementRingsState),
    hydration: finalize(vm.hydration, hydrationState),
    nightSummary: finalize(vm.nightSummary, nightSummaryState),
    workouts: finalize(vm.workouts, workoutsState),
    devActivityLog: finalize(vm.devActivityLog, devActivityLogState),
    starredRepoList: finalize(vm.starredRepoList, starredRepoListState),
    readingFeed: finalize(vm.readingFeed, readingFeedState),
    bookshelf: finalize(vm.bookshelf, bookshelfState),
    theatreReviews: finalize(vm.theatreReviews, theatreReviewsState)
  }
}

function toBookshelfBooks(adapted: ReturnType<typeof adaptBooks>): NonNullable<BookshelfProps['books']> {
  const bookMeta: NonNullable<BookshelfProps['books']>['bookMeta'] = {}
  for (const [asin, m] of Object.entries(adapted.bookMeta)) {
    bookMeta[asin] = {
      ...(m.seriesName != null ? {seriesName: m.seriesName} : {}),
      ...(m.seriesNumber != null ? {seriesNumber: m.seriesNumber} : {}),
      ...(m.seriesTotal != null ? {seriesTotal: m.seriesTotal} : {}),
      ...(m.pages != null ? {pages: m.pages} : {}),
      ...(m.year != null ? {year: m.year} : {}),
      ...(m.desc != null ? {desc: m.desc} : {}),
      genres: m.genres
    }
  }
  return {
    books: adapted.books.map((b) => ({
      asin: b.asin,
      title: b.title,
      author: b.author,
      status: b.status,
      ...(b.rating != null ? {rating: b.rating} : {}),
      ...(b.progress != null ? {progress: b.progress} : {}),
      ...(b.notes != null ? {notes: b.notes} : {}),
      mainImage: b.mainImage,
      mainImageThumb: b.mainImageThumb,
      mainImageCard: b.mainImageCard,
      mainImageAvif: b.mainImageAvif,
      mainImageThumbAvif: b.mainImageThumbAvif,
      mainImageCardAvif: b.mainImageCardAvif,
      finishedAt: b.finishedAt,
      startedAt: b.startedAt
    })),
    bookMeta,
    statusLabels: adapted.statusLabels
  }
}

/** Apply a widget's state rule; a non-data result drops the data and the timestamp. */
export function finalize<P extends WidgetStateProps>(props: P, rule: (p: P) => WidgetState): P {
  const state = rule(props)
  return rendersData(state) ? {...props, state} : ({state, generatedAt: null} as P)
}
