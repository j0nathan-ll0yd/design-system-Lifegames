# @lifegames/fixtures

Canonical, cross-consumer dashboard fixtures for the Lifegames Human Datastream.
Single source of truth for **representative** content (all states: baseline, empty,
…) — the web build, visual tests, and (eventually) iOS SwiftUI previews consume
these instead of hand-baking local snapshots.

This package implements **Phase A** of
`docs/onboarding-review/04-fixtures-as-ssr-shell.md` (DS-owned fixtures as the SSR
shell). It produces **two fixture families** from one set of TS factories.

## The two families

| Family                     | What it is                                                                      | Who consumes it                                                                                                             | Where it lives                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **RAW** (pre-adapter)      | LP-export-shaped fixtures, typed from `@j0nathan-ll0yd/portal-contract/schemas` | the web's Playwright **CloudFront route-interception** layer (`page.route(${CLOUDFRONT_BASE}/**)` reads these by file path) | committed JSON: `src/generated/<kebab-domain>/<variation>.json`; typed TS: `src/variations/*`          |
| **POST-ADAPTER** (display) | the display shapes `loadDashboardData()` returns for the **SSR shell**          | the web build (and iOS previews later)                                                                                      | typed TS: `src/post-adapter/<domain>.ts`; committed JSON: `src/post-adapter/<domain>.<variation>.json` |

Both families are produced by `scripts/generate.ts` and validated by
`scripts/validate.ts`. The generated output is **committed** and freshness-gated.

## Import paths (the Phase B contract)

```ts
// ── POST-ADAPTER (SSR shell) ───────────────────────────────────────────────
// Whole barrel + the DashboardData-shaped helper:
import { fixtures, getDashboardFixture } from '@lifegames/fixtures';
// or the post-adapter sub-barrel:
import {
  fixtures,
  getDashboardFixture,
  type DashboardFixture,
  type FixtureVariation,
} from '@lifegames/fixtures/post-adapter';

// Per-domain post-adapter map (variation → display shape):
import { profilePostAdapter } from '@lifegames/fixtures/post-adapter/profile';
import { healthPostAdapter } from '@lifegames/fixtures/post-adapter/health';
import { githubPostAdapter } from '@lifegames/fixtures/post-adapter/github';
import { readingPostAdapter } from '@lifegames/fixtures/post-adapter/reading';
import { booksPostAdapter } from '@lifegames/fixtures/post-adapter/books';
import { systemPostAdapter } from '@lifegames/fixtures/post-adapter/system';
import { starredReposPostAdapter } from '@lifegames/fixtures/post-adapter/starredRepos';

// ── RAW (Playwright route interception) ─────────────────────────────────────
// Typed TS maps (domain → variation → raw export shape):
import { rawFixtures } from '@lifegames/fixtures'; // all raw domains
import { healthVariations } from '@lifegames/fixtures/raw/health'; // one domain

// Serialized JSON by path (what Playwright route handlers read):
//   @lifegames/fixtures/generated/<kebab-domain>/<variation>.json
import baselineStarred from '@lifegames/fixtures/generated/github-starred-repos/baseline.json';
```

### `getDashboardFixture(variation = 'baseline')`

Returns the exact shape the web's `loadDashboardData()` returns — a `DashboardFixture`:

```
{ profile, health, github, reading, books, system, starredRepos }
```

Phase B's `loadDashboardData()` shim becomes:

```ts
import { getDashboardFixture } from '@lifegames/fixtures';
export async function loadDashboardData() {
  return getDashboardFixture(process.env.FIXTURE_VARIATION ?? 'baseline');
}
```

`FIXTURE_VARIATION` lets visual tests select `empty` (and future named states).

## Domains & variations

