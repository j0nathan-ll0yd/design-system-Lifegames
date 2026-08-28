import {a11y, widgets} from '@j0nathan-ll0yd/copy'
import {classifyHeartRate, classifyHRV} from './heart-rate'
import {HYDRATION} from './constants'
import {withViewTransition} from './view-transition'
import type {AdaptedArticle, AdaptedBooks, AdaptedGithubEvent, AdaptedHealth, AdaptedSleep, AdaptedStarredRepo, BookMeta, WorkoutEntry} from './adapters'
import {LANG_COLORS} from './constants'
import type {LocationExport} from './location-types'
import {imgFallbackAttrs, installImageFallbacks, localizeImageUrl, PLACEHOLDER_IMAGE_SRC, sanitizeImageUrl} from './image-utils'
import {renderWidgetEmpty} from './updater-empty'

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

import {esc} from './html-utils'
export { esc }

export function updateHeartRate(data: AdaptedHealth): void {
  // Guard the quantity access: on an empty dashboard `quantities` is `{}`, so
  // heartRate/hrvSDNN are absent. Unguarded `.value` here would throw and abort
  // the whole health update chain (movement + hydration never run, leaving their
  // SSR baseline). Absent data renders the no-data dash, matching the footer.
  const hrRaw = data.quantities.heartRate?.value
  const hrvRaw = data.quantities.hrvSDNN?.value
  const hr = typeof hrRaw === 'number' ? Math.round(hrRaw) : 0
  const hrv = typeof hrvRaw === 'number' ? Math.round(hrvRaw) : 0
  const hasHr = hr > 0
  const zone = classifyHeartRate(hr)
  const hrvStyle = classifyHRV(hrv)

  const card = document.getElementById('cardHR')

  // Paused state: watch worn=false means the watch is off wrist or charging.
  // CSS controls visibility: is-paused on the card hides .hr-data and shows .hr-paused.
  // We still remove is-loading (D-SMOKE: hydration must complete regardless).
  // Update copy in case source (charging vs hrGap) changes on re-poll.
  const isCharging = data.watch?.source === 'charging'
  const isPaused = data.watch?.worn === false

  if (isPaused) {
    const labelEl = document.getElementById('hrPausedLabel')
    if (labelEl) {
      labelEl.textContent = isCharging
        ? widgets.heartRate.paused.labelCharging
        : widgets.heartRate.paused.label
    }
    const descEl = document.getElementById('hrPausedDesc')
    if (descEl) {
      descEl.textContent = isCharging
        ? widgets.heartRate.paused.descriptionCharging
        : widgets.heartRate.paused.description
    }
    card?.classList.add('is-paused')
    card?.classList.remove('is-loading')
    return
  }

  // Not paused — remove is-paused so CSS reveals the data content (recovery path).
  card?.classList.remove('is-paused')

  const bpm = document.getElementById('pulseBpm')
  if (bpm) {
    bpm.textContent = hasHr ? String(hr) : '—'
    bpm.style.color = zone.bpmColor
    bpm.style.textShadow = zone.bpmShadow
  }

  const badge = document.getElementById('hrZoneBadge')
  if (badge) {
    badge.textContent = hasHr ? zone.zone : '—'
    badge.style.color = zone.badgeColor
    badge.style.background = zone.badgeBg
    badge.style.border = '1px solid ' + zone.badgeBorder
  }

  const hrvEl = document.getElementById('hrHrvValue')
  if (hrvEl) {
    hrvEl.textContent = typeof hrvRaw === 'number' ? String(hrv) : '—'
    hrvEl.style.color = hrvStyle.color
    hrvEl.style.textShadow = hrvStyle.shadow
  }

  // Update canvas ECG parameters
  const ecgUpdate = (window as any).__ecgUpdate
  if (typeof ecgUpdate === 'function') {
    ecgUpdate(hr, hrv, zone.ecgStroke)
  }

  const ecgBg = document.getElementById('hrEcgBg')
  if (ecgBg) {
    ecgBg.style.opacity = String(zone.ecgOpacity)
  }

  if (card) {
    card.classList.remove(...ACCENT_CLASSES)
    card.classList.add(zone.accentClass)
    card.classList.remove('is-loading')
  }
}

