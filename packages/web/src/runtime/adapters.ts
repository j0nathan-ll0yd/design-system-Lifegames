import {ACTIVITY_TYPE_MAP, HYDRATION, LANG_COLORS, STATUS_LABELS} from './constants'
import {sanitizeImageUrl} from './image-sanitizer'
import {computeSleepPercentages, computeTotalSleepSeconds, formatDuration, formatPhase} from './sleep'
import type {
  ArticlesExport,
  BooksExport,
  GithubEventsExport,
  GithubStarredReposExport,
  HealthExport,
  SleepExport,
  WorkoutsExport
} from '@j0nathan-ll0yd/portal-contract/schemas'

// The contract inlines these three optional sub-objects inside HealthExport
// rather than naming them. Derive the names here instead of re-declaring the
// shapes, so they can never drift from the schema they came from.
type HealthExportGoals = NonNullable<HealthExport['goals']>
type HealthExportSolar = NonNullable<HealthExport['solar']>
type HealthExportWatch = NonNullable<HealthExport['watch']>

// ── Adapted output types (what adapters produce for updaters) ──────

export interface HealthQuantity {
  value: number
  unit: string
}

// Re-export so widget types can import WatchState from adapters without
// depending directly on the exports layer.
export type { HealthExportWatch as WatchState }

// Measured versus missing (atlas decision 0160, H03). Every measurement an
// adapter derives is `number | null`: `null` means the export did not carry the
// measurement, `0` means the export carried a zero. A quantity the export did
// not carry is ABSENT from `quantities`; no adapter inserts a default. Goals,
// ranges and maxima are configuration, never a stand-in for a measurement.
export interface AdaptedHealth {
  date: string
  quantities: Record<string, HealthQuantity>
  // totalCalories is null unless BOTH energy inputs exist; the sleep
  // percentages are null when no sleep export was supplied.
  derived: {totalCalories: number | null; deepPct: number | null; remPct: number | null; corePct: number | null}
  sleepScore: number | null
  // '' when no sleep export was supplied.
  sleepDurationFormatted: string
  sleepPhaseFormatted: Record<string, string>
  hydration: {
    waterOz: number | null
    caffeineMg: number | null
    waterMax: number
    caffeineMax: number
    waterRangeLo: number
    waterRangeHi: number
    caffeineRangeLo: number
    caffeineRangeHi: number
  }
  // Activity ring goals from the export's `goals` object. Absent on legacy
  // payloads; per-field null until the device's first goals sync.
  goals?: HealthExportGoals
  // Sunrise/sunset facts for the movement sun-arc footer (absent on legacy payloads).
  solar?: HealthExportSolar
  // watch is the server-computed worn verdict from device_watch_state.
  // Absent means unknown (no device has ever reported) or watch is worn.
  // Present with worn=false means the widget should render the paused state.
  watch?: HealthExportWatch
}

export interface AdaptedSleep {
  isEmpty: boolean
  date: string
  sleepScore: number | null
  sleepDurationFormatted: string
  sleepPhaseFormatted: Record<string, string>
  // null when the sleep export lacks deep, REM or core (see computeSleepPercentages).
  derived: {deepPct: number | null; remPct: number | null; corePct: number | null}
  // Seconds per phase; null for a phase the export did not carry.
  phases: Record<string, number | null>
}

export interface WorkoutEntry {
  activityType: string
  activityUrl?: string
  duration: number | null
  energyBurned: number | null
  distance: number | null
  source: string
}

export interface AdaptedGithubEvent {
  type: string
  repo: string
  title: string
  // Relative label ("2h ago") computed against `now`; `datetime` keeps the
  // export's ISO timestamp for <time datetime> (atlas decision 0160).
  date: string
  datetime?: string
  number?: number
  hash?: string
  additions?: number
  deletions?: number
  url: string
}

export interface AdaptedArticle {
  title: string
  url: string
  source: string
  // Relative label computed against `now`; `datetime` is the ISO `savedAt`.
  date: string
  datetime?: string
  hasNotes: boolean
  noteText: string | null
}

