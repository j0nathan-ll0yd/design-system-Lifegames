// Production islands: typed-props widget + bundled runtime init.
// Drop-in replacements for consumer-side widget forks (e.g., j0nathan-ll0yd.github.io).
// Differs from `./islands/*` (showcase-shaped, fixture-driven) and `./widgets/*` (raw SSR).
export { default as BioTerminal } from './BioTerminal.astro';
export { default as BookModal } from './BookModal.astro';
export { default as ComingSoon } from './ComingSoon.astro';
export { default as IdentityCard } from './IdentityCard.astro';
export { default as NotFound } from './NotFound.astro';
export { default as Hydration } from './Hydration.astro';
// Static passthrough islands
export { default as SystemStatus } from './SystemStatus.astro';
export { default as Workouts } from './Workouts.astro';
export { default as NightSummary } from './NightSummary.astro';
export { default as MovementRings } from './MovementRings.astro';
export { default as StarredRepoList } from './StarredRepoList.astro';
export { default as DevActivityLog } from './DevActivityLog.astro';
export { default as FocusOverlay } from './FocusOverlay.astro';
export { default as DndOverlay } from './DndOverlay.astro';
// Interactive islands (passthrough + bundled runtime)
export { default as HeartRate } from './HeartRate.astro';
export { default as ReadingFeed } from './ReadingFeed.astro';
export { default as Bookshelf } from './Bookshelf.astro';
export { default as PlaceLeaderboardV3 } from './PlaceLeaderboardV3.astro';
export { default as ExplorationOdometerV3 } from './ExplorationOdometerV3.astro';
export { default as TheatreReviews } from './TheatreReviews.astro';
