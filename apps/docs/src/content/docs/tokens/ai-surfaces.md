---
title: AI-Surface Tokens
description: Semantic color tokens for surfaces rendered by AI clients — thinking indicators, citations, tool-use disclosure, artifact frames, and code blocks.
---

AI-surface tokens provide first-class semantic primitives for the distinct surfaces that LLM clients render. They ship as native `--lg-color-surface-*` CSS custom properties and as the `AISurfaces` Swift enum.

## Token reference

Source: `tokens/semantic/ai-surfaces.tokens.json`

| Token | CSS custom property | Default value | Description |
|---|---|---|---|
| `color.surface.thinking` | `--lg-color-surface-thinking` | `rgba(255,255,255,0.07)` | AI thinking/reasoning indicator surface |
| `color.surface.citation` | `--lg-color-surface-citation` | `rgba(255,255,255,0.03)` | AI citation reference surface |
| `color.surface.tool-use` | `--lg-color-surface-tool-use` | `rgba(99,102,241,0.08)` | AI tool-use disclosure surface (indigo tint) |
| `color.surface.artifact-frame` | `--lg-color-surface-artifact-frame` | `rgba(255,255,255,0.04)` | AI artifact frame container |
| `color.surface.code-block` | `--lg-color-surface-code-block` | `rgba(0,0,0,0.35)` | AI-rendered code block background |
| `color.surface.code-block-diff.added` | `--lg-color-surface-code-block-diff-added` | `rgba(6,214,160,0.12)` | Diff-added lines in AI code blocks |
| `color.surface.code-block-diff.removed` | `--lg-color-surface-code-block-diff-removed` | `rgba(239,68,68,0.12)` | Diff-removed lines in AI code blocks |

## CSS consumption

```css
.ai-thinking-indicator {
  background: var(--lg-color-surface-thinking);
  border: 1px solid var(--lg-color-border-subtle);
}

.ai-citation {
  background: var(--lg-color-surface-citation);
}

.ai-tool-use-badge {
  background: var(--lg-color-surface-tool-use);
}

.code-block {
  background: var(--lg-color-surface-code-block);
}

.diff-added {
  background: var(--lg-color-surface-code-block-diff-added);
}

.diff-removed {
  background: var(--lg-color-surface-code-block-diff-removed);
}
```

## Swift consumption

The `AISurfaces` namespace is generated at `Sources/LifegamesTokens/AISurfaces.swift`:

```swift
import SwiftUI
import LifegamesTokens

struct ThinkingIndicator: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(AISurfaces.surfaceThinking)
    }
}
```

## Motion pulse tokens

AI streaming and thinking animations use the `motion.pulse.*` tokens from `tokens/motion.tokens.json`:

| Token | CSS property | Value | Use case |
|---|---|---|---|
| `motion.pulse.breathing` | `--lg-motion-pulse-breathing` | 2000ms | Slow breathing cycle for thinking state |
| `motion.pulse.streaming` | `--lg-motion-pulse-streaming` | 500ms | Fast cycle for token-streaming state |

Both collapse to `0ms` under `@media (prefers-reduced-motion: reduce)`.

```css
@keyframes ai-breathing {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.ai-thinking {
  animation: ai-breathing var(--lg-motion-pulse-breathing) ease-in-out infinite;
  background: var(--lg-color-surface-thinking);
}
```

## Integration with shadcn and Material 3

AI-surface tokens are exposed natively as `--lg-*` vars regardless of whether shadcn/ui or Material 3 have equivalents. The shadcn and M3 projection alias files (`tokens/projections/*/alias.json`) may alias some of these surfaces to platform-native roles where appropriate, but the `--lg-color-surface-*` vars are always present.
