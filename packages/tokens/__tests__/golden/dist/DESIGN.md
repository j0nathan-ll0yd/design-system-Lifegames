# Lifegames Design System

> Generated from `tokens/*.tokens.json` — do not edit by hand.
> Re-upload to claude.ai/design after every meaningful token change.

## Brand & Voice

_Voice source of truth: `packages/copy/VOICE.md` — this section is generated from `packages/copy/voice.summary.json`._

**Precise · Wry · Defiantly human.** The voice of a human broadcasting himself in machine-readable form — on his own terms. Legible to the machine, never surrendered to it. A wry engineer at a terminal: precise, dry, quietly confident; shows the work, skips the hype; renders a life as a datastream while insisting the human is the irreducible source, not an obsolete algorithm.

Visual language: dark-first, neon-accented, cross-platform (web Astro + iOS SwiftUI) — deep near-black surfaces, glassy translucent cards, vivid neon accents (pink, indigo, cyan), fluid typography that scales with viewport, and motion that favors decelerated easing.

**Registers** (the `register` enum): `atom`, `label`, `factual`, `expressive`, `machine`, `brand`, `consent`.

**Audiences** (the `audience` field): `human`, `machine`, `dual`.

**Arbitration rule:** Literal-first in machine surfaces; allusive only in human-narrative ones. Never sacrifice parseability for flavor in any string whose usage[] touches a machine surface (llms-txt, llms-full, JSON-LD, .txt, feed, <SYSTEM>).

**Principles:** One voice, many registers; Legible to machines, irreducibly human; Wit through precision, not volume; Show the work, skip the hype; Data is a mirror, not a coach; Earn the aesthetic through ethos; dose the flavor; Each string does one thing.

## Token Architecture

Four tiers, applied in order of specificity:

1. **Primitive** — raw values (`color.pink.500 = #ff006e`). Never reference these directly from components.
2. **Semantic** — role-based aliases (`color.accent.pink → {color.pink.500}`). The consumer-facing layer.
3. **Component** — component-scoped overrides (`card.background`).
4. **Widget** — widget-scoped overrides (optional tier).

**Rule:** Token names encode ROLE, not value. Use `color.accent.pink`, never `color.ff006e`.

## Color Palette

### Primitive colors

| Token | Value |
|---|---|
| `color.pink.400` | `#ff69b4` |
| `color.pink.500` | `#ff006e` |
| `color.blue.300` | `#7eb4ff` |
| `color.blue.500` | `#3a86ff` |
| `color.blue.550` | `#0c69ff` |
| `color.blue.600` | `#3b82f6` |
| `color.blue.700` | `#5676e2` |
| `color.green.500` | `#06d6a0` |
| `color.amber.500` | `#f59e0b` |
| `color.purple.400` | `#c084fc` |
| `color.purple.500` | `#a855f7` |
| `color.purple.550` | `#9e41f6` |
| `color.purple.600` | `#8b5cf6` |
| `color.red.400` | `#f87171` |
| `color.red.500` | `#ef4444` |
| `color.red.apple` | `#ff3b30` |
| `color.cyan.500` | `#00d4ff` |
| `color.orange.500` | `#ff6b00` |
| `color.yellow.500` | `#ffd600` |
| `color.gold.500` | `#ffd700` |
| `color.silver.500` | `#c0c0c0` |
| `color.bronze.500` | `#cd7f32` |
| `color.indigo.500` | `#818cf8` |
| `color.indigo.600` | `#6366f1` |
| `color.indigo.700` | `#5e5ce6` |
| `color.gray.900` | `#0a0a0f` |
| `color.gray.950` | `#06060f` |
| `color.zinc.100` | `#fafafa` |
| `color.zinc.200` | `#e4e4e7` |
| `color.zinc.300` | `#f0f0f0` |
| `color.zinc.400` | `#9ca3af` |
| `color.zinc.500` | `#8e8e97` |
| `color.zinc.600` | `#85858e` |
| `color.zinc.700` | `#7c7c84` |
| `color.white.pure` | `#ffffff` |
| `color.appleHealth.green` | `#34c759` |
| `color.alpha.white3` | `rgba(255,255,255,0.03)` |
| `color.alpha.white4` | `rgba(255,255,255,0.04)` |
| `color.alpha.white5` | `rgba(255,255,255,0.05)` |
| `color.alpha.white6` | `rgba(255,255,255,0.06)` |
| `color.alpha.white7` | `rgba(255,255,255,0.07)` |
| `color.alpha.white10` | `rgba(255,255,255,0.1)` |
| `color.alpha.white18` | `rgba(255,255,255,0.18)` |
| `color.alpha.black35` | `rgba(0,0,0,0.35)` |
| `color.sleep.deep` | `#5676e2` |
| `color.sleep.rem` | `#9e41f6` |
| `color.sleep.core` | `#0c69ff` |
| `color.sleep.awake` | `#9ca3af` |
| `color.podium.gold` | `#ffd700` |
| `color.podium.silver` | `#c0c0c0` |
| `color.podium.bronze` | `#cd7f32` |

