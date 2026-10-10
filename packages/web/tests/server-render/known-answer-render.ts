// Review M01 (adversarial review of the 0160 wave): the EXACT render of every
// live widget from the known-answer exports, slot by slot.
//
// Each projection lists, in document order, every text node of the card (the
// header's live label and stale "as of" time excepted: the state tests pin
// those), every content-bearing attribute and every inline style that the
// widget's non-data allowlist does not already permit. states.test.ts compares
// the render to it with toEqual, so a wrong value in any slot (a star count off
// by one) and any carrier the projection does not name both fail.
//
// Expected values come from the raw `ssrKnownAnswer` exports, the adapters
// (the input side of the template) and the authored copy. Only pure, unit-tested
// helpers are shared with the templates: the heart-rate zone classifier and the
// workout duration formatter.
import {a11y, widgets} from '@j0nathan-ll0yd/copy'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {adaptArticles, adaptBooks, adaptGithubEvents, adaptHealth, adaptStarredRepos} from '../../src/runtime/adapters'
import {classifyHeartRate, classifyHRV} from '../../src/runtime/heart-rate'
import {PLACEHOLDER_IMAGE_SRC} from '../../src/runtime/image-utils'
import {formatWorkoutDuration} from '../../src/runtime/widget-rules'
import {NO_READING} from '../../src/runtime/widget-state'

const GENERATED = join(__dirname, '../../../fixtures/src/generated')
const KNOWN_ANSWER = 'ssrKnownAnswer'
const raw = (dir: string): any => JSON.parse(readFileSync(join(GENERATED, dir, `${KNOWN_ANSWER}.json`), 'utf8'))

/** The render clock the state tests use. */
export const RENDER_NOW = '2026-03-18T12:00:00.000Z'

export interface Projection {
  /** Every text node of the card, whitespace-collapsed, in document order. */
  text: string[]
  /** Every content-bearing attribute as `name=value`, in document order. */
  attrs: string[]
  /** Every inline style the non-data allowlist does not permit, in document order. */
  styles: string[]
  /** Every class token the non-data allowlist does not use, as a set. */
  classes: string[]
  /** Parsed JSON attributes, compared as objects (key order is the template's). */
  json?: Record<string, unknown[]>
}

export interface ProjectionOptions {
  /** NightSummary (owner decision Q3): a health export that is not live lends no score. */
  healthLive?: boolean
}

// Attributes that are structure, presentation or SVG geometry. Every OTHER
// attribute is content and must appear in the projection.
export const NON_CONTENT_ATTR =
  /^(class|id|style|role|aria-hidden|aria-live|tabindex|target|rel|loading|decoding|referrerpolicy|type|hidden|focusable|viewBox|d|x|y|width|height|rx|x1|x2|y1|y2|cx|cy|r|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|fill|opacity|filter|stdDeviation|result|in|preserveAspectRatio|data-state-scaffold|data-ssr-state|data-generated-at|data-astro-.*)$/

/** Attributes whose value is JSON, compared parsed. */
export const JSON_ATTR = new Set(['data-book', 'data-local-cover'])

const fixed = (n: number, digits: number): string => n.toFixed(digits)
const or = (v: number | undefined, format: (n: number) => string): string => (typeof v === 'number' ? format(v) : NO_READING)

function heartRate(): Projection {
  const q = raw('health').quantities
  const hr = Math.round(q.heartRate.value)
  const hrv = Math.round(q.heartRateVariabilitySDNN.value)
  const zone = classifyHeartRate(hr)
  const hrvZone = classifyHRV(hrv)
  const c = widgets.heartRate
  return {
    text: [
      c.title,
      String(hr),
      c.bpm,
      zone.zone,
      c.hrv,
      String(hrv),
      c.hrvUnit,
      c.rhr,
      or(q.restingHeartRate?.value, (n) => String(Math.round(n))),
      c.rhrUnit,
      c.rr,
      or(q.respiratoryRate?.value, (n) => String(Math.round(n))),
      c.rrUnit,
      c.temp,
      or(q.wristTemperatureDelta?.value, (n) => (n > 0 ? '+' : '') + fixed(n, 1))
    ],
    attrs: [`data-bpm=${hr}`, `data-hrv=${hrv}`, `data-stroke=${zone.ecgStroke}`],
    styles: [
      `span color: ${zone.bpmColor}; text-shadow: ${zone.bpmShadow}`,
      `span color: ${zone.badgeColor}; background: ${zone.badgeBg}; border: 1px solid ${zone.badgeBorder}`,
      `span color: ${hrvZone.color}; text-shadow: ${hrvZone.shadow}`
    ],
    classes: []
  }
}

