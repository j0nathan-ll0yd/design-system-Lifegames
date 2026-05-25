// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface WaffleGridProps {
  categoryBreakdown: {
    category: string;
    visitCount: number;
    totalMinutes: number;
  }[];
  totalVisits: number;
}
