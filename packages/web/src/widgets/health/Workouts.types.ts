// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WidgetStateProps } from '../../runtime/widget-state';

export interface Workout {
  activity_type: string;
  // Measurements: null when the export did not carry them (never 0).
  duration: number | null;
  energy_burned: number | null;
  distance: number | null;
  // Activity link (mapped activity types only).
  link?: string | null;
}

export interface WorkoutsProps extends WidgetStateProps {
  // Absent in the non-data states (unavailable, suppressed, loading).
  // generatedAt is the workouts export's own generatedAt.
  health?: {
    workouts: Workout[];
  };
}
