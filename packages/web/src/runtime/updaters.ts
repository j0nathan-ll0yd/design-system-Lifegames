import {a11y, widgets} from '@j0nathan-ll0yd/copy'
import {withViewTransition} from './view-transition'
import type {AdaptedArticle, AdaptedBooks, AdaptedGithubEvent, AdaptedHealth, AdaptedSleep, AdaptedStarredRepo, BookMeta, WorkoutEntry} from './adapters'
import {LANG_COLORS} from './constants'
import type {LocationExport} from './location-types'
import {imgFallbackAttrs, installImageFallbacks, mirroredCoverUrl, parseLocalCovers, PLACEHOLDER_IMAGE_SRC, sanitizeImageUrl} from './image-utils'
import {enterUnavailable, insertStateNotice, isSuppressedCard, renderWidgetEmpty, revealLiveData} from './updater-empty'
import type {Freshness} from './freshness'
import {heartRateEmptyHtml, hydrationRangeHtml} from './widget-markup'
import {type HeartRateView, heartRateView, hydrationView, nightSummaryView, type RangeBand, SLEEP_PHASES, toNightSummaryHealth} from './widget-views'
import {writeHeartRateFooter} from './updaters-movement'
import type {HeartRateProps} from '../widgets/health/HeartRate.types'
import {composeSystemLines, formatAge} from './view-models'
import {formatMeasurement, formatMonthYear} from './widget-state'
import {formatWorkoutDuration} from './widget-rules'
import {workoutsRestHtml} from './workouts-markup'

const CATEGORY_COLORS: Record<string, string> = {
  Dining: 'var(--neon-orange, #ff6b00)',
  'Fitness & Outdoors': 'var(--neon-green, #06d6a0)',
  Shopping: 'var(--neon-purple, #a855f7)',
  Entertainment: 'var(--neon-pink, #ff006e)',
  Travel: 'var(--neon-cyan, #00d4ff)',
  Health: 'var(--neon-red, #ef4444)',
  Work: 'var(--neon-blue, #3a86ff)',
  Education: 'var(--neon-indigo, #818cf8)',
  Services: 'var(--neon-amber, #f59e0b)'
}
const CATEGORY_FALLBACK_COLOR = 'var(--text-muted, #9ca3af)'

export function getCategoryColor(category: string | null): string {
  if (!category) {
    return CATEGORY_FALLBACK_COLOR
  }
  return CATEGORY_COLORS[category] ?? CATEGORY_FALLBACK_COLOR
}

const ACCENT_CLASSES = [
  'tri-card-accent-pink',
  'tri-card-accent-blue',
  'tri-card-accent-green',
  'tri-card-accent-amber',
  'tri-card-accent-red',
  'tri-card-accent-purple',
  'tri-card-accent-cyan',
  'tri-card-accent-orange',
  'tri-card-accent-indigo'
]

import {esc, safeHttpsUrl} from './html-utils'
export { esc }

/** HeartRate's props from adapter output and the export's freshness. */
function heartRateProps(data: AdaptedHealth, freshness: Freshness | undefined): HeartRateProps {
  return {state: freshness?.state, generatedAt: freshness?.generatedAt, health: {quantities: data.quantities, watch: data.watch}}
}

/** Write HeartRate's value slots from its view: a reading, the no-reading mark, or ''. */
function writeHeartRateSlots(card: HTMLElement, view: HeartRateView): void {
  const {zone, showData} = view
  const hasHr = view.hr > 0
  const bpm = document.getElementById('pulseBpm')
  if (bpm) {
    bpm.textContent = view.bpmText
    // A zone colour belongs to a reading; no reading carries none.
    bpm.style.color = hasHr ? zone.bpmColor : ''
    bpm.style.textShadow = hasHr ? zone.bpmShadow : ''
  }
  const badge = document.getElementById('hrZoneBadge')
  if (badge) {
    badge.textContent = view.zoneText
    badge.style.color = hasHr ? zone.badgeColor : ''
    badge.style.background = hasHr ? zone.badgeBg : ''
    badge.style.border = hasHr ? '1px solid ' + zone.badgeBorder : ''
  }
  const hrvEl = document.getElementById('hrHrvValue')
  if (hrvEl) {
    hrvEl.textContent = view.hrvText
    hrvEl.style.color = view.hasHrv ? view.hrvColor.color : ''
    hrvEl.style.textShadow = view.hasHrv ? view.hrvColor.shadow : ''
  }
  writeHeartRateFooter(view)
  const labelEl = document.getElementById('hrPausedLabel')
  if (labelEl) {
    labelEl.textContent = view.pausedLabel
  }
  const descEl = document.getElementById('hrPausedDesc')
  if (descEl) {
    descEl.textContent = view.pausedDescription
  }
  // CSS controls the paused block: .is-paused hides .hr-data and shows .hr-paused.
  card.classList.toggle('is-paused', view.paused)
  if (showData) {
    // Update canvas ECG parameters
    const ecgUpdate = (window as any).__ecgUpdate
    if (typeof ecgUpdate === 'function') {
      ecgUpdate(view.hr, view.hrv, zone.ecgStroke)
    }
  }
  const ecgBg = document.getElementById('hrEcgBg')
  if (ecgBg) {
    ecgBg.style.opacity = String(zone.ecgOpacity)
  }
  card.classList.remove(...ACCENT_CLASSES)
  card.classList.add(zone.accentClass)
}

