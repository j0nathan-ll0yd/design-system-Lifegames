# Changelog

All notable changes to the Lifegames Design System are documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Per-package changelogs are still authoritative for version-bump history:

- `packages/tokens/CHANGELOG.md` — `@j0nathan-ll0yd/tokens`
- `packages/web/CHANGELOG.md` — `@j0nathan-ll0yd/web`
- `packages/schemas/CHANGELOG.md` — `@j0nathan-ll0yd/schemas`

This root file aggregates cross-package narrative — DS-wide governance
changes, contract shifts, deprecation campaigns, and release notes —
that don't naturally fit in a single package's history.

## [Unreleased]

### Added

- **`media/` data-only fixture domain** for OfflineMediaDownloader app previews
  (S98): authored schemas `media-file` / `media-library` / `media-profile` in
  `@j0nathan-ll0yd/schemas`, 8 validated fixture JSON files under
  `Sources/LifegamesWidgets/Resources/widgets/media/`, and public Codable wire
  models (`MediaFileProps`, `MediaLibraryProps`, `MediaProfileProps`) in
  `LifegamesWidgets/Runtime`. Data-only domains (fixtures without a web widget)
  are wired into `fixture-map.json` via `EXTRA_CATEGORY_WIRING` in
  `generate-widget-schemas.mjs`. SPM surface: minor (new public types + resources);
  `@j0nathan-ll0yd/schemas`: minor (new schemas).
- `other/sync-status.{fresh,aging,stale,never-synced}.json` freshness variants
  for Life Portal watch-widget previews.
- **`location-visits` data-only fixture domain** for Life Portal location
  previews (S98): authored schemas `visit-timeline` / `saved-places` /
  `place-search-results`, 5 validated fixture JSON files under
  `Sources/LifegamesWidgets/Resources/widgets/location/`, and public Codable
  wire models (`VisitTimelineProps`, `SavedPlacesProps`,
  `PlaceSearchResultsProps`) in `LifegamesWidgets/Runtime`.
- Optional `basalKcal` / `restingHeartRate` fields on the `movement-rings`
  schema and optional `level` on `diagnostics-monitor` log entries, so Life
  Portal preview adapters can source `TodayHealthData` / `LogEntry` fields from
  canonical fixtures (`@j0nathan-ll0yd/schemas`: minor).
- (placeholder — populated by the DS audit implementation rollout, F-001 → F-034)

### Changed

- (placeholder)

### Deprecated

- (placeholder)

### Removed

- (placeholder)

### Fixed

- (placeholder)

### Security

- (placeholder)