**Post-adapter (7 domains, SSR shell):** `profile`, `health`, `github`, `reading`,
`books`, `system`, `starredRepos`. Each has exactly the standard triad: `baseline`,
`empty`, `full` (see [Variation convention](#variation-convention)).

- `profile`, `system`, `github`, `reading`, `health`, `books` are **authored display
  shapes** — they are NOT mechanically derivable from the raw factories because the
  runtime adapters produce narrower/different shapes (e.g. `adaptHealth` omits
  `ranges`/`goals`/`solar`; `DashboardGithub` is a contribution-grid aggregate with
  no LP export; `DashboardReading.articles` is a renamed projection). They are
  authored against `@lifegames/schemas` `authored/`+`generated/` schemas.
- `starredRepos` is the **one adapter-derived** domain: `adaptStarredRepos()` IS the
  display shape. It is generated by running the real adapter with a **stable injected
  clock** (`now` = a fixed `generatedAt`) so relative-time strings ("2 weeks ago")
  never drift. This depends on the `adaptStarredRepos(data, now?)` signature.

**Raw (10 domains, Playwright):** `health`, `sleep`, `workouts`, `books`, `location`,
`githubEvents`, `starredRepos`, `articles`, `focus`, `theatreReviews`. Each provides at
least the standard triad (`baseline`, `empty`, `full`) plus domain-specific extras
(e.g. `bradycardia`, `allCategories`, `oldTimestamp`).

## Variation convention

Every domain provides a normalized **triad** of reserved variation keys:

| key        | meaning                                                           |
| ---------- | ----------------------------------------------------------------- |
| `empty`    | data fetched but zero items / null-ish — the widget's empty state |
| `baseline` | the typical, representative populated state (the SSR default)     |
| `full`     | maximally populated — stress the layout (see semantics below)     |

- **Post-adapter is uniform** (exactly the triad): `getDashboardFixture()` indexes every
  domain by the shared `FixtureVariation` type, so all 7 domains must carry the same keys.
- **Raw is open-ended**: each raw domain provides at least the triad, plus any number of
  domain-specific extras (e.g. `health.bradycardia`, `location.allCategories`).
- Reserved keys + any documented N/A exceptions live in `src/reserved-variations.ts`
  (`RESERVED_VARIATIONS`, `VARIATION_EXCEPTIONS`); the module is package-internal.

### `full` semantics (per shape-kind)

`full` means _maximally populated within schema bounds_ — all optional keys present, all
nullable-but-required fields (`anyOf:[T, null]`) set to non-null values, longest realistic
strings, and max-count arrays — to surface overflow/truncation/layout bugs.

- **List domains** (books, articles, repos, events, reviews, workouts, sleep): max array
  length with every item-level nullable field non-null.
- **Aggregate domains** (health, location): all metrics / optional sections populated.
- **Scalar domains** (focus): the single field at its richest value (longest valid string).
  `focus.full` intentionally equals `focus.dnd` (one field; nothing else to vary).

The `check:full-coverage` oracle (wired into `build`) walks each raw export schema and
fails if a `full` fixture misses an optional key or leaves a nullable-but-required field
null. `focus` and `health.quantities` are documented `WALKER_EXCEPTIONS`.

### Loading / skeleton is **not** a fixture

Skeleton is a _render_ state (the UI shown while data is absent), not a data payload. There
is no `skeleton.json` — a loading screenshot is produced by withholding/delaying the
response at the interception layer (Playwright route control, the analogue of MSW
`delay('infinite')`), never by a fixture. See `GOVERNANCE.md` P3.2 for the authoritative
rule.

## Determinism

`scripts/generate.ts` is byte-deterministic and idempotent. Three things guarantee a
re-run produces identical output (so the freshness git-diff gate stays green):

1. **Object key order** is fixed by the factory source.
2. **The factory clock is anchored**: `src/factories/helpers.ts` `isoDate`/`isoTimestamp`
   resolve a fixed reference instant (`FIXTURES_NOW` env override, else a baked anchor),
   NOT `Date.now()`. The `starredRepos` post-adapter additionally pins its adapter clock.
   Relative-time strings shown to users are recomputed downstream by the runtime
   adapters at the consumer's clock (Playwright re-runs the adapter), so a fixed
   absolute timestamp in the fixture is correct.
3. **Output is prettier-formatted** with the repo config (idempotent), so committed
   JSON also passes the repo-wide `format:check` CI gate.

## Build / validate

```bash
pnpm -F @lifegames/fixtures build      # generate + validate (fails on invalid)
pnpm -F @lifegames/fixtures generate   # write src/generated + src/post-adapter JSON
pnpm -F @lifegames/fixtures validate    # Ajv against portal-contract raw + @lifegames/schemas
pnpm -F @lifegames/fixtures test        # vitest (barrel + starredRepos determinism)
```

Schema mapping lives in `fixture-map.json` (package-local by design — see the file's
`_comment` for the rationale).
