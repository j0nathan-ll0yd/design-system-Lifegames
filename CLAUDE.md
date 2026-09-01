# Lifegames Design System

**Purpose:** Cross-platform design system providing the single source of truth for tokens, components, and widgets consumed by iOS (SwiftUI) and web (Astro). Governed by `GOVERNANCE.md` (principles P1–P8).

**Stack:** DTCG tokens → Style Dictionary v5 → `@j0nathan-ll0yd/tokens` (CSS/JS), `LifegamesTokens` (Swift). 29 web widgets + 30 Swift widgets (health, location, GitHub, identity, reading, other). Astro 6 + Storybook 10. Vite 8 unified.

## Token Rules

- Token names encode ROLE, not value (e.g., `color.accent.pink` not `color.ff006e`)
- All colors flow through DTCG JSON in `tokens/` — never add raw hex values to components
- No raw `Color(hex:)` or `Color(red:green:blue:)` in Swift — use `LifegamesTokens` constants
- No raw hex in CSS — use `var(--lg-*)` custom properties
- Four tiers: primitive → semantic → component → widget (last optional)

## Swift Conventions

- `Package.swift` at repo root (SPM requirement)
- All `#Preview` blocks include `.preferredColorScheme(.dark)`
- No `import UIKit` in View files — use `#if os(iOS)` for platform APIs
- Watch targets must NOT include ECGBackgroundView or PulsingMapMarker
- Font references use PostScript name (e.g., `"SpaceGrotesk-Regular"`)
- Consumers call `LifegamesFonts.registerFonts()` at app launch

## Web Conventions

- Fluid typography/spacing via `clamp()` in CSS output
- Astro components use scoped `<style>` blocks
- Widget fixtures in `Sources/LifegamesWidgets/Resources/widgets/` (shared with iOS via Vite alias)

## Fixture Rules

- Personal data MUST be scrubbed before push (enforced by `scripts/scan-personal-data.sh`)
- All scrubs recorded in `SCRUBBING.md`

## Schema Validation

Schemas live in `packages/schemas/`. Production validator (`validate.ts`) reads `fixture-map.json` and validates fixtures against their schemas using Ajv in strict mode. All schemas must declare `$schema: "http://json-schema.org/draft-07/schema#"` (draft mismatch guard prevents silent failures). Consumer-side invocation: `LIFEGAMES_VALIDATE_CWD=$PWD pnpm ... validate` (Phase D1+).

## Cross-Repo Consumption

Web consumer at `~/Repositories/j0nathan-ll0yd.github.io`; iOS consumer at `~/Repositories/ios-LifegamesPortal`. Both consume the DS JS packages from **GitHub Packages** (`@j0nathan-ll0yd/{copy,tokens,schemas,web,fixtures}` at `^1.0.0`, public — install with the built-in `GITHUB_TOKEN` in CI, no PAT); Swift consumers pin the DS Git tag via SPM.

**When DS packages change:** land the change on `main` with a Changeset; publishing runs from `.github/workflows/publish-ds-packages.yml` (Changesets — `ds-v*` tag or manual dispatch), and `@j0nathan-ll0yd/config` from `publish-config.yml`. Consumers pick up the new version via a normal `pnpm install` / lockfile bump — no local linking step. See `GOVERNANCE.md` §6.1–6.2 for the distribution and version contract.

## Apps

- `apps/portfolio` — Astro 6 static site (was Astro 5)
- `apps/docs` — Astro 6 Starlight documentation (was Astro 5)
- `apps/storybook` — Storybook 10 component workshop (was Storybook 9)
- `apps/swift-gallery` — iOS SwiftUI runtime showcase. Consumes DS via local-path SPM. Six sections: Colors, Typography, Cards, Components, Neon Effects, Widgets. Open with `open apps/swift-gallery/SwiftGallery.xcodeproj`. Dropped from LP's DesignGalleryFeature: BookshelfFeature and HomeFeature showcases (coupling was via PreviewMocks only, not direct symbol references).

All use Vite 8 (unified from prior Vite 6/7 split).

## Formatting & Type Safety

