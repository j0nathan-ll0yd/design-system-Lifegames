# Lifegames Design System

Unified cross-platform design system powering the Lifegames portfolio — a single source of truth for tokens, components, and widgets across web (Astro) and iOS (SwiftUI).

## Architecture

```
tokens/          DTCG JSON source of truth (W3C Design Token Community Group format)
packages/tokens  @lifegames/tokens — CSS custom properties, JS/JSON outputs via Style Dictionary v4
packages/web     @lifegames/web — Astro components, 56 page-specific widgets, Storybook stories
Sources/         Swift packages — LifegamesTokens, LifegamesComponents, LifegamesWidgets (SPM)
apps/docs        Astro Starlight documentation site
apps/storybook   Storybook 8 component workshop
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
| `@lifegames/web` | Astro | Web components and 56 widgets |
| `LifegamesTokens` | Swift | Generated Color, Font, Spacing extensions |
| `LifegamesComponents` | Swift | iOS/macOS SwiftUI primitives |
| `LifegamesComponentsWatch` | Swift | Watch-safe component subset |
| `LifegamesWidgets` | Swift | 56 SwiftUI widget ports |

## License

MIT — see [LICENSE](LICENSE). Space Grotesk font under [SIL OFL](LICENSES/OFL.txt).
