// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface TopReposProps {
  repos: {
  rank: number;
  name: string;
  stars: number;
  language: string;
  languageColor: string;
}[];
}
