# @j0nathan-ll0yd/web

## 3.2.0

### Minor Changes

- dc34fa3: Harden first-party cover rendering with exact URL sanitization, immutable local availability, atomic picture updates, and deterministic fallbacks.

  Move raw book-cover fixtures to a reserved non-routable host so placeholder keys cannot look like missing public CloudFront objects.

## 3.1.0

### Minor Changes

- 2b86147: Bind the image fallback to server-rendered book covers at load time.

  The SSR shell emits `data-fallback` on Bookshelf covers, but the only code that
  turned that attribute into behaviour was the live-data path (`updateBookshelf`,
  `initBookshelf`, `initTheatreReviews`). Before the live-data swap — on the
  offline PWA shell, on a slow or failing `books.json`, on any cover that 4xxs —
  the covers had no handler and stayed blank, with no placeholder.

  New export `initImageFallbacks(root = document)`: the load-time entry point for
  server-rendered covers. It arms every cover still in flight and, unlike
  `installImageFallbacks`, also recovers covers that already failed before any
  script could run — the ordering SSR always produces. It is idempotent, so the
  island, the production wrapper and a later updater may each call it.
  `Bookshelf.astro` now bundles it (fallback wiring only: no click or keyboard
  binding, so it cannot double-bind a consumer's page-level handlers).

  The same-origin refusal and the `<picture><source>` neutralization from 3.0.1
  are unchanged and apply on this path too. The live-data path is untouched.

## 3.0.1

### Patch Changes

- 79a865d: Make the first-party image fallback actually paint. 3.0.0 shipped it broken two ways, and neither could be seen by the tests that existed.

  `installImageFallbacks` set `img.src` to the placeholder but left the enclosing `<picture>`'s `<source>` candidates in place. Inside a `<picture>` the browser resolves from the first matching `<source>` and only consults `<img src>` when none matched, so a cover whose AVIF source 404s kept re-resolving to the dead source and painted a broken glyph while `img.src` silently held the correct value. `pictureWithAvif()` emits exactly that shape, which is what the Bookshelf renders. The handler now removes the sibling `<source>` elements before swapping the src.

  `src/assets/no-cover.svg` was not well-formed XML. Its comment contained `--` (in the token names `--lg-card-background` and friends), which XML forbids, so no browser could decode it -- the fallback target was itself unrenderable. The comment is reworded and now says why.

  Both were invisible to the suite. Every `installImageFallbacks` test used a bare `<img>`, never the `<picture>` markup the same module generates, and jsdom performs no `<picture>` source selection at all -- with a dead `<source>` still in the DOM it reports `img.src` as the placeholder and passes. `check-placeholder-asset.test.mjs` asserted the asset's identity and path but never that the bytes decode as an image, and a malformed SVG still serves 200 with the right Content-Type.

  Three gates close that, each verified to fail on the unfixed code:
  - `tests/browser/image-fallback.browser.test.ts` renders in real Chromium and asserts on `naturalWidth` and `currentSrc` -- the placeholder paints, the dead source does not survive. Runs in CI as the new `web-browser-runtime` job, on the playwright-labelled runner because the existing web job has no browser binaries.
  - The jsdom suite gains the `<picture>` cases it never had.
  - `check-placeholder-asset.test.mjs` rejects `--` inside an XML comment.

  No API change. Consumers on 3.0.0 need only the version bump; the `/images/no-cover.svg` copy requirement is unchanged, but re-copy the asset because its bytes changed.

## 3.0.0

### Major Changes

- d62c027: Reading widgets render book covers and theatre posters from the real export contract fields, and no image path can reach a third-party host (atlas decision 0086).

  The books export emits `mainImage`, `mainImageThumb`, `mainImageCard`, `mainImageAvif`, `mainImageThumbAvif` and `mainImageCardAvif`, all first-party CloudFront. `Bookshelf.astro` read `cover*` instead — names no export has ever emitted — so its AVIF sources were dead and every cover fell through to a hard-coded `m.media-amazon.com` ASIN URL. That hard-code is why the production site still requested images from Amazon. All four call sites are removed; a missing or broken cover now resolves to a committed same-origin placeholder.

  Breaking for consumers:
  - `BookEntry` (`widgets/reading/Bookshelf.types.ts`) and `AdaptedBookEntry` (`runtime/adapters.ts`) carry the contract's own `mainImage*` names in place of `cover*`. Pass the export fields straight through.
  - `imgFallbackAttrs(src)` takes one argument. The fallback target is always the placeholder, so the previous `originalUrl` argument is gone.
  - The `data-book` payload the Bookshelf writes uses `mainImage` / `mainImageAvif`; BookModal reads those.
  - **Consumers must serve the placeholder.** Copy `@j0nathan-ll0yd/web/assets/no-cover.svg` to `public/images/no-cover.svg`. Without it the fallback 404s. The path is `PLACEHOLDER_IMAGE_SRC` in `runtime/image-utils.ts`.

  `installImageFallbacks` now refuses a `data-fallback` that is not same-origin and substitutes the placeholder, so stale SSR markup from an older build cannot reintroduce a third-party request. `dashboard-books.schema.json` gains the six nullable image fields it previously forbade, which is what lets the SSR shell render a real cover at all.

## 2.1.1

### Patch Changes

- 6828871: Audit comment discipline in published web sources.

## 2.1.0

### Minor Changes

- f61cdf1: Fix portfolio Lighthouse regressions in the production reading widgets: keep
  bookshelf children semantic list items, mark linked theatre posters decorative,
  and attach image fallbacks at runtime without CSP-blocked inline handlers.

  Raise the web caption, metadata, and body typography floors to 0.75rem (12px)
  while retaining fluid clamps and the existing upper bounds.

### Patch Changes

- Updated dependencies [f61cdf1]
  - @j0nathan-ll0yd/tokens@2.2.1

## 2.0.4

### Patch Changes

- Updated dependencies [27dfe68]
  - @j0nathan-ll0yd/copy@1.0.2

## 2.0.3

### Patch Changes

- Updated dependencies [2506ac6]
  - @j0nathan-ll0yd/tokens@2.2.0

## 2.0.2

### Patch Changes

- 514314a: Adopt repo-wide Prettier formatting with a blocking CI `format:check` gate (issue #54). Generated artifacts (`packages/copy/dist/*.zod.ts`, schemas `dist` types, `fixture-map.json`, widget schemas, DTCG audit) are now formatted in-generator so they are readable and diff-friendly. This is a formatting-only change — no token values, schema shapes, copy strings, or public APIs change.
- Updated dependencies [514314a]
  - @j0nathan-ll0yd/copy@1.0.1
  - @j0nathan-ll0yd/tokens@2.1.1

## 2.0.1

### Patch Changes

- Updated dependencies
  - @j0nathan-ll0yd/tokens@2.1.0

## 0.1.0

### Minor Changes

- Initial release of the Lifegames Design System. Includes DTCG tokens (CSS, Swift, JSON), 56 cross-platform widgets (Astro + SwiftUI), web/iOS primitives, runtime data clients, and documentation scaffold.

### Patch Changes

- Updated dependencies
  - @j0nathan-ll0yd/tokens@0.1.0
