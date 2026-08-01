// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @j0nathan-ll0yd/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface PinnedReposProps {
  repos: {
    name: string;
    description: string;
    stars: number;
    forks: number;
    language: string;
    languageColor: string;
    url: string;
  }[];
}