function movementRings(): Projection {
  const h = raw('health')
  const q = h.quantities
  const g = h.goals
  const c = widgets.movement
  const move = Math.round(q.activeEnergyBurned.value)
  const exercise = Math.round(q.exerciseTime.value)
  const pct = (v: number, goal: number): number => Math.round((v / goal) * 100)
  // Ring geometry: radii 60, 44 and 28; an absent ring is a full offset.
  const offset = (r: number, frac: number): string => fixed(2 * Math.PI * r * (1 - Math.min(1, Math.max(0, frac))), 2)
  const stand = q.standHours?.value
  return {
    text: [
      c.title,
      `${pct(move, g.moveKcal)}%`,
      'cal',
      c.steps,
      Math.round(q.stepCount.value).toLocaleString('en-US'),
      c.distance,
      fixed(q.distanceWalkingRunning.value / 1000, 1),
      c.distanceUnit,
      c.flights,
      or(q.flightsClimbed?.value, (n) => String(Math.round(n))),
      c.calories,
      c.caloriesShort,
      `${move}/${g.moveKcal}`,
      c.exercise,
      c.exerciseShort,
      `${exercise}/${g.exerciseMin}`,
      c.stand,
      c.stand,
      `${or(stand, (n) => String(Math.floor(n)))}/${g.standHr}`,
      '☀',
      h.solar.sunriseHHmm,
      h.solar.sunsetHHmm,
      '☾',
      or(q.timeInDaylight?.value, (n) => String(Math.round(n))),
      `${c.daylightCaption.replace('{minutes}', '').trim()} · ${c.daylightGoal.replace('{minutes}', String(g.daylightMin))}`,
      '✓'
    ],
    attrs: [
      `aria-label=${
        a11y.movement.rings.replace('{calories}%', `${pct(move, g.moveKcal)}%`).replace('{exercise}%', `${pct(exercise, g.exerciseMin)}%`).replace(
          '{stand}%',
          stand == null ? widgets.widgetState.noReading : `${pct(stand, g.standHr)}%`
        )
      }`,
      `stroke-dashoffset=${offset(60, move / g.moveKcal)}`,
      `stroke-dashoffset=${offset(44, exercise / g.exerciseMin)}`,
      `stroke-dashoffset=${offset(28, stand == null ? 0 : stand / g.standHr)}`,
      'data-mv-metric=steps',
      'data-mv-metric=distance',
      'data-mv-metric=flights',
      `aria-label=${a11y.movement.daylight}`
    ],
    styles: [`div left: ${h.solar.currentProgressPct}%`],
    classes: []
  }
}

function hydration(): Projection {
  const hy = adaptHealth(raw('health'), raw('sleep')).hydration
  const c = widgets.hydration
  const range = (lo: number, hi: number, max: number): string => `div bottom: ${(lo / max) * 100}%; height: ${((hi - lo) / max) * 100}%`
  const clip = (v: number, max: number): string => `div clip-path: inset(${100 - Math.min(Math.max(v / max, 0), 1) * 100}% 0 0 0)`
  return {
    text: [
      c.title,
      String(hy.waterRangeHi),
      String(hy.waterRangeLo),
      `${hy.waterOz} oz`,
      c.water,
      String(hy.caffeineRangeHi),
      String(hy.caffeineRangeLo),
      `${hy.caffeineMg} mg`,
      c.caffeine
    ],
    attrs: [],
    styles: [
      range(hy.waterRangeLo, hy.waterRangeHi, hy.waterMax),
      clip(hy.waterOz!, hy.waterMax),
      range(hy.caffeineRangeLo, hy.caffeineRangeHi, hy.caffeineMax),
      clip(hy.caffeineMg!, hy.caffeineMax)
    ],
    classes: [
      'hydra-range',
      'hydra-range-coffee',
      'hydra-range-label',
      'hydra-range-label-bottom',
      'hydra-range-label-coffee',
      'hydra-range-label-top',
      'hydra-range-label-water',
      'hydra-range-water'
    ]
  }
}

function nightSummary(opts: ProjectionOptions): Projection {
  const sl = raw('sleep')
  const c = widgets.nightSummary
  const hm = (s: number): string => {
    const m = Math.floor(s / 60)
    return Math.floor(m / 60) > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
  }
  const asleep = sl.deep.seconds + sl.rem.seconds + sl.core.seconds
  const score = opts.healthLive === false ? null : raw('health').quantities.sleepScore.value
  const share = (s: number): number => Math.round((s / asleep) * 100)
  const clauses = c.restorative.split('—').map((x) => x.trim())
  return {
    text: [
      c.title,
      hm(asleep),
      c.score,
      score == null ? NO_READING : String(score),
      c.phaseDeep,
      hm(sl.deep.seconds),
      c.phaseRem,
      hm(sl.rem.seconds),
      c.phaseCore,
      hm(sl.core.seconds),
      c.phaseAwake,
      hm(sl.awake.seconds),
      clauses[0]!.replace('{deep}', String(share(sl.deep.seconds))),
      '—',
      clauses[1]!.replace('{rem}', String(share(sl.rem.seconds))),
      `— ${clauses[2]}`
    ],
    attrs: ['data-phase=deep', 'data-phase=rem', 'data-phase=core', 'data-phase=awake'],
    // The score bar, when a score is shown; the pills' styles are chrome (allowlist).
    styles: score == null ? [] : [`div width: ${score}%`],
    classes: []
  }
}

