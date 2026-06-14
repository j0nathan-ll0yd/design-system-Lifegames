// @lifegames/fixtures — canonical cross-consumer dashboard fixtures.
//
// Two fixture families:
//   1. RAW (pre-adapter)   — `rawFixtures` + `@lifegames/fixtures/raw[/<domain>]`
//      LP-export-shaped; feed the web's Playwright CloudFront route-interception
//      layer. Serialized JSON at `@lifegames/fixtures/generated/<domain>/<v>.json`.
//   2. POST-ADAPTER (display) — `fixtures` + `@lifegames/fixtures/post-adapter[/<domain>]`
//      Display shapes the web's loadDashboardData consumes for the SSR shell.
//
// See README.md for the full import-path contract.
export {
  fixtures,
  getDashboardFixture,
  type DashboardFixture,
  type FixtureVariation,
  profilePostAdapter,
  healthPostAdapter,
  githubPostAdapter,
  readingPostAdapter,
  booksPostAdapter,
  systemPostAdapter,
  starredReposPostAdapter,
} from './post-adapter';

export { rawFixtures } from './raw';
