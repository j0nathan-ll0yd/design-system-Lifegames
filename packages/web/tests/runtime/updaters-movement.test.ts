// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from 'vitest'
import {updateHeartRateFooter, updateMovementRings} from '../../src/runtime/updaters-movement'
import type {AdaptedHealth} from '../../src/runtime/adapters'
import {widgets} from '@lifegames/copy'

// ── helpers ───────────────────────────────────────────────────────────────────

function el(id: string): HTMLElement {
  const e = document.getElementById(id)
  if (!e) {
    throw new Error(`Missing element #${id}`)
  }
  return e as HTMLElement
}

function makeHealth(overrides: Partial<AdaptedHealth> = {}): AdaptedHealth {
  return {
    date: '2026-01-01',
    quantities: {
      stepCount: {value: 8000, unit: 'count'},
      distanceWalkingRunning: {value: 5200, unit: 'm'},
      flightsClimbed: {value: 12, unit: 'count'},
      activeEnergyBurned: {value: 400, unit: 'kcal'},
      exerciseTime: {value: 30, unit: 'min'},
      standTime: {value: 9, unit: 'hr'}
    },
    derived: {totalCalories: 2200, deepPct: 20, remPct: 25, corePct: 45},
    sleepScore: 85,
    sleepDurationFormatted: '7h 30m',
    sleepPhaseFormatted: {deep: '1h 30m', rem: '1h 52m', core: '3h 22m', awake: '15m'},
    hydration: {
      waterOz: 68,
      caffeineMg: 200,
      waterMax: 140,
      caffeineMax: 500,
      waterRangeLo: 74,
      waterRangeHi: 125,
      caffeineRangeLo: 200,
      caffeineRangeHi: 400
    },
    ...overrides
  }
}

// Minimal DOM required by updateMovementRings — mirrors SSR output:
// #mvPaused and .mv-data are siblings, always present in the DOM.
// CSS (not a style attribute) controls visibility via is-paused on #cardMovement.
const POPULATED_DOM = `
  <div id="cardMovement" class="tri-card is-loading">
    <div id="mvPaused">
      <span id="mvPausedLabel"></span>
      <span id="mvPausedDesc"></span>
    </div>
    <div class="mv-data">
      <circle id="ringMove"></circle>
      <circle id="ringExercise"></circle>
      <circle id="ringStand"></circle>
      <span id="ringCenterPct"></span>
      <span data-mv-metric="steps"></span>
      <span data-mv-metric="distance"></span>
      <span data-mv-metric="flights"></span>
      <span id="legendMove"></span>
      <span id="legendExercise"></span>
      <span id="legendStand"></span>
      <span id="mvDaylightMin"></span>
      <span id="mvDaylightHit"></span>
      <span id="mvSunrise"></span>
      <span id="mvSunset"></span>
      <div id="mvSunDot"></div>
    </div>
  </div>
`

// ── updateMovementRings — basic ───────────────────────────────────────────────