/**
 * Update HeartRate (cardHR) from adapter output. The card takes the state the
 * server renders for the same input (heartRateView, heartRateState):
 *   - a readable export with no heart rate: `unavailable` (notice, no value);
 *   - no quantity at all, or a recorded 0: `empty` ("No heart rate data");
 *   - a paused watch (off the wrist or charging): the data state, the paused
 *     copy and no value;
 *   - otherwise the data state (`live`, or `stale` from `freshness`).
 * `freshness` is the health export's (exportFreshness('health', export));
 * omitted, the card records `live` with no timestamp.
 */
export function updateHeartRate(data: AdaptedHealth, freshness?: Freshness): void {
  const card = document.getElementById('cardHR')
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (!card || isSuppressedCard(card)) {
    return
  }
  const view = heartRateView(heartRateProps(data, freshness))
  writeHeartRateSlots(card, view)
  if (view.state === 'unavailable') {
    enterUnavailable(card)
    return
  }
  if (view.state === 'empty') {
    revealLiveData(card, 'empty')
    // The server's empty notice sits after the skeleton, before the paused block.
    insertStateNotice(card, heartRateEmptyHtml())
  } else {
    revealLiveData(card, view.state === 'stale' ? 'stale' : 'live', {generatedAt: freshness?.generatedAt})
  }
  card.querySelectorAll<HTMLElement>('[data-state-scaffold]').forEach((s) => {
    s.hidden = view.scaffoldHidden
  })
  card.classList.remove('is-loading')
}

export function updateWorkouts(data: WorkoutEntry[] | null | undefined, freshness?: Freshness): void {
  const card = document.getElementById('cardWorkouts')
  if (!card) {
    return
  }
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (isSuppressedCard(card)) {
    return
  }

  // null or undefined: the export could not be read. The card keeps what it
  // shows; only a successful empty result ([]) empties it.
  if (data == null) {
    return
  }

  const body = card.querySelector('.widget-body')
  if (!body) {
    return
  }

  card.style.display = ''
  // A successful export with no workouts is the recovery-day empty state:
  // clear every previous workout and show the server's empty markup.
  if (data.length === 0) {
    revealLiveData(card, 'empty')
    body.innerHTML = workoutsRestHtml()
    card.classList.remove('is-loading')
    return
  }
  revealLiveData(card, freshness?.state ?? 'live', {generatedAt: freshness?.generatedAt})

  // Shared with Workouts.astro, so server and client format the same.
  const fmtDuration = formatWorkoutDuration

  function getIcon(type: string): string {
    if (type === 'Outdoor Walk') {
      return '<svg class="workout-sub-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="5" r="3" fill="var(--neon-pink)" opacity="0.8"/><path d="M14 8 L14 17 M14 12 L9 15 M14 12 L19 15 M12 27 L14 17 L16 27" stroke="var(--neon-pink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/></svg>'
    }
    if (type === "Barry's Bootcamp") {
      return '<svg class="workout-sub-icon" viewBox="0 0 28 28" fill="none"><rect x="3" y="12" width="22" height="4" rx="2" stroke="var(--neon-pink)" stroke-width="1.8" opacity="0.8"/><rect x="1" y="10" width="4" height="8" rx="1.5" stroke="var(--neon-pink)" stroke-width="1.5" opacity="0.6"/><rect x="23" y="10" width="4" height="8" rx="1.5" stroke="var(--neon-pink)" stroke-width="1.5" opacity="0.6"/><circle cx="8" cy="14" r="3" stroke="var(--neon-pink)" stroke-width="1.2" opacity="0.5"/><circle cx="20" cy="14" r="3" stroke="var(--neon-pink)" stroke-width="1.2" opacity="0.5"/></svg>'
    }
    return '<svg class="workout-sub-icon" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="10" stroke="var(--neon-pink)" stroke-width="1.8" opacity="0.6"/><path d="M14 8 L14 14 L19 14" stroke="var(--neon-pink)" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/></svg>'
  }

  let html = ''
  data.forEach((w: WorkoutEntry) => {
    html += '<div class="workout-sub-card">'
    html += '<div class="workout-sub-top">'
    html += getIcon(w.activityType)
    // Only an https activity link becomes an href (shared with the template).
    const activityHref = safeHttpsUrl(w.activityUrl)
    html += activityHref
      ? '<a class="workout-sub-type" href="' + esc(activityHref) + '" target="_blank" rel="noopener noreferrer">' + esc(w.activityType) + '</a>'
      : '<div class="workout-sub-type">' + esc(w.activityType) + '</div>'
    html += '</div>'
    html += '<div class="workout-sub-stats">'
    html += '<div class="workout-stat"><div class="workout-stat-label">' +
      widgets.workouts.duration +
      '</div><div class="workout-stat-value">' +
      formatMeasurement(w.duration, fmtDuration) +
      '</div></div>'
    html += '<div class="workout-stat"><div class="workout-stat-label">' +
      widgets.workouts.calories +
      '</div><div class="workout-stat-value">' +
      formatMeasurement(w.energyBurned, (n) => Math.round(n) + ' ' + widgets.workouts.caloriesUnit) +
      '</div></div>'
    if (w.distance && w.distance > 0) {
      html += '<div class="workout-stat"><div class="workout-stat-label">' +
        widgets.workouts.distance +
        '</div><div class="workout-stat-value">' +
        (w.distance / 1000).toFixed(2) +
        ' ' +
        widgets.workouts.distanceUnit +
        '</div></div>'
    }
    html += '</div>'
    html += '</div>'
  })

  body.innerHTML = html
  card.classList.remove('is-loading')
}

