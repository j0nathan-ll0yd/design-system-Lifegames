// Movement Rings widget + Heart Rate footer-vitals strip updaters.
// Live-data dispatcher (live-data.ts) calls these from its `health` branch.
import {a11y, widgets} from '@j0nathan-ll0yd/copy'
import type {AdaptedHealth} from './adapters'
import {revealLiveData} from './updater-empty'
import {formatMeasurement, NO_READING} from './widget-state'

// Default goals — kept in sync with MovementRings.astro SSR defaults.
const DEFAULT_MOVE_KCAL = 500
const DEFAULT_EXERCISE_MIN = 30
const DEFAULT_STAND_HR = 12
const DEFAULT_DAYLIGHT_MIN = 20

// SVG ring geometry — mirrors MovementRings.astro SSR (r=60/44/28).
const RING_RADII = {move: 60, exercise: 44, stand: 28} as const

function circumference(radius: number): number {
  return 2 * Math.PI * radius
}

function offset(circ: number, pct: number): number {
  const visual = Math.min(1, Math.max(0, pct))
  return circ * (1 - visual)
}

function setRingProgress(id: string, radius: number, pct: number): void {
  const el = document.getElementById(id)
  if (!el) {
    return
  }
  const circ = circumference(radius)
  el.setAttribute('stroke-dasharray', circ.toFixed(2))
  el.setAttribute('stroke-dashoffset', offset(circ, pct).toFixed(2))
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id)
  if (el) {
    el.textContent = text
  }
}

// The ring group's accessible name, composed from the same `a11y.movement.rings`
// template the SSR path uses (MovementRings.astro), so the two cannot drift.
// Percentages are unclamped to match it: the centre readout clamps to 100%
// because a ring cannot overdraw, but the ANNOUNCED value stays truthful at 107%.
// A ring whose measurement the export did not carry reads "no reading".
function ringsLabel(move: number | null, exercise: number | null, stand: number | null): string {
  const pct = (fraction: number | null): string => (fraction == null ? widgets.widgetState.noReading : Math.round(fraction * 100) + '%')
  return a11y.movement.rings.replace('{calories}%', pct(move)).replace('{exercise}%', pct(exercise)).replace('{stand}%', pct(stand))
}

/**
 * Update MovementRings widget (cardMovement) from AdaptedHealth.
 * Reads stepCount / distanceWalkingRunning / flightsClimbed,
 * activeEnergyBurned / exerciseTime / standTime; normalises Stand
 * min -> hr if HealthKit shipped minutes; computes ring progress
 * fractions against the server-synced goals (fallback: SSR defaults)
 * and applies via stroke-dashoffset. Also refreshes the daylight
 * caption (+ goal-met badge) and the solar sun-arc footer.
 */
