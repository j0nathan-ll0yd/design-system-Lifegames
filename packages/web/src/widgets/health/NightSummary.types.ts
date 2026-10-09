// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WidgetStateProps } from '../../runtime/widget-state';

export interface NightSummaryProps extends WidgetStateProps {
  // Absent in the non-data states (unavailable, suppressed, loading). This card
  // reads two exports but follows the SLEEP export alone: state and
  // generatedAt are the sleep export's; the health export lends only the
  // sleep score while it is live, else the score is null (owner decision Q3;
  // nightSummaryDomain and sleepScoreSource in runtime/widget-rules).
  health?: {
    // null when the health export did not carry a sleep score (never 0).
    sleepScore: number | null;
    // '' when no sleep was recorded.
    sleepDurationFormatted: string;
    sleepPhaseFormatted: {
      deep: string;
      rem: string;
      core: string;
      awake: string;
    };
    derived: {
      // null when no sleep export was supplied.
      deepPct: number | null;
      remPct: number | null;
    };
    // True when the sleep export recorded zero sleep (AdaptedSleep.isEmpty).
    isEmpty?: boolean;
  };
}