/**
 * Update NightSummary (cardSleep) from adapter output. The card follows the
 * sleep export alone (owner decision Q3): `freshness` is the SLEEP export's
 * (exportFreshness('sleep', sleep)). The health export lends only the score,
 * and only while live: build `data` with
 * adaptSleep(sleep, sleepScoreSource(health, exportDomainState('health', health).state)).
 * Zero recorded sleep is `empty`. Omitting `freshness` records `live`.
 */
export function updateNightSummary(data: AdaptedSleep, freshness?: Freshness): void {
  const card = document.getElementById('cardSleep')
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (!card || isSuppressedCard(card)) {
    return
  }
  const view = nightSummaryView({state: freshness?.state, generatedAt: freshness?.generatedAt, health: toNightSummaryHealth(data)})
  if (view.state === 'empty') {
    revealLiveData(card, 'empty')
  } else {
    revealLiveData(card, view.state === 'stale' ? 'stale' : 'live', {generatedAt: freshness?.generatedAt})
  }

  const duration = document.getElementById('sleepDuration')
  if (duration) {
    duration.textContent = view.durationText
  }
  const scoreVal = document.getElementById('sleepScoreVal')
  if (scoreVal) {
    // A score the health export did not carry is no reading, never 0.
    scoreVal.textContent = view.scoreText
  }
  const scoreFill = document.getElementById('sleepScoreFill') as HTMLElement | null
  if (scoreFill) {
    scoreFill.style.width = view.scoreWidth + '%'
  }
  SLEEP_PHASES.forEach((phase) => {
    const val = card.querySelector(`[data-phase="${phase}"] .sleep-moon-pill-val`)
    if (val) {
      // '' marks a phase the export did not carry: no reading, never 0m.
      val.textContent = view.phases[phase]
    }
  })
  const insight = document.getElementById('sleepInsight')
  if (insight) {
    // The same markup NightSummary.astro renders for the empty notice and the caption.
    insight.innerHTML = view.isEmpty
      ? '<span class="sleep-insight-empty" data-state-notice="empty">' + esc(widgets.nightSummary.empty) + '</span>'
      : view.caption
      ? '<span>' + esc(view.caption.deep) + '</span> &mdash; <span>' + esc(view.caption.rem) + '</span> &mdash; ' + esc(view.caption.tail)
      : ''
  }
  card.classList.remove('is-loading')
}

/**
 * Update Hydration (cardHydration) from adapter output: the values, the
 * liquid fill and the target-range bands the server renders for the same
 * input (hydrationView). `freshness` is the health export's; omitted, the
 * card records `live`.
 */
export function updateHydration(data: AdaptedHealth, freshness?: Freshness): void {
  const card = document.getElementById('cardHydration')
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (!card || isSuppressedCard(card)) {
    return
  }
  const view = hydrationView({state: freshness?.state, generatedAt: freshness?.generatedAt, health: {hydration: data.hydration}})
  if (view.state === 'empty') {
    revealLiveData(card, 'empty')
  } else {
    revealLiveData(card, view.state === 'stale' ? 'stale' : 'live', {generatedAt: freshness?.generatedAt})
  }
  // Measurements are null when the export did not carry them: the bar stays
  // empty and the value reads as no reading, never 0 (atlas decision 0160).
  const waterLiq = document.getElementById('hydraWaterLiq')
  if (waterLiq) {
    waterLiq.style.clipPath = 'inset(' + (100 - view.waterPct) + '% 0 0 0)'
  }
  const waterVal = document.getElementById('hydraWaterVal') as HTMLElement | null
  if (waterVal) {
    waterVal.dataset.liveUpdated = '1'
    waterVal.textContent = view.waterText
  }
  const coffeeLiq = document.getElementById('hydraCoffeeLiq')
  if (coffeeLiq) {
    coffeeLiq.style.clipPath = 'inset(' + (100 - view.caffeinePct) + '% 0 0 0)'
  }
  const coffeeVal = document.getElementById('hydraCoffeeVal') as HTMLElement | null
  if (coffeeVal) {
    coffeeVal.dataset.liveUpdated = '1'
    coffeeVal.textContent = view.caffeineText
  }
  const coffeeLabel = document.getElementById('hydraCoffeeLabel')
  if (coffeeLabel) {
    coffeeLabel.textContent = widgets.hydration.caffeine
  }
  // The target-range bands: replaced on every update, drawn only with values.
  writeHydrationBand(card.querySelector('.hydra-bottle-body'), 'water', view.waterBand)
  writeHydrationBand(card.querySelector('.hydra-mug-body'), 'coffee', view.caffeineBand)
  card.classList.remove('is-loading')
}

/** Replace a vessel's band with the server's markup for `band` (none when null). */
function writeHydrationBand(vessel: Element | null, kind: 'water' | 'coffee', band: RangeBand | null): void {
  if (!vessel) {
    return
  }
  vessel.querySelectorAll(':scope > .hydra-range').forEach((r) => r.remove())
  if (band) {
    // The server renders the band first in the vessel body, before the liquid.
    vessel.insertAdjacentHTML('afterbegin', hydrationRangeHtml(kind, band))
  }
}

/** A relative date in <time datetime> when its ISO source is known. */
function timeHtml(className: string, label: string, datetime: string | undefined): string {
  return datetime
    ? '<time class="' + className + '" datetime="' + esc(datetime) + '">' + esc(label) + '</time>'
    : '<span class="' + className + '">' + esc(label) + '</span>'
}