export function updateWorkouts(data: WorkoutEntry[] | null): void {
  const card = document.getElementById('cardWorkouts')
  if (!card) {
    return
  }

  if (!data || data.length === 0) {
    return
  }

  const body = card.querySelector('.widget-body')
  if (!body) {
    return
  }

  card.style.display = ''

  function fmtDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.round(seconds % 60)
    if (h > 0) {
      return h + 'h ' + m + 'm'
    }
    return m + 'm' + (s > 0 ? ' ' + s + 's' : '')
  }

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
    html += w.activityUrl
      ? '<a class="workout-sub-type" href="' + esc(w.activityUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(w.activityType) + '</a>'
      : '<div class="workout-sub-type">' + esc(w.activityType) + '</div>'
    html += '</div>'
    html += '<div class="workout-sub-stats">'
    html += '<div class="workout-stat"><div class="workout-stat-label">' +
      widgets.workouts.duration +
      '</div><div class="workout-stat-value">' +
      fmtDuration(w.duration ?? 0) +
      '</div></div>'
    html += '<div class="workout-stat"><div class="workout-stat-label">' +
      widgets.workouts.calories +
      '</div><div class="workout-stat-value">' +
      Math.round(w.energyBurned ?? 0) +
      ' ' +
      widgets.workouts.caloriesUnit +
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
}

export function updateNightSummary(data: AdaptedSleep): void {
  if (data.isEmpty) {
    const duration = document.getElementById('sleepDuration')
    if (duration) {
      duration.textContent = '--'
    }

    const scoreVal = document.getElementById('sleepScoreVal')
    if (scoreVal) {
      scoreVal.textContent = '--'
    }

    const scoreFill = document.getElementById('sleepScoreFill') as HTMLElement | null
    if (scoreFill) {
      scoreFill.style.width = '0%'
    }

    const phases = ['deep', 'rem', 'core', 'awake']
    phases.forEach((phase) => {
      const pill = document.querySelector(`[data-phase="${phase}"]`)
      if (pill) {
        const val = pill.querySelector('.sleep-moon-pill-val')
        if (val) {
          val.textContent = '--'
        }
      }
    })

    const insight = document.getElementById('sleepInsight')
    if (insight) {
      insight.innerHTML = `<span class="sleep-insight-empty">${widgets.nightSummary.empty}</span>`
    }

    const timestamp = document.getElementById('sleepTimestamp')
    if (timestamp) {
      timestamp.textContent = 'no data'
    }

    document.getElementById('cardSleep')?.classList.remove('is-loading')
    return
  }

  const duration = document.getElementById('sleepDuration')
  if (duration) {
    duration.textContent = data.sleepDurationFormatted
  }

  const scoreVal = document.getElementById('sleepScoreVal')
  if (scoreVal) {
    scoreVal.textContent = String(data.sleepScore)
  }

  const scoreFill = document.getElementById('sleepScoreFill') as HTMLElement | null
  if (scoreFill) {
    scoreFill.style.width = data.sleepScore + '%'
  }

  const phases = ['deep', 'rem', 'core', 'awake']
  phases.forEach((phase) => {
    const pill = document.querySelector(`[data-phase="${phase}"]`)
    if (pill) {
      const val = pill.querySelector('.sleep-moon-pill-val')
      if (val) {
        val.textContent = data.sleepPhaseFormatted[phase] ?? ''
      }
    }
  })

  const insight = document.getElementById('sleepInsight')
  if (insight) {
    // Source the words from copy; split the ICU template on the em-dash to keep
    // the percentage clauses in their own styled <span>s (mirrors NightSummary.astro).
    const clauses = widgets.nightSummary.restorative.split('—').map((c) => c.trim())
    const deepClause = (clauses[0] ?? '').replace('{deep}', String(data.derived.deepPct))
    const remClause = (clauses[1] ?? '').replace('{rem}', String(data.derived.remPct))
    const tailClause = clauses[2] ?? ''
    insight.innerHTML = '<span>' + deepClause + '</span> &mdash; <span>' + remClause + '</span> &mdash; ' + tailClause
  }

  const timestamp = document.getElementById('sleepTimestamp')
  if (timestamp) {
    timestamp.textContent = widgets.nightSummary.timestampLastNight
  }

  document.getElementById('cardSleep')?.classList.remove('is-loading')
}

