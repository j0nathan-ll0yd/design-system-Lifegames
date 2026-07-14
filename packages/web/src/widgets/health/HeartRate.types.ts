// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WatchState } from '../../../runtime/adapters';
export type { WatchState };

export interface HeartRateProps {
  health: {
    quantities: {
      heartRate: { value: number; unit: string };
      hrvSDNN: { value: number; unit: string };
      restingHeartRate?: { value: number; unit: string };
      respiratoryRate?: { value: number; unit: string };
      // °C delta from 30-day baseline (Apple wrist temperature)
      wristTemperatureDelta?: { value: number; unit: string };
    };
    watch?: WatchState;
  };
}
