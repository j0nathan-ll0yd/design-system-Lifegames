# @j0nathan-ll0yd/fixtures

## 1.1.0

### Minor Changes

- d62c027: Reading widgets render book covers and theatre posters from the real export contract fields, and no image path can reach a third-party host (atlas decision 0086).

  The books export emits `mainImage`, `mainImageThumb`, `mainImageCard`, `mainImageAvif`, `mainImageThumbAvif` and `mainImageCardAvif`, all first-party CloudFront. `Bookshelf.astro` read `cover*` instead — names no export has ever emitted — so its AVIF sources were dead and every cover fell through to a hard-coded `m.media-amazon.com` ASIN URL. That hard-code is why the production site still requested images from Amazon. All four call sites are removed; a missing or broken cover now resolves to a committed same-origin placeholder.

  Breaking for consumers:
  - `BookEntry` (`widgets/reading/Bookshelf.types.ts`) and `AdaptedBookEntry` (`runtime/adapters.ts`) carry the contract's own `mainImage*` names in place of `cover*`. Pass the export fields straight through.
  - `imgFallbackAttrs(src)` takes one argument. The fallback target is always the placeholder, so the previous `originalUrl` argument is gone.
  - The `data-book` payload the Bookshelf writes uses `mainImage` / `mainImageAvif`; BookModal reads those.
  - **Consumers must serve the placeholder.** Copy `@j0nathan-ll0yd/web/assets/no-cover.svg` to `public/images/no-cover.svg`. Without it the fallback 404s. The path is `PLACEHOLDER_IMAGE_SRC` in `runtime/image-utils.ts`.

  `installImageFallbacks` now refuses a `data-fallback` that is not same-origin and substitutes the placeholder, so stale SSR markup from an older build cannot reintroduce a third-party request. `dashboard-books.schema.json` gains the six nullable image fields it previously forbade, which is what lets the SSR shell render a real cover at all.

### Patch Changes

- Updated dependencies [d62c027]
  - @j0nathan-ll0yd/web@3.0.0
  - @j0nathan-ll0yd/schemas@2.1.0

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
