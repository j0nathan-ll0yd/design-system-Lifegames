import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

// MARK: - CoffeeStateSwitcher (gallery-only)

/// Gallery-only wrapper that adds an in-screen state picker to `CoffeeTrackingView`.
///
/// NOT part of the design-system library — exists only in the gallery app target (§8).
/// Keeps `CoffeeTrackingView` purely presentational (C-PRESENTATIONAL / GOVERNANCE P3):
/// the view receives plain `CoffeeTrackingProps` with no state-mutation logic.
///
/// Usage (from ScreenCatalog):
/// ```swift
/// AnyView(CoffeeStateSwitcher())
/// ```
struct CoffeeStateSwitcher: View {
    // MARK: - Switchable states (one per §7 fixture file)

    enum CoffeeState: String, CaseIterable, Identifiable {
        case unpaired
        case searching
        case connectedIdle = "connected-idle"
        case connectedFresh = "connected-fresh"
        case connectedSipping = "connected-sipping"
        case connectedDrinking = "connected-drinking"
        case connectedFinished = "connected-finished"
        case error
        case fullOverflow = "full-overflow"

        var id: String {
            rawValue
        }

        var displayName: String {
            switch self {
            case .unpaired: "Unpaired"
            case .searching: "Searching"
            case .connectedIdle: "Connected – Idle"
            case .connectedFresh: "Fresh Cup (0%)"
            case .connectedSipping: "Sipping (cup lifted)"
            case .connectedDrinking: "Drinking (60%)"
            case .connectedFinished: "Finished (~97%)"
            case .error: "Error"
            case .fullOverflow: "Overflow (stress)"
            }
        }

        /// Fixture file stem looked up via `FixtureLoader.load(category:name:)`.
        var fixtureName: String {
            "coffee-tracking.\(rawValue)"
        }
    }

    // MARK: - View state

    @State private var selectedState: CoffeeState = .connectedDrinking

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            // Gallery-only chrome: slim state picker pinned to top —
            // the hosted view owns the full area below so its bottom CTAs are visible.
            pickerHeader

            // Full-viewport CoffeeTrackingView driven by the fixture-loaded props
            CoffeeTrackingView(props: loadedProps(for: selectedState))
        }
    }

    // MARK: - Top picker header (gallery scaffolding)

    private var pickerHeader: some View {
        VStack(spacing: 0) {
            HStack {
                Text("State")
                    .font(Font.Tokens.caption2())
                    .fontWeight(.medium)
                    .textCase(.uppercase)
                    .kerning(1.5)
                    .foregroundStyle(LGColor.textMuted)

                Spacer()

                Picker("State", selection: $selectedState) {
                    ForEach(CoffeeState.allCases) { state in
                        Text(state.displayName).tag(state)
                    }
                }
                .pickerStyle(.menu)
                .tint(LGColor.accentAmber)
                .accessibilityLabel("Switch coffee state")
            }
            .padding(.horizontal, Spacing.s400)
            .padding(.vertical, Spacing.s300)
            .background(LGColor.surfaceBase.opacity(0.96))

            Divider()
        }
    }

    // MARK: - Fixture loading

    /// Loads and decodes the fixture JSON for the given state via `FixtureLoader`.
    ///
    /// On a missing or malformed fixture the switcher falls back to an `.error` props so
    /// the view renders in its error state with a diagnostic message rather than crashing.
    private func loadedProps(for state: CoffeeState) -> CoffeeTrackingProps {
        if let props: CoffeeTrackingProps = FixtureLoader.load(
            category: "coffee",
            name: state.fixtureName
        ) {
            return props
        }
        return CoffeeTrackingProps(
            connection: .error,
            errorMessage: "Missing fixture: \(state.fixtureName).json"
        )
    }
}