describe('updateMovementRings', () => {
  beforeEach(() => {
    document.body.innerHTML = POPULATED_DOM
  })

  it('removes is-loading from cardMovement', () => {
    updateMovementRings(makeHealth())
    expect(el('cardMovement').classList.contains('is-loading')).toBe(false)
  })

  it('sets steps chip text', () => {
    updateMovementRings(makeHealth())
    expect(document.querySelector('[data-mv-metric="steps"]')?.textContent).toBe('8,000')
  })

  it('sets legend move text', () => {
    updateMovementRings(makeHealth())
    expect(el('legendMove').textContent).toBe('400/500')
  })

  // ── server-synced goals ────────────────────────────────────────────────────
  // Regression: the live site rendered 103/500 · 0/30 while the device goals
  // were 650/40 — the updater ignored health.json's `goals` object entirely.

  describe('server-synced goals', () => {
    it('renders legend denominators and center pct from data.goals', () => {
      updateMovementRings(
        makeHealth({
          goals: {moveKcal: 650, exerciseMin: 40, standHr: 12, daylightMin: 20},
          quantities: {...makeHealth().quantities, activeEnergyBurned: {value: 103, unit: 'kcal'}, exerciseTime: {value: 0, unit: 'min'}}
        })
      )
      expect(el('legendMove').textContent).toBe('103/650')
      expect(el('legendExercise').textContent).toBe('0/40')
      expect(el('ringCenterPct').textContent).toBe('16%')
    })

    it('falls back to SSR defaults when the goals object is absent (legacy payload)', () => {
      updateMovementRings(makeHealth())
      expect(el('legendMove').textContent).toBe('400/500')
      expect(el('legendExercise').textContent).toBe('30/30')
      expect(el('legendStand').textContent).toBe('9/12')
      expect(el('ringCenterPct').textContent).toBe('80%')
    })

    it('falls back per-field when goal fields are null (pre-first-goals-sync)', () => {
      updateMovementRings(makeHealth({goals: {moveKcal: null, exerciseMin: null, standHr: null, daylightMin: 20}}))
      expect(el('legendMove').textContent).toBe('400/500')
      expect(el('legendExercise').textContent).toBe('30/30')
      expect(el('legendStand').textContent).toBe('9/12')
    })

    it('prefers the synced standHours ring count over the standTime derivation', () => {
      // Regression: watch ring 4/12 stand HOURS while standTime was 4 MINUTES —
      // the /60 derivation rendered 0/12.
      updateMovementRings(makeHealth({quantities: {...makeHealth().quantities, standTime: {value: 4, unit: 'min'}, standHours: {value: 4, unit: 'count'}}}))
      expect(el('legendStand').textContent).toBe('4/12')
    })

    it('floors stand minutes to hours against the synced stand goal', () => {
      updateMovementRings(
        makeHealth({
          goals: {moveKcal: 650, exerciseMin: 40, standHr: 14, daylightMin: 20},
          quantities: {...makeHealth().quantities, standTime: {value: 245, unit: 'min'}}
        })
      )
      expect(el('legendStand').textContent).toBe('4/14')
    })
  })

  // ── daylight caption ───────────────────────────────────────────────────────

  describe('daylight caption', () => {
    it('renders 0 when timeInDaylight is absent — never leaves SSR fixture text', () => {
      // Simulate SSR fixture bleed-through: the shell shipped "48" + a visible badge.
      el('mvDaylightMin').textContent = '48'
      updateMovementRings(makeHealth())
      expect(el('mvDaylightMin').textContent).toBe('0')
      expect(el('mvDaylightHit').hidden).toBe(true)
    })

    it('shows the goal-met badge when daylight >= goal', () => {
      updateMovementRings(makeHealth({quantities: {...makeHealth().quantities, timeInDaylight: {value: 48, unit: 'min'}}}))
      expect(el('mvDaylightMin').textContent).toBe('48')
      expect(el('mvDaylightHit').hidden).toBe(false)
    })

    it('hides the goal-met badge when daylight < goal', () => {
      updateMovementRings(makeHealth({quantities: {...makeHealth().quantities, timeInDaylight: {value: 5, unit: 'min'}}}))
      expect(el('mvDaylightMin').textContent).toBe('5')
      expect(el('mvDaylightHit').hidden).toBe(true)
    })
  })

  // ── solar sun-arc footer ───────────────────────────────────────────────────

  describe('solar sun-arc footer', () => {
    it('updates sunrise/sunset text and dot position from data.solar', () => {
      updateMovementRings(makeHealth({solar: {sunriseHHmm: '05:39', sunsetHHmm: '20:24', currentProgressPct: 81.6}}))
      expect(el('mvSunrise').textContent).toBe('05:39')
      expect(el('mvSunset').textContent).toBe('20:24')
      expect(el('mvSunDot').style.left).toBe('81.6%')
    })

    it('clamps the dot position to 0-100', () => {
      updateMovementRings(makeHealth({solar: {sunriseHHmm: '05:39', sunsetHHmm: '20:24', currentProgressPct: 140}}))
      expect(el('mvSunDot').style.left).toBe('100%')
    })

    it('leaves SSR solar values untouched when solar is absent', () => {
      el('mvSunrise').textContent = '06:30'
      el('mvSunset').textContent = '20:15'
      updateMovementRings(makeHealth())
      expect(el('mvSunrise').textContent).toBe('06:30')
      expect(el('mvSunset').textContent).toBe('20:15')
    })
  })

  // ── paused state ───────────────────────────────────────────────────────────

  describe('paused state (watch.worn === false)', () => {
    // GUARD TESTS: both blocks must exist in the DOM unconditionally.
    // If either is absent, the class-toggle silently no-ops — the exact bug that
    // shipped in the old ternary-branch SSR design.
    it('paused block #mvPaused is always present in the DOM regardless of watch state', () => {
      updateMovementRings(makeHealth())
      expect(document.getElementById('mvPaused')).not.toBeNull()
    })

    it('data container .mv-data is always present in the DOM regardless of watch state', () => {
      const data = makeHealth({watch: {worn: false, since: null, source: 'hrGap'}})
      updateMovementRings(data)
      expect(document.querySelector('.mv-data')).not.toBeNull()
    })

    it('shows hrGap label when source is hrGap', () => {
      const data = makeHealth({watch: {worn: false, since: null, source: 'hrGap'}})
      updateMovementRings(data)
      expect(el('mvPausedLabel').textContent).toBe(widgets.movement.paused.label)
    })

    it('shows charging label when source is charging', () => {
      const data = makeHealth({watch: {worn: false, since: null, source: 'charging'}})
      updateMovementRings(data)
      expect(el('mvPausedLabel').textContent).toBe(widgets.movement.paused.labelCharging)
    })

    it('shows charging description when source is charging', () => {
      const data = makeHealth({watch: {worn: false, since: null, source: 'charging'}})
      updateMovementRings(data)
      expect(el('mvPausedDesc').textContent).toBe(widgets.movement.paused.descriptionCharging)
    })

    it('adds is-paused class to cardMovement', () => {
      const data = makeHealth({watch: {worn: false, since: null, source: 'hrGap'}})
      updateMovementRings(data)
      expect(el('cardMovement').classList.contains('is-paused')).toBe(true)
    })

    it('does NOT add is-paused when watch is absent (worn)', () => {
      updateMovementRings(makeHealth())
      expect(el('cardMovement').classList.contains('is-paused')).toBe(false)
    })

    it('still removes is-loading when paused (D-SMOKE)', () => {
      const data = makeHealth({watch: {worn: false, since: null, source: 'hrGap'}})
      updateMovementRings(data)
      expect(el('cardMovement').classList.contains('is-loading')).toBe(false)
    })

    it('removes is-paused on recovery (watch absent = worn)', () => {
      // First call — paused
      updateMovementRings(makeHealth({watch: {worn: false, since: null, source: 'hrGap'}}))
      expect(el('cardMovement').classList.contains('is-paused')).toBe(true)
      // Second call — recovered
      updateMovementRings(makeHealth())
      expect(el('cardMovement').classList.contains('is-paused')).toBe(false)
    })
  })
})

// ── updateHeartRateFooter ─────────────────────────────────────────────────────

describe('updateHeartRateFooter', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="hrFooterRhr"></span>
      <span id="hrFooterRr"></span>
      <span id="hrFooterTemp"></span>
    `
  })

  it('renders RHR value when present', () => {
    const data = makeHealth({quantities: {...makeHealth().quantities, restingHeartRate: {value: 58, unit: 'bpm'}}})
    updateHeartRateFooter(data)
    expect(el('hrFooterRhr').textContent).toBe('58')
  })

  it('renders dash when RHR is absent', () => {
    updateHeartRateFooter(makeHealth())
    expect(el('hrFooterRhr').textContent).toBe('—')
  })

  it('renders signed temp delta', () => {
    const data = makeHealth({quantities: {...makeHealth().quantities, wristTemperatureDelta: {value: 0.2, unit: '°C'}}})
    updateHeartRateFooter(data)
    expect(el('hrFooterTemp').textContent).toBe('+0.2')
  })
})
