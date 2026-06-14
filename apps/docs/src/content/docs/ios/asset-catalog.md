---
title: iOS Asset Catalog Colors
description: How the design token color pipeline generates Colors.xcassets and the LGColor namespace.
---

## Overview

All color tokens from `tokens/` are compiled into a native `.xcassets` asset catalog at
`Sources/LifegamesTokens/Resources/Colors.xcassets`. This gives iOS (and macOS) access to
colors via `Color("token-name", bundle: .module)` — the standard SwiftUI asset catalog pattern.

The generated `LGColor` enum in `Sources/LifegamesTokens/Color+Tokens.swift` wraps every
colorset as a typed constant. Use `LGColor.*` in all new code.

## Pipeline

```
tokens/*.tokens.json
  └─ style-dictionary.config.mjs (build:tokens)
       ├─ Sources/LifegamesTokens/Resources/Colors.xcassets/
       │    └─ <token-path>.colorset/Contents.json   (71 colorsets)
       └─ Sources/LifegamesTokens/Color+Tokens.swift
            └─ public enum LGColor { ... }
```

Run the pipeline with:

```bash
pnpm build:tokens
```

## Naming Convention

Asset catalog names use full kebab-case token paths:

| Token path                 | Asset name                 | `LGColor` property          |
| -------------------------- | -------------------------- | --------------------------- |
| `color.accent.pink`        | `color-accent-pink`        | `LGColor.accentPink`        |
| `color.surface.base`       | `color-surface-base`       | `LGColor.surfaceBase`       |
| `color.border.interactive` | `color-border-interactive` | `LGColor.borderInteractive` |
| `card.background`          | `card-background`          | `LGColor.cardBackground`    |

The `LGColor` enum drops the leading `color` path segment for brevity:
`color.accent.pink` → `LGColor.accentPink`.

## Usage

```swift
import LifegamesTokens
import SwiftUI

struct MyView: View {
    var body: some View {
        Text("Hello")
            .foregroundStyle(LGColor.accentPink)
            .background(LGColor.surfaceBase)
    }
}
```

## Color Space

All colorsets use **sRGB** with a single universal appearance entry. The design system is
dark-first — every token is defined for dark mode. There are no light-mode variants at this time.

## Legacy Transition

During the `_Legacy/` transition period, `Color+SemanticAliases.swift` provides source-compatible
forwarding aliases for old `Color.colorAccentPink`-style names. These route to `LGColor` and
will be removed after C3 visual approval (`C1.5`).

**Do not use** `Color.colorAccentPink` in new code — use `LGColor.accentPink` directly.

## Round-Trip Tests

`Tests/LifegamesTokensTests/RoundTripColorTests.swift` verifies that each colorset's sRGB
components match the source hex values from `tokens/primitive/color.tokens.json` within
ε = 1/255. Run with:

```bash
swift test --filter RoundTripColorTests
```
