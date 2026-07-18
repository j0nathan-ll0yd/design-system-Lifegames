// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WatchState } from '../../../runtime/adapters';
export type { WatchState };

export interface MovementRingsProps {
  health: {
    quantities: {
      stepCount: { value: number; unit: string };
      distanceWalkingRunning: { value: number; unit: string };
      flightsClimbed: { value: number; unit: string };
      activeEnergyBurned: { value: number; unit: string };
      exerciseTime: { value: number; unit: string };
      // Stand may arrive as min (HealthKit) or hr — see updater normalisation.
      standTime: { value: number; unit: string };
      // Achieved stand-hours ring count (HKActivitySummary); preferred over
      // standTime-derived hours when present.
      standHours?: { value: number; unit: string };
      timeInDaylight?: { value: number; unit: string };
    };
    goals?: {
      moveKcal: number; // default 500
      exerciseMin: number; // default 30
      standHr: number; // default 12
      daylightMin: number; // default 20
    };
    solar?: {
      sunriseHHmm: string; // "06:30"
      sunsetHHmm: string; // "20:15"
      currentProgressPct: number; // 0-100, position along sun arc
    };
    watch?: WatchState;
  };
}
