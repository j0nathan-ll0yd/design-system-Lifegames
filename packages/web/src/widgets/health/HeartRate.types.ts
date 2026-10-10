// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WatchState } from '../../runtime/adapters';
import type { WidgetStateProps } from '../../runtime/widget-state';
export type { WatchState };

export interface HeartRateProps extends WidgetStateProps {
  // Absent in the non-data states (unavailable, suppressed, loading).
  health?: {
    quantities: {
      // Each quantity is absent when the export did not carry it. A missing
      // heartRate renders the unavailable state; a missing hrvSDNN renders the
      // no-reading mark. Neither is ever rendered as 0.
      heartRate?: { value: number; unit: string };
      hrvSDNN?: { value: number; unit: string };
      restingHeartRate?: { value: number; unit: string };
      respiratoryRate?: { value: number; unit: string };
      // °C delta from 30-day baseline (Apple wrist temperature)
      wristTemperatureDelta?: { value: number; unit: string };
    };
    watch?: WatchState;
  };
}
