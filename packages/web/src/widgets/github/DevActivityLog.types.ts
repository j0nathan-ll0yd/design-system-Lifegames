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
    // Text the server renders: absolute UTC (`2026-10-23 14:05 UTC`, atlas decision
    // 0164 D5). The browser writes the relative label from `datetime`.
    date: string;
    // ISO timestamp behind `date`, rendered as <time datetime>.
    datetime?: string;
    hash: string;
    // Absent when the export did not carry them: no "+0 -0" is invented.
    additions?: number;
    deletions?: number;
    number?: number;
    url?: string;
  }[];
}
