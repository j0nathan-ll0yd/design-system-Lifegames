# SwiftGallery

Runtime showcase of the Lifegames Design System for iOS. Lives at `apps/swift-gallery/` alongside `apps/storybook`, `apps/docs`, and `apps/portfolio`.

## Open

```bash
open apps/swift-gallery/SwiftGallery.xcodeproj
```

## Sections

| Section | What it shows |
|---|---|
| Colors | All `LGColor.*` token swatches grouped by role |
| Typography | Type scale samples (widget header → hero header) |
| Cards | `.portalCard()`, `.glassMorphic()`, `.neonCard()`, `.glassCard()`, `.minimalSection()` |
| Components | HealthRingView, StatItemView, MetricCardView, WidgetHeaderView, SyncStatusBanner, LiveDotView, PulsingMapMarker, ECGBackgroundView |
| Neon Effects | `neonGlow()` on text, accent bars, glow radii, animated effects |
| Widgets | IdentityCard, Hydration, HeartRate (DSWidgets) + all health widget states (HeartRate, Hydration, NightSummary, Workouts) |

## Dropped from DesignGalleryFeature

- **BookshelfFeature** showcase: zero direct `Bookshelf` symbol references found in `DesignGalleryView.swift`. Coupling was via `PreviewMocks` sample data only — not ported.
- **HomeFeature** showcase: zero direct `HomeFeature`/`HomeView` symbol references found in `DesignGalleryView.swift`. Coupling was via `PreviewMocks` sample data only — not ported.

## Consuming DS

Local SPM path dep via `project.yml`: `.package(path: "../..")` resolves to the DS repo root (`Package.swift`).

## Build

Requires Xcode 16+ / iOS 26 SDK. Select `SwiftGallery` scheme, choose any iOS 26 simulator.

## Regenerate project

```bash
cd apps/swift-gallery && xcodegen generate --spec project.yml
```
