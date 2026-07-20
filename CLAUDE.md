# Lifegames Design System

**Purpose:** Cross-platform design system providing the single source of truth for tokens, components, and widgets consumed by iOS (SwiftUI) and web (Astro). Governed by `GOVERNANCE.md` (principles P1–P8).

**Stack:** DTCG tokens → Style Dictionary v5 → `@lifegames/tokens` (CSS/JS), `LifegamesTokens` (Swift). 29 web widgets + 30 Swift widgets (health, location, GitHub, identity, reading, other). Astro 6 + Storybook 10. Vite 7 unified.

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

Web consumer at `~/Repositories/j0nathan-ll0yd.github.io`; iOS consumer at `~/Repositories/ios-LifegamesPortal`. Both consume via **yalc** (local npm registry simulator).

**Workflow when DS packages change:**

```bash
# From DS repo root
pnpm yalc:publish    # rebuilds tokens + pushes @lifegames/{tokens,web,schemas}

# In consumers (automatic propagation via yalc publish --push)
```

Phase 2 flips to npm `^X.Y.Z` from GitHub Packages without source changes.

## Apps

- `apps/portfolio` — Astro 6 static site (was Astro 5)
- `apps/docs` — Astro 6 Starlight documentation (was Astro 5)
- `apps/storybook` — Storybook 10 component workshop (was Storybook 9)
- `apps/swift-gallery` — iOS SwiftUI runtime showcase. Consumes DS via local-path SPM. Six sections: Colors, Typography, Cards, Components, Neon Effects, Widgets. Open with `open apps/swift-gallery/SwiftGallery.xcodeproj`. Dropped from LP's DesignGalleryFeature: BookshelfFeature and HomeFeature showcases (coupling was via PreviewMocks only, not direct symbol references).

All use Vite 7 (unified from prior Vite 6/7 split).

## Formatting & Type Safety

- **Formatters (split by language):**
  - **dprint** owns TS/JS/JSON (`.ts/.tsx/.mts/.cts/.js/.mjs/.cjs/.jsx/.json`). Config: root `dprint.json`, which `extends` the estate standard `@j0nathan-ll0yd/config/dprint.json` (consumed via `workspace:*`, resolved through the pnpm symlink — no GitHub-Packages auth needed for DS's own build). Pinned exact: `dprint` in root devDeps + `allowBuilds` (its postinstall downloads the binary).
  - **Prettier 3.x** (exact-pinned) owns everything dprint can't: `.astro` (dprint has no Astro plugin), `.md/.mdx/.css`. Config: `.prettierrc.mjs` at repo root.
- **Run locally:** `pnpm format` (write) / `pnpm format:check` (CI-equivalent). Both run **dprint then prettier** for the respective file sets.
- **CI gate:** `format` job in `ci.yml` runs `pnpm format:check` (dprint check + prettier check) and is **required for merge**.
- **dprint excludes** (root `dprint.json`) mirror `.prettierignore` so generated/golden files are never reformatted: `**/dist`, tokens golden snapshots, generated schema/fixture artifacts (`packages/schemas/generated`, `fixture-map.json`, `packages/fixtures/src/generated`), `widget-consumers.json`, `Tests/golden-mdx`, `docs/maintenance`, `.yalc`, and **all `*.astro`**. The schemas-freshness gate is the proof that no generated artifact was reformatted.
- **Generated artifacts** (`packages/copy/dist`, `packages/schemas/dist`, `packages/schemas/fixture-map.json`) are formatted **in-generator** using `prettier.resolveConfig()` + the root `.prettierrc.mjs` (still Prettier). They are dprint-excluded and are proven consistent by the freshness git-diff, not a top-level format pass. Do not add them to `.prettierignore`.
- **Pre-commit:** `lint-staged` runs `dprint fmt` on staged TS/JS/JSON and `prettier --write` on staged astro/md/mdx/css (via `.husky/pre-commit`). Personal-data scan also runs.
- **Type safety:** every TS package extends `@j0nathan-ll0yd/config/tsconfig-base.json` (strict + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`). `pnpm typecheck` (`turbo run typecheck`) type-checks schemas, fixtures, web, and storybook; enforced by a CI `typecheck` job and the pre-push gate. `packages/web` has its own `tsconfig.json` (its widget source previously had none); a `src/astro-shim.d.ts` types `*.astro` imports + `import.meta.env` for `tsc`.
- **Swift:** explicitly exempt — no Swift formatter in scope. Generated Swift is deterministic from codegen. Follow-up: evaluate SwiftFormat.
- **ESLint** stays per-package (web, copy, tokens, schemas); `eslint-config-prettier` is the last entry in every flat config to disable stylistic conflicts (dprint owns formatting; the prettier-config disables residual stylistic ESLint rules). Follow-up: adopt the shared `@j0nathan-ll0yd/config/eslint` base (out of scope for the dprint migration).

## lp-audit (Audit System — D domain)

This repo hosts the **D-domain audit runners** for the Lifegames Portal `lp-audit` system: `scripts/audit-widget-matrix.mjs` (D1 — widget completeness matrix, reconciles `production-widgets.json` / `widget-manifest.json` / `widget-consumers.json` / `docs/widget-inventory.json` + the filesystem), `scripts/check-baseline-age.mjs` (D2 — visual-baseline staleness), `scripts/check-yalc-staleness.mjs` (D5 — yalc link freshness), and `scripts/scan-personal-data.sh` (D6 — fixture personal-data scan). They run on schedule via `.github/workflows/audit-ds.yml`. The audit catalog and finding reports live in the monorepo hub's `audits/` tree (not this repo) — triage a finding by its catalog id at `audits/CATALOG.md#<id>`. Runners are report-only during the bake period: a red run is a real finding, not a broken gate.

## Commits

Conventional commit format with trailers. No AI attribution.
