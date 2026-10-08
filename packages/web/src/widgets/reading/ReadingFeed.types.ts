// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

import type { WidgetStateProps } from '../../runtime/widget-state';

export interface Article {
  title: string;
  source: string;
  // Relative label computed against the page's `now`.
  date: string;
  // ISO timestamp behind `date`, rendered as <time datetime>.
  datetime?: string;
}

export interface ReadingFeedProps extends WidgetStateProps {
  // Absent in the non-data states (unavailable, suppressed, loading).
  // The server passes at most 10 articles (one client page).
  reading?: {
    articles: Article[];
  };
}
