// Raw (pre-adapter) fixture barrel.
//
// These are the raw LP-export-shaped fixtures, typed from
// `@j0nathan-ll0yd/portal-contract/schemas`. They are what the web's Playwright layer
// serves when it intercepts CloudFront (`page.route(${CLOUDFRONT_BASE}/**)`),
// fulfilling each endpoint from the committed JSON under `src/generated/<domain>/`.
//
// `rawFixtures` exposes the same data as typed TS maps (domain → variation → raw
// shape) for any TS consumer. The serialized JSON form lives at
// `@j0nathan-ll0yd/fixtures/generated/<domain>/<variation>.json` for file-path consumers
// (Playwright reads files by path). Both are produced from these factories.
import {
  articlesVariations,
  booksVariations,
  focusVariations,
  githubEventsVariations,
  healthVariations,
  locationVariations,
  sleepVariations,
  starredReposVariations,
  theatreReviewsVariations,
  workoutsVariations
} from './variations/index'

/**
 * Raw pre-adapter fixtures keyed by domain then variation. Domain keys are the
 * canonical camelCase names; the on-disk JSON directories use the kebab-case
 * `DIRECTORY_MAP` form (e.g. githubEvents → github-events).
 */
export const rawFixtures = {
  health: healthVariations,
  sleep: sleepVariations,
  workouts: workoutsVariations,
  books: booksVariations,
  location: locationVariations,
  githubEvents: githubEventsVariations,
  starredRepos: starredReposVariations,
  articles: articlesVariations,
  focus: focusVariations,
  theatreReviews: theatreReviewsVariations
} as const

export {
  articlesVariations,
  booksVariations,
  focusVariations,
  githubEventsVariations,
  healthVariations,
  locationVariations,
  sleepVariations,
  starredReposVariations,
  theatreReviewsVariations,
  workoutsVariations
}

// Re-export factories so consumers can construct ad-hoc variations if needed.
export * from './factories/index'
