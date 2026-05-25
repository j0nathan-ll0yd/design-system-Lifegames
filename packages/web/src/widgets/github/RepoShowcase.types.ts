// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface RepoShowcaseProps {
  repos: {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languageColor: string;
  topics: string[];
  url: string;
}[];
}
