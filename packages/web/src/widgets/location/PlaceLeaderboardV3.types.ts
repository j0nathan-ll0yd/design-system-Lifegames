// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface PlaceLeaderboardV3Props {
  topPlaces: {name: string; category: string | null; visitCount: number; totalDurationMinutes: number; lastVisitAt: string | null}[]
}
