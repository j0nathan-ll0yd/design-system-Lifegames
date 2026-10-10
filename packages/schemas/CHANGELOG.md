# @j0nathan-ll0yd/schemas

## 2.3.0

### Minor Changes

- 7b4aecb: Widget schemas accept the honest widget states (atlas decision 0160).

  The live widget schemas gain optional `state` and `generatedAt` properties, and their data property is
  no longer required, so an `unavailable` or `suppressed` fixture carries no data envelope.
  `health.quantities.heartRate` and `hrvSDNN` are optional in `heart-rate`; nullable measurements are
  nullable in `hydration`, `night-summary` and `workouts`. `focus-overlay` and `dnd-overlay` now
  generate from their TS Props (`currentFocus`, `now`). These changes loosen validation.

  **Scoped correction: some widget-schema input that validated before now fails.** GOVERNANCE.md §6.2
  classes a breaking schema type change as major. The owner chose minor on 2026-10-08, because the narrowing corrects each schema to the TypeScript Props type it always claimed
  to describe, and no consumer outside this repository validates a widget schema. What now fails, each
  measured with Ajv against the schemas at `17d203b` (the merge base) and at this change:
  - **`heart-rate`, `health.watch`.** The generator now compiles widget types under the web package's
    tsconfig. Under this package's NodeNext config, extensionless relative imports in widget types
    never resolved, so `health.watch` was `{}` and accepted any value. It is now an object with
    required `worn` (boolean) and `source` (`charging` or `hrGap`), optional `since` (string or null),
    or null. `watch: {}`, `watch: {worn: "yes"}`, `watch: {source: "anything"}`, `watch: 42` and
    `watch: "x"` validated at `17d203b` and fail now. This is the only property any widget schema at
    `17d203b` typed `{}`.
  - **A newly declared optional property with a value of the wrong type.** Draft-07 objects are open, so
    at `17d203b` an undeclared key passed with any value. These keys are now declared, so a value
    outside the declared type fails: `state` (one of `live`, `stale`, `empty`, `unavailable`,
    `suppressed`, `loading`, or null) and `generatedAt` (string or null) in `bookshelf`,
    `dev-activity-log`, `heart-rate`, `hydration`, `movement-rings`, `night-summary`, `reading-feed`,
    `starred-repo-list`, `theatre-reviews` and `workouts`; `bookshelf.localCovers` (string array or
    null); `dev-activity-log.events[].datetime` (string); `reading-feed.reading.articles[].datetime`
    and `starred-repo-list.repos[].datetime` (string or null); `night-summary.health.isEmpty`
    (boolean or null); `system-status.system.lines[].source` and `keyClass` (string or null) and
    `suppressed` (boolean or null);
    `workouts.health.workouts[].link` (string or null); `currentFocus` (string or null) and `now`
    (string or null) in `focus-overlay` and `dnd-overlay`.

  No other required property was added, and every other type change widens (number to number or null).

  **Consumer evidence, searched 2026-10-09:**
  - This repository: all 306 `ds`-bucket fixtures in `fixture-map.json` validate against the widget
    schemas. The `consumer` bucket, which site and iOS validation reads through
    `LIFEGAMES_VALIDATE_CWD`, maps 7 fixtures, all to export or dashboard schemas, none to a widget
    schema.
  - `j0nathan-ll0yd.github.io` (`main` at `7b4c8b72`): depends on `@j0nathan-ll0yd/schemas` `^2.1.0`.
    Its only readers, `scripts/generate-contract-lock.mjs` and `scripts/check-contract-lock.mjs`,
    hash the top level of `generated/` without recursing, so no `generated/widgets/` file; its
    `.contract-lock.json` lists 22 files, none a widget schema. No file under `src`, `scripts` or
    `tests` imports Ajv.
  - `ios-LifegamesPortal` (`main` at `fcbb857`): no dependency on the package; its contract scripts
    lock the portal-contract export schemas only.
  - `mantle-LifegamesPortal` (`main` at `d9e1285`) and `agent-enforcement` (`main` at `f4682f0`): no
    reference.
  - `atlas` (`main` at `f97c9fdc`): `scripts/__tests__/component-matrix.test.mjs` resolves
    `generated/widgets/*.schema.json` paths for existence only; it validates nothing.
  - GitHub code search over the `j0nathan-ll0yd` owner for `generated/widgets` and
    `heart-rate.schema.json`: hits in this repository and the atlas test above only.

  **Limit:** the package is public on GitHub Packages, which publishes no dependents list, and code
  search covers default branches only. A consumer outside the `j0nathan-ll0yd` owner cannot be
  enumerated. Such a consumer that validates widget fixtures against these schemas must correct any
  fixture that holds a value the list above names.

  `fixture-map.json` wires the 20 new state fixtures.

## 2.2.1

### Patch Changes