export interface AdaptedBookEntry {
  title: string
  author: string
  asin: string
  status: string
  rating: number | null
  progress: number | undefined
  link: string
  // Image fields keep the export contract's own names (books.json emits
  // `mainImage*`). An adapter-local rename to `cover*` was how the widgets
  // silently drifted off the contract — a renamed field reads as present in
  // the widget while the real one goes unread (atlas decision 0086).
  mainImage: string | null
  mainImageThumb: string | null
  mainImageCard: string | null
  mainImageAvif: string | null
  mainImageThumbAvif: string | null
  mainImageCardAvif: string | null
  notes: string | null
  finishedAt: string | null
  startedAt: string | null
}

export interface BookMeta {
  seriesName: string | null
  seriesNumber: number | null
  seriesTotal: number | null
  pages: number | null
  genres: string[]
  year: number | null
  desc: string | null
}

export interface AdaptedBooks {
  books: AdaptedBookEntry[]
  bookMeta: Record<string, BookMeta>
  statusLabels: Record<string, string>
  stats: {total: number; reading: number; completed: number; upcoming: number}
}

export interface AdaptedStarredRepo {
  owner: string
  name: string
  url: string
  stars: number
  language: string
  languageColor: string
  // Relative label computed against `now`; `datetime` is the ISO `starredAt`.
  starredAt: string
  datetime?: string
}

// ── Adapter functions ──────────────────────────────────────────────

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/

export function adaptHealth(healthData: HealthExport, sleepData: SleepExport | null): AdaptedHealth {
  const q = {...healthData.quantities}

  // 1. Rename heartRateVariabilitySDNN → hrvSDNN
  if ('heartRateVariabilitySDNN' in q) {
    q.hrvSDNN = q.heartRateVariabilitySDNN
    delete q.heartRateVariabilitySDNN
  }

  // 2. exerciseTime stays absent when the export omits it (no 0 default).

  // 3. Convert dietaryWater mL → oz (null when not measured)
  const waterMl = q.dietaryWater?.value
  const waterOz = typeof waterMl === 'number' ? Math.round(waterMl / 29.5735) : null

  // 4. Convert dietaryCaffeine grams → mg (null when not measured)
  const caffeineG = q.dietaryCaffeine?.value
  const caffeineMg = typeof caffeineG === 'number' ? Math.round(caffeineG * 1000) : null

  // 5. Compute totalCalories: a sum is a measurement only when both inputs are.
  const activeEnergy = q.activeEnergyBurned?.value
  const basalEnergy = q.basalEnergyBurned?.value
  const totalCalories = typeof activeEnergy === 'number' && typeof basalEnergy === 'number' ? Math.round(activeEnergy + basalEnergy) : null

  // 6. Build hydration object
  const hydration = {
    waterOz,
    caffeineMg,
    waterMax: HYDRATION.waterMax,
    caffeineMax: HYDRATION.caffeineMax,
    waterRangeLo: HYDRATION.waterRangeLo,
    waterRangeHi: HYDRATION.waterRangeHi,
    caffeineRangeLo: HYDRATION.caffeineRangeLo,
    caffeineRangeHi: HYDRATION.caffeineRangeHi
  }

  // 7. Sleep fields
  const sleepScore = q.sleepScore?.value ?? null
  let sleepDurationFormatted = ''
  let sleepPhaseFormatted: Record<string, string> = {}
  let deepPct: number | null = null
  let remPct: number | null = null
  let corePct: number | null = null

  if (sleepData) {
    const rem = sleepData.rem as {seconds: number} | undefined
    const deep = sleepData.deep as {seconds: number} | undefined
    const core = sleepData.core as {seconds: number} | undefined
    const awake = sleepData.awake as {seconds: number} | undefined
    const phases = {rem: rem?.seconds ?? null, deep: deep?.seconds ?? null, core: core?.seconds ?? null, awake: awake?.seconds ?? null}
    const totalSleepSeconds = computeTotalSleepSeconds(phases)
    sleepDurationFormatted = formatDuration(totalSleepSeconds)
    sleepPhaseFormatted = {deep: formatPhase(phases.deep), rem: formatPhase(phases.rem), core: formatPhase(phases.core), awake: formatPhase(phases.awake)}
    const pcts = computeSleepPercentages(phases)
    deepPct = pcts.deepPct
    remPct = pcts.remPct
    corePct = pcts.corePct
  }

  // 8+9. Build result matching health.json shape.
  // IMPORTANT: adaptHealth builds an explicit field list — unknown fields are
  // silently dropped (finding F8). `watch` must be listed here explicitly or it
  // never reaches the updaters even when the health export carries it.
  return {
    date: healthData.date,
    quantities: q,
    derived: {totalCalories, deepPct, remPct, corePct},
    sleepScore,
    sleepDurationFormatted,
    sleepPhaseFormatted,
    hydration,
    goals: healthData.goals,
    solar: healthData.solar,
    watch: healthData.watch
  }
}

