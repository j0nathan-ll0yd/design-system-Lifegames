// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface DevActivityLogProps {
  events: {type: string; repo: string; title: string; date: string; hash: string; additions: number; deletions: number}[]
}
