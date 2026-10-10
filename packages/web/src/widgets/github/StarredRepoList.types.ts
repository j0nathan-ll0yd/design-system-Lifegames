// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WidgetStateProps } from '../../runtime/widget-state';

export interface StarredRepoListProps extends WidgetStateProps {
  // Absent in the non-data states (unavailable, suppressed, loading).
  repos?: {
    owner: string;
    name: string;
    stars: number;
    language: string;
    languageColor: string;
    // Relative label computed against the page's `now`.
    starredAt: string;
    // ISO timestamp behind `starredAt`, rendered as <time datetime>.
    datetime?: string;
  }[];
}
