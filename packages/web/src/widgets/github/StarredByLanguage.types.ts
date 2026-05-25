// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface StarredByLanguageProps {
  groups: {
  language: string;
  languageColor: string;
  repos: {
  owner: string;
  name: string;
  stars: number;
  starredAt: string;
}[];
}[];
}
