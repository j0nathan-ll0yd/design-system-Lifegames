# Coffee Tracking (iOS)

**Status: Incubating** — 0 shipping surfaces today. Planned surfaces: iOS Coffee tab, watchOS complication.

iOS-platform pattern — no web parity obligation (web is read-only).

## 1. Intent

A dedicated screen that (a) shows whether an Acaia Pearl scale is connected, (b) renders a coffee-mug visual that fills sip-by-sip as the user drinks, and (c) provides a "New Cup" control to begin tracking a cup. The screen is prop-driven; all Bluetooth, HealthKit, and timer logic lives in the host feature layer, not in the design system.

The design direction was resolved by reviewing three gallery explorations (Hero / Dashboard / Ritual) and choosing **Hero** as the canonical design. The Hero layout has been promoted from the gallery to `CoffeeTrackingView` in `LifegamesComponentsCore`.

## 2. Anatomy

### Canonical view

- **`CoffeeTrackingView`** — the canonical coffee-tracking screen (Hero design). `init(props: CoffeeTrackingProps, animated: Bool = true)`. ScrollView body with pinned primary action via `.safeAreaInset(edge:.bottom)`. All animations are gated by `@Environment(\.accessibilityReduceMotion)`. The iOS Coffee tab should import this view directly.

### Shared primitives

- **`CoffeeMugView`** — animated mug with wave fill, bubbles, steam, gloss overlay, and handle, ported from `HydrationView`'s private `CoffeeMugColumn`. Interface: `init(fillPercent: Double, beverage: Beverage, animated: Bool)`. The fill animation is stepped (per sip) and guarded by `@Environment(\.accessibilityReduceMotion)`.
- **`CoffeeConnectionBadge`** — renders a `ScaleConnection` value in three modes: pill (full), header-dot (compact), ring-state (circular). Uses `LiveDotView(color:)` for the live indicator.

## 3. Props

Swift type: [`CoffeeTrackingProps`](../../Sources/LifegamesComponentsCore/Coffee/CoffeeTrackingProps.swift)

### Raw signals (stored)

| Field                   | Type              | Notes                                                      |
| ----------------------- | ----------------- | ---------------------------------------------------------- |
| `connection`            | `ScaleConnection` | `.unpaired` / `.searching` / `.connected` / `.error`       |
| `errorMessage`          | `String?`         | Non-nil only when `connection == .error`                   |
| `batteryPercent`        | `Int?`            | `nil` when unknown or unpaired                             |
| `isSessionActive`       | `Bool`            | `true` while a cup is being tracked                        |
| `isCupOnScale`          | `Bool`            | `false` while lifted — meter holds at last stable value    |
| `startWeightGrams`      | `Double`          | Baseline captured at "New Cup" (full-cup weight)           |
| `lastStableWeightGrams` | `Double`          | Last settled reading; non-increasing upstream; drives fill |
| `currentWeightGrams`    | `Double`          | Instantaneous; may be ~0 while cup is lifted               |
| `flowRateGramsPerSec`   | `Double`          | Δweight/Δt derived client-side; 0 when idle                |
| `sessionElapsedSeconds` | `Int`             | Built-in Acaia timer, relayed as seconds                   |
| `dailyCaffeineMg`       | `Int`             | Accumulated today (mg)                                     |
| `dailyTargetMg`         | `Int`             | Default 400 mg (FDA guideline)                             |
| `cupsToday`             | `Int`             | Cup count for the day                                      |
| `beverage`              | `Beverage`        | `.drip` / `.espresso` / `.coldBrew`                        |

### Derived (computed — single source of truth)

| Property            | Formula                                                               | Notes                       |
| ------------------- | --------------------------------------------------------------------- | --------------------------- |
| `consumedGrams`     | `max(0, startWeightGrams - lastStableWeightGrams)`                    | Never negative              |
| `fillPercent`       | `startWeightGrams > 0 ? min(consumedGrams / startWeightGrams, 1) : 0` | ÷0 guard; clamped to [0, 1] |
| `caffeineMgThisCup` | `Int((consumedGrams × beverage.caffeineMgPerGram).rounded())`         | Display estimate ±~30%      |

Caffeine density constants (`Beverage.caffeineMgPerGram`): drip 0.40 mg/g · espresso 2.1 mg/g · cold brew 2.0 mg/g (USDA-derived).

## 4. Fill model (per-sip accumulation)

1. **New Cup** — user taps "New Cup"; `startWeightGrams` is captured from the current stable reading. `fillPercent` starts at 0.
2. **Sip** — user lifts the cup (`isCupOnScale = false`, weight → ~0). The meter **holds** its current value; it never jumps down.
3. **Replace** — cup returns; once `lastStableWeightGrams` settles to a new lower value, `consumedGrams` rises and the meter ticks up (animated increment).
4. **Finish** — "Finish Cup" ends the session; caffeine rolls into the daily total; mug resets on the next "New Cup".

