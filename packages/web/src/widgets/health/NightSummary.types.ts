// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface NightSummaryProps {
  health: {
    sleepScore: number;
    sleepDurationFormatted: string;
    sleepPhaseFormatted: {
      deep: string;
      rem: string;
      core: string;
      awake: string;
    };
    derived: {
      deepPct: number;
      remPct: number;
    };
  };
}
