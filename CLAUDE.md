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

## Widget Conventions (W-series)

### W16: Production-Widget Props Extends Schema [INFORMATIONAL]

**Goal:** When a production-widget `Props` interface in `packages/web/src/widgets/**/*.types.ts` is shaped identically to a consumer-aggregate fixture validated by `@lifegames/schemas`, it SHOULD extend that schema-derived type. The branded `SchemaDerived<T>` from `@lifegames/schemas` makes the relationship explicit at the type level.

**Discovery (2026-05-25):** Most existing widget Props are DS-internal narrow shapes that DO NOT match consumer-aggregate fixtures directly. The fixture-validation seam (ajv strict mode against `data/*.json`) is at the consumer-prebuild level, not at the widget Props level. Per-widget DS schemas are a deferred follow-up plan.

**Current enforcement:** ESLint rule `lifegames-local/widget-props-extends-schema` runs as a `warn` (not `error`). All 55 existing `.types.ts` files carry a leading `// schema-exempt: <reason>` comment. New widgets that consume a consumer-aggregate fixture directly SHOULD drop the exemption and extend `SchemaDerived<X>` from `@lifegames/schemas`.

**Escape hatch:** Leading comment `// schema-exempt: <reason>` opts a file out. Already applied to all current widgets pending the follow-up plan.