export function updateMovementRings(data: AdaptedHealth): void {
  const card = document.getElementById('cardMovement')
  if (!card) {
    return
  }
  // Empty (no movement measured, or every measurement a recorded zero): a card
  // the server rendered empty keeps its empty notice; nothing is revealed.
  const q0 = data.quantities
  const measured = [q0.stepCount, q0.distanceWalkingRunning, q0.activeEnergyBurned, q0.exerciseTime].filter((m) => m != null)
  if (measured.every((m) => m?.value === 0) && card.querySelector('[data-state-notice="empty"]')) {
    card.classList.remove('is-loading')
    return
  }
  revealLiveData(card)

  // Paused state: watch worn=false means the watch is off wrist or charging.
  // CSS controls visibility: is-paused on the card hides .mv-data and shows .mv-paused.
  // We still remove is-loading (D-SMOKE: hydration must complete regardless).
  // Update copy in case source (charging vs hrGap) changes on re-poll.
  const isPaused = data.watch?.worn === false
  const isCharging = data.watch?.source === 'charging'

  if (isPaused) {
    const labelEl = document.getElementById('mvPausedLabel')
    if (labelEl) {
      labelEl.textContent = isCharging
        ? widgets.movement.paused.labelCharging
        : widgets.movement.paused.label
    }
    const descEl = document.getElementById('mvPausedDesc')
    if (descEl) {
      descEl.textContent = isCharging
        ? widgets.movement.paused.descriptionCharging
        : widgets.movement.paused.description
    }
    card.classList.add('is-paused')
    card.classList.remove('is-loading')
    return
  }

  // Not paused — remove is-paused so CSS reveals the data content (recovery path).
  card.classList.remove('is-paused')

  const q = data.quantities

  // Goals — server-synced values from health.json's `goals` object. The object is
  // absent on legacy payloads and each field is null until the device's first
  // goals sync, so fall back per-field to the SSR defaults.
  const goals = {
    moveKcal: data.goals?.moveKcal ?? DEFAULT_MOVE_KCAL,
    exerciseMin: data.goals?.exerciseMin ?? DEFAULT_EXERCISE_MIN,
    standHr: data.goals?.standHr ?? DEFAULT_STAND_HR,
    daylightMin: data.goals?.daylightMin ?? DEFAULT_DAYLIGHT_MIN
  }

  // A quantity the export did not carry is null — no reading, never 0.
  const round = (v: number | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)
  const moveVal = round(q.activeEnergyBurned?.value)
  const exerciseVal = round(q.exerciseTime?.value)

  // Stand: prefer the achieved ring count (`standHours`, synced from
  // HKActivitySummary — the watch ring's own metric). Legacy payloads without
  // it fall back to standTime, where HealthKit ships minutes and the UI shows
  // hours (an approximation: minutes stood ≠ hours credited).
  const standRaw = q.standTime
  const standHours: number | null = q.standHours
    ? Math.floor(q.standHours.value)
    : standRaw
    ? standRaw.unit === 'min'
      ? Math.floor(standRaw.value / 60)
      : Math.floor(standRaw.value)
    : null

  const frac = (v: number | null, goal: number): number | null => (v == null ? null : goal > 0 ? v / goal : 0)
  const movePct = frac(moveVal, goals.moveKcal)
  const exercisePct = frac(exerciseVal, goals.exerciseMin)
  const standPct = frac(standHours, goals.standHr)

  setRingProgress('ringMove', RING_RADII.move, movePct ?? 0)
  setRingProgress('ringExercise', RING_RADII.exercise, exercisePct ?? 0)
  setRingProgress('ringStand', RING_RADII.stand, standPct ?? 0)

  setText('ringCenterPct', movePct == null ? NO_READING : Math.round(Math.min(movePct, 1) * 100) + '%')

  // The ring group's accessible name carries the same three percentages the rings
  // draw, and it is the ONLY place a screen reader hears them. On an `output: 'static'`
  // consumer the SSR label is frozen at BUILD time while these rings repaint on every
  // poll, so leaving it alone announces stale numbers over live rings — worse than no
  // name at all, because it is confidently wrong.
  //
  // Not needed on the paused path above: `#cardMovement.is-paused .mv-data` is
  // `display: none`, so the rings leave the accessibility tree entirely.
  const ringsSvg = card.querySelector('.mv-rings svg[role="img"]')
  if (ringsSvg) {
    ringsSvg.setAttribute('aria-label', ringsLabel(movePct, exercisePct, standPct))
    // The server hides the value-free rings from assistive tech; live values name them.
    ringsSvg.removeAttribute('aria-hidden')
  }

  // Chips: steps · distance · flights
  const steps = round(q.stepCount?.value)
  const distanceM = q.distanceWalkingRunning?.value
  const flights = round(q.flightsClimbed?.value)

  const stepsEl = card.querySelector<HTMLElement>('[data-mv-metric="steps"]')
  if (stepsEl) {
    stepsEl.textContent = formatMeasurement(steps, (n) => n.toLocaleString('en-US'))
  }

  const distEl = card.querySelector<HTMLElement>('[data-mv-metric="distance"]')
  if (distEl) {
    // Preserve the trailing unit span when we rewrite the value
    distEl.innerHTML = formatMeasurement(distanceM, (n) => (n / 1000).toFixed(1)) + '<span class="mv-chip-unit">km</span>'
  }

  const flightsEl = card.querySelector<HTMLElement>('[data-mv-metric="flights"]')
  if (flightsEl) {
    flightsEl.textContent = formatMeasurement(flights)
  }

  // Legend totals (goals are configuration; the measurement may be no reading)
  setText('legendMove', formatMeasurement(moveVal) + '/' + goals.moveKcal)
  setText('legendExercise', formatMeasurement(exerciseVal) + '/' + goals.exerciseMin)
  setText('legendStand', formatMeasurement(standHours) + '/' + goals.standHr)

  // Daylight caption — an absent timeInDaylight quantity is no reading, never 0.
  const daylightMin = round(q.timeInDaylight?.value)
  setText('mvDaylightMin', formatMeasurement(daylightMin))
  const daylightHitEl = document.getElementById('mvDaylightHit')
  if (daylightHitEl) {
    daylightHitEl.hidden = daylightMin == null || daylightMin < goals.daylightMin
  }

  // Sun-arc footer — solar facts are server-computed. When absent, nothing is
  // invented: the times read as no reading and the sun dot is hidden.
  const sunDot = document.getElementById('mvSunDot')
  if (data.solar) {
    setText('mvSunrise', data.solar.sunriseHHmm)
    setText('mvSunset', data.solar.sunsetHHmm)
    if (sunDot) {
      const pct = Math.min(100, Math.max(0, data.solar.currentProgressPct))
      sunDot.style.left = pct + '%'
      sunDot.style.display = ''
    }
  } else {
    setText('mvSunrise', NO_READING)
    setText('mvSunset', NO_READING)
    if (sunDot) {
      sunDot.style.display = 'none'
    }
  }

  card.classList.remove('is-loading')
}

/**
 * Update the HeartRate widget's 3-up footer vitals strip
 * (RHR · RR · Temp). Renders '—' when a field is absent or zero.
 */
export function updateHeartRateFooter(data: AdaptedHealth): void {
  const q = data.quantities

  // Unit spans are static siblings in the DOM — only update the value text.
  const rhr = q.restingHeartRate
  const fmtRhr = rhr && rhr.value > 0 ? String(Math.round(rhr.value)) : '—'
  const rhrEl = document.getElementById('hrFooterRhr')
  if (rhrEl) {
    rhrEl.textContent = fmtRhr
  }

  const rr = q.respiratoryRate
  const fmtRr = rr && rr.value > 0 ? String(Math.round(rr.value)) : '—'
  const rrEl = document.getElementById('hrFooterRr')
  if (rrEl) {
    rrEl.textContent = fmtRr
  }

  const tempDelta = q.wristTemperatureDelta
  let fmtTemp = '—'
  if (tempDelta && Number.isFinite(tempDelta.value)) {
    const v = tempDelta.value
    const sign = v > 0 ? '+' : ''
    fmtTemp = sign + v.toFixed(1)
  }
  const tempEl = document.getElementById('hrFooterTemp')
  if (tempEl) {
    tempEl.textContent = fmtTemp
  }
}
