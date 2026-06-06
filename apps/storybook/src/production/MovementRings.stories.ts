import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

interface MovementRingsArgs {
  moveKcal: number | null;
  exerciseMin: number | null;
  standHr: number | null;
  steps: number | null;
  distanceM: number | null;
  flights: number | null;
  daylightMin: number | null;
  goalMoveKcal: number;
  goalExerciseMin: number;
  goalStandHr: number;
  sunriseHHmm: string;
  sunsetHHmm: string;
  sunProgressPct: number;
}

const meta: Meta<MovementRingsArgs> = {
  title: 'Production/Health/MovementRings',
  tags: ['stable', 'autodocs'],
  argTypes: {
    moveKcal: { control: 'number' },
    exerciseMin: { control: 'number' },
    standHr: { control: 'number' },
    steps: { control: 'number' },
    distanceM: { control: 'number' },
    flights: { control: 'number' },
    daylightMin: { control: 'number' },
    goalMoveKcal: { control: 'number' },
    goalExerciseMin: { control: 'number' },
    goalStandHr: { control: 'number' },
    sunriseHHmm: { control: 'text' },
    sunsetHHmm: { control: 'text' },
    sunProgressPct: { control: { type: 'range', min: 0, max: 100 } },
  },
  render: (args) => {
    const isEmpty = !args.moveKcal && !args.steps && !args.distanceM && !args.exerciseMin;
    const isLoading = args.moveKcal === null;

    const goalMove = args.goalMoveKcal ?? 500;
    const goalEx = args.goalExerciseMin ?? 30;
    const goalStand = args.goalStandHr ?? 12;

    const moveVal = Math.round(args.moveKcal ?? 0);
    const exVal = Math.round(args.exerciseMin ?? 0);
    const standVal = Math.round(args.standHr ?? 0);
    const steps = Math.round(args.steps ?? 0);
    const distanceKm = ((args.distanceM ?? 0) / 1000).toFixed(1);
    const flights = Math.round(args.flights ?? 0);
    const daylightMin = Math.round(args.daylightMin ?? 0);

    const movePct = goalMove > 0 ? Math.min(1, moveVal / goalMove) : 0;
    const exPct = goalEx > 0 ? Math.min(1, exVal / goalEx) : 0;
    const standPct = goalStand > 0 ? Math.min(1, standVal / goalStand) : 0;
    const centerPct = Math.round(movePct * 100);

    const CIRC = { move: 2 * Math.PI * 60, exercise: 2 * Math.PI * 44, stand: 2 * Math.PI * 28 };
    const offset = (circ: number, pct: number) => (circ * (1 - pct)).toFixed(2);

    const sunPct = args.sunProgressPct ?? 60;
    const sunrise = args.sunriseHHmm ?? '06:30';
    const sunset = args.sunsetHHmm ?? '20:15';
    const daylightHit = daylightMin >= (args.daylightMin ?? 20);

    return html`
      <div id="cardMovement" class="tri-card tri-card-accent-red" style="max-width: 340px;">
        <div class="widget-header">
          <h3 class="widget-label">Movement</h3>
          <div class="widget-header-right">
            <div class="live-dot live-dot-red"></div>
            <span class="widget-timestamp">today</span>
          </div>
        </div>
        <div class="widget-body">
          ${isLoading ? html`
            <div class="skeleton-state">
              <div style="display: grid; grid-template-columns: 144px 1fr; gap: 18px; align-items: center;">
                <div class="skeleton-circle" style="width: 120px; height: 120px; border-radius: 50%;"></div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div class="skeleton-bar" style="width: 100%; height: 28px; border-radius: 8px;"></div>
                  <div class="skeleton-bar" style="width: 100%; height: 28px; border-radius: 8px;"></div>
                  <div class="skeleton-bar" style="width: 100%; height: 28px; border-radius: 8px;"></div>
                </div>
              </div>
            </div>
          ` : isEmpty ? html`
            <div style="display: flex; align-items: center; justify-content: center; padding: 32px 0;">
              <span style="font-size: var(--lg-font-size-caption); color: var(--lg-color-text-muted); letter-spacing: 1px; text-transform: uppercase;">No movement yet today</span>
            </div>
          ` : html`
            <div style="display: grid; grid-template-columns: 144px 1fr; gap: 18px; align-items: center;">
              <div style="width: 144px; height: 144px; position: relative;">
                <svg viewBox="0 0 144 144" style="display: block; width: 100%; height: 100%;" role="img" aria-label="Movement rings">
                  <circle class="mv-ring-track mv-ring-track-move"     cx="72" cy="72" r="60" fill="none" stroke-width="12" stroke-linecap="round" opacity="0.18" stroke="var(--lg-color-health-red)"></circle>
                  <circle class="mv-ring-track mv-ring-track-exercise" cx="72" cy="72" r="44" fill="none" stroke-width="12" stroke-linecap="round" opacity="0.18" stroke="var(--lg-color-health-green)"></circle>
                  <circle class="mv-ring-track mv-ring-track-stand"    cx="72" cy="72" r="28" fill="none" stroke-width="12" stroke-linecap="round" opacity="0.18" stroke="var(--lg-color-accent-blue)"></circle>
                  <circle cx="72" cy="72" r="60" fill="none" stroke-width="12" stroke-linecap="round"
                    stroke="var(--lg-color-health-red)"
                    stroke-dasharray="${CIRC.move.toFixed(2)}"
                    stroke-dashoffset="${offset(CIRC.move, movePct)}"
                    style="transform: rotate(-90deg); transform-origin: center;"></circle>
                  <circle cx="72" cy="72" r="44" fill="none" stroke-width="12" stroke-linecap="round"
                    stroke="var(--lg-color-health-green)"
                    stroke-dasharray="${CIRC.exercise.toFixed(2)}"
                    stroke-dashoffset="${offset(CIRC.exercise, exPct)}"
                    style="transform: rotate(-90deg); transform-origin: center;"></circle>
                  <circle cx="72" cy="72" r="28" fill="none" stroke-width="12" stroke-linecap="round"
                    stroke="var(--lg-color-accent-blue)"
                    stroke-dasharray="${CIRC.stand.toFixed(2)}"
                    stroke-dashoffset="${offset(CIRC.stand, standPct)}"
                    style="transform: rotate(-90deg); transform-origin: center;"></circle>
                </svg>
                <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; gap: 2px;">
                  <span style="font-family: var(--lg-font-family-system); font-size: 0.92rem; font-weight: var(--lg-font-weight-bold); color: var(--lg-color-text-title);">${centerPct}%</span>
                  <span style="font-family: var(--lg-font-family-system); font-size: 0.50rem; letter-spacing: 2.5px; text-transform: uppercase; color: var(--lg-color-text-muted);">cal</span>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--lg-radius-md);">
                  <span style="font-size: var(--lg-font-size-caption2); text-transform: uppercase; letter-spacing: 1.8px; color: var(--lg-color-text-muted);">Steps</span>
                  <strong style="font-family: var(--lg-font-family-system); font-size: var(--lg-font-size-body); font-weight: var(--lg-font-weight-semibold); color: var(--lg-color-text-title);">${steps.toLocaleString()}</strong>
                </div>
                <div style="display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--lg-radius-md);">
                  <span style="font-size: var(--lg-font-size-caption2); text-transform: uppercase; letter-spacing: 1.8px; color: var(--lg-color-text-muted);">Distance</span>
                  <strong style="font-family: var(--lg-font-family-system); font-size: var(--lg-font-size-body); font-weight: var(--lg-font-weight-semibold); color: var(--lg-color-text-title);">${distanceKm}<span style="font-size: var(--lg-font-size-caption2); color: var(--lg-color-text-muted); margin-left: 3px;">km</span></strong>
                </div>
                <div style="display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--lg-radius-md);">
                  <span style="font-size: var(--lg-font-size-caption2); text-transform: uppercase; letter-spacing: 1.8px; color: var(--lg-color-text-muted);">Flights</span>
                  <strong style="font-family: var(--lg-font-family-system); font-size: var(--lg-font-size-body); font-weight: var(--lg-font-weight-semibold); color: var(--lg-color-text-title);">${flights}</strong>
                </div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04);">
              <div style="display: flex; align-items: center; gap: 6px; font-family: var(--lg-font-family-system); font-size: var(--lg-font-size-caption2); color: var(--lg-color-text-muted);">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: var(--lg-color-health-red); flex-shrink: 0;"></span>
                Cal <span style="color: var(--lg-color-text-title); font-weight: var(--lg-font-weight-semibold);">${moveVal}/${goalMove}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; font-family: var(--lg-font-family-system); font-size: var(--lg-font-size-caption2); color: var(--lg-color-text-muted);">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: var(--lg-color-health-green); flex-shrink: 0;"></span>
                Ex <span style="color: var(--lg-color-text-title); font-weight: var(--lg-font-weight-semibold);">${exVal}/${goalEx}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; font-family: var(--lg-font-family-system); font-size: var(--lg-font-size-caption2); color: var(--lg-color-text-muted);">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: var(--lg-color-accent-blue); flex-shrink: 0;"></span>
                Stand <span style="color: var(--lg-color-text-title); font-weight: var(--lg-font-weight-semibold);">${standVal}/${goalStand}</span>
              </div>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.06); margin-top: 14px; padding-top: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 0.82rem; color: var(--lg-color-accent-amber);">&#9728;</span>
                <span style="font-family: var(--lg-font-family-system); font-size: 0.56rem; letter-spacing: 0.10em; color: var(--lg-color-text-subtle);">${sunrise}</span>
                <div style="flex: 1; position: relative; height: 4px; border-radius: 2px; background: linear-gradient(90deg, rgba(94,92,230,0.25) 0%, rgba(245,158,11,0.55) 50%, rgba(94,92,230,0.25) 100%);">
                  <div style="position: absolute; top: 50%; left: ${sunPct}%; width: 8px; height: 8px; border-radius: 50%; background: var(--lg-color-accent-amber); transform: translate(-50%, -50%); box-shadow: 0 0 8px rgba(245,158,11,0.9);"></div>
                </div>
                <span style="font-family: var(--lg-font-family-system); font-size: 0.56rem; letter-spacing: 0.10em; color: var(--lg-color-text-subtle);">${sunset}</span>
                <span style="font-size: 0.82rem; opacity: 0.45; color: var(--lg-color-accent-amber);">&#9790;</span>
              </div>
              <p style="text-align: center; font-family: var(--lg-font-family-system); font-size: 0.60rem; letter-spacing: 0.09em; color: var(--lg-color-text-muted); margin: 0;">
                ${daylightMin} min in daylight today &middot; goal ${args.daylightMin ?? 20} min${daylightHit ? html` <span style="color: var(--lg-color-health-green);">&#10003;</span>` : ''}
              </p>
            </div>
          `}
        </div>
      </div>
    `;
  },
};

