# @j0nathan-ll0yd/fixtures

## 1.0.9

### Patch Changes

- Updated dependencies [6828871]
  - @j0nathan-ll0yd/web@2.1.1

## 1.0.8

### Patch Changes

- 743885c: Replace fabricated and private GitHub fixture links with verified public targets, and enforce URL integrity across raw and post-adapter fixtures.
- Updated dependencies [f61cdf1]
  - @j0nathan-ll0yd/web@2.1.0

## 1.0.7

### Patch Changes

- @j0nathan-ll0yd/web@2.0.4

## 1.0.6

### Patch Changes

- Updated dependencies [2506ac6]
  - @j0nathan-ll0yd/schemas@2.0.0
  - @j0nathan-ll0yd/web@2.0.3

## 1.0.5

### Patch Changes

- Updated dependencies [514314a]
  - @j0nathan-ll0yd/schemas@1.0.2
  - @j0nathan-ll0yd/web@2.0.2

## 1.0.4

### Patch Changes

- @j0nathan-ll0yd/web@2.0.1

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1]

### Fixed

- Republished so the tarball's `dependencies` pin the current
  `@j0nathan-ll0yd/schemas`. No file under `packages/fixtures` changed — this is
  a **workspace-dependency cascade**: `pnpm publish` rewrites `workspace:*` to a
  concrete version at pack time, so bumping `@j0nathan-ll0yd/schemas` 1.0.0 →
  1.0.1 changed this package's published manifest while its own version stayed
  at the already-published 1.0.0. `changeset publish` silently skips a version
  already on the registry, so every consumer of `@j0nathan-ll0yd/fixtures@1.0.0`
  kept resolving a tarball that pins `@j0nathan-ll0yd/schemas@1.0.0`.

  Found by `scripts/check-package-drift.mjs` after it was rebuilt to compare the
  payload this checkout would publish against the payload already published
  under the declared version. The previous path-based generation could not see
  this class of defect at all: it asked "did a file matching `files[]` change",
  and here none did.

## [1.0.0]

### Added

- Initial publish to GitHub Packages under the `@j0nathan-ll0yd` scope.