export function updateDevActivityLog(events: AdaptedGithubEvent[] | null | undefined, freshness?: Freshness): void {
  const card = document.getElementById('cardDevLog')
  if (!card) {
    return
  }
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (isSuppressedCard(card)) {
    return
  }
  // null or undefined: the export could not be read. The card keeps what it
  // shows; only a successful empty result ([]) empties it.
  if (events == null) {
    return
  }

  const body = card.querySelector('.widget-body')
  if (!body) {
    return
  }

  if (events.length === 0) {
    renderWidgetEmpty('cardDevLog', {message: widgets.devLog.empty})
    return
  }
  revealLiveData(card, freshness?.state ?? 'live', {generatedAt: freshness?.generatedAt})

  const iconMap: Record<string, {symbol: string; color: string}> = {
    commit: {symbol: '\u2192', color: 'var(--neon-green)'},
    pr_opened: {symbol: '\u2295', color: 'var(--neon-blue)'},
    pr_closed: {symbol: '\u2296', color: 'var(--neon-blue)'},
    pr_merged: {symbol: '\u229E', color: 'var(--neon-blue)'},
    issue_opened: {symbol: '\u25C9', color: 'var(--neon-amber)'},
    issue_closed: {symbol: '\u2714', color: 'var(--neon-amber)'}
  }
  const fallbackIcon = {symbol: '\u00B7', color: 'var(--neon-green)'}

  let html = '<div class="gh-dal-terminal">'
  events.forEach((e: AdaptedGithubEvent) => {
    const icon = iconMap[e.type] || fallbackIcon
    let detail = ''
    // Line counts only when the export carried both (no invented "+0 -0").
    if (e.type === 'commit' && e.hash && typeof e.additions === 'number' && typeof e.deletions === 'number') {
      detail = '<span style="color:var(--neon-green)">+' +
        Number(e.additions) +
        '</span> <span style="color:var(--neon-red)">-' +
        Number(e.deletions) +
        '</span>'
    } else if (typeof e.number === 'number') {
      detail = '#' + Number(e.number)
    }

    // Only an https event URL becomes an href (shared with the template).
    const eventHref = safeHttpsUrl(e.url)
    if (eventHref) {
      html += '<a class="gh-dal-line" href="' + esc(eventHref) + '" target="_blank" rel="noopener noreferrer">'
    } else {
      html += '<a class="gh-dal-line">'
    }
    html += '<span class="gh-dal-icon" style="color: ' + icon.color + ';">' + icon.symbol + '</span>'
    html += '<span class="gh-dal-repo">' + esc(e.repo) + '</span>'
    html += '<span class="gh-dal-title">' + esc(e.title) + '</span>'
    if (detail) {
      html += '<span class="gh-dal-detail">' + detail + '</span>'
    }
    html += timeHtml('gh-dal-date', e.date, e.datetime)
    html += '</a>'
  })
  html += '</div>'

  // Crossfade the content list swap — visually signals "data arriving".
  // The view-transition-name is set on the body element only during the
  // transition so duplicate names cannot occur across concurrent swaps.
  const bodyEl = body as HTMLElement
  withViewTransition(() => {
    bodyEl.style.viewTransitionName = 'live-content-swap'
    bodyEl.innerHTML = html
    bodyEl.style.viewTransitionName = ''
  })
  card.classList.remove('is-loading')
}

