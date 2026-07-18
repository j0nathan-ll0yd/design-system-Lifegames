// Movement Rings widget + Heart Rate footer-vitals strip updaters.
// Live-data dispatcher (live-data.ts) calls these from its `health` branch.
import { widgets } from '@lifegames/copy';
import type { AdaptedHealth } from './adapters';

// Default goals — kept in sync with MovementRings.astro SSR defaults.
const DEFAULT_MOVE_KCAL = 500;
const DEFAULT_EXERCISE_MIN = 30;
const DEFAULT_STAND_HR = 12;
const DEFAULT_DAYLIGHT_MIN = 20;

// SVG ring geometry — mirrors MovementRings.astro SSR (r=60/44/28).
const RING_RADII = {
  move: 60,
  exercise: 44,
  stand: 28,
} as const;

function circumference(radius: number): number {
  return 2 * Math.PI * radius;
}

function offset(circ: number, pct: number): number {
  const visual = Math.min(1, Math.max(0, pct));
  return circ * (1 - visual);
}

function setRingProgress(id: string, radius: number, pct: number): void {
  const el = document.getElementById(id);
  if (!el) return;
  const circ = circumference(radius);
  el.setAttribute('stroke-dasharray', circ.toFixed(2));
  el.setAttribute('stroke-dashoffset', offset(circ, pct).toFixed(2));
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
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
  const card = document.getElementById('cardMovement');
  if (!card) return;

  // Paused state: watch worn=false means the watch is off wrist or charging.
  // CSS controls visibility: is-paused on the card hides .mv-data and shows .mv-paused.
  // We still remove is-loading (D-SMOKE: hydration must complete regardless).
  // Update copy in case source (charging vs hrGap) changes on re-poll.
  const isPaused = data.watch?.worn === false;
  const isCharging = data.watch?.source === 'charging';

  if (isPaused) {
    const labelEl = document.getElementById('mvPausedLabel');
    if (labelEl) {
      labelEl.textContent = isCharging
        ? widgets.movement.paused.labelCharging
        : widgets.movement.paused.label;
    }
    const descEl = document.getElementById('mvPausedDesc');
    if (descEl) {
      descEl.textContent = isCharging
        ? widgets.movement.paused.descriptionCharging
        : widgets.movement.paused.description;
    }
    card.classList.add('is-paused');
    card.classList.remove('is-loading');
    return;
  }

  // Not paused — remove is-paused so CSS reveals the data content (recovery path).
  card.classList.remove('is-paused');

  const q = data.quantities;

  // Goals — server-synced values from health.json's `goals` object. The object is
  // absent on legacy payloads and each field is null until the device's first
  // goals sync, so fall back per-field to the SSR defaults.
  const goals = {
    moveKcal: data.goals?.moveKcal ?? DEFAULT_MOVE_KCAL,
    exerciseMin: data.goals?.exerciseMin ?? DEFAULT_EXERCISE_MIN,
    standHr: data.goals?.standHr ?? DEFAULT_STAND_HR,
    daylightMin: data.goals?.daylightMin ?? DEFAULT_DAYLIGHT_MIN,
  };

  const moveVal = Math.round(q.activeEnergyBurned?.value ?? 0);
  const exerciseVal = Math.round(q.exerciseTime?.value ?? 0);

  // Stand: prefer the achieved ring count (`standHours`, synced from
  // HKActivitySummary — the watch ring's own metric). Legacy payloads without
  // it fall back to standTime, where HealthKit ships minutes and the UI shows
  // hours (an approximation: minutes stood ≠ hours credited).
  const standRaw = q.standTime;
  const standHours = q.standHours
    ? Math.floor(q.standHours.value)
    : standRaw
      ? standRaw.unit === 'min'
        ? Math.floor(standRaw.value / 60)
        : Math.floor(standRaw.value)
      : 0;

  const movePct = goals.moveKcal > 0 ? moveVal / goals.moveKcal : 0;
  const exercisePct = goals.exerciseMin > 0 ? exerciseVal / goals.exerciseMin : 0;
  const standPct = goals.standHr > 0 ? standHours / goals.standHr : 0;

  setRingProgress('ringMove', RING_RADII.move, movePct);
  setRingProgress('ringExercise', RING_RADII.exercise, exercisePct);
  setRingProgress('ringStand', RING_RADII.stand, standPct);

  setText('ringCenterPct', Math.round(Math.min(movePct, 1) * 100) + '%');

  // Chips: steps · distance · flights
  const steps = Math.round(q.stepCount?.value ?? 0);
  const distanceKm = ((q.distanceWalkingRunning?.value ?? 0) / 1000).toFixed(1);
  const flights = Math.round(q.flightsClimbed?.value ?? 0);

  const stepsEl = card.querySelector<HTMLElement>('[data-mv-metric="steps"]');
  if (stepsEl) stepsEl.textContent = steps.toLocaleString();

  const distEl = card.querySelector<HTMLElement>('[data-mv-metric="distance"]');
  if (distEl) {
    // Preserve the trailing unit span when we rewrite the value
    distEl.innerHTML = distanceKm + '<span class="mv-chip-unit">km</span>';
  }

  const flightsEl = card.querySelector<HTMLElement>('[data-mv-metric="flights"]');
  if (flightsEl) flightsEl.textContent = String(flights);

  // Legend totals
  setText('legendMove', moveVal + '/' + goals.moveKcal);
  setText('legendExercise', exerciseVal + '/' + goals.exerciseMin);
  setText('legendStand', standHours + '/' + goals.standHr);

  // Daylight caption — an absent timeInDaylight quantity means no daylight synced
  // yet today, so render 0 rather than leaving the SSR fixture value on screen.
  const daylightMin = q.timeInDaylight ? Math.round(q.timeInDaylight.value) : 0;
  setText('mvDaylightMin', String(daylightMin));
  const daylightHitEl = document.getElementById('mvDaylightHit');
  if (daylightHitEl) daylightHitEl.hidden = daylightMin < goals.daylightMin;

  // Sun-arc footer — solar facts are server-computed; when absent (legacy payload)
  // keep the SSR values since the client has nothing better to show.
  if (data.solar) {
    setText('mvSunrise', data.solar.sunriseHHmm);
    setText('mvSunset', data.solar.sunsetHHmm);
    const sunDot = document.getElementById('mvSunDot');
    if (sunDot) {
      const pct = Math.min(100, Math.max(0, data.solar.currentProgressPct));
      sunDot.style.left = pct + '%';
    }
  }

  card.classList.remove('is-loading');
}

/**
 * Update the HeartRate widget's 3-up footer vitals strip
 * (RHR · RR · Temp). Renders '—' when a field is absent or zero.
 */
export function updateHeartRateFooter(data: AdaptedHealth): void {
  const q = data.quantities;

  // Unit spans are static siblings in the DOM — only update the value text.
  const rhr = q.restingHeartRate;
  const fmtRhr = rhr && rhr.value > 0 ? String(Math.round(rhr.value)) : '—';
  const rhrEl = document.getElementById('hrFooterRhr');
  if (rhrEl) rhrEl.textContent = fmtRhr;

  const rr = q.respiratoryRate;
  const fmtRr = rr && rr.value > 0 ? String(Math.round(rr.value)) : '—';
  const rrEl = document.getElementById('hrFooterRr');
  if (rrEl) rrEl.textContent = fmtRr;

  const tempDelta = q.wristTemperatureDelta;
  let fmtTemp = '—';
  if (tempDelta && Number.isFinite(tempDelta.value)) {
    const v = tempDelta.value;
    const sign = v > 0 ? '+' : '';
    fmtTemp = sign + v.toFixed(1);
  }
  const tempEl = document.getElementById('hrFooterTemp');
  if (tempEl) tempEl.textContent = fmtTemp;
}