function workouts(): Projection {
  const c = widgets.workouts
  return {
    text: [
      c.title,
      ...raw('workouts').workouts.flatMap((w: any) => [
        w.activityType,
        c.duration,
        formatWorkoutDuration(w.duration),
        c.calories,
        `${Math.round(w.energyBurned)} ${c.caloriesUnit}`,
        c.distance,
        `${fixed(w.distance / 1000, 2)} ${c.distanceUnit}`
      ])
    ],
    attrs: [],
    styles: [],
    classes: [
      'workout-stat',
      'workout-stat-label',
      'workout-stat-value',
      'workout-sub-card',
      'workout-sub-icon',
      'workout-sub-stats',
      'workout-sub-top',
      'workout-sub-type'
    ]
  }
}

const DEV_LOG_ICONS: Record<string, {symbol: string; color: string}> = {
  commit: {symbol: '→', color: 'var(--lg-color-accent-green)'},
  pr_merged: {symbol: '⊞', color: 'var(--lg-color-accent-blue)'}
}

function devActivityLog(): Projection {
  const rawEvents = raw('github-events').events
  const events = adaptGithubEvents(raw('github-events'), Date.parse(RENDER_NOW))
  const text: string[] = [widgets.devLog.title]
  const attrs: string[] = []
  const styles: string[] = []
  events.forEach((e, i) => {
    const r = rawEvents[i]
    const icon = DEV_LOG_ICONS[r.type]!
    text.push(icon.symbol, r.repo.split('/')[1], r.title)
    styles.push(`span color: ${icon.color};`)
    if (r.type === 'commit') {
      text.push(`+${r.additions}`, `-${r.deletions}`)
      styles.push('span color:var(--lg-color-accent-green)', 'span color:var(--lg-color-accent-red)')
    } else {
      text.push(`#${r.number}`)
    }
    text.push(r.date)
    attrs.push(`href=${e.url}`, 'data-sa-link-event=activity_click', `datetime=${r.date}`)
  })
  return {text, attrs, styles, classes: ['gh-dal-date', 'gh-dal-detail', 'gh-dal-icon', 'gh-dal-line', 'gh-dal-repo', 'gh-dal-title']}
}

function starredRepoList(): Projection {
  const repos = raw('github-starred-repos').repos
  const labels = adaptStarredRepos(raw('github-starred-repos'), Date.parse(RENDER_NOW))
  return {
    text: [
      widgets.starredRepos.title,
      ...repos.flatMap((r: any, i: number) => [
        `${r.ownerLogin}/`,
        r.name,
        `★ ${r.stargazersCount.toLocaleString('en-US')}`,
        r.languages[0].language,
        labels[i]!.starredAt
      ])
    ],
    attrs: repos.flatMap((r: any) => [`href=${r.htmlUrl}`, 'data-sa-link-event=repo_click', `datetime=${r.starredAt}`]),
    styles: labels.map((r) => `span background: ${r.languageColor};`),
    classes: ['gh-sl-date', 'gh-sl-lang', 'gh-sl-lang-dot', 'gh-sl-name', 'gh-sl-owner', 'gh-sl-row', 'gh-sl-stars']
  }
}

function readingFeed(): Projection {
  const articles = raw('articles').articles
  const labels = adaptArticles(raw('articles'), Date.parse(RENDER_NOW))
  return {
    text: [widgets.readingFeed.title, ...articles.flatMap((a: any, i: number) => [a.articleTitle, `(${a.sourceTitle})`, labels[i]!.date])],
    attrs: articles.map((a: any) => `datetime=${a.savedAt}`),
    styles: articles.map((_: unknown, i: number) => `li animation-delay: ${i * 0.07}s`),
    classes: ['article-list-date', 'article-list-item', 'article-list-source', 'article-list-title']
  }
}

