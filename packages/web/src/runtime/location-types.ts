/**
 * Shape consumed by the location showcase runtime (exploration odometer + place
 * leaderboard).
 *
 * Unlike every other export shape the web runtime handles, this one is NOT part
 * of `@j0nathan-ll0yd/portal-contract`: the LOCATION publication chain (the three
 * location stores, the ExportLocationData lambda, and the `location.json`
 * artifact) was removed on 2026-07-30 by atlas decision 0012, so the contract
 * package has no `location-export.schema.json` to generate from and never will.
 *
 * The widgets themselves still ship as gallery/showcase components driven by
 * `@j0nathan-ll0yd/fixtures`, so the type is declared here — hand-authored, next
 * to its only consumers — rather than lingering in a stale copy of a generated
 * contract file. If the location chain is ever restored upstream, delete this
 * file and import `LocationExport` from `@j0nathan-ll0yd/portal-contract/schemas`
 * like every other export shape.
 */
export interface LocationExport {
  generatedAt: string
  totalVisits: number
  totalPlaces: number
  totalDurationHours: number
  citiesVisited: number
  currentCity: string | null
  lastSeen: string | null
  last90Days: {date: string; count: number; uniquePlaces: number; totalDurationMinutes: number}[]
  topPlaces: {name: string; category: string | null; visitCount: number; totalDurationMinutes: number; lastVisitAt: string | null}[]
  cityBreakdown: {city: string; visitCount: number}[]
  categoryBreakdown: {category: string; visitCount: number; totalMinutes: number}[]
  streaks: {currentStreak: number; longestStreak: number; totalActiveDays: number}
  explorationStats: {totalNeighborhoods: number; totalCities: number; totalStates: number}
}
