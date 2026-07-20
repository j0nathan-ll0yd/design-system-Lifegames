// schema-exempt: DS-internal narrow widget Props shape.
// Fixture validation lives at @lifegames/schemas (consumer-aggregate shapes).
// Per-widget DS schemas are a deferred follow-up plan.

export interface ExplorationOdometerV3Props {
  totalVisits: number
  totalPlaces: number
  totalDurationHours: number
  citiesVisited: number
  explorationStats: {totalNeighborhoods: number; totalCities: number; totalStates: number}
}
