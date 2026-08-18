# DiagnosticsMonitor (watchOS)

## 1. Intent

A read-only watch surface that surfaces in-app event counts, log file size, recent log rows, and a transfer action for shipping the watch log to the paired iPhone.

## 2. Anatomy

- **Header** — `MONITOR` caption + `<N> events` code-styled headline.
- **Counts card** — rounded rectangle (`card.neonCornerRadius` 20) with one row per category bucket. Each row: 4×16 colored bar, abbreviation label, capsule progress bar normalized to `max(counts)`, monospaced count.
- **Action row** — log file size (left, `ByteCountFormatter`), `trash.fill` clear button (right, `LGColor.healthRed`), transfer button (right-most, `LGColor.accentBlue`, icon varies by `transferStatus`).
- **Recent activity list** — `LazyVStack` with up to 25 `LogRowView`s. Each row: 6pt colored dot, abbreviated relative time, multi-line message.

## 3. Props

Swift type: [`DiagnosticsMonitorProps`](../../Sources/LifegamesWidgetsWatch/DiagnosticsMonitorProps.swift)

| Field             | Type              | Notes                                                                       |
| ----------------- | ----------------- | --------------------------------------------------------------------------- |
| `totalEventCount` | `Int`             | Headline total. Always pre-aggregated by the caller.                        |
| `counts`          | `[CategoryCount]` | One entry per `Category` bucket; emitted in fixed order.                    |
| `fileSizeBytes`   | `Int`             | Source log file size on disk. Rendered via static `ByteCountFormatter`.     |
| `entries`         | `[LogEntry]`      | Render-capped at `prefix(25)`; full list is the consumer's responsibility.  |
| `transferStatus`  | `TransferStatus`  | `idle`, `uploading`, `success`, `failure`. Drives the transfer button icon. |
| `referenceDate`   | `Date`            | Injected "now" for the relative-time formatter.                             |

`counts` reflects ALL entries in the source log — NEVER derive it from the truncated `entries[]` slice.

## 4. States

- **Empty** — `totalEventCount == 0`, every count is zero, entries empty. Layout still renders the counts card so the visual rhythm stays intact.
- **Populated** — typical state; the fixture demonstrates 6 entries.
- **Many** — entries exceed 25; only the first 25 render.
- **Transferring** — `transferStatus == .uploading`; transfer button shows `ProgressView()` and is disabled.

`transferStatus` reachable on day-one ship: `.idle`, `.success`. `.uploading` and `.failure` are wired in props but not exercised by the day-one iOS reducer (see plan §12).

## 5. Variants

None planned in v1.

## 6. Accessibility

- Dynamic Type respected. The header headline uses `.minimumScaleFactor(0.8).lineLimit(1)` so the 41mm snapshot stays legible at the smallest size.
- VoiceOver:
  - Header — `accessibilityLabel("Monitor: <N> events")`.
  - Each count row — combined element with `accessibilityLabel("<CATEGORY> category, <N> events")`.
  - File size label — `accessibilityLabel("Log size")` + `accessibilityValue(<formatted size>)`.
  - Clear button — `accessibilityLabel("Clear log")` + `accessibilityHint("Permanently deletes all recorded events")`.
  - Transfer button — status-aware `accessibilityLabel` (Idle / In progress / Complete / Failed) + `accessibilityHint("Sends the log file to the iPhone")`.
  - Recent-activity header — `accessibilityAddTraits(.isHeader)`.
  - Each log row — combined element with `accessibilityLabel("<CAT> <MESSAGE>")` and `accessibilityValue(<relative time>)`.
- Contrast: all category accents render against `LGColor.surfaceRaised`/`LGColor.surfaceBase`; tokens audited ≥4.5:1.

## 7. AOD behavior

No animations. No scanline overlay (intentionally cut from v1 to stay under the AOD energy budget). The `LazyVStack` is fine to leave on screen in AOD because no row triggers a repeating animation.

## 8. References

- Fixture: [`Sources/LifegamesWidgets/Resources/widgets/other/diagnostics-monitor.json`](../../Sources/LifegamesWidgets/Resources/widgets/other/diagnostics-monitor.json)
- Snapshot tests: [`Tests/LifegamesWidgetsTests/WatchSyncDiagnosticsSnapshotTests.swift`](../../Tests/LifegamesWidgetsTests/WatchSyncDiagnosticsSnapshotTests.swift)
- Plan: [`atlas/.omc/plans/watch-redesign-sync-and-diagnostics.md`](../../../atlas/.omc/plans/watch-redesign-sync-and-diagnostics.md)
