# Lifegames Design System

Unified cross-platform design system powering the Lifegames portfolio — a single source of truth for tokens, components, and widgets across web (Astro) and iOS (SwiftUI).

## Architecture

```
tokens/          DTCG JSON source of truth (W3C Design Token Community Group format)
packages/tokens  @lifegames/tokens — CSS custom properties, JS/JSON outputs via Style Dictionary v4
packages/web     @lifegames/web — Astro components, 29 page-specific widgets, Storybook stories
Sources/         Swift packages — LifegamesTokens, LifegamesComponents, LifegamesWidgets (SPM)
apps/docs        Astro Starlight documentation site
apps/storybook   Storybook 10 component workshop
```

## Quick Start

### Web

```bash
pnpm install
pnpm build:tokens    # Generate CSS/JS/JSON from DTCG tokens
pnpm build           # Build all packages
```

### iOS (Swift Package Manager)

```swift
// Package.swift
dependencies: [
    .package(path: "../design-system-Lifegames")
]
```

```bash
swift build
swift test
```

## Token Tiers

```
primitive → semantic → component → widget
```

- **Primitive**: Raw palette values (colors, spacing scale, font weights)
- **Semantic**: Role-based aliases (surface.base, text.primary, accent.pink)
- **Component**: Component-specific compositions (card.background, card.padding)
- **Widget**: Optional per-widget overrides (widget.heart-rate.glow-color)

## Platforms

| Package | Language | Description |
|---------|----------|-------------|
| `@lifegames/tokens` | CSS/JS/JSON | Design tokens for any platform |
| `@lifegames/web` | Astro | Web components and 29 widgets |
| `LifegamesTokens` | Swift | Generated Color, Font, Spacing extensions |
| `LifegamesComponents` | Swift | iOS/macOS SwiftUI primitives |
| `LifegamesComponentsWatch` | Swift | Watch-safe component subset |
| `LifegamesWidgets` | Swift | 29 SwiftUI widget ports |

## AI Platform Integration

Four pathways for AI-native consumers — all built from the same DTCG token source:

- **Claude Artifacts** (shadcn/ui + OKLCH) — import `@lifegames/tokens/dist/shadcn.css` for instant brand theming in React + Tailwind + shadcn/ui
- **Gemini / Material Web Components** — import `@lifegames/tokens/dist/m3.css` for all 29 Material 3 color roles themed off Lifegames semantic tokens
- **Figma / Tokens Studio / Penpot** — use `@lifegames/tokens/dist/tokens.json` (DTCG 2025.10 compliant)
- **Claude Design** (claude.ai/design) — upload `@lifegames/tokens/dist/DESIGN.md` to seed the design system; one-command upload ritual via `pnpm sync:claude-design`

→ [Full integration docs](apps/docs/src/content/docs/integration/overview.mdx)

### Claude Design sync ritual

```bash
pnpm build:tokens          # regenerates DESIGN.md alongside CSS/JS/JSON/Swift
pnpm sync:claude-design    # opens claude.ai/design + reveals DESIGN.md in Finder
```

DESIGN.md is a deterministic, human-readable brief: brand voice, token architecture, color/typography/spacing/motion/shadow tables, the full 56-widget catalog, and authoring rules. The token build prints a reminder when DESIGN.md content changes, so re-upload to Claude Design isn't forgotten.

Sync is one-way (this repo → Claude Design) and upload is a manual drag — Claude Design has no public ingest API. The deterministic markdown means diffs are reviewable before each upload.

## Governance

- [CONTRACT.md](CONTRACT.md) — versioning contract: what counts as a major / minor / patch bump on each shipped surface (`@lifegames/tokens`, `@lifegames/web`, `@lifegames/schemas`, SPM products).
- [GOVERNANCE.md](GOVERNANCE.md) — placement rules (P1–P8): what belongs in the design system vs the app.
- [CHANGELOG.md](CHANGELOG.md) — cross-package narrative changelog; per-package histories live under `packages/*/CHANGELOG.md`.

## License

MIT — see [LICENSE](LICENSE). Space Grotesk font under [SIL OFL](LICENSES/OFL.txt).