export default meta;
type Story = StoryObj<MovementRingsArgs>;

export const Default: Story = {
  args: {
    moveKcal: 380,
    exerciseMin: 32,
    standHr: 9,
    steps: 8421,
    distanceM: 6200,
    flights: 14,
    daylightMin: 48,
    goalMoveKcal: 500,
    goalExerciseMin: 30,
    goalStandHr: 12,
    sunriseHHmm: '06:30',
    sunsetHHmm: '20:15',
    sunProgressPct: 60,
  },
};

export const AllRingsClosed: Story = {
  args: {
    moveKcal: 540,
    exerciseMin: 34,
    standHr: 12,
    steps: 11280,
    distanceM: 9100,
    flights: 18,
    daylightMin: 24,
    goalMoveKcal: 500,
    goalExerciseMin: 30,
    goalStandHr: 12,
    sunriseHHmm: '06:30',
    sunsetHHmm: '20:15',
    sunProgressPct: 72,
  },
};

export const StandOnly: Story = {
  args: {
    moveKcal: 180,
    exerciseMin: 4,
    standHr: 12,
    steps: 2840,
    distanceM: 1900,
    flights: 3,
    daylightMin: 12,
    goalMoveKcal: 500,
    goalExerciseMin: 30,
    goalStandHr: 12,
    sunriseHHmm: '06:30',
    sunsetHHmm: '20:15',
    sunProgressPct: 50,
  },
};

export const Empty: Story = {
  args: {
    moveKcal: 0,
    exerciseMin: 0,
    standHr: 0,
    steps: 0,
    distanceM: 0,
    flights: 0,
    daylightMin: 0,
    goalMoveKcal: 500,
    goalExerciseMin: 30,
    goalStandHr: 12,
    sunriseHHmm: '06:30',
    sunsetHHmm: '20:15',
    sunProgressPct: 0,
  },
};

export const Skeleton: Story = {
  args: {
    moveKcal: null,
    exerciseMin: null,
    standHr: null,
    steps: null,
    distanceM: null,
    flights: null,
    daylightMin: null,
    goalMoveKcal: 500,
    goalExerciseMin: 30,
    goalStandHr: 12,
    sunriseHHmm: '06:30',
    sunsetHHmm: '20:15',
    sunProgressPct: 0,
  },
};

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: { value: 'dark' },
  },
};