export function updateReadingFeed(input: AdaptedArticle[] | null | undefined, freshness?: Freshness): void {
  const card = document.getElementById('cardReading')
  if (!card) {
    return
  }
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (isSuppressedCard(card)) {
    return
  }
  // null or undefined: the export could not be read. The card keeps what it
  // shows; only a successful empty result ([]) empties it.
  if (input == null) {
    return
  }
  // A const keeps the narrowing inside the page closure below.
  const articles: AdaptedArticle[] = input

  const body = card.querySelector('.widget-body')
  if (!body) {
    return
  }

  if (articles.length === 0) {
    renderWidgetEmpty('cardReading', {message: widgets.readingFeed.empty})
    return
  }
  revealLiveData(card, freshness?.state ?? 'live', {generatedAt: freshness?.generatedAt})

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(articles.length / PAGE_SIZE)
  const bodyEl = body as HTMLElement

  // The reader's page is persisted on the widget-body element across poll-tick
  // re-invocations (dataset.currentPage is the single source of truth). Restore
  // it clamped so a tick that shrinks the feed never renders an empty slice.
  const persisted = Math.min(Number(bodyEl.dataset.currentPage) || 1, totalPages)
  let currentPage = persisted

  function renderPage(page: number): void {
    if (!body) {
      return
    }
    bodyEl.dataset.currentPage = String(page)
    const start = (page - 1) * PAGE_SIZE
    const pageArticles = articles.slice(start, start + PAGE_SIZE)

    let html = '<ul class="article-list" aria-live="polite">'
    pageArticles.forEach((a: AdaptedArticle, i: number) => {
      html += '<li class="article-list-item" style="animation-delay: ' + i * 0.07 + 's">'
      if (a.hasNotes) {
        html += '<span class="article-list-note" title="' + esc(a.noteText || '') + '">'
        html += '<svg class="article-list-note-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
        html += '<path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5l-3 3V3z" stroke="currentColor" stroke-width="1.2"/>'
        html += '<line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1"/>'
        html += '<line x1="5" y1="8.5" x2="9" y2="8.5" stroke="currentColor" stroke-width="1"/>'
        html += '</svg>'
        html += '</span>'
      }
      // Empty-title rows (e.g. Hoodline) promote the source into the title slot
      // so the row never renders blank-left; the parenthetical source is then
      // suppressed to avoid duplicating it.
      const titleText = a.title || a.source
      // Only an https article URL becomes an href, as in the other widgets.
      const articleHref = safeHttpsUrl(a.url)
      if (articleHref) {
        html += '<a class="article-list-title" href="' + esc(articleHref) + '" target="_blank" rel="noopener noreferrer">' + esc(titleText) + '</a>'
      } else {
        html += '<span class="article-list-title">' + esc(titleText) + '</span>'
      }
      if (a.title) {
        html += '<span class="article-list-source">(' + esc(a.source) + ')</span>'
      }
      html += timeHtml('article-list-date', a.date, a.datetime)
      html += '</li>'
    })
    html += '</ul>'

    if (totalPages > 1) {
      html += '<div class="article-pagination">'
      for (let p = 1; p <= totalPages; p++) {
        const activeClass = p === page ? ' article-page-active' : ''
        const ariaCurrent = p === page ? ' aria-current="page"' : ''
        html += '<button class="article-page-btn' +
          activeClass +
          '"' +
          ariaCurrent +
          ' data-page="' +
          p +
          '" aria-label="' +
          a11y.readingFeed.pagination.replace('{page}', String(p)).replace('{total}', String(totalPages)) +
          '">' +
          p +
          '</button>'
      }
      html += '</div>'
    }

    // Crossfade the article list swap on live-data refreshes and pagination
    // clicks — visually signals "content arriving/changing". The swap is async
    // (document.startViewTransition), so the button nodes it produces are not
    // available synchronously; a single delegated listener on the persistent
    // widget-body (below) handles clicks instead of per-button listeners.
    withViewTransition(() => {
      bodyEl.style.viewTransitionName = 'live-content-swap'
      body.innerHTML = html
      bodyEl.style.viewTransitionName = ''
    })
  }

  // Bind exactly one delegated click listener on the persistent .widget-body.
  // renderPage only ever sets body.innerHTML — it never replaces this element —
  // so the listener survives every async list swap and every poll-tick
  // re-invocation. The idempotency flag mirrors the dataset.liveUpdated pattern
  // used elsewhere in this module.
  if (!bodyEl.dataset.paginationBound) {
    bodyEl.addEventListener('click', (e: Event) => {
      const target = e.target
      if (!(target instanceof Element)) {
        return
      }
      const btn = target.closest('.article-page-btn')
      if (!btn) {
        return
      }
      const targetPage = parseInt((btn as HTMLElement).dataset.page || '1', 10)
      // dataset.currentPage is the single source of truth (not the active class).
      if (String(targetPage) !== bodyEl.dataset.currentPage) {
        renderPage(targetPage)
      }
    })
    bodyEl.dataset.paginationBound = '1'
  }

  renderPage(currentPage)
  card.classList.remove('is-loading')
}

export function updateSystemStatus(timestamps: Record<string, string | null>, now: number = Date.now()): void {
  const container = document.getElementById('systemStatus')
  if (!container) {
    return
  }

  // Same rows the SystemStatus template renders on the server (composeSystemLines).
  const bySource = new Map(composeSystemLines(timestamps, now).map((l) => [l.source, l]))

  const lines = container.querySelectorAll<HTMLElement>('.sys-line')
  lines.forEach((line) => {
    // A row the server rendered suppressed (a hiding focus mode) stays as it
    // is: an age or ACTIVE/OFFLINE would disclose export recency. Only the
    // focus gate releases it (releaseSuppression).
    if (isSuppressedCard(line)) {
      return
    }
    const source = line.dataset.source
    const composed = source ? bySource.get(source) : undefined
    if (!composed) {
      return
    }

    const dot = line.querySelector('.sys-dot')
    const valEl = line.querySelector('[class*="sys-val"]')
    const keyEl = line.querySelector('[class*="sys-key"]')
    if (!dot || !valEl) {
      return
    }

    dot.className = 'sys-dot ' + composed.dotClass
    if (keyEl && composed.keyClass) {
      keyEl.className = composed.keyClass
    }
    valEl.className = composed.valClass ?? 'sys-val'
    valEl.innerHTML = composed.value
    // A released row now shows live status: it carries no state of its own.
    delete line.dataset.ssrState
  })
}

export function updateExplorationOdometer(data: LocationExport): void {
  const card = document.getElementById('cardExplorationOdometer')
  if (!card) {
    return
  }

  const fields: Record<string, number> = {
    'odo-visits': data.totalVisits,
    'odo-places': data.totalPlaces,
    'odo-cities': data.explorationStats.totalCities,
    'odo-states': data.explorationStats.totalStates
  }

  for (const [key, value] of Object.entries(fields)) {
    const el = card.querySelector<HTMLElement>(`[data-loc="${key}"]`)
    if (el) {
      el.textContent = value.toLocaleString()
    }
  }

  const subtitleEl = card.querySelector<HTMLElement>('[data-loc="odo-subtitle"]')
  if (subtitleEl && data.currentCity) {
    let text = esc(data.currentCity)
    if (data.lastSeen) {
      text += ' · ' + formatRelativeTime(data.lastSeen)
    }
    subtitleEl.innerHTML = text
    subtitleEl.style.display = ''
  }

  card.classList.remove('is-loading')
}