### Semantic roles

#### color.surface

| Token | Resolves to | Description |
|---|---|---|
| `color.surface.thinking` | `rgba(255,255,255,0.05)` | Background for AI thinking/reasoning indicator surfaces |
| `color.surface.citation` | `rgba(255,255,255,0.03)` | Background for AI citation reference surfaces |
| `color.surface.tool-use` | `rgba(99,102,241,0.08)` | Background for AI tool-use disclosure surfaces (indigo tint — not covered by white/black alpha primitive set) |
| `color.surface.artifact-frame` | `rgba(255,255,255,0.04)` | Background for AI artifact frame containers |
| `color.surface.code-block` | `rgba(0,0,0,0.35)` | Background for AI-rendered code block surfaces |
| `color.surface.code-block-diff.added` | `rgba(6,214,160,0.12)` | Background for diff-added lines in AI code blocks |
| `color.surface.code-block-diff.removed` | `rgba(239,68,68,0.12)` | Background for diff-removed lines in AI code blocks |
| `color.surface.base` | `#06060f` | Primary background |
| `color.surface.deep` | `#0a0a0f` | Secondary background |
| `color.surface.raised` | `rgba(255,255,255,0.05)` | Card/glass background (5% white overlay) |
| `color.surface.raisedHover` | `rgba(255,255,255,0.07)` | Card hover state — brighter than rest per industry-default hover-emphasis convention |
| `color.surface.inset` | `rgba(255,255,255,0.03)` | Inset/recessed surface |

#### color.border

| Token | Resolves to | Description |
|---|---|---|
| `color.border.default` | `rgba(255,255,255,0.06)` | Default border |
| `color.border.subtle` | `rgba(255,255,255,0.1)` | Glass border |
| `color.border.strong` | `rgba(255,255,255,0.18)` | Emphasized border |
| `color.border.interactive` | `rgba(99,102,241,0.2)` | Interactive hover border (indigo accent — not covered by white/black alpha primitive set) |

#### color.text

| Token | Resolves to | Description |
|---|---|---|
| `color.text.title` | `#fafafa` | Heading text |
| `color.text.primary` | `#f0f0f0` | Body text. Resolves to zinc.300 = #f0f0f0 identically across web (--text), the Swift color-text-primary xcasset, and LGColor.textPrimary — cross-platform parity holds. See docs/adr/0006-text-primary-token-parity.md. |
| `color.text.muted` | `#9ca3af` | Secondary text. Uses web value #9ca3af cross-platform. Converged upward for accessibility (MA2). |
| `color.text.subtle` | `#85858e` | Tertiary text |
| `color.text.disabled` | `#7c7c84` | Disabled/arrow text |

#### color.accent

