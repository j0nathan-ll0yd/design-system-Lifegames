# @j0nathan-ll0yd/tokens

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