`fillPercent` is a function of `lastStableWeightGrams` only (not the instantaneous ~0 g reading while the cup is lifted), so sipping raises the meter and never resets it to zero.

## 5. States

| State                | `connection` | `isSessionActive` | `isCupOnScale` | `fillPercent` |
| -------------------- | ------------ | ----------------- | -------------- | ------------- |
| `unpaired`           | `.unpaired`  | false             | false          | 0             |
| `searching`          | `.searching` | false             | false          | 0             |
| `connected-idle`     | `.connected` | false             | false          | 0             |
| `connected-fresh`    | `.connected` | true              | true           | 0             |
| `connected-sipping`  | `.connected` | true              | false          | ~0.4 (holds)  |
| `connected-drinking` | `.connected` | true              | true           | ~0.4          |
| `connected-finished` | `.connected` | true              | true           | ~1.0          |
| `error`              | `.error`     | false             | false          | 0             |
| `full-overflow`      | `.connected` | true              | true           | ~0.8 (stress) |

`full-overflow` exercises 4-digit `dailyCaffeineMg`, 2-digit `cupsToday`, and `sessionElapsedSeconds > 3600` (HH:MM:SS format).

## 6. Tokens & conventions

- **Monospaced numerics** — all live readouts (weight, caffeine mg, timer) use `Font.Tokens.monoNumeric(_:weight:)`. Never `.system(size:design:.monospaced)` directly in Coffee sources.
- **Color** — amber primary: `LGColor.accentAmber`. Surface: `LGColor.surfaceBase` / `LGColor.surfaceRaised`. Text: `LGColor.textTitle` / `LGColor.textMuted`.
- **No raw hex, no `Color(red:`, no direct `.system(size:`** in `Sources/LifegamesComponentsCore/Coffee/*`.
- **SF Symbol sizing** — SF-Symbol icons in button labels are sized via `.imageScale(...)` + `.fontWeight(...)`, never `.font(.system(size:))`.

## 7. Accessibility

- Mug fill: `.accessibilityLabel("Coffee mug")` + `.accessibilityValue("\(Int(fillPercent * 100))% of this cup")` (S71).
- "New Cup" / "Finish Cup" buttons: `.accessibilityLabel` + `.contentShape(.rect)` for ≥44 pt targets (S68/S70).
- Connection state announced on change.
- All animations guarded by `@Environment(\.accessibilityReduceMotion)`; reduced path renders a static fill (get-only env — verified manually, not unit-testable). This includes mug opacity/grayscale cross-fades and the daily progress bar tween — bare `.animation(_:value:)` does NOT auto-respect reduce motion; all are gated via `shouldAnimate`.

## 8. References

- Canonical view: [`Sources/LifegamesComponentsCore/Coffee/CoffeeTrackingView.swift`](../../Sources/LifegamesComponentsCore/Coffee/CoffeeTrackingView.swift)
- Props: [`Sources/LifegamesComponentsCore/Coffee/CoffeeTrackingProps.swift`](../../Sources/LifegamesComponentsCore/Coffee/CoffeeTrackingProps.swift)
- Mono-numeric token: [`Sources/LifegamesTokens/Font+MonoNumeric.swift`](../../Sources/LifegamesTokens/Font+MonoNumeric.swift)
- Props unit tests: [`Tests/LifegamesComponentsCoreTests/CoffeeTrackingPropsTests.swift`](../../Tests/LifegamesComponentsCoreTests/CoffeeTrackingPropsTests.swift)
- Gallery switcher: `apps/swift-gallery/SwiftGallery/Screens/Directions/Coffee/CoffeeStateSwitcher.swift`
- Fixtures: `Sources/LifegamesWidgets/Resources/widgets/coffee/`
- Plan: [`monorepo-LifegamesPortal/.omc/plans/coffee-acaia-ui.md`](../../../monorepo-LifegamesPortal/.omc/plans/coffee-acaia-ui.md)

## 9. Follow-ups

- **F1 (post-pick):** Fold `HydrationView`'s private `LiquidVessel`/`WavePath`/`RisingBubbles`/`SteamView` onto the shared `CoffeeMugView` (a deletion, not a move).
- **F2:** Migrate existing monospaced numeric usages in `HeartRateView`/`HydrationView` onto `Font.Tokens.monoNumeric`.
- **F-promote:** Wire `CoffeeTrackingView` into the iOS `CoffeeFeature` tab.
- **BLE phase:** iOS `CoffeeFeature` TCA + `BluetoothClient` (Acaia BLE) + HealthKit dietary-caffeine + backend caffeine domain.

Advances from Incubating to Beta once the iOS Coffee tab is a confirmed shipping surface (GOVERNANCE P7).