- 2a91f35: Consume `@j0nathan-ll0yd/portal-contract` 2.5.0.

  The declared range moves `^2.0.0` -> `^2.5.0` in `schemas`, `fixtures` and `web`, so the
  floor is explicit rather than resolved by chance. 2.5.0 adds `minLength: 1` to eight
  identity fields across five raw export schemas (LP #297, #299) and publishes the
  WebSocket inbound envelope on a new `./websocket` subpath (LP #296).

  `packages/schemas/.contract-lock.json` is regenerated by `pnpm contract:generate`: five
  export-schema checksums and the aggregate move. The lock itself is not in the schemas
  `files[]`, so it does not ship — the regenerated `swift/WidgetModels.swift` does. That
  Swift delta is formatting only: quicktype stops merging the floored properties into
  combined `let a, b: String` declarations. Every emitted type is unchanged.

  No public export surface changed, so this is a patch on all three.

## 2.2.0

### Minor Changes

- f3e5abf: Consume `@j0nathan-ll0yd/portal-contract` 2.x (`^1.0.0` → `^2.0.0`).

  The caret on 1.x could not reach the published 2.x, so the schema snapshot was frozen at
  its 2026-08-26 state. The regenerated emitted types now carry the producer's
  content-versioned cover fields: `BooksExport.mainImageVersion` and
  `TheatreReviewsExport.imageVersion` (both required-nullable), plus the optional
  `FocusExport.hidingSince`. `.contract-lock.json` is regenerated against the 2.x raw
  schemas; `contract:verify` passes.

  All three additions are additive. No emitted type lost a member.

## 2.1.0

### Minor Changes

- d62c027: Reading widgets render book covers and theatre posters from the real export contract fields, and no image path can reach a third-party host (atlas decision 0086).

  The books export emits `mainImage`, `mainImageThumb`, `mainImageCard`, `mainImageAvif`, `mainImageThumbAvif` and `mainImageCardAvif`, all first-party CloudFront. `Bookshelf.astro` read `cover*` instead — names no export has ever emitted — so its AVIF sources were dead and every cover fell through to a hard-coded `m.media-amazon.com` ASIN URL. That hard-code is why the production site still requested images from Amazon. All four call sites are removed; a missing or broken cover now resolves to a committed same-origin placeholder.

  Breaking for consumers:
  - `BookEntry` (`widgets/reading/Bookshelf.types.ts`) and `AdaptedBookEntry` (`runtime/adapters.ts`) carry the contract's own `mainImage*` names in place of `cover*`. Pass the export fields straight through.
  - `imgFallbackAttrs(src)` takes one argument. The fallback target is always the placeholder, so the previous `originalUrl` argument is gone.
  - The `data-book` payload the Bookshelf writes uses `mainImage` / `mainImageAvif`; BookModal reads those.
  - **Consumers must serve the placeholder.** Copy `@j0nathan-ll0yd/web/assets/no-cover.svg` to `public/images/no-cover.svg`. Without it the fallback 404s. The path is `PLACEHOLDER_IMAGE_SRC` in `runtime/image-utils.ts`.

  `installImageFallbacks` now refuses a `data-fallback` that is not same-origin and substitutes the placeholder, so stale SSR markup from an older build cannot reintroduce a third-party request. `dashboard-books.schema.json` gains the six nullable image fields it previously forbade, which is what lets the SSR shell render a real cover at all.

## 2.0.0

### Major Changes

- 2506ac6: Remove the spurious `./swift/*` export subpath.

  The glob resolved to `swift/WidgetModels.swift` (quicktype-generated Swift
  Codable structs) and a `swift/.gitkeep` placeholder. Neither is a JS module, so
  the export-surface Level-2 extractor could not classify the subpath and reported
  the whole package as INDETERMINATE — which is never a pass.

  `WidgetModels.swift` has no Node consumer: a sweep of design-system-Lifegames,
  j0nathan-ll0yd.github.io, ios-LifegamesPortal, mantle-LifegamesPortal and mantle
  found zero imports of `@j0nathan-ll0yd/schemas/swift`. Its only consumer is the
  Swift target `LifegamesSchemas`, which reaches it through SPM and the repo
  filesystem path, never through Node's `exports` resolution.

  `files` still lists `swift`, so `WidgetModels.swift` continues to ship in the
  tarball unchanged. Removing an `exports` key is a surface removal regardless of
  whether anything consumed it, so this is a major bump.

## 1.0.2

### Patch Changes

- 514314a: Adopt repo-wide Prettier formatting with a blocking CI `format:check` gate (issue #54). Generated artifacts (`packages/copy/dist/*.zod.ts`, schemas `dist` types, `fixture-map.json`, widget schemas, DTCG audit) are now formatted in-generator so they are readable and diff-friendly. This is a formatting-only change — no token values, schema shapes, copy strings, or public APIs change.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Authored schemas for the `media/` data-only fixture domain (OMD app previews,
  S98): `media-file.schema.json`, `media-library.schema.json`,
  `media-profile.schema.json`. Registered in `SCHEMA_ENTRIES` (TS + Swift
  codegen) and wired into the `ds` fixture-map bucket via
  `EXTRA_CATEGORY_WIRING`.
- Optional `basalKcal` and `restingHeartRate` fields on the `movement-rings`
  manual schema; optional `level` field on `diagnostics-monitor` log entries.
- Authored schemas for the `location-visits` data-only fixture domain (LP
  location previews, S98): `visit-timeline.schema.json`,
  `saved-places.schema.json`, `place-search-results.schema.json`.

## [1.0.1]

### Fixed

- `scripts/validate.ts` (a `files[]` entry, so it ships in the tarball): the
  consumer-invocation banner still told readers to run the validator "via
  yalc/npm package". yalc was retired in #153; it now says "via the published
  npm package". Comment-only — no validation behaviour changes.

  Published 1.0.0 predates that edit, so every consumer of `@j0nathan-ll0yd/schemas`
  is still resolving the stale banner. This release exists to actually ship it,
  and is the drift that `pnpm check:package-drift` (added in the same change)
  found.

## [1.0.0]

- Renamed from `@lifegames/schemas` and published to GitHub Packages (#151).

## [0.1.0]

- Initial published version (history predates this changelog; see the root
  `CHANGELOG.md` for cross-package narrative).
