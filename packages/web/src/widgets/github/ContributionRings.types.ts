// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface ContributionRingsProps {
  commits: {
  count: number;
  pct: number;
};
  pullRequests: {
  count: number;
  pct: number;
};
  issues: {
  count: number;
  pct: number;
};
  reviews: {
  count: number;
  pct: number;
};
}
