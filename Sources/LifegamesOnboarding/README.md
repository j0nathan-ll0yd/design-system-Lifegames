# LifegamesOnboarding

TCA-agnostic SwiftUI onboarding flow for LifePortal permission requests.

## ADR: DS Placement Rationale (P4 Stretch)

Per GOVERNANCE.md principle P4 (components must have 2+ consumers to justify DS placement), this target is a stretch with a single current consumer (ios-LifegamesPortal). The rationale for early DS placement:

1. **watchOS onboarding is the planned second surface.** The watchOS app will require its own permission onboarding flow (HealthKit, Location). Placing the views in the DS now avoids duplication when that surface ships.

2. **TCA-agnosticism is the architectural invariant.** Keeping these views outside the iOS app package enforces the contract that DS views never import ComposableArchitecture. If the views lived in `LifePortalFeatures`, the constraint would be informal. In the DS package, the Swift compiler enforces it.

3. **The DS is the correct boundary for cross-platform UI primitives.** Onboarding chrome (neonCard, progress dots, permission status badges) uses only design tokens. This is exactly the category of UI that belongs in the DS.

Revisit: If watchOS onboarding is not implemented within 2 release cycles, reconsider moving this back into `LifePortalFeatures`.

## Usage

```swift
import LifegamesOnboarding

OnboardingFlowView(
    pages: permissions.map { $0.asProps },
    currentPageIndex: store.currentPageIndex,
    onRequestPermission: { id in store.send(.requestPermissionTapped(id)) },
    onOpenSettings: { store.send(.openSettingsTapped) },
    onSkipPermission: { id in store.send(.skipPermissionTapped(id)) },
    onComplete: { store.send(.completeTapped) },
    onNext: { store.send(.nextTapped) }
)
```

## Files

| File | Purpose |
|------|---------|
| `OnboardingPermissionProps.swift` | Value-type props struct + `PermissionDisplayStatus` enum |
| `OnboardingFlowView.swift` | Container that renders the correct page for `currentPageIndex` |
| `OnboardingIntroPage.swift` | Welcome screen (index 0) |
| `OnboardingPermissionPage.swift` | Per-permission card (index 1..N) |
| `OnboardingSummaryPage.swift` | Completion summary with status rows (index N+1) |
| `OnboardingProgressDots.swift` | Shared progress indicator |
