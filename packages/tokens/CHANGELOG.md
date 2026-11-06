# @j0nathan-ll0yd/tokens

## 2.4.0

### Minor Changes

- 5a9a6ae: Add the `motion` entrypoint: the single definition of the 33 shared keyframes, plus `.skeleton-bar` and `.skeleton-circle`. It has no global rule.

  `packages/tokens/src/animations.css` and `packages/tokens/src/effects.css` import it, so their consumers keep every keyframe name. A consumer of `effects` also gains the two skeleton classes. The global reduced-motion rule stays in both files and stays out of `motion`.

  The mobile performance block in `effects` now stops `.id-avatar::after`. The block stopped `.id-avatar`, which has no animation.

  Minor: this adds an entrypoint and removes none. Adopt this release together with the matching `packages/web` release.

## 2.3.2

### Patch Changes

- e50a29d: Emit the `system-ui` font family bare in `packages/tokens` CSS. `--lg-font-family-system` read `'system-ui', sans-serif`; quoted, `system-ui` names a font family no system has, so text fell through to `sans-serif` instead of the platform UI font. It now reads `system-ui, sans-serif` in `tokens.css` and `tokens-layered.css`. The emitter keeps every CSS generic family keyword bare. No other token value changes.

## 2.3.1

### Patch Changes

- 8bee355: The Bookshelf tile focus ring in `packages/tokens/src/base.css` now lies inside the tile. `.shelf-book-link:focus-visible::after` takes `outline-offset: -1px` (was `3px`). The overlay covers the tile's padding box, 1px inside its border, so the 2px ring's outer edge is the tile's border edge. The shelf row clips anything past a tile and has no top or side padding, so the old ring, which reached 4px past the tile, lost its top and left edges. Pages that load `tokens/base` without the web package's `a11y.css`, such as the docs showcase, draw this copy. It matches the web package's ring, and `scripts/shelf-ring-geometry.test.mjs` holds the copies to one geometry.

## 2.3.0

### Minor Changes

- 99140ce: Add three iOS typography tokens: `iosTypography.caption2Emphasized` (11.5, weight 500), `iosTypography.captionEmphasized` (12.5, weight 500) and `iosTypography.bodyEmphasized` (13.1, weight 600). They emit new `--lg-iosTypography-*Emphasized-*` CSS custom properties and new entries in `tokens.js`, `tokens.json`, `tokens.d.ts`, `tokens.dtcg.json` and `DESIGN.md`. Every existing token value is unchanged.

## 2.2.2

### Patch Changes

- 0bc9b08: Remove the dead map styles. The website map left on 2026-02-28 (website commit `f50e4520`), and no page renders map markup or loads Leaflet (atlas decision 0157). No rendered pixel changes.
  - `packages/web`: drop `.map-wrapper`, `.map-wrapper .leaflet-container`, `.map-wrapper .leaflet-control-attribution`, `.map-wrapper .leaflet-control-zoom`, `.map-overlay`, `.map-marker-pulse`, `.map-marker-dot`, `.map-marker-ring`, `.map-meta-row` and `.map-meta-value` from `src/styles/components.css`, and the three responsive `.map-wrapper` height overrides from `src/styles/layout.css`. The two stylesheets lose 1810 bytes.
  - `packages/tokens`: drop `@keyframes mapRingPulse` from `src/effects.css`. Only `.map-marker-ring` used it. The file loses 179 bytes.

- f379c75: Move the green book focus ring in `base.css` from `.shelf-book:focus-visible` to `.shelf-book-link:focus-visible::after`, 3px outside the overlay, and give the link itself no ring. The Bookshelf tile no longer takes focus; its title link does, and the link's overlay covers the tile (web minor, atlas decision 0160 D5).

## 2.2.1

### Patch Changes

- f61cdf1: Fix portfolio Lighthouse regressions in the production reading widgets: keep
  bookshelf children semantic list items, mark linked theatre posters decorative,
  and attach image fallbacks at runtime without CSP-blocked inline handlers.

  Raise the web caption, metadata, and body typography floors to 0.75rem (12px)
  while retaining fluid clamps and the existing upper bounds.

## 2.2.0

### Minor Changes

- 2506ac6: Emit `dist/tokens.d.ts`, the declaration file the `.` export has always
  declared but never shipped.

  `package.json` has pointed the `.` export's `types` condition at
  `./dist/tokens.d.ts` since 2.0.0, but the Style Dictionary build never wrote
  one, so consumers got no types at all (`tsc` reported TS7016, "Could not find a
  declaration file for module '@j0nathan-ll0yd/tokens'") and the export-surface
  Level-2 gate read the subpath as INDETERMINATE — a declared-but-absent target
  is never `NO_SURFACE`.

  A new `lifegames/tokens.d.ts` Style Dictionary format generates the declarations
  from the same resolved token tree that produces `dist/tokens.js`, so the two
  cannot drift. Types are literal and `readonly`:
  `tokens.color.pink['500']` now types as `'#ff006e'` rather than `string`. The
  output is byte-gated by a golden snapshot like every other build artifact.

  Additive only — no existing export changed shape.

## 2.1.1

### Patch Changes

- 514314a: Adopt repo-wide Prettier formatting with a blocking CI `format:check` gate (issue #54). Generated artifacts (`packages/copy/dist/*.zod.ts`, schemas `dist` types, `fixture-map.json`, widget schemas, DTCG audit) are now formatted in-generator so they are readable and diff-friendly. This is a formatting-only change — no token values, schema shapes, copy strings, or public APIs change.

## 2.1.0

### Minor Changes

- Remove `style-dictionary` from `@j0nathan-ll0yd/tokens` runtime `dependencies`. It is a build-time token generator only — nothing in the shipped payload (`files[]`/`exports`) imports it at runtime — so it was installing as a non-dev transitive in consumers. It is retained as a single `devDependencies` entry (version range reconciled to `^5.4.4`). This is behavior-visible for consumers (the transitive disappears from their install graph), hence a minor bump.

> **Note (record correction, issue #180).** The commit that shipped this release was marked `fix(tokens)!` — the conventional-commit `!` asserts BREAKING/MAJOR — which contradicts the minor bump applied here. **The minor bump is correct; the `!` marker was overstated.** `style-dictionary` was a genuinely declared runtime dependency (not, as originally worded, a "phantom hoisted transitive"), but nothing in the shipped payload imports it and no consumer imports it, so its removal requires no consumer code change and matches none of the MAJOR triggers in GOVERNANCE §6.2(5). No corrective release is warranted. Full evidence: [`docs/adr/0007-tokens-style-dictionary-removal-semver-tier.md`](../../docs/adr/0007-tokens-style-dictionary-removal-semver-tier.md).

## 0.1.0

### Minor Changes

- Initial release of the Lifegames Design System. Includes DTCG tokens (CSS, Swift, JSON), 56 cross-platform widgets (Astro + SwiftUI), web/iOS primitives, runtime data clients, and documentation scaffold.
