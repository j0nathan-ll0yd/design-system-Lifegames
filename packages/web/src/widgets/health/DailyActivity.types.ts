// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface DailyActivityProps {
  health: {
    quantities: {
      stepCount: { value: number; unit: string };
      distanceWalkingRunning: { value: number; unit: string };
      exerciseTime: { value: number; unit: string };
      activeEnergyBurned: { value: number; unit: string };
      basalEnergyBurned: { value: number; unit: string };
    };
    derived: {
      totalCalories: number;
    };
  };
}