export function adaptSleep(sleepData: SleepExport, healthData: HealthExport | null): AdaptedSleep {
  const rem = sleepData.rem as {seconds: number} | undefined
  const deep = sleepData.deep as {seconds: number} | undefined
  const core = sleepData.core as {seconds: number} | undefined
  const awake = sleepData.awake as {seconds: number} | undefined
  const phases = {rem: rem?.seconds ?? null, deep: deep?.seconds ?? null, core: core?.seconds ?? null, awake: awake?.seconds ?? null}
  const totalSleepSeconds = computeTotalSleepSeconds(phases)
  const isEmpty = totalSleepSeconds === 0
  const pcts = computeSleepPercentages(phases)

  return {
    isEmpty,
    date: sleepData.date,
    sleepScore: healthData?.quantities?.sleepScore?.value ?? null,
    sleepDurationFormatted: formatDuration(totalSleepSeconds),
    sleepPhaseFormatted: {deep: formatPhase(phases.deep), rem: formatPhase(phases.rem), core: formatPhase(phases.core), awake: formatPhase(phases.awake)},
    derived: {deepPct: pcts.deepPct, remPct: pcts.remPct, corePct: pcts.corePct},
    phases
  }
}

export function adaptWorkouts(workoutsData: WorkoutsExport | null): WorkoutEntry[] | null {
  if (workoutsData === null) {
    return null
  }
  return workoutsData.workouts.map((w) => {
    const mapped = ACTIVITY_TYPE_MAP[w.activityType]
    if (mapped) {
      return {...w, activityType: mapped.label, activityUrl: mapped.url}
    }
    return w
  })
}

export function adaptGithubEvents(data: GithubEventsExport | null, now?: number): AdaptedGithubEvent[] {
  if (!data) {
    return []
  }
  const events = data.events || []
  const ts = now ?? Date.now()

  return events.slice(0, 10).map((e) => {
    let date = e.date
    if (date && date.includes('T')) {
      const msAgo = ts - new Date(date).getTime()
      const minutesAgo = Math.floor(msAgo / 60000)
      const hoursAgo = Math.floor(minutesAgo / 60)
      const daysAgo = Math.floor(hoursAgo / 24)
      const weeksAgo = Math.floor(daysAgo / 7)
      if (weeksAgo > 0) {
        date = weeksAgo + 'w ago'
      } else if (daysAgo > 0) {
        date = daysAgo + 'd ago'
      } else if (hoursAgo > 0) {
        date = hoursAgo + 'h ago'
      } else {
        date = minutesAgo + 'm ago'
      }
    }

    const fullRepo = e.repo || ''
    let repo = fullRepo
    const slashIdx = repo.indexOf('/')
    if (slashIdx !== -1) {
      repo = repo.substring(slashIdx + 1)
    }

    let url = ''
    if (e.type === 'commit' && e.hash) {
      url = 'https://github.com/' + fullRepo + '/commit/' + e.hash
    } else if (e.type?.startsWith('pr_') && e.number !== undefined) {
      url = 'https://github.com/' + fullRepo + '/pull/' + e.number
    } else if (e.type?.startsWith('issue_') && e.number !== undefined) {
      url = 'https://github.com/' + fullRepo + '/issues/' + e.number
    }

    // `datetime` keeps the export's own ISO value (timestamp or date-only).
    return {...e, date, datetime: e.date && ISO_DATE_PREFIX.test(e.date) ? e.date : undefined, repo, url}
  })
}

