# Lifegames Design System

**Purpose:** Cross-platform design system providing the single source of truth for tokens, components, and widgets consumed by iOS (SwiftUI) and web (Astro). Governed by `GOVERNANCE.md` (principles P1–P8).

**Stack:** DTCG tokens → Style Dictionary v5 → `@lifegames/tokens` (CSS/JS), `LifegamesTokens` (Swift). 37 widgets total (health, location, GitHub, watch). Astro 6 + Storybook 10. Vite 7 unified.

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

All use Vite 7 (unified from prior Vite 6/7 split).

## Commits

Conventional commit format with trailers. No AI attribution.
