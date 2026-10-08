// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WidgetStateProps } from '../../runtime/widget-state';

export interface DevActivityLogProps extends WidgetStateProps {
  // Absent in the non-data states (unavailable, suppressed, loading).
  events?: {
    type: string;
    repo: string;
    title: string;
    // Relative label ("2h ago") computed against the page's `now`.
    date: string;
    // ISO timestamp behind `date`, rendered as <time datetime>.
    datetime?: string;
    hash: string;
    additions: number;
    deletions: number;
  }[];
}
