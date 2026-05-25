// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface CommitLogProps {
  commits: {
  hash: string;
  message: string;
  repo: string;
  date: string;
  additions: number;
  deletions: number;
}[];
}
