# Lifegames Design System

## Token Rules

- Token names encode ROLE, not value (e.g., `color.accent.pink` not `color.ff006e`)
- All colors flow through DTCG JSON in `tokens/` — never add raw hex values to components
- No raw `Color(hex:)` or `Color(red:green:blue:)` in Swift component/widget files — use generated token constants from `LifegamesTokens`
- No raw hex in CSS component files — use `var(--lg-*)` custom properties from `@lifegames/tokens`
- Four token tiers: primitive -> semantic -> component -> widget. Widget tier is optional.

## Swift Conventions

- `Package.swift` MUST stay at repo root (SPM constraint)
- All `#Preview` blocks MUST include `.preferredColorScheme(.dark)`
- No `import UIKit` in View files — use `#if os(iOS)` for platform-specific APIs
- Watch targets MUST NOT include ECGBackgroundView or PulsingMapMarker
- Font references use PostScript name (e.g., `"SpaceGrotesk-Regular"`)
- Consumers MUST call `LifegamesFonts.registerFonts()` at app launch

## Web Conventions

- Fluid typography and spacing via `clamp()` in CSS output
- Astro components use scoped `<style>` blocks
- Widget fixtures live in `Sources/LifegamesWidgets/Resources/widgets/` (shared with iOS via Vite alias)

## Fixture Rules

- Personal data MUST be scrubbed before any remote push
- All scrubs recorded in `Sources/LifegamesWidgets/Resources/widgets/SCRUBBING.md`
- Pre-commit hook (`scripts/scan-personal-data.sh`) enforces this

## Phase 1 Constraints

- Local-only — no `git push`, no npm publish, no GitHub Pages deploy
- CI workflow files exist but are gated behind `vars.REMOTE_ENABLED`

## Cross-Repo Consumption (Phase 1)

The portfolio site `j0nathan-ll0yd.github.io` consumes `@lifegames/tokens`
and `@lifegames/web` via **yalc** (a local npm registry simulator).

Workflow when DS packages change:

```bash
# From DS repo root
pnpm yalc:publish        # rebuilds tokens + pushes both packages to ~/.yalc/

# In github.io repo (first-time setup only)
yalc add @lifegames/tokens @lifegames/web
pnpm install             # or npm install

# In github.io repo (after subsequent DS changes)
# Automatic — `yalc publish --push` propagates updates to all consumers
```

In Phase 2, the same `yalc` consumption flips to npm `^X.Y.Z` from GitHub
Packages without any source changes.

## Commits

- Conventional commit format with trailers
- No AI attribution in commit messages