export function updatePlaceLeaderboard(data: LocationExport): void {
  const card = document.getElementById('cardPlaceLeaderboard')
  if (!card) {
    return
  }

  const listEl = card.querySelector<HTMLElement>('[data-loc="leaderboard-list"]')
  if (!listEl) {
    card.classList.remove('is-loading')
    return
  }
  // No places: clear the previous rows and say so, never keep them.
  if (data.topPlaces.length === 0) {
    listEl.innerHTML = '<div class="widget-empty">' + esc(widgets.topPlaces.empty) + '</div>'
    card.classList.remove('is-loading')
    return
  }

  const maxVisits = Math.max(...data.topPlaces.map((p) => p.visitCount), 1)

  listEl.innerHTML = data.topPlaces.slice(0, 8).map((place, i) => {
    const barWidth = ((place.visitCount / maxVisits) * 100).toFixed(1)
    const catColor = getCategoryColor(place.category)
    const catBadge = place.category
      ? `<span class="pl-cat" style="color:${catColor};border-color:${catColor}">${esc(place.category)}</span>`
      : ''
    return `<div class="pl-row">
      <span class="pl-rank">${i + 1}</span>
      <span class="pl-name">${esc(place.name)}</span>
      ${catBadge}
      <div class="pl-bar-wrapper"><div class="pl-bar-fill" style="width:${barWidth}%"></div></div>
      <span class="pl-visits">${place.visitCount}</span>
    </div>`
  }).join('')

  card.classList.remove('is-loading')
}

// Owner's time zone, never the host's (atlas decision 0160).
export function formatFinishedDate(isoString: string): string {
  return formatMonthYear(isoString)
}

export function formatRelativeTime(isoString: string, now: number = Date.now()): string {
  return formatAge(isoString, now)
}

/**
 * The consumer's mirrored cover paths, from the card root's
 * `data-local-covers` (Bookshelf.astro renders it in every state, loading
 * included, from its `localCovers` prop).
 */
function localCoverCandidates(card: Element): ReadonlySet<string> {
  return parseLocalCovers(card instanceof HTMLElement ? card.dataset.localCovers : null)
}

/** The cover URL to render: the same-origin mirror for an exact listed path, else the contract URL. */
function displayCoverCandidate(candidate: string | null | undefined, localCandidates: ReadonlySet<string>): string | null {
  const sanitized = sanitizeImageUrl(candidate, {onReject: 'omit'})
  if (!sanitized) {
    return null
  }
  return mirroredCoverUrl(sanitized, localCandidates) ?? sanitized
}

/** One complete cover node, used by both updater branches for atomic swaps. */
function bookshelfCoverHtml(book: AdaptedBooks['books'][number], localCandidates: ReadonlySet<string>): string {
  const cardSrc = displayCoverCandidate(book.mainImageCard ?? book.mainImage, localCandidates)
  const thumbSrc = displayCoverCandidate(book.mainImageThumb ?? book.mainImage, localCandidates)
  const displaySrc = cardSrc ?? thumbSrc ?? PLACEHOLDER_IMAGE_SRC
  const rasterSrcset = cardSrc && thumbSrc
    ? cardSrc + ' 1x, ' + thumbSrc + ' 2x'
    : null

  const avifCard = displayCoverCandidate(book.mainImageCardAvif ?? book.mainImageAvif, localCandidates)
  const avifThumb = displayCoverCandidate(book.mainImageThumbAvif ?? book.mainImageAvif, localCandidates)
  const avifCandidates = [avifCard ? esc(avifCard) + ' 1x' : '', avifThumb ? esc(avifThumb) + ' 2x' : ''].filter(Boolean)
  const avifSrcset = avifCandidates.join(', ')

  const imgAttrs = 'src="' +
    esc(displaySrc) +
    '"' +
    (rasterSrcset ? ' srcset="' + esc(rasterSrcset) + '"' : '') +
    ' width="80" height="120" alt="' +
    esc(book.title) +
    '" loading="lazy" decoding="async"' +
    imgFallbackAttrs(displaySrc, avifSrcset.length > 0)
  const img = '<img ' + imgAttrs + '>'
  return avifSrcset
    ? '<picture><source srcset="' + avifSrcset + '" type="image/avif">' + img + '</picture>'
    : img
}