function bookshelf(): Projection {
  const books = raw('books').books
  const adapted = adaptBooks(raw('books'))
  const c = widgets.bookshelf
  const text: string[] = [c.title]
  const attrs: string[] = []
  const styles: string[] = []
  const bookJson: unknown[] = []
  const covers: unknown[] = []
  books.forEach((b: any, i: number) => {
    const progress = b.currentPage != null ? Math.round((b.currentPage / b.totalPages) * 100) : undefined
    bookJson.push({
      title: b.title,
      author: b.author,
      asin: b.asin,
      status: b.status,
      statusLabel: adapted.statusLabels[b.status],
      ...(b.rating != null ? {rating: b.rating} : {}),
      ...(progress != null ? {progress} : {}),
      link: `https://www.amazon.com/dp/${b.asin}?tag=lifegames04-20&linkCode=ll2&language=en_US&ref_=as_li_ss_tl`,
      notes: null,
      finishedAt: null,
      startedAt: null,
      series: b.series,
      seriesNumber: b.seriesNumber,
      seriesTotal: b.seriesTotal,
      pages: b.pageCount,
      year: b.publishedYear,
      // The adapter's book metadata carries no publication date.
      publicationDate: null,
      desc: b.description,
      genres: [b.category],
      // The fixture's cover host is not an allowed image origin: the placeholder.
      mainImage: PLACEHOLDER_IMAGE_SRC,
      mainImageAvif: null
    })
    covers.push([])
    attrs.push('data-book=*', 'data-local-cover=*', `aria-label=${a11y.bookshelf.bookItem.replace('{title}', b.title).replace('{author}', b.author)}`,
      `src=${PLACEHOLDER_IMAGE_SRC}`, `srcset=${PLACEHOLDER_IMAGE_SRC} 1x, ${PLACEHOLDER_IMAGE_SRC} 2x`, `alt=${b.title}`)
    styles.push(`li animation-delay: ${i * 0.08}s`)
    text.push(b.title, b.author, adapted.statusLabels[b.status]!)
    if (progress != null) {
      styles.push(`div width: ${progress}%`)
      text.push(`${progress}%`)
    }
    if (b.rating != null) {
      for (let s = 1; s <= 5; s++) {
        text.push(s <= b.rating ? '★' : '☆')
      }
    }
  })
  // The row's chrome, plus the classes each book's status, progress and rating select.
  const classes = new Set(['shelf-book', 'shelf-book-author', 'shelf-book-status', 'shelf-book-title', 'shelf-cover-wrapper'])
  for (const b of books) {
    classes.add(`shelf-status-${b.status}`)
    if (b.status === 'reading') {
      classes.add('shelf-book-active')
    }
    if (b.currentPage != null) {
      ;['shelf-book-progress', 'shelf-book-progress-bar', 'shelf-book-progress-fill'].forEach((c) => classes.add(c))
    }
    if (b.rating != null) {
      classes.add('shelf-book-stars')
      classes.add('star-on')
      if (b.rating < 5) {
        classes.add('star-off')
      }
    }
  }
  return {text, attrs, styles, classes: [...classes], json: {'data-book': bookJson, 'data-local-cover': covers}}
}

// The theatre grade colours, by grade letter.
const GRADE_COLOR: Record<string, string> = {A: '#06d6a0', B: '#3a86ff', C: '#f59e0b', D: '#ff6b00', F: '#ef4444'}

function theatreReviews(): Projection {
  const t = raw('theatre-reviews')
  return {
    text: [widgets.theatreReviews.title, `${t.totalReviews} reviews`, ...t.reviews.flatMap((r: any) => [r.rating, r.title])],
    attrs: ['href=https://www.coasttocoastreviews.com', ...t.reviews.flatMap((r: any) => [`href=${r.url}`, `src=${PLACEHOLDER_IMAGE_SRC}`, 'alt='])],
    styles: t.reviews.flatMap((r: any, i: number) => {
      const color = GRADE_COLOR[r.rating[0]]
      return [`a animation-delay: ${i * 0.08}s`, `span color:${color};border-color:${color}`]
    }),
    classes: ['theatre-card', 'theatre-grade', 'theatre-poster-wrap', 'theatre-title']
  }
}

const PROJECTIONS: Record<string, (opts: ProjectionOptions) => Projection> = {
  cardHR: heartRate,
  cardMovement: movementRings,
  cardHydration: hydration,
  cardSleep: nightSummary,
  cardWorkouts: workouts,
  cardDevLog: devActivityLog,
  cardStarredRepos: starredRepoList,
  cardReading: readingFeed,
  cardBooks: bookshelf,
  cardTheatreReviews: theatreReviews
}

/** The exact known-answer render of a live widget, by card id. */
export function knownAnswerProjection(id: string, opts: ProjectionOptions = {}): Projection {
  const project = PROJECTIONS[id]
  if (!project) {
    throw new Error(`no known-answer projection for #${id}`)
  }
  return project(opts)
}
