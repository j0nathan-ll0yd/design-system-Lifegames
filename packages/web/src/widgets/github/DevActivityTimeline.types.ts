// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface DevActivityTimelineProps {
  events: {
    type: string;
    repo: string;
    title: string;
    date: string;
    hash: string;
    // Absent when the export carries no line counts: nothing renders, never +0 -0.
    additions?: number;
    deletions?: number;
  }[];
}
