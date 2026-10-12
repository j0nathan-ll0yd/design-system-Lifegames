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
import {ssrKnownAnswer as articlesSsrKnownAnswer} from './variations/articles'
import {ssrKnownAnswer as booksSsrKnownAnswer} from './variations/books'
import {ssrKnownAnswer as focusSsrKnownAnswer} from './variations/focus'
import {ssrKnownAnswer as githubEventsSsrKnownAnswer} from './variations/github-events'
import {ssrKnownAnswer as healthSsrKnownAnswer} from './variations/health'
import {ssrKnownAnswer as sleepSsrKnownAnswer} from './variations/sleep'
import {ssrKnownAnswer as starredReposSsrKnownAnswer} from './variations/starred-repos'
import {ssrKnownAnswer as theatreReviewsSsrKnownAnswer} from './variations/theatre-reviews'
import {ssrKnownAnswer as workoutsSsrKnownAnswer} from './variations/workouts'

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

/**
 * Non-optional typed accessor for the `ssrKnownAnswer` variation of every raw domain
 * (decision 0160). The `Record<string, T>` domain maps type `rawFixtures.<d>.ssrKnownAnswer`
 * as possibly undefined under `noUncheckedIndexedAccess`; this object does not. There is
 * no `location` entry: location is retired (decision 0012). The same payloads are also
 * reachable as `rawFixtures.<domain>.ssrKnownAnswer`.
 */
export const ssrKnownAnswerFixtures = {
  health: healthSsrKnownAnswer,
  sleep: sleepSsrKnownAnswer,
  workouts: workoutsSsrKnownAnswer,
  books: booksSsrKnownAnswer,
  githubEvents: githubEventsSsrKnownAnswer,
  starredRepos: starredReposSsrKnownAnswer,
  articles: articlesSsrKnownAnswer,
  focus: focusSsrKnownAnswer,
  theatreReviews: theatreReviewsSsrKnownAnswer
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