export function updateHydration(data: AdaptedHealth): void {
  const waterOz = data.hydration.waterOz
  const caffeineMg = data.hydration.caffeineMg

  const waterLiq = document.getElementById('hydraWaterLiq')
  if (waterLiq) {
    const waterPct = Math.min(waterOz / HYDRATION.waterMax, 1) * 100
    waterLiq.style.clipPath = 'inset(' + (100 - waterPct) + '% 0 0 0)'
  }

  const waterVal = document.getElementById('hydraWaterVal') as HTMLElement | null
  if (waterVal) {
    waterVal.dataset.liveUpdated = '1'
    waterVal.textContent = waterOz + ' oz'
  }

  const coffeeLiq = document.getElementById('hydraCoffeeLiq')
  if (coffeeLiq) {
    const caffeinePct = Math.min(caffeineMg / HYDRATION.caffeineMax, 1) * 100
    coffeeLiq.style.clipPath = 'inset(' + (100 - caffeinePct) + '% 0 0 0)'
  }

  const coffeeVal = document.getElementById('hydraCoffeeVal') as HTMLElement | null
  if (coffeeVal) {
    coffeeVal.dataset.liveUpdated = '1'
    coffeeVal.textContent = caffeineMg + ' mg'
  }

  const coffeeLabel = document.getElementById('hydraCoffeeLabel')
  if (coffeeLabel) {
    coffeeLabel.textContent = widgets.hydration.caffeine
  }

  document.getElementById('cardHydration')?.classList.remove('is-loading')
}

