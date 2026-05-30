---
"@lifegames/widgets-watch": minor
---

Add `SyncStatusView` + `DiagnosticsMonitorView` to `LifegamesWidgetsWatch` (Experimental).
Both ship with scrubbed fixtures, snapshot tests at 45mm and 41mm, AOD-safe
animations (`@Environment(\.isLuminanceReduced)` gated, `ReducedMotion.animation(_:)`
wrapped, clean cancel/restart on toggle), accessibility traits, and pattern docs.
Consumed by LifePortal watch app `WatchHealthFeature` and `WatchDiagnosticFeature`.