| Token | Resolves to | Description |
|---|---|---|
| `color.accent.pink` | `#ff006e` |  |
| `color.accent.blue` | `#3a86ff` |  |
| `color.accent.blue-on-dark` | `#7eb4ff` | Accessible blue for readable text on the dashboard dark background (#06060f). ~9:1 contrast — meets WCAG AA (≥4.5:1) and AAA (≥7:1). Use wherever blue.500 (#3a86ff, ~1.78:1) would appear as readable text on dark surfaces. |
| `color.accent.green` | `#06d6a0` |  |
| `color.accent.amber` | `#f59e0b` |  |
| `color.accent.purple` | `#a855f7` |  |
| `color.accent.red` | `#ef4444` |  |
| `color.accent.cyan` | `#00d4ff` |  |
| `color.accent.orange` | `#ff6b00` |  |
| `color.accent.indigo` | `#818cf8` |  |
| `color.accent.default` | `#6366f1` | Primary accent (iOS accent) |

#### color.accent-hc

| Token | Resolves to | Description |
|---|---|---|
| `color.accent-hc.pink` | `#ff69b4` | High-contrast variant (AAA) |
| `color.accent-hc.purple` | `#c084fc` |  |
| `color.accent-hc.red` | `#f87171` |  |

#### color.health

| Token | Resolves to | Description |
|---|---|---|
| `color.health.red` | `#ff3b30` | Apple Health move ring |
| `color.health.green` | `#34c759` | Apple Health exercise ring |
| `color.health.purple` | `#5e5ce6` | Apple Health stand ring |

#### color.interactive

| Token | Resolves to | Description |
|---|---|---|
| `color.interactive.default` | `#6366f1` | Buttons, links |
| `color.interactive.hover` | `#8b5cf6` | Hover state |

#### color.status

| Token | Resolves to | Description |
|---|---|---|
| `color.status.warning` | `#ffd600` | Warning state (iOS statusWarning) |

## Typography

Fluid type scale via `clamp()` on web; SwiftUI `Font.custom(..., relativeTo:)` on iOS for Dynamic Type. Font family: **Space Grotesk** (PostScript names: `SpaceGrotesk-Regular`, `-Medium`, `-SemiBold`, `-Bold`, `-Light`).

| Style | Fluid size (web) | iOS text style | Weight |
|---|---|---|---|
| `caption2` | `clamp(0.75rem, 0.70rem + 0.10vw, 0.78rem)` | `.caption2` | Regular (400) |
| `caption` | `clamp(0.75rem, 0.70rem + 0.14vw, 0.80rem)` | `.caption` | Regular (400) |
| `footnote` | `clamp(0.75rem, 0.68rem + 0.20vw, 0.82rem)` | `.footnote` | Regular (400) |
| `body` | `clamp(0.75rem, 0.68rem + 0.20vw, 0.82rem)` | `.body` | Regular (400) |
| `callout` | `clamp(0.75rem, 0.68rem + 0.20vw, 0.82rem)` | `.callout` | Regular (400) |
| `subhead` | `clamp(0.88rem, 0.75rem + 0.34vw, 1.05rem)` | `.subheadline` | Medium (500) |
| `headline` | `clamp(1.20rem, 0.98rem + 0.60vw, 1.50rem)` | `.headline` | SemiBold (600) |
| `title3` | `clamp(1.60rem, 1.30rem + 0.80vw, 2.00rem)` | `.title3` | Bold (700) |
| `title2` | `clamp(1.90rem, 1.53rem + 1.00vw, 2.40rem)` | `.title2` | Bold (700) |
| `title1` | `clamp(2.10rem, 1.70rem + 1.05vw, 2.625rem)` | `.title` | Bold (700) |
| `hero` | `clamp(1.80rem, 1.50rem + 0.80vw, 2.20rem)` | `.largeTitle` | Bold (700) |
| `display` | `` | `` | Bold (700) |
| `heading1` | `` | `` | Bold (700) |
| `heading2` | `` | `` | SemiBold (600) |
| `body` | `clamp(0.75rem, 0.68rem + 0.20vw, 0.82rem)` | `.body` | Regular (400) |
| `label` | `` | `` | Medium (500) |
| `caption` | `clamp(0.75rem, 0.70rem + 0.14vw, 0.80rem)` | `.caption` | Regular (400) |
| `code` | `` | `` | Regular (400) |

## Spacing

Fluid spacing scale. Web uses `clamp()`; iOS uses the max pixel value as `CGFloat`.

| Token | Web (fluid) | iOS (CGFloat) |
|---|---|---|
| `space.50` | `clamp(1px, 0.02rem + 0.13vw, 2px)` | `2px` |
| `space.100` | `clamp(3px, 0.14rem + 0.13vw, 4px)` | `4px` |
| `space.150` | `clamp(4px, 0.16rem + 0.25vw, 6px)` | `6px` |
| `space.200` | `clamp(6px, 0.28rem + 0.25vw, 8px)` | `8px` |
| `space.250` | `clamp(7px, 0.30rem + 0.38vw, 10px)` | `10px` |
| `space.300` | `clamp(8px, 0.31rem + 0.50vw, 12px)` | `12px` |
| `space.350` | `clamp(10px, 0.44rem + 0.50vw, 14px)` | `14px` |
| `space.400` | `clamp(11px, 0.45rem + 0.63vw, 16px)` | `16px` |
| `space.450` | `clamp(12px, 0.47rem + 0.75vw, 18px)` | `18px` |
| `space.500` | `clamp(14px, 0.59rem + 0.75vw, 20px)` | `20px` |
| `space.600` | `clamp(16px, 0.63rem + 1.00vw, 24px)` | `24px` |
| `space.700` | `clamp(18px, 0.66rem + 1.25vw, 28px)` | `28px` |
| `space.800` | `clamp(22px, 0.91rem + 1.25vw, 32px)` | `32px` |
| `space.900` | `clamp(24px, 0.94rem + 1.50vw, 36px)` | `36px` |
| `space.1000` | `clamp(28px, 1.19rem + 1.50vw, 40px)` | `40px` |
| `space.1200` | `clamp(32px, 1.25rem + 2.00vw, 48px)` | `48px` |
| `space.1600` | `64px` | `64px` |

## Motion

### Duration

| Token | Value |
|---|---|
| `motion.duration.instant` | `0ms` |
| `motion.duration.fast` | `150ms` |
| `motion.duration.normal` | `300ms` |
| `motion.duration.slow` | `500ms` |
| `motion.duration.slower` | `600ms` |
| `motion.delay.short` | `50ms` |
| `motion.delay.normal` | `100ms` |
| `motion.reduced.duration` | `0ms` |
| `motion.pulse.breathing` | `2000ms` |
| `motion.pulse.streaming` | `500ms` |

### Easing (cubic-bezier)

| Token | Curve |
|---|---|
| `motion.easing.standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `motion.easing.decelerate` | `cubic-bezier(0, 0, 0.2, 1)` |
| `motion.easing.accelerate` | `cubic-bezier(0.4, 0, 1, 1)` |
| `motion.easing.overshoot` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `motion.reduced.easing` | `cubic-bezier(0, 0, 1, 1)` |

**Default behavior:** prefer `standard` for most transitions, `decelerate` for entering elements, `overshoot` for playful affordances.

## Shadows

| Token | Layers |
|---|---|
| `shadow.glow.pink` | `0px 0px 20px 0px rgba(255,0,110,0.3) / 0px 0px 40px 0px rgba(255,0,110,0.15)` |
| `shadow.glow.blue` | `0px 0px 20px 0px rgba(58,134,255,0.3) / 0px 0px 40px 0px rgba(58,134,255,0.15)` |
| `shadow.glow.green` | `0px 0px 20px 0px rgba(6,214,160,0.3) / 0px 0px 40px 0px rgba(6,214,160,0.15)` |
| `shadow.glow.amber` | `0px 0px 20px 0px rgba(245,158,11,0.3) / 0px 0px 40px 0px rgba(245,158,11,0.15)` |
| `shadow.glow.purple` | `0px 0px 20px 0px rgba(168,85,247,0.3) / 0px 0px 40px 0px rgba(168,85,247,0.15)` |
| `shadow.glow.red` | `0px 0px 20px 0px rgba(239,68,68,0.3) / 0px 0px 40px 0px rgba(239,68,68,0.15)` |
| `shadow.glow.cyan` | `0px 0px 20px 0px rgba(0,212,255,0.3) / 0px 0px 40px 0px rgba(0,212,255,0.15)` |
| `shadow.glow.orange` | `0px 0px 20px 0px rgba(255,107,0,0.3) / 0px 0px 40px 0px rgba(255,107,0,0.15)` |
| `shadow.glow.indigo` | `0px 0px 20px 0px rgba(129,140,248,0.3) / 0px 0px 40px 0px rgba(129,140,248,0.15)` |
| `shadow.glow.pinkSm` | `0px 0px 12px 0px rgba(255,0,110,0.25)` |
| `shadow.glow.blueSm` | `0px 0px 12px 0px rgba(58,134,255,0.25)` |
| `shadow.glow.greenSm` | `0px 0px 12px 0px rgba(6,214,160,0.25)` |
| `shadow.glow.amberSm` | `0px 0px 12px 0px rgba(245,158,11,0.25)` |
| `shadow.glow.purpleSm` | `0px 0px 12px 0px rgba(168,85,247,0.25)` |
| `shadow.glow.redSm` | `0px 0px 12px 0px rgba(239,68,68,0.25)` |
| `shadow.glow.cyanSm` | `0px 0px 12px 0px rgba(0,212,255,0.25)` |
| `shadow.glow.orangeSm` | `0px 0px 12px 0px rgba(255,107,0,0.25)` |
| `shadow.glow.indigoSm` | `0px 0px 12px 0px rgba(129,140,248,0.25)` |
| `shadow.glow.accent` | `0px 0px 20px 0px rgba(129,140,248,0.3) / 0px 0px 40px 0px rgba(129,140,248,0.15)` |
| `shadow.glow.accentSm` | `0px 0px 12px 0px rgba(129,140,248,0.25)` |

## Component Tokens

### card

| Token | Value |
|---|---|
| `card.background` | `rgba(255,255,255,0.05)` |
| `card.border` | `rgba(255,255,255,0.06)` |
| `card.borderHover` | `rgba(99,102,241,0.2)` |
| `card.cornerRadius` | `16px` |
| `card.padding` | `32px` |
| `card.paddingCompact` | `18px` |
| `card.neonCornerRadius` | `20px` |
| `card.glassBorder` | `rgba(255,255,255,0.1)` |

### line-height

| Token | Value |
|---|---|
| `line-height.none` | `1` |
| `line-height.tight` | `1.25` |
| `line-height.snug` | `1.3` |
| `line-height.compact` | `1.35` |
| `line-height.base` | `1.55` |
| `line-height.relaxed` | `1.6` |
| `line-height.loose` | `1.65` |
| `line-height.looser` | `1.7` |

### transition

| Token | Value |
|---|---|
| `transition.default` | `{"duration":"300ms","timingFunction":[0.4,0,0.2,1],"delay":"50ms"}` |
| `transition.fast` | `{"duration":"150ms","timingFunction":[0.4,0,0.2,1],"delay":"0ms"}` |
| `transition.enter` | `{"duration":"300ms","timingFunction":[0,0,0.2,1],"delay":"50ms"}` |
| `transition.exit` | `{"duration":"150ms","timingFunction":[0.4,0,1,1],"delay":"0ms"}` |
| `transition.spring` | `{"duration":"500ms","timingFunction":[0.34,1.56,0.64,1],"delay":"0ms"}` |

### z

| Token | Value |
|---|---|
| `z.behind` | `-1` |
| `z.base` | `0` |
| `z.raised` | `1` |
| `z.raised-2` | `2` |
| `z.raised-3` | `3` |
| `z.raised-4` | `4` |
| `z.panel` | `10` |
| `z.header` | `20` |
| `z.overlay` | `500` |
| `z.skip-link` | `10000` |

## Widget Catalog

Single-purpose UI surfaces sharing a common dark/neon aesthetic. 32 widgets across 6 categories. Each widget consumes a JSON fixture and renders identically on web (Astro) and iOS (SwiftUI).

### github

| Widget | View Type | Fixture | Production |
|---|---|---|---|
| `ActivityFeed` | `ActivityFeedView` | `github/activity-feed.json` | no |
| `CommitLog` | `CommitLogView` | `github/commit-log.json` | no |
| `CommitTimeline` | `CommitTimelineView` | `github/commit-timeline.json` | no |
| `DevActivityCards` | `DevActivityCardsView` | `github/dev-activity-cards.json` | no |
| `DevActivityLog` | `DevActivityLogView` | `github/dev-activity-log.json` | yes (mind) |
| `DevActivityTimeline` | `DevActivityTimelineView` | `github/dev-activity-timeline.json` | no |
| `LanguageBars` | `LanguageBarsView` | `github/language-bars.json` | no |
| `LanguageStack` | `LanguageStackView` | `github/language-stack.json` | no |
| `PinnedRepos` | `PinnedReposView` | `github/pinned-repos.json` | no |
| `StarredRepoList` | `StarredRepoListView` | `github/starred-repo-list.json` | yes (mind) |
| `WeeklyPulse` | `WeeklyPulseView` | `github/weekly-pulse.json` | no |

### health

| Widget | View Type | Fixture | Production |
|---|---|---|---|
| `HeartRate` | `HeartRateView` | `health/heart-rate.json` | yes (body) |
| `Hydration` | `HydrationView` | `health/hydration.json` | yes (body) |
| `MovementRings` | `MovementRingsView` | `health/movement-rings.json` | yes (body) |
| `NightSummary` | `NightSummaryView` | `health/night-summary.json` | yes (body) |
| `Workouts` | `WorkoutsView` | `health/workouts.json` | yes (body) |

### identity

| Widget | View Type | Fixture | Production |
|---|---|---|---|
| `BioTerminal` | `BioTerminalView` | `identity/bio-terminal.json` | yes (left-panel) |
| `ComingSoon` | `ComingSoonView` | `identity/coming-soon.json` | no |
| `IdentityCard` | `IdentityCardView` | `identity/identity-card.json` | yes (left-panel) |

### location

| Widget | View Type | Fixture | Production |
|---|---|---|---|
| `ExplorationOdometer` | `ExplorationOdometerView` | `location/exploration-odometer-v3.json` | yes (body) |
| `PlaceLeaderboard` | `PlaceLeaderboardView` | `location/place-leaderboard-v3.json` | yes (body) |

### other

| Widget | View Type | Fixture | Production |
|---|---|---|---|
| `DiagnosticsMonitor` | `DiagnosticsMonitorView` | `other/diagnostics-monitor.json` | no |
| `DndOverlay` | `DndOverlayView` | `other/dnd-overlay.json` | no |
| `FocusOverlay` | `FocusOverlayView` | `other/focus-overlay.json` | no |
| `GitHubHeatmap` | `GitHubHeatmapView` | `other/github-heatmap.json` | no |
| `OGImage` | `OGImageView` | `other/og-image.json` | no |
| `SyncStatus` | `SyncStatusView` | `other/sync-status.json` | no |
| `SystemStatus` | `SystemStatusView` | `other/system-status.json` | yes (left-panel) |

### reading

| Widget | View Type | Fixture | Production |
|---|---|---|---|
| `BookModal` | `BookModalView` | `reading/book-modal.json` | no |
| `Bookshelf` | `BookshelfView` | `reading/bookshelf.json` | yes (mind) |
| `ReadingFeed` | `ReadingFeedView` | `reading/reading-feed.json` | yes (mind) |
| `TheatreReviews` | `TheatreReviewsView` | `reading/theatre-reviews.json` | yes (mind) |

## Authoring Rules

- **No raw hex** in component or widget source files. Use semantic tokens.
- **No raw `Color(hex:)` or `Color(red:green:blue:)`** in Swift component files — use generated `LifegamesTokens` constants.
- **No raw hex in CSS** — use `var(--lg-*)` custom properties from `@j0nathan-ll0yd/tokens`.
- All neon colors MUST resolve to **identical hex values** across web and iOS.
- All SwiftUI `#Preview` blocks MUST include `.preferredColorScheme(.dark)`.
- Fluid typography and spacing via `clamp()` on web; SwiftUI uses `relativeTo:` for Dynamic Type on iOS.

## CSS Custom Property Naming

All web-consumed tokens are exposed as CSS custom properties prefixed `--lg-`. Example: `color.accent.pink → var(--lg-color-accent-pink)`.

## Source of Truth

- DTCG JSON: `tokens/*.tokens.json` in [design-system-Lifegames](https://github.com/) (canonical)
- Build: `pnpm build:tokens`
- Outputs: `packages/tokens/dist/{tokens.css,tokens.js,tokens.json}`, `Sources/LifegamesTokens/*.swift`
- This file: `packages/tokens/dist/DESIGN.md` — regenerated on every build.