export function updateDevActivityLog(events: AdaptedGithubEvent[]): void {
  const card = document.getElementById('cardDevLog')
  if (!card) {
    return
  }

  const body = card.querySelector('.widget-body')
  if (!body) {
    return
  }

  if (!events || events.length === 0) {
    body.innerHTML = '<div class="widget-empty">' + esc(widgets.devLog.empty) + '</div>'
    card.classList.remove('is-loading')
    return
  }

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
    if (e.type === 'commit' && e.hash) {
      detail = '<span style="color:var(--neon-green)">+' +
        (e.additions || 0) +
        '</span> <span style="color:var(--neon-red)">-' +
        (e.deletions || 0) +
        '</span>'
    } else if (e.number !== undefined) {
      detail = '#' + e.number
    }

    if (e.url) {
      html += '<a class="gh-dal-line" href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer">'
    } else {
      html += '<a class="gh-dal-line">'
    }
    html += '<span class="gh-dal-icon" style="color: ' + icon.color + ';">' + icon.symbol + '</span>'
    html += '<span class="gh-dal-repo">' + esc(e.repo) + '</span>'
    html += '<span class="gh-dal-title">' + esc(e.title) + '</span>'
    if (detail) {
      html += '<span class="gh-dal-detail">' + detail + '</span>'
    }
    html += '<span class="gh-dal-date">' + esc(e.date) + '</span>'
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

export function updateReadingFeed(articles: AdaptedArticle[]): void {
  const card = document.getElementById('cardReading')
  if (!card) {
    return
  }

  const body = card.querySelector('.widget-body')
  if (!body) {
    return
  }

  if (!articles || articles.length === 0) {
    body.innerHTML = '<div class="widget-empty">' + esc(widgets.readingFeed.empty) + '</div>'
    card.classList.remove('is-loading')
    return
  }

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
      if (a.url) {
        html += '<a class="article-list-title" href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer">' + esc(titleText) + '</a>'
      } else {
        html += '<span class="article-list-title">' + esc(titleText) + '</span>'
      }
      if (a.title) {
        html += '<span class="article-list-source">(' + esc(a.source) + ')</span>'
      }
      html += '<span class="article-list-date">' + esc(a.date) + '</span>'
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

export function updateSystemStatus(timestamps: Record<string, string | null>): void {
  const container = document.getElementById('systemStatus')
  if (!container) {
    return
  }

  var SOURCE_LINE_COLORS: Record<string, string> = {
    health: 'red',
    sleep: 'purple',
    location: 'blue',
    books: 'amber',
    articles: 'amber',
    theatreReviews: 'yellow'
  }

  const lines = container.querySelectorAll('.sys-line')
  lines.forEach((line) => {
    const source = (line as HTMLElement).dataset.source
    if (!source) {
      return
    }

    const dot = line.querySelector('.sys-dot')
    const valEl = line.querySelector('[class*="sys-val"]')
    const keyEl = line.querySelector('[class*="sys-key"]')
    if (!dot || !valEl) {
      return
    }

    const ts = timestamps[source]
    if (ts) {
      const ago = formatRelativeTime(ts)
      const lineColor = SOURCE_LINE_COLORS[source] || 'green'
      dot.className = 'sys-dot sys-dot-' + lineColor
      if (keyEl) {
        keyEl.className = 'sys-key sys-key-' + lineColor
      }
      valEl.className = 'sys-val-green'
      // Copy stores natural case ('Active'); this site renders all-caps with no
      // CSS transform, so uppercase at the call site to preserve the pixels.
      valEl.innerHTML = widgets.systemStatus.valueActive.toUpperCase() + ' <span class="sys-val">(' + ago + ')</span>'
    } else {
      dot.className = 'sys-dot sys-dot-red'
      if (keyEl) {
        keyEl.className = 'sys-key'
      }
      valEl.className = 'sys-val-red'
      // Copy stores natural case ('Offline'); uppercase at the call site (no CSS transform here).
      valEl.textContent = widgets.systemStatus.valueOffline.toUpperCase()
    }
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
  if (!listEl || data.topPlaces.length === 0) {
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

export function formatFinishedDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {month: 'short', year: 'numeric'}).format(new Date(isoString))
}

export function formatRelativeTime(isoString: string): string {
  const msAgo = Date.now() - new Date(isoString).getTime()
  const minutesAgo = Math.max(0, Math.floor(msAgo / 60000))
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

const buildTimeLocalCoverCandidates = new WeakMap<Element, ReadonlySet<string>>()

/** Capture the exact URLs with committed files before live updates mutate SSR. */
function localCoverCandidates(card: Element): ReadonlySet<string> {
  const captured = buildTimeLocalCoverCandidates.get(card)
  if (captured) {
    return captured
  }

  const candidates = new Set<string>()
  card.querySelectorAll<HTMLElement>('.shelf-book[data-local-cover]').forEach((book) => {
    try {
      const values: unknown = JSON.parse(book.dataset.localCover || '[]')
      if (!Array.isArray(values)) {
        return
      }
      values.forEach((value) => {
        if (typeof value !== 'string') {
          return
        }
        const sanitized = sanitizeImageUrl(value, {onReject: 'omit'})
        if (sanitized) {
          candidates.add(sanitized)
        }
      })
    } catch {
      // Malformed availability metadata means no candidate is assumed local.
    }
  })
  buildTimeLocalCoverCandidates.set(card, candidates)
  return candidates
}

function displayCoverCandidate(candidate: string | null | undefined, localCandidates: ReadonlySet<string>): string | null {
  const sanitized = sanitizeImageUrl(candidate, {onReject: 'omit'})
  if (!sanitized) {
    return null
  }
  return localCandidates.has(sanitized)
    ? localizeImageUrl(sanitized, {onReject: 'omit'})
    : sanitized
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

export function updateBookshelf(data: AdaptedBooks): void {
  const card = document.getElementById('cardBooks')
  if (!card) {
    return
  }
  const localCandidates = localCoverCandidates(card)

  // Empty state: render the shared two-line placeholder. This replaces
  // `.widget-body` (destroying #dashShelfRow), so the populated path below
  // recreates the shelf row on an empty -> populated transition.
  if (!data.books || data.books.length === 0) {
    renderWidgetEmpty('cardBooks', {title: widgets.bookshelf.emptyTitle, body: widgets.bookshelf.emptyBody})
    return
  }

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

export function updateStarredRepos(repos: AdaptedStarredRepo[]): void {
  const card = document.getElementById('cardStarredRepos')
  if (!card) {
    return
  }

  if (!repos || repos.length === 0) {
    const body = card.querySelector('.widget-body')
    if (body) {
      body.innerHTML = '<div class="widget-empty">' + esc(widgets.starredRepos.empty) + '</div>'
    }
    card.classList.remove('is-loading')
    return
  }

  const list = card.querySelector('.gh-starred-list')
  if (!list) {
    return
  }

  let html = ''
  repos.forEach((repo) => {
    const color = LANG_COLORS[repo.language] || repo.languageColor || '#8b949e'
    html += '<div class="gh-sl-row">'
    html += '<a class="gh-sl-name" href="' + esc(repo.url) + '" target="_blank" rel="noopener noreferrer" data-sa-link-event="repo_click">'
    html += '<span class="gh-sl-owner">' + esc(repo.owner) + '/</span>' + esc(repo.name)
    html += '</a>'
    html += '<span class="gh-sl-stars">&#9733; ' + repo.stars.toLocaleString() + '</span>'
    html += '<span class="gh-sl-lang">'
    html += '<span class="gh-sl-lang-dot" style="background: ' + color + ';"></span>'
    html += esc(repo.language)
    html += '</span>'
    html += '<span class="gh-sl-date">' + esc(repo.starredAt) + '</span>'
    html += '</div>'
  })
  list.innerHTML = html

  card.classList.remove('is-loading')
}
