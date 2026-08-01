// @j0nathan-ll0yd/fixtures — canonical cross-consumer dashboard fixtures.
//
// Two fixture families:
//   1. RAW (pre-adapter)   — `rawFixtures` + `@j0nathan-ll0yd/fixtures/raw[/<domain>]`
//      LP-export-shaped; feed the web's Playwright CloudFront route-interception
//      layer. Serialized JSON at `@j0nathan-ll0yd/fixtures/generated/<domain>/<v>.json`.
//   2. POST-ADAPTER (display) — `fixtures` + `@j0nathan-ll0yd/fixtures/post-adapter[/<domain>]`
//      Display shapes the web's loadDashboardData consumes for the SSR shell.
//
// See README.md for the full import-path contract.
export {
  booksPostAdapter,
  type DashboardFixture,
  fixtures,
  type FixtureVariation,
  getDashboardFixture,
  githubPostAdapter,
  healthPostAdapter,
  profilePostAdapter,
  readingPostAdapter,
  starredReposPostAdapter,
  systemPostAdapter
} from './post-adapter'

export { rawFixtures } from './raw'
