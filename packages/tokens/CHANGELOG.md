# @j0nathan-ll0yd/tokens

## 2.1.0

### Minor Changes

- Remove `style-dictionary` from `@j0nathan-ll0yd/tokens` runtime `dependencies`. It is a build-time token generator only — nothing in the shipped payload (`files[]`/`exports`) imports it at runtime — so it was installing as a non-dev transitive in consumers. It is retained as a single `devDependencies` entry (version range reconciled to `^5.4.4`). This is behavior-visible for consumers (the transitive disappears from their install graph), hence a minor bump.

## 0.1.0

### Minor Changes

- Initial release of the Lifegames Design System. Includes DTCG tokens (CSS, Swift, JSON), 56 cross-platform widgets (Astro + SwiftUI), web/iOS primitives, runtime data clients, and documentation scaffold.
