# @j0nathan-ll0yd/schemas

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