- **Formatters (split by language):**
  - **dprint** owns TS/JS/JSON (`.ts/.tsx/.mts/.cts/.js/.mjs/.cjs/.jsx/.json`). Config: root `dprint.json`, which `extends` the estate standard `@j0nathan-ll0yd/config/dprint.json` (consumed via `workspace:*`, resolved through the pnpm symlink — no GitHub-Packages auth needed for DS's own build). Pinned exact: `dprint` in root devDeps + `allowBuilds` (its postinstall downloads the binary).
  - **Prettier 3.x** (exact-pinned) owns everything dprint can't: `.astro` (dprint has no Astro plugin), `.md/.mdx/.css`. Config: `.prettierrc.mjs` at repo root.
- **Run locally:** `pnpm format` (write) / `pnpm format:check` (CI-equivalent). Both run **dprint then prettier** for the respective file sets.
- **CI gate:** `format` job in `ci.yml` runs `pnpm format:check` (dprint check + prettier check) and is **required for merge**.
- **dprint excludes** (root `dprint.json`) mirror `.prettierignore` so generated/golden files are never reformatted: `**/dist`, tokens golden snapshots, generated schema/fixture artifacts (`packages/schemas/generated`, `fixture-map.json`, `packages/fixtures/src/generated`), `widget-consumers.json`, `Tests/golden-mdx`, `docs/maintenance`, and **all `*.astro`**. The schemas-freshness gate is the proof that no generated artifact was reformatted.
- **Generated artifacts** (`packages/copy/dist`, `packages/schemas/dist`, `packages/schemas/fixture-map.json`) are formatted **in-generator** using `prettier.resolveConfig()` + the root `.prettierrc.mjs` (still Prettier). They are dprint-excluded and are proven consistent by the freshness git-diff, not a top-level format pass. Do not add them to `.prettierignore`.
- **Pre-commit:** `lint-staged` runs `dprint fmt` on staged TS/JS/JSON and `prettier --write` on staged astro/md/mdx/css (via `.husky/pre-commit`). Personal-data scan also runs.
- **Type safety:** every TS package extends `@j0nathan-ll0yd/config/tsconfig-base.json` (strict + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`). `pnpm typecheck` (`turbo run typecheck`) type-checks schemas, fixtures, web, and storybook; enforced by a CI `typecheck` job and the pre-push gate. `packages/web` has its own `tsconfig.json` (its widget source previously had none); a `src/astro-shim.d.ts` types `*.astro` imports + `import.meta.env` for `tsc`.
- **Swift:** explicitly exempt — no Swift formatter in scope. Generated Swift is deterministic from codegen. Follow-up: evaluate SwiftFormat.
- **ESLint** stays per-package (web, copy, tokens, schemas); `eslint-config-prettier` is the last entry in every flat config to disable stylistic conflicts (dprint owns formatting; the prettier-config disables residual stylistic ESLint rules). Follow-up: adopt the shared `@j0nathan-ll0yd/config/eslint` base (out of scope for the dprint migration).

## Component-Contract Catalog (`contracts/component-catalog/`)

Machine-checkable record of what each widget presents: props, states, a11y surface, and whether a
consumer render test holds it to that. Closes the presentation-layer spec-coverage gap (atlas
decision 0060). **Scope:** the UNION of the Swift and web widget trees — 33 widgets at
`CATALOG_SPEC_VERSION` 3, DISCOVERED on every run, never hand-listed. A widget on one platform only
gets a PARTIAL entry (`platforms` names the sides; the absent side is `null`). **Schema vs spec:**
`schema.mjs` is the hand-written normative grammar (zero-dep, `CATALOG_SPEC_VERSION`);
`catalog/*.contract.json` is **generated** by `generate.mjs` — never hand-edit an entry, and never
hand-write a prop shape. Sources: props ← the generated widget schema in
`packages/schemas/generated/widgets/`, states ← fixture + Storybook-snapshot filenames, a11y ←
`.accessibilityLabel(` in the Swift view. The canonical widget id is the generated schema FILENAME,
paired via that schema's `title`; an unmappable Swift view throws rather than being paired by
guesswork. Gaps are written as `null`, never faked as a pass. **Conformance ratchet:**
`conformance-baseline.json` grandfathers the 31 widgets with no behavioral test and the 29 with no
a11y label; a null field whose id is NOT in the matching list FAILS, so a new widget with neither and
a regression that drops either both red. A baseline id naming no widget also FAILS; a graduated
widget's stale id is reported PRUNABLE and must be pruned in the same PR. Missing or unparseable
baseline is a hard RED. Re-record with `node contracts/component-catalog/check.mjs
--update-baseline` — never hand-edit an id. **Baseline freeze** (atlas decision 0102 move 1b): the
baseline is also compared against its own copy at the MERGE BASE, so `--update-baseline` cannot
silently absorb a new gap. Any id ADDED to a gap list FAILS unless a `Baseline-Raise:
<axis>:<widget-id> <reason>` trailer on a commit in the branch (or `CATALOG_BASELINE_RAISE`) names
that exact axis and id and gives a reason; a shrunk set always passes. Identity-keyed, never a count.
Armed by `CI=1` or `CATALOG_BASELINE_FROZEN=1` (`.husky/pre-push` sets it); an unresolvable base is
RED, which is why the CI `governance-gates` checkout uses `fetch-depth: 0`. There is no thaw switch.
Gate: `pnpm check:component-catalog` (grammar conformance + sidecar digest, validity, completeness,
conformance ratchet, baseline freeze, idempotence) — wired into BOTH the CI `governance-gates` step
(required status context) and `.husky/pre-push`; unit tests run under `pnpm test:scripts`, and
`ratchet.test.mjs` also runs directly in `governance-gates` as the freeze's can-fail proof. Bumping
`CATALOG_SPEC_VERSION` means grammar + vectors + `.sha256` sidecar + regenerated catalog in ONE
change. See `contracts/component-catalog/README.md`.

## lp-audit (Audit System — D domain)

This repo hosts the **D-domain audit runners** for the Lifegames Portal `lp-audit` system: `scripts/audit-widget-matrix.mjs` (D1 — widget completeness matrix, reconciles `production-widgets.json` / `widget-manifest.json` / `widget-consumers.json` / `docs/widget-inventory.json` + the filesystem), `scripts/check-baseline-age.mjs` (D2 — visual-baseline staleness), and `scripts/scan-personal-data.sh` (D6 — fixture personal-data scan). They run on schedule via `.github/workflows/audit-ds.yml`. (D5 yalc-staleness was retired with the yalc machinery — atlas#1 / decision 0015 PR 6.) The audit catalog and finding reports live in the atlas hub's `audits/` tree (not this repo) — triage a finding by its catalog id at `atlas/audits/CATALOG.md#<id>`. Runners are report-only during the bake period: a red run is a real finding, not a broken gate.

## Commits

Conventional commit format with trailers. No AI attribution.
