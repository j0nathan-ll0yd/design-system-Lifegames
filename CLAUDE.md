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

## Commits

- Conventional commit format with trailers
- No AI attribution in commit messages
