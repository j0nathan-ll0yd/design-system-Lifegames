// Movement Rings widget + Heart Rate footer-vitals strip updaters.
// Live-data dispatcher (live-data.ts) calls these from its `health` branch.
import {widgets} from '@j0nathan-ll0yd/copy'
import type {AdaptedHealth} from './adapters'
import type {Freshness} from './freshness'
import {esc} from './html-utils'
import {insertStateNotice, isSuppressedCard, revealLiveData} from './updater-empty'
import {movementEmptyHtml} from './widget-markup'
import {type HeartRateView, heartRateView, movementView, type RingStroke} from './widget-views'
import type {MovementRingsProps} from '../widgets/health/MovementRings.types'

function setText(id: string, text: string): void {
  const el = document.getElementById(id)
  if (el) {
    el.textContent = text
  }
}

function setRing(id: string, stroke: RingStroke): void {
  const el = document.getElementById(id)
  if (el) {
    el.setAttribute('stroke-dasharray', stroke.dasharray)
    el.setAttribute('stroke-dashoffset', stroke.dashoffset)
  }
}

/** MovementRings' props from adapter output and the export's freshness. */
function movementProps(data: AdaptedHealth, freshness: Freshness | undefined): MovementRingsProps {
  return {
    state: freshness?.state,
    generatedAt: freshness?.generatedAt,
    health: {quantities: data.quantities, goals: data.goals, solar: data.solar, watch: data.watch}
  }
}

/**
 * Update MovementRings (cardMovement) from adapter output. The card takes the
 * state and every slot the server renders for the same input (movementView):
 * a paused watch keeps the data state with the paused copy and no value; no
 * movement measured, or every measurement a recorded zero, is `empty`;
 * otherwise the data state (`live`, or `stale` from `freshness`) with the
 * rings against the server-synced goals (defaults until the first sync), the
 * chips, the legend, the daylight caption and the sun-arc footer. A missing
 * measurement reads as no reading, never 0. `freshness` is the health
 * export's; omitted, the card records `live`.
 */
export function updateMovementRings(data: AdaptedHealth, freshness?: Freshness): void {
  const card = document.getElementById('cardMovement')
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (!card || isSuppressedCard(card)) {
    return
  }
  const view = movementView(movementProps(data, freshness))
  if (view.isEmpty) {
    revealLiveData(card, 'empty')
    // The server's empty notice sits after the skeleton, before the paused block.
    insertStateNotice(card, movementEmptyHtml())
  } else {
    revealLiveData(card, view.state === 'stale' ? 'stale' : 'live', {generatedAt: freshness?.generatedAt})
  }
  card.querySelectorAll<HTMLElement>('[data-state-scaffold]').forEach((s) => {
    s.hidden = view.scaffoldHidden
  })
  // CSS controls the paused block: .is-paused hides .mv-data and shows .mv-paused.
  card.classList.toggle('is-paused', view.paused)
  setText('mvPausedLabel', view.pausedLabel)
  setText('mvPausedDesc', view.pausedDescription)

  setRing('ringMove', view.rings.move)
  setRing('ringExercise', view.rings.exercise)
  setRing('ringStand', view.rings.stand)
  setText('ringCenterPct', view.centerText)

  // The ring group's accessible name carries the same three percentages the
  // rings draw; a card that shows no value hides the value-free rings.
  const ringsSvg = card.querySelector('.mv-rings svg[role="img"]')
  if (ringsSvg) {
    if (view.ringsLabel != null) {
      ringsSvg.setAttribute('aria-label', view.ringsLabel)
      ringsSvg.removeAttribute('aria-hidden')
    } else {
      ringsSvg.removeAttribute('aria-label')
      ringsSvg.setAttribute('aria-hidden', 'true')
    }
  }

  const stepsEl = card.querySelector<HTMLElement>('[data-mv-metric="steps"]')
  if (stepsEl) {
    stepsEl.textContent = view.stepsText
  }
  const distEl = card.querySelector<HTMLElement>('[data-mv-metric="distance"]')
  if (distEl) {
    // Keep the trailing unit span when the value is rewritten.
    distEl.innerHTML = esc(view.distanceText) + '<span class="mv-chip-unit">' + esc(widgets.movement.distanceUnit) + '</span>'
  }
  const flightsEl = card.querySelector<HTMLElement>('[data-mv-metric="flights"]')
  if (flightsEl) {
    flightsEl.textContent = view.flightsText
  }

  setText('legendMove', view.legendMove)
  setText('legendExercise', view.legendExercise)
  setText('legendStand', view.legendStand)

  setText('mvDaylightMin', view.daylightText)
  setText('mvDaylightGoal', widgets.movement.daylightGoal.replace('{minutes}', String(view.goals.daylightMin)))
  const daylightHitEl = document.getElementById('mvDaylightHit')
  if (daylightHitEl) {
    daylightHitEl.hidden = !view.daylightHit
  }

  // Sun-arc footer: solar facts are server-computed; absent solar draws no dot.
  setText('mvSunrise', view.sunrise)
  setText('mvSunset', view.sunset)
  const sunDot = document.getElementById('mvSunDot')
  if (sunDot) {
    if (view.sunPct != null) {
      sunDot.style.left = view.sunPct + '%'
      sunDot.style.display = ''
    } else {
      sunDot.style.left = ''
      sunDot.style.display = 'none'
    }
  }

  card.classList.remove('is-loading')
}

/** Write HeartRate's footer vitals (RHR · RR · Temp) from its view. */
export function writeHeartRateFooter(view: HeartRateView): void {
  setText('hrFooterRhr', view.rhrText)
  setText('hrFooterRr', view.rrText)
  setText('hrFooterTemp', view.tempText)
}

/**
 * Update the HeartRate widget's 3-up footer vitals strip (RHR · RR · Temp)
 * with the slots the server renders for the same input (heartRateView): the
 * reading or '—', and nothing while the card shows no value (paused, empty,
 * unavailable). `freshness` is the health export's.
 */
export function updateHeartRateFooter(data: AdaptedHealth, freshness?: Freshness): void {
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (isSuppressedCard(document.getElementById('cardHR'))) {
    return
  }
  writeHeartRateFooter(
    heartRateView({state: freshness?.state, generatedAt: freshness?.generatedAt, health: {quantities: data.quantities, watch: data.watch}})
  )
}
