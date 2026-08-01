# @j0nathan-ll0yd/schemas

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

## [0.1.0]

- Initial published version (history predates this changelog; see the root
  `CHANGELOG.md` for cross-package narrative).
