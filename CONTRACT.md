# Lifegames DS Versioning Contract

One-page reference for what every kind of change to the DS means for
downstream consumers. Each consumed surface has its own semver
discipline; this file is the authoritative mapping.

> **Scope.** This contract covers what counts as a major / minor / patch
> bump on each shipped surface. It does **not** cover release process
> mechanics (changesets, yalc, GitHub Packages); see `CONTRIBUTING.md`
> and `packages/*/CHANGELOG.md` for those.

## `@lifegames/tokens` (npm, GitHub Packages)

Consumed by `@lifegames/web` and downstream Astro/SwiftUI consumers via
`tokens.css`, `tokens.js`, and the generated `LifegamesTokens` Swift
module (mirror).

| Change                                                       | Bump   |
|--------------------------------------------------------------|--------|
| CSS var renamed or removed (`--lg-color-foo` → `--lg-color-bar`) | major  |
| Swift accessor renamed or removed (`Color.foo` → `Color.bar`)  | major  |
| Token role removed (semantic-tier role disappears)             | major  |
| New CSS var or Swift accessor added                            | minor  |
| New token family (e.g. new accent role)                        | minor  |
| Value change that crosses the WCAG-AA threshold for an existing pairing | major  |
| Value change that stays within the accessibility band (passes `check-contrast`) | patch  |
| Description / metadata only (`$description`, comments)         | patch  |
| Deprecation announced (`$deprecated: true`, still emitted)     | minor  |

Mapping to platform outputs (web vs iOS) is encoded in
[GOVERNANCE.md §5](GOVERNANCE.md). The
[parity gate](scripts/check-token-parity.mjs) enforces that role hex
values stay identical across platforms — a parity-breaking change
without an entry in `tokens/parity-exceptions.json` is rejected at CI.

## `@lifegames/web` (npm, GitHub Packages)

Consumed by Astro apps (the portfolio site) and by Storybook.

| Change                                                       | Bump   |
|--------------------------------------------------------------|--------|
| Widget Props type field renamed or removed                   | major  |
| Widget Props type field changes shape (e.g. `string` → `Date`) | major  |
| Widget export renamed or removed from `production` barrel    | major  |
| New widget exported from `production` or category barrels    | minor  |
| New optional Props field                                     | minor  |
| Required Props field becomes optional (with default)         | minor  |
| Pure visual / token-driven style change                      | patch  |
| Internal refactor with no public API change                  | patch  |
| Schema-exempt widget marker change (`// schema-exempt:`)     | minor  |

The contract-test job (`pnpm --filter @lifegames/web tsc --noEmit`)
plus the W16 ESLint advisory enforces that `*.types.ts` props match
schemas; the consumer-facing impact of a widget change is judged
against the public `production/index.ts` barrel.

## `@lifegames/schemas` (npm, GitHub Packages)

Consumed by `@lifegames/web` and the mantle backend (vendored).

| Change                                                       | Bump   |
|--------------------------------------------------------------|--------|
| Schema field renamed or removed                              | major  |
| Required field added (backend produces, consumer reads)      | major  |
| Optional field added (graceful on old consumer)              | minor  |
| Description or refinement that does not narrow valid range   | patch  |
| Tightening validation (rejects previously-valid input)       | major  |
| Loosening validation (accepts previously-rejected input)     | minor  |

Backend-driven changes flow into the DS via vendored sync (see
`packages/schemas/CHANGELOG.md` for the propagation log).

## SPM products: `LifegamesTokens`, `LifegamesComponents`, `LifegamesWidgets` (+ `*Watch`)

Consumed by `ios-LifegamesPortal` via SPM. Versioned by repo git tag;
SPM resolves the latest reachable tag matching the consumer's pin.

| Change                                                       | Bump   |
|--------------------------------------------------------------|--------|
| Public API rename / removal (any of: type, function, property) | major  |
| Public Init signature change                                 | major  |
| New public type / function / property                        | minor  |
| New SwiftUI widget added                                     | minor  |
| Internal implementation change with stable public surface    | patch  |
| Resource (xcassets, font) rename / removal                   | major  |
| Resource added                                               | minor  |
| Min iOS deployment target raised                             | major  |
| Min iOS deployment target lowered                            | minor  |

The SPM-to-JS version mapping is documented in
[docs/SPM-VERSION-MAPPING.md](docs/SPM-VERSION-MAPPING.md). When a
breaking SPM change ships, the corresponding `@lifegames/*` npm
packages should also bump (so consumers cannot end up on a JS+Swift
mix that disagrees on a shared role).

## When in doubt

- If a downstream consumer would need a code change to keep building,
  the change is **major** even when the local diff feels small.
- If a downstream consumer can adopt the new bytes with no code change
  but gains a new capability, the change is **minor**.
- Otherwise the change is **patch**.

Cross-surface changes (e.g. a new token consumed by both web widgets
and SwiftUI widgets) require bumping each surface independently per
its own rules above.
