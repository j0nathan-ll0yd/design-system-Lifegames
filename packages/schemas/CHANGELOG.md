# @j0nathan-ll0yd/schemas

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
