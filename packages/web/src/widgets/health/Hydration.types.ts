// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WidgetStateProps } from '../../runtime/widget-state';

export interface HydrationProps extends WidgetStateProps {
  // Absent in the non-data states (unavailable, suppressed, loading).
  health?: {
    hydration: {
      // Measurements: null when the export did not carry them (never 0).
      waterOz: number | null;
      caffeineMg: number | null;
      // Scale configuration, never a stand-in for a measurement.
      waterMax: number;
      waterRangeLo: number;
      waterRangeHi: number;
      caffeineMax: number | null;
      caffeineRangeLo: number | null;
      caffeineRangeHi: number | null;
    };
  };
}
