// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface Workout {
  activity_type: string;
  duration: number;
  energy_burned: number;
  distance: number;
}

export interface WorkoutsProps {
  health: {
    workouts: Workout[];
  };
}
