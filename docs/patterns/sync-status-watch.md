# SyncStatus (watchOS)

## 1. Intent

A compact watch surface that communicates the health-data sync state of the LifePortal watch app through a hero symbol, a status pill, a relative-time label, and a single bottom-toolbar primary action.

## 2. Anatomy

- **Hero symbol** — 44pt SF Symbol, hierarchical rendering, glow tint matched to status, optional breathing animation while syncing.
- **Status pill** — circle dot + ALL-CAPS label inside a 12pt rounded rectangle (`LGColor.surfaceRaised`).
- **Relative-time label** — `RelativeDateTimeFormatter` ("2m ago" / "Never synced"), `LGColor.textMuted`.
- **Error line** — optional, `LGColor.accentRed`, multi-line.
- **Primary action button** — `.bottomBar` toolbar item, `.bordered` button style, tint varies by status, disabled when `status == .needsSetup`.

## 3. Props

Swift type: [`SyncStatusProps`](../../Sources/LifegamesWidgetsWatch/SyncStatusProps.swift)

| Field                | Type                     | Notes                                                                            |
| -------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| `status`             | `SyncStatusProps.Status` | One of `idle`, `syncing`, `syncedRecent`, `needsSetup`, `authRequired`, `error`. |
| `lastSyncDate`       | `Date?`                  | Used by the relative-time label. `nil` renders "Never synced".                   |
| `referenceDate`      | `Date`                   | Injected "now" for deterministic snapshots.                                      |
| `errorMessage`       | `String?`                | Renders only when non-nil.                                                       |
| `primaryActionLabel` | `String`                 | Button text. ALL-CAPS conventional.                                              |
| `syncedRecentWindow` | `TimeInterval` (static)  | 5 minutes. Mirrors `WatchHealthFeature.autoSyncThrottleInterval`.                |

## 4. States

| Status          | Symbol                          | Tint                    | Breathing            |
| --------------- | ------------------------------- | ----------------------- | -------------------- |
| `.idle`         | `heart.fill`                    | `LGColor.accentPink`    | off                  |
| `.syncing`      | `arrow.2.circlepath`            | `LGColor.accentBlue`    | on (AOD-gated)       |
| `.syncedRecent` | `checkmark.circle.fill`         | `LGColor.healthGreen`   | off                  |
| `.needsSetup`   | `exclamationmark.triangle.fill` | `LGColor.accentDefault` | off; button disabled |
| `.authRequired` | `exclamationmark.triangle.fill` | `LGColor.accentDefault` | off                  |
| `.error`        | `xmark.circle.fill`             | `LGColor.accentRed`     | off                  |

## 5. Variants

None planned in v1.

## 6. Accessibility

- Dynamic Type respected on every text element. The hero symbol uses a fixed point size by design; the status pill, relative-time label, and button text all honor Dynamic Type via `Font.Tokens.*`.
- 41mm fallback: status pill text and primary button text use `.minimumScaleFactor(0.8).lineLimit(1)` so long localized labels stay legible.
- VoiceOver:
  - Hero symbol — `accessibilityLabel("Sync status: <STATUS>")`, `accessibilityValue(<relative time>)`.
  - Status pill — combined element with `accessibilityLabel("Status: <STATUS>")`.
  - Relative-time label — `accessibilityLabel("Last synced")` + `accessibilityValue(<relative time>)`.
  - Error line — `accessibilityLabel("Error: <message>")`.
  - Primary button — status-aware `accessibilityLabel` and `accessibilityHint` (see `SyncStatusView.buttonAccessibilityLabel/Hint`).
- Contrast: all foreground tokens render against `LGColor.surfaceBase`; verified ≥4.5:1 by the existing DTCG audit.

## 7. AOD behavior

`BreathingModifier` reads `@Environment(\.isLuminanceReduced)` and animates only when `enabled == true && isLuminanceReduced == false`. On toggle-off the modifier resets the opacity in a non-repeating `withAnimation(.linear(duration: 0))` to cancel any in-flight repeating animation. The repeating animation wraps `ReducedMotion.animation(_:)` so that once the watchOS branch lands in `ReducedMotion`, the user's Reduce Motion preference is also respected.

`.contentTransition(.symbolEffect(.replace))` is wrapped in `#if os(watchOS) || os(iOS)` to satisfy S19 enforcement and degrade gracefully on macOS hosts.

## 8. References

- Fixture: [`Sources/LifegamesWidgets/Resources/widgets/other/sync-status.json`](../../Sources/LifegamesWidgets/Resources/widgets/other/sync-status.json)
- Snapshot tests: [`Tests/LifegamesWidgetsTests/WatchSyncDiagnosticsSnapshotTests.swift`](../../Tests/LifegamesWidgetsTests/WatchSyncDiagnosticsSnapshotTests.swift)
- Plan: [`monorepo-LifegamesPortal/.omc/plans/watch-redesign-sync-and-diagnostics.md`](../../../monorepo-LifegamesPortal/.omc/plans/watch-redesign-sync-and-diagnostics.md)