export function updateBookshelf(data: AdaptedBooks | null | undefined, freshness?: Freshness): void {
  const card = document.getElementById('cardBooks')
  if (!card) {
    return
  }
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (isSuppressedCard(card)) {
    return
  }
  // null or undefined: the export could not be read. The card keeps what it
  // shows; only a successful empty result ([]) empties it.
  if (data == null || data.books == null) {
    return
  }
  const localCandidates = localCoverCandidates(card)

  // Empty state: render the shared two-line placeholder. This replaces
  // `.widget-body` (destroying #dashShelfRow), so the populated path below
  // recreates the shelf row on an empty -> populated transition.
  if (data.books.length === 0) {
    renderWidgetEmpty('cardBooks', {title: widgets.bookshelf.emptyTitle, body: widgets.bookshelf.emptyBody})
    return
  }

  revealLiveData(card, freshness?.state ?? 'live', {generatedAt: freshness?.generatedAt})
  let shelfRow = document.getElementById('dashShelfRow')
  if (!shelfRow) {
    const body = card.querySelector('.widget-body')
    if (!body) {
      card.classList.remove('is-loading')
      return
    }
    body.innerHTML = '<ul class="shelf-row" id="dashShelfRow" role="list"></ul>'
    shelfRow = document.getElementById('dashShelfRow')
  }
  if (!shelfRow) {
    card.classList.remove('is-loading')
    return
  }

  const statusLabels = data.statusLabels
  const bookMeta = data.bookMeta
  const statusOrder: Record<string, number> = {reading: 0, upNext: 1, finished: 2}
  const sortedBooks = data.books.slice().sort((a, b) => {
    return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  })
  const displayBooks = sortedBooks.slice(0, 5)

  const existingBooks = shelfRow.querySelectorAll('.shelf-book')

  if (existingBooks.length === displayBooks.length) {
    displayBooks.forEach((b, i: number) => {
      const el = existingBooks[i]
      // existingBooks.length === displayBooks.length (guard above) → i is in-bounds.
      if (el === undefined) {
        return
      }
      const meta = bookMeta[b.asin] || ({} as BookMeta)
      el.setAttribute('data-book',
        JSON.stringify({
          title: b.title,
          author: b.author,
          asin: b.asin,
          status: b.status,
          statusLabel: statusLabels[b.status],
          rating: b.rating,
          progress: b.progress,
          link: b.link,
          mainImage: b.mainImage,
          mainImageAvif: b.mainImageAvif,
          series: meta.seriesName || null,
          seriesNumber: meta.seriesNumber || null,
          seriesTotal: meta.seriesTotal || null,
          pages: meta.pages || null,
          year: meta.year || null,
          desc: meta.desc || null,
          genres: meta.genres || [],
          notes: b.notes || null,
          finishedAt: b.finishedAt || null,
          startedAt: b.startedAt || null
        }))

      el.setAttribute('aria-label', a11y.bookshelf.bookItem.replace('{title}', b.title).replace('{author}', b.author))

      const coverWrapper = el.querySelector<HTMLElement>('.shelf-cover-wrapper')
      if (coverWrapper) {
        coverWrapper.innerHTML = bookshelfCoverHtml(b, localCandidates)
        installImageFallbacks(coverWrapper)
      }

      const title = el.querySelector('.shelf-book-title span')
      if (title) {
        title.textContent = b.title
      }

      const author = el.querySelector('.shelf-book-author')
      if (author) {
        author.textContent = b.author
      }

      // Active class for reading books
      if (b.status === 'reading') {
        el.classList.add('shelf-book-active')
      } else {
        el.classList.remove('shelf-book-active')
      }

      const status = el.querySelector('.shelf-book-status')
      if (status) {
        status.className = 'shelf-book-status shelf-status-' + b.status
        status.textContent = b.status === 'reading' ? widgets.bookshelf.statusReading : (statusLabels[b.status] ?? '')
      }

      // Stars: only for non-reading books
      const existingStars = el.querySelector('.shelf-book-stars')
      if (b.status !== 'reading' && b.rating) {
        let starsHtml = ''
        for (let s = 1; s <= 5; s++) {
          starsHtml += '<span class="' + (s <= b.rating ? 'star-on' : 'star-off') + '">' + (s <= b.rating ? '\u2605' : '\u2606') + '</span>'
        }
        if (existingStars) {
          existingStars.innerHTML = starsHtml
        } else {
          const starsDiv = document.createElement('div')
          starsDiv.className = 'shelf-book-stars'
          starsDiv.innerHTML = starsHtml
          status!.insertAdjacentElement('afterend', starsDiv)
        }
      } else if (existingStars) {
        existingStars.remove()
      }

      // Progress bar + label: create-or-update for reading books
      const existingBar = el.querySelector('.shelf-book-progress-bar')
      const existingProgress = el.querySelector('.shelf-book-progress')
      if (b.status === 'reading' && b.progress != null) {
        // Update or create the bar
        if (existingBar) {
          const fill = existingBar.querySelector('.shelf-book-progress-fill') as HTMLElement
          if (fill) {
            fill.style.width = b.progress + '%'
          }
        } else {
          const barDiv = document.createElement('div')
          barDiv.className = 'shelf-book-progress-bar'
          barDiv.innerHTML = '<div class="shelf-book-progress-fill" style="width:' + b.progress + '%"></div>'
          const insertAfter = status
          insertAfter!.insertAdjacentElement('afterend', barDiv)
        }
        // Update or create the label
        if (existingProgress) {
          existingProgress.textContent = b.progress + '%'
        } else {
          const progDiv = document.createElement('div')
          progDiv.className = 'shelf-book-progress'
          progDiv.textContent = b.progress + '%'
          const bar = el.querySelector('.shelf-book-progress-bar')
          bar!.insertAdjacentElement('afterend', progDiv)
        }
      } else {
        if (existingBar) {
          existingBar.remove()
        }
        if (existingProgress) {
          existingProgress.remove()
        }
      }

      // Finished date: show below stars for finished books with finishedAt
      const existingFinishedDate = el.querySelector('.shelf-book-finished-date')
      if (b.status === 'finished' && b.finishedAt) {
        const dateText = widgets.bookshelf.finishedDate.replace('{date}', formatFinishedDate(b.finishedAt))
        if (existingFinishedDate) {
          existingFinishedDate.textContent = dateText
        } else {
          const dateDiv = document.createElement('div')
          dateDiv.className = 'shelf-book-finished-date'
          dateDiv.textContent = dateText
          const starsEl = el.querySelector('.shelf-book-stars')
          const afterEl = starsEl || status
          afterEl!.insertAdjacentElement('afterend', dateDiv)
        }
      } else if (existingFinishedDate) {
        existingFinishedDate.remove()
      }
    })
  } else {
    let html = ''
    displayBooks.forEach((b, i: number) => {
      const meta = bookMeta[b.asin] || ({} as BookMeta)
      const bookData = JSON.stringify({
        title: b.title,
        author: b.author,
        asin: b.asin,
        status: b.status,
        statusLabel: statusLabels[b.status],
        rating: b.rating,
        progress: b.progress,
        link: b.link,
        mainImage: b.mainImage,
        mainImageAvif: b.mainImageAvif,
        series: meta.seriesName || null,
        seriesNumber: meta.seriesNumber || null,
        seriesTotal: meta.seriesTotal || null,
        pages: meta.pages || null,
        year: meta.year || null,
        desc: meta.desc || null,
        genres: meta.genres || [],
        notes: b.notes || null,
        finishedAt: b.finishedAt || null,
        startedAt: b.startedAt || null
      })
      var activeClass = b.status === 'reading' ? ' shelf-book-active' : ''
      html += '<li class="shelf-book' +
        activeClass +
        '" style="animation-delay: ' +
        i * 0.08 +
        's" data-book=\'' +
        bookData.replace(/'/g, '&#39;') +
        '\' tabindex="0" aria-label="' +
        a11y.bookshelf.bookItem.replace('{title}', esc(b.title)).replace('{author}', esc(b.author)) +
        '">'
      html += '<div class="shelf-cover-wrapper">'
      html += bookshelfCoverHtml(b, localCandidates)
      html += '</div>'
      html += '<div class="shelf-book-title"><span>' + esc(b.title) + '</span></div>'
      html += '<div class="shelf-book-author">' + esc(b.author) + '</div>'
      html += '<div class="shelf-book-status shelf-status-' +
        b.status +
        '">' +
        (b.status === 'reading' ? widgets.bookshelf.statusReading : statusLabels[b.status]) +
        '</div>'
      if (b.status === 'reading' && b.progress != null) {
        html += '<div class="shelf-book-progress-bar"><div class="shelf-book-progress-fill" style="width:' + b.progress + '%"></div></div>'
        html += '<div class="shelf-book-progress">' + b.progress + '%</div>'
      } else if (b.rating) {
        html += '<div class="shelf-book-stars">'
        for (let s = 1; s <= 5; s++) {
          html += '<span class="' + (s <= b.rating ? 'star-on' : 'star-off') + '">' + (s <= b.rating ? '\u2605' : '\u2606') + '</span>'
        }
        html += '</div>'
      }
      if (b.status === 'finished' && b.finishedAt) {
        html += '<div class="shelf-book-finished-date">' + esc(widgets.bookshelf.finishedDate.replace('{date}', formatFinishedDate(b.finishedAt))) + '</div>'
      }
      html += '</li>'
    })
    shelfRow.innerHTML = html
  }

  installImageFallbacks(shelfRow)

  document.getElementById('cardBooks')?.classList.remove('is-loading')
}

export function updateStarredRepos(repos: AdaptedStarredRepo[] | null | undefined, freshness?: Freshness): void {
  const card = document.getElementById('cardStarredRepos')
  if (!card) {
    return
  }
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (isSuppressedCard(card)) {
    return
  }
  // null or undefined: the export could not be read. The card keeps what it
  // shows; only a successful empty result ([]) empties it.
  if (repos == null) {
    return
  }

  // Empty state: the shared placeholder replaces `.widget-body` (destroying
  // `.gh-starred-list`), so the populated path recreates the list on an
  // empty -> populated transition.
  if (repos.length === 0) {
    renderWidgetEmpty('cardStarredRepos', {message: widgets.starredRepos.empty})
    return
  }

  const body = card.querySelector('.widget-body')
  if (!body) {
    return
  }
  revealLiveData(card, freshness?.state ?? 'live', {generatedAt: freshness?.generatedAt})
  let list = card.querySelector('.gh-starred-list')
  if (!list) {
    body.innerHTML = '<div class="gh-starred-list"></div>'
    list = card.querySelector('.gh-starred-list')
  }
  if (!list) {
    return
  }

  let html = ''
  repos.forEach((repo) => {
    const color = LANG_COLORS[repo.language] || repo.languageColor || '#8b949e'
    html += '<div class="gh-sl-row">'
    // Only an https repository URL becomes an href (shared with the template).
    const href = safeHttpsUrl(repo.url)
    html += '<a class="gh-sl-name"' + (href ? ' href="' + esc(href) + '"' : '') +
      ' target="_blank" rel="noopener noreferrer" data-sa-link-event="repo_click">'
    html += '<span class="gh-sl-owner">' + esc(repo.owner) + '/</span>' + esc(repo.name)
    html += '</a>'
    html += '<span class="gh-sl-stars">&#9733; ' + repo.stars.toLocaleString('en-US') + '</span>'
    html += '<span class="gh-sl-lang">'
    html += '<span class="gh-sl-lang-dot" style="background: ' + color + ';"></span>'
    html += esc(repo.language)
    html += '</span>'
    html += timeHtml('gh-sl-date', repo.starredAt, repo.datetime)
    html += '</div>'
  })
  list.innerHTML = html

  card.classList.remove('is-loading')
}
