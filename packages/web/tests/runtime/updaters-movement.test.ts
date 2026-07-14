// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { updateMovementRings, updateHeartRateFooter } from '../../src/runtime/updaters-movement';
import type { AdaptedHealth } from '../../src/runtime/adapters';
import { widgets } from '@lifegames/copy';

// ── helpers ───────────────────────────────────────────────────────────────────

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as HTMLElement;
}

function makeHealth(overrides: Partial<AdaptedHealth> = {}): AdaptedHealth {
  return {
    date: '2026-01-01',
    quantities: {
      stepCount: { value: 8000, unit: 'count' },
      distanceWalkingRunning: { value: 5200, unit: 'm' },
      flightsClimbed: { value: 12, unit: 'count' },
      activeEnergyBurned: { value: 400, unit: 'kcal' },
      exerciseTime: { value: 30, unit: 'min' },
      standTime: { value: 9, unit: 'hr' },
    },
    derived: { totalCalories: 2200, deepPct: 20, remPct: 25, corePct: 45 },
    sleepScore: 85,
    sleepDurationFormatted: '7h 30m',
    sleepPhaseFormatted: { deep: '1h 30m', rem: '1h 52m', core: '3h 22m', awake: '15m' },
    hydration: {
      waterOz: 68,
      caffeineMg: 200,
      waterMax: 140,
      caffeineMax: 500,
      waterRangeLo: 74,
      waterRangeHi: 125,
      caffeineRangeLo: 200,
      caffeineRangeHi: 400,
    },
    ...overrides,
  };
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
    </div>
  </div>
`;

// ── updateMovementRings — basic ───────────────────────────────────────────────

describe('updateMovementRings', () => {
  beforeEach(() => {
    document.body.innerHTML = POPULATED_DOM;
  });

  it('removes is-loading from cardMovement', () => {
    updateMovementRings(makeHealth());
    expect(el('cardMovement').classList.contains('is-loading')).toBe(false);
  });

  it('sets steps chip text', () => {
    updateMovementRings(makeHealth());
    expect(document.querySelector('[data-mv-metric="steps"]')?.textContent).toBe('8,000');
  });

  it('sets legend move text', () => {
    updateMovementRings(makeHealth());
    expect(el('legendMove').textContent).toBe('400/500');
  });

  // ── paused state ───────────────────────────────────────────────────────────

  describe('paused state (watch.worn === false)', () => {
    // GUARD TESTS: both blocks must exist in the DOM unconditionally.
    // If either is absent, the class-toggle silently no-ops — the exact bug that
    // shipped in the old ternary-branch SSR design.
    it('paused block #mvPaused is always present in the DOM regardless of watch state', () => {
      updateMovementRings(makeHealth());
      expect(document.getElementById('mvPaused')).not.toBeNull();
    });

    it('data container .mv-data is always present in the DOM regardless of watch state', () => {
      const data = makeHealth({ watch: { worn: false, since: null, source: 'hrGap' } });
      updateMovementRings(data);
      expect(document.querySelector('.mv-data')).not.toBeNull();
    });

    it('shows hrGap label when source is hrGap', () => {
      const data = makeHealth({ watch: { worn: false, since: null, source: 'hrGap' } });
      updateMovementRings(data);
      expect(el('mvPausedLabel').textContent).toBe(widgets.movement.paused.label);
    });

    it('shows charging label when source is charging', () => {
      const data = makeHealth({ watch: { worn: false, since: null, source: 'charging' } });
      updateMovementRings(data);
      expect(el('mvPausedLabel').textContent).toBe(widgets.movement.paused.labelCharging);
    });

    it('shows charging description when source is charging', () => {
      const data = makeHealth({ watch: { worn: false, since: null, source: 'charging' } });
      updateMovementRings(data);
      expect(el('mvPausedDesc').textContent).toBe(widgets.movement.paused.descriptionCharging);
    });

    it('adds is-paused class to cardMovement', () => {
      const data = makeHealth({ watch: { worn: false, since: null, source: 'hrGap' } });
      updateMovementRings(data);
      expect(el('cardMovement').classList.contains('is-paused')).toBe(true);
    });

    it('does NOT add is-paused when watch is absent (worn)', () => {
      updateMovementRings(makeHealth());
      expect(el('cardMovement').classList.contains('is-paused')).toBe(false);
    });

    it('still removes is-loading when paused (D-SMOKE)', () => {
      const data = makeHealth({ watch: { worn: false, since: null, source: 'hrGap' } });
      updateMovementRings(data);
      expect(el('cardMovement').classList.contains('is-loading')).toBe(false);
    });

    it('removes is-paused on recovery (watch absent = worn)', () => {
      // First call — paused
      updateMovementRings(makeHealth({ watch: { worn: false, since: null, source: 'hrGap' } }));
      expect(el('cardMovement').classList.contains('is-paused')).toBe(true);
      // Second call — recovered
      updateMovementRings(makeHealth());
      expect(el('cardMovement').classList.contains('is-paused')).toBe(false);
    });
  });
});

// ── updateHeartRateFooter ─────────────────────────────────────────────────────

describe('updateHeartRateFooter', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="hrFooterRhr"></span>
      <span id="hrFooterRr"></span>
      <span id="hrFooterTemp"></span>
    `;
  });

  it('renders RHR value when present', () => {
    const data = makeHealth({
      quantities: {
        ...makeHealth().quantities,
        restingHeartRate: { value: 58, unit: 'bpm' },
      },
    });
    updateHeartRateFooter(data);
    expect(el('hrFooterRhr').textContent).toBe('58');
  });

  it('renders dash when RHR is absent', () => {
    updateHeartRateFooter(makeHealth());
    expect(el('hrFooterRhr').textContent).toBe('—');
  });

  it('renders signed temp delta', () => {
    const data = makeHealth({
      quantities: {
        ...makeHealth().quantities,
        wristTemperatureDelta: { value: 0.2, unit: '°C' },
      },
    });
    updateHeartRateFooter(data);
    expect(el('hrFooterTemp').textContent).toBe('+0.2');
  });
});
