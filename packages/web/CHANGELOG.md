# @j0nathan-ll0yd/web

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