export function adaptBooks(booksData: BooksExport): AdaptedBooks {
  const rawBooks = booksData.books ?? []

  const books: AdaptedBookEntry[] = rawBooks.map((b) => {
    const mappedStatus = b.status ?? 'upNext'
    let progress: number | undefined
    if (b.currentPage != null && b.totalPages != null && b.totalPages > 0) {
      progress = Math.round((b.currentPage / b.totalPages) * 100)
    }
    return {
      title: b.title,
      author: b.author,
      asin: b.asin,
      status: mappedStatus,
      rating: b.rating ?? null,
      progress,
      link: 'https://www.amazon.com/dp/' + b.asin + '?tag=lifegames04-20&linkCode=ll2&language=en_US&ref_=as_li_ss_tl',
      // Sanitize at the contract boundary. Renderers repeat the check at the
      // point of use because they also accept fixture and DOM-sourced data.
      // Rejected raster URLs paint the committed placeholder; rejected AVIF
      // candidates are absent so they cannot override the raster fallback.
      mainImage: sanitizeImageUrl(b.mainImage),
      mainImageThumb: sanitizeImageUrl(b.mainImageThumb),
      mainImageCard: sanitizeImageUrl(b.mainImageCard),
      mainImageAvif: sanitizeImageUrl(b.mainImageAvif, {onReject: 'omit'}),
      mainImageThumbAvif: sanitizeImageUrl(b.mainImageThumbAvif, {onReject: 'omit'}),
      mainImageCardAvif: sanitizeImageUrl(b.mainImageCardAvif, {onReject: 'omit'}),
      notes: b.notes ?? null,
      finishedAt: b.finishedAt ?? null,
      startedAt: b.startedAt ?? null
    }
  })

  const bookMeta: Record<string, BookMeta> = {}
  for (const b of rawBooks) {
    if (b.asin) {
      bookMeta[b.asin] = {
        seriesName: b.series ?? null,
        seriesNumber: b.seriesNumber ?? null,
        seriesTotal: b.seriesTotal ?? null,
        pages: b.totalPages ?? b.pageCount ?? null,
        genres: b.category ? b.category.split(' > ') : [],
        year: b.publishedYear ?? null,
        desc: b.description ?? null
      }
    }
  }

  const inProgress = books.filter((b) => b.status === 'reading').length
  const completed = books.filter((b) => b.status === 'finished').length
  const next = books.filter((b) => b.status === 'upNext').length

  return {books, bookMeta, statusLabels: STATUS_LABELS, stats: {total: books.length, reading: inProgress, completed, upcoming: next}}
}

export function adaptStarredRepos(data: GithubStarredReposExport, now?: number): AdaptedStarredRepo[] {
  const ts = now ?? Date.now()
  return (data.repos || []).slice(0, 5).map((r) => {
    const msAgo = ts - new Date(r.starredAt).getTime()
    const hoursAgo = Math.floor(msAgo / 3600000)
    const daysAgo = Math.floor(hoursAgo / 24)
    const weeksAgo = Math.floor(daysAgo / 7)
    let starredAt: string
    if (weeksAgo > 0) {
      starredAt = `${weeksAgo} week${weeksAgo > 1 ? 's' : ''} ago`
    } else if (daysAgo > 0) {
      starredAt = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
    } else {
      starredAt = `${hoursAgo}h ago`
    }
    const lang = r.languages?.[0]?.language || 'Unknown'
    return {
      owner: r.ownerLogin,
      name: r.name,
      url: r.htmlUrl,
      stars: r.stargazersCount,
      language: lang,
      languageColor: LANG_COLORS[lang] || '#8b949e',
      starredAt,
      datetime: r.starredAt
    }
  })
}

export function adaptArticles(data: ArticlesExport | null, now?: number): AdaptedArticle[] {
  if (!data || !data.articles) {
    return []
  }

  const ts = now ?? Date.now()

  return data.articles.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 30).map((a) => {
    const msAgo = ts - new Date(a.savedAt).getTime()
    const minutesAgo = Math.floor(msAgo / 60000)
    const hoursAgo = Math.floor(minutesAgo / 60)
    const daysAgo = Math.floor(hoursAgo / 24)
    const weeksAgo = Math.floor(daysAgo / 7)
    let date: string
    if (weeksAgo > 0) {
      date = weeksAgo + 'w ago'
    } else if (daysAgo > 0) {
      date = daysAgo + 'd ago'
    } else if (hoursAgo > 0) {
      date = hoursAgo + 'h ago'
    } else {
      date = minutesAgo + 'm ago'
    }

    const hasNotes = Array.isArray(a.notes) && a.notes.length > 0
    const noteText = hasNotes ? a.notes.map((n) => n.comment).join('\n') : null

    return {title: a.articleTitle, url: a.articleUrl, source: a.sourceTitle || '', date, datetime: a.savedAt, hasNotes, noteText}
  })
}
