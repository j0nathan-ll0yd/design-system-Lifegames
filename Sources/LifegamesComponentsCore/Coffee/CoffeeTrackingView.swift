import LifegamesCopy
import LifegamesTokens
import SwiftUI

// MARK: - CoffeeTrackingView

/// Canonical coffee-tracking screen. Promoted from the Hero gallery direction as the
/// chosen design for the iOS Coffee tab.
///
/// Presentational-only (GOVERNANCE P3): no CoreBluetooth, HealthKit, or TCA.
/// Connection/weight/timer arrive as plain `CoffeeTrackingProps`.
///
/// Layout: ScrollView with pinned primary action via `.safeAreaInset(edge:.bottom)`.
/// All animations are gated by `@Environment(\.accessibilityReduceMotion)` and by the
/// `animated` seam (pass `false` for deterministic snapshot rendering).
public struct CoffeeTrackingView: View {
    public let props: CoffeeTrackingProps
    /// Animation seam — pass `false` for deterministic snapshot rendering. Production
    /// callers use the default (`true`).
    public let animated: Bool
    /// Primary-action tap. The button's *meaning* is `props.primaryAction`; the caller switches
    /// on the same value, so label and behavior cannot drift. Presentational: the view emits
    /// the event, it never mutates (GOVERNANCE P3 — data in, events out).
    public let onPrimaryAction: () -> Void
    /// Manual retry while a cup is tracked and the link is down (`.error` / `.unpaired`). The
    /// primary button stays `.finishCup` then, so retry is a secondary affordance. `nil` hides it.
    public let onReconnect: (() -> Void)?

    /// An unlabeled trailing closure binds to `onPrimaryAction` under Swift 6's forward-scan
    /// rule. Swift 5 language mode still matches backward and would bind it to `onReconnect`,
    /// so a Swift 5 caller must label `onPrimaryAction:`.
    public init(
        props: CoffeeTrackingProps,
        animated: Bool = true,
        onPrimaryAction: @escaping () -> Void = {},
        onReconnect: (() -> Void)? = nil
    ) {
        self.props = props
        self.animated = animated
        self.onPrimaryAction = onPrimaryAction
        self.onReconnect = onReconnect
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// True only when both the caller requested animation AND the user has not requested
    /// reduced motion. Every animation gate in this view uses this flag (C-MOTION / §10).
    private var shouldAnimate: Bool {
        animated && !reduceMotion
    }

    // MARK: - Derived state

    /// Desaturate the mug when not connected or on error. A tracked cup with an absent link
    /// reads half-desaturated in every non-connected state: the cup still counts.
    private var mugGrayscale: Double {
        if props.isPresenceUnknown {
            return 0.5
        }
        switch props.connection {
        case .unpaired, .error: return 1.0
        case .searching: return 0.5
        case .connected: return 0.0
        }
    }

    /// Dim the mug when connection is absent OR the cup is lifted mid-sip.
    private var mugOpacity: Double {
        if props.isPresenceUnknown || props.isSipping {
            return 0.60
        }
        if props.connection == .unpaired || props.connection == .error {
            return 0.35
        }
        return 1.0
    }

    /// Steam is a live "cup resting, still hot" cue. It holds only while the link can vouch
    /// for the cup: off mid-sip, and off while presence is unknown (atlas OQ-V4).
    var isSteamActive: Bool {
        props.fillPercent > 0.05 && !props.isSipping && !props.isPresenceUnknown
    }

    /// The secondary retry renders only when the caller handles it AND a tracked cup has a
    /// down link that will not recover by itself. `.searching` is already reconnecting.
    var showsReconnectAffordance: Bool {
        onReconnect != nil && props.isSessionActive
            && (props.connection == .error || props.connection == .unpaired)
    }

    // MARK: - Body

    public var body: some View {
        ZStack {
            LGColor.surfaceBase.ignoresSafeArea()

            // Scrollable content — no Spacers; explicit token padding drives rhythm.
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    // Connection status pill
                    CoffeeConnectionBadge(
                        connection: props.connection,
                        mode: .pill,
                        errorMessage: props.errorMessage
                    )
                    .padding(.top, Spacing.s600)
                    .padding(.bottom, Spacing.s400)

                    // Hero steam — rises from above the mug rim; more visible than
                    // CoffeeMugView's subtle built-in SteamPuffs.
                    // Reserves Spacing.s1000 (40 pt) regardless of active state so
                    // the mug's vertical position stays locked as steam fades in/out.
                    HeroSteamRisers(
                        active: isSteamActive,
                        animated: shouldAnimate
                    )
                    .frame(height: Spacing.s1000)

                    // Hero mug (the emotional center)
                    ZStack(alignment: .bottom) {
                        CoffeeMugView(
                            fillPercent: props.fillPercent,
                            beverage: props.beverage,
                            animated: animated
                        )
                        .grayscale(mugGrayscale)
                        .opacity(mugOpacity)
                        // Hardened: gated on shouldAnimate so reduce-motion users
                        // see instant transitions rather than cross-fades (C-MOTION).
                        .animation(shouldAnimate ? .easeInOut(duration: 0.4) : nil, value: mugOpacity)
                        .animation(shouldAnimate ? .easeInOut(duration: 0.4) : nil, value: mugGrayscale)

                        // "Sipping…" floats just below the mug while cup is lifted
                        if props.isSipping {
                            Text(CopyLoader.widgets.coffee.sipping)
                                .font(Font.Tokens.caption2())
                                .fontWeight(.medium)
                                .kerning(1.5)
                                .textCase(.uppercase)
                                .foregroundStyle(LGColor.accentAmber.opacity(0.7))
                                .offset(y: Spacing.s600)
                                .transition(.opacity.combined(with: .scale(scale: 0.9)))
                        }
                    }
                    .padding(.bottom, Spacing.s600)

                    // Caffeine readout for this cup
                    caffeineReadout
                        .padding(.bottom, Spacing.s500)

                    // Secondary: daily progress bar
                    dailyBar
                        .padding(.horizontal, Spacing.s600)
                        .padding(.bottom, Spacing.s400)
                }
            }
        }
        // Primary action button pinned above the bottom safe area.
        // safeAreaInset pushes scroll content up by the container's height automatically.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            pinnedCTAContainer
        }
    }

    // MARK: - Pinned CTA container

    /// Button always visible at the bottom; gradient veil prevents scroll content
    /// from hard-colliding with the button's solid backing.
    private var pinnedCTAContainer: some View {
        VStack(spacing: 0) {
            // Gradient veil: surfaceBase transparent → opaque
            LinearGradient(
                colors: [LGColor.surfaceBase.opacity(0), LGColor.surfaceBase],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: Spacing.s800)
            .allowsHitTesting(false)

            // Solid backing ensures button is always fully legible
            VStack(spacing: Spacing.s100) {
                primaryActionButton
                if showsReconnectAffordance {
                    reconnectButton
                }
            }
            .padding(.horizontal, Spacing.s600)
            .padding(.top, Spacing.s100)
            .padding(.bottom, Spacing.s500)
            .background(LGColor.surfaceBase)
        }
    }

    // MARK: - Caffeine readout

    private var caffeineReadout: some View {
        VStack(spacing: Spacing.s100) {
            HStack(alignment: .firstTextBaseline, spacing: Spacing.s150) {
                Text("\(props.caffeineMgThisCup)") // runtime value, not copy
                    .font(Font.Tokens.monoNumeric(52, weight: .bold))
                    .foregroundStyle(LGColor.accentAmber)
                    .neonGlow(LGColor.accentAmber, radius: 8)

                Text(CopyLoader.widgets.coffee.caffeineUnit)
                    .font(Font.Tokens.monoNumeric(18, weight: .regular))
                    .foregroundStyle(LGColor.accentAmber.opacity(0.7))
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(CopyLoader.a11y.coffee.caffeineThisCup)
            .accessibilityValue("\(props.caffeineMgThisCup) milligrams")

            Text(
                CopyLoader.widgets.coffee.thisCup.replacingOccurrences(
                    of: "{beverage}", with: props.beverage.heroDisplayName
                )
            )
            .font(Font.Tokens.caption())
            .foregroundStyle(LGColor.textMuted)
        }
    }

    // MARK: - Daily progress bar

    private var dailyBar: some View {
        let animate = shouldAnimate
        return VStack(alignment: .leading, spacing: Spacing.s200) {
            // Label + value row
            HStack {
                Text(CopyLoader.widgets.coffee.dailyLabel)
                    .font(Font.Tokens.caption2())
                    .fontWeight(.medium)
                    .textCase(.uppercase)
                    .kerning(1.5)
                    .foregroundStyle(LGColor.textMuted)

                Spacer()

                Text("\(props.dailyCaffeineMg) / \(props.dailyTargetMg) mg")
                    .font(Font.Tokens.monoNumeric(11, weight: .regular))
                    .foregroundStyle(LGColor.textMuted)
            }

            // Progress track
            GeometryReader { geo in
                let fillFraction = CGFloat(props.dailyCaffeineMg) / CGFloat(max(1, props.dailyTargetMg))

                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(LGColor.surfaceRaised.opacity(0.5))
                        .frame(height: 6)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(
                            props.dailyCaffeineMg > props.dailyTargetMg
                                ? LGColor.accentRed
                                : LGColor.accentAmber
                        )
                        .frame(
                            width: geo.size.width * min(fillFraction, 1),
                            height: 6
                        )
                        // Hardened: gated on shouldAnimate so reduce-motion users see
                        // instant bar updates rather than a width tween (C-MOTION).
                        .animation(animate ? .easeInOut(duration: 0.5) : nil, value: props.dailyCaffeineMg)
                }
            }
            .frame(height: 6)
            .accessibilityLabel(CopyLoader.a11y.coffee.dailyCaffeine)
            .accessibilityValue("\(props.dailyCaffeineMg) of \(props.dailyTargetMg) mg")
        }
    }

    // MARK: - Primary action button

    private var primaryActionButton: some View {
        let action = props.primaryAction
        let isDisabled = !action.isEnabled

        return Button {
            onPrimaryAction() // caller owns behavior; view stays presentational (P3)
        } label: {
            HStack(spacing: Spacing.s200) {
                if let systemImage = action.systemImage {
                    // Hardened: SF-Symbol icons use .imageScale + .fontWeight, not a
                    // raw point-size font — direct size calls are banned in Core/Coffee
                    // (C-TOKENS / §10). .imageScale keeps size relative to the label.
                    Image(systemName: systemImage)
                        .imageScale(.medium)
                        .fontWeight(.semibold)
                        .accessibilityHidden(true)
                }
                Text(action.title)
                    .font(Font.Tokens.body())
                    .fontWeight(.semibold)
            }
            .foregroundStyle(isDisabled ? LGColor.textMuted : LGColor.accentAmber)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.s400)
            .background(
                (isDisabled ? LGColor.surfaceRaised : LGColor.accentAmber).opacity(0.14)
            )
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(
                    (isDisabled ? LGColor.surfaceRaised : LGColor.accentAmber).opacity(0.35),
                    lineWidth: 1.5
                )
            )
        }
        .disabled(isDisabled)
        .frame(minHeight: 44)
        .contentShape(.rect)
        .accessibilityLabel(action.accessibilityLabel)
    }

    // MARK: - Secondary reconnect affordance

    /// Unfilled text button under the `.finishCup` primary: visibly secondary, never the primary target.
    private var reconnectButton: some View {
        Button {
            onReconnect?() // caller owns behavior; view stays presentational (P3)
        } label: {
            HStack(spacing: Spacing.s150) {
                Image(systemName: "arrow.clockwise")
                    .imageScale(.small)
                    .fontWeight(.semibold)
                    .accessibilityHidden(true)
                Text(CopyLoader.widgets.coffee.actionReconnect)
                    .font(Font.Tokens.caption())
                    .fontWeight(.medium)
            }
            .foregroundStyle(LGColor.accentAmber.opacity(0.8))
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .contentShape(.rect)
        .accessibilityLabel(CopyLoader.a11y.coffee.actionReconnect)
    }
}

// MARK: - Primary action presentation

/// Label, icon, enabled state and VoiceOver label, derived from `PrimaryAction` ONLY.
extension CoffeeTrackingProps.PrimaryAction {
    /// `.searching` is the one state with nothing to do: the link is still coming up and no
    /// cup is tracked.
    var isEnabled: Bool {
        self != .searching
    }

    /// Only `.finishCup` carries a symbol. The `actionNewCup` copy value already starts with
    /// "+", so a `plus` symbol rendered it twice; a disabled `.searching` has nothing to add.
    var systemImage: String? {
        switch self {
        case .connect, .reconnect, .searching, .newCup: nil
        case .finishCup: "checkmark"
        }
    }

    var title: String {
        switch self {
        case .connect: CopyLoader.widgets.coffee.actionConnect
        case .reconnect: CopyLoader.widgets.coffee.actionReconnect
        case .searching: CopyLoader.widgets.coffee.searching
        case .newCup: CopyLoader.widgets.coffee.actionNewCup
        case .finishCup: CopyLoader.widgets.coffee.actionFinishCup
        }
    }

    var accessibilityLabel: String {
        switch self {
        case .connect: CopyLoader.a11y.coffee.actionConnect
        case .reconnect: CopyLoader.a11y.coffee.actionReconnect
        case .searching: CopyLoader.a11y.coffee.actionSearching
        case .newCup: CopyLoader.a11y.coffee.actionNewCup
        case .finishCup: CopyLoader.a11y.coffee.actionFinishCup
        }
    }
}

// MARK: - Hero steam risers

/// Larger, more visible steam for the Hero layout.
/// Rendered as a dedicated VStack slot (Spacing.s1000 tall) directly above `CoffeeMugView`
/// so risers appear to emerge from the mug's open rim.
///
/// Animation pattern mirrors `SteamPuffs` in `CoffeeMugView`: state set in `onAppear`,
/// per-riser `.animation(.delay)` handles stagger. Reduce-motion is respected via the
/// caller's `shouldAnimate` → `animated` prop (C-MOTION / §10).
struct HeroSteamRisers: View { // internal: behavioral tests read `active`
    let active: Bool
    let animated: Bool

    @State private var rising = false

    var body: some View {
        HStack(spacing: Spacing.s350) {
            riser(index: 0, lateralDrift: -3)
            riser(index: 1, lateralDrift: 3)
            riser(index: 2, lateralDrift: -2)
        }
        .frame(maxHeight: .infinity, alignment: .bottom) // anchor to mug rim
        .opacity(active ? 1 : 0)
        // Hardened: was bare `.animation(.easeInOut(duration: 0.6), value: active)`
        // which does not auto-respect reduce motion. Gate on `animated` (C-MOTION).
        .animation(animated ? .easeInOut(duration: 0.6) : nil, value: active)
        .onAppear {
            if animated {
                rising = active
            }
        }
    }

    private func riser(index: Int, lateralDrift: CGFloat) -> some View {
        let delay = Double(index) * 0.6
        let baseH: CGFloat = 26 - CGFloat(index) * 4 // 26 / 22 / 18 pt

        return Capsule()
            .fill(LGColor.accentAmber)
            .frame(width: 3, height: rising ? baseH + 12 : baseH)
            .offset(x: rising ? lateralDrift : 0, y: rising ? -Spacing.s150 : 0)
            .opacity(rising ? 0.22 : 0.65)
            .animation(
                animated
                    ? .easeInOut(duration: 2.0)
                    .repeatForever(autoreverses: true)
                    .delay(delay)
                    : nil,
                value: rising
            )
    }
}

// MARK: - Beverage display name (Hero layout)

private extension CoffeeTrackingProps.Beverage {
    /// Short display name used in the "this cup · drip" sub-label.
    var heroDisplayName: String {
        switch self {
        case .drip: CopyLoader.widgets.coffee.beverageDrip
        case .espresso: CopyLoader.widgets.coffee.beverageEspresso
        case .coldBrew: CopyLoader.widgets.coffee.beverageColdBrew
        }
    }
}

// MARK: - Previews

#if os(iOS)
    #Preview("Coffee — Disconnected") {
        CoffeeTrackingView(
            props: CoffeeTrackingProps(
                connection: .unpaired,
                isSessionActive: false,
                isCupOnScale: false,
                dailyTargetMg: 400
            )
        )
        .preferredColorScheme(.dark)
    }

    #Preview("Coffee — Searching") {
        CoffeeTrackingView(
            props: CoffeeTrackingProps(
                connection: .searching,
                isSessionActive: false,
                isCupOnScale: false,
                sessionElapsedSeconds: 0,
                dailyCaffeineMg: 95,
                dailyTargetMg: 400,
                cupsToday: 1
            )
        )
        .preferredColorScheme(.dark)
    }

    #Preview("Coffee — Connected Drinking") {
        CoffeeTrackingView(
            props: CoffeeTrackingProps(
                connection: .connected,
                batteryPercent: 78,
                isSessionActive: true,
                isCupOnScale: true,
                startWeightGrams: 300,
                lastStableWeightGrams: 120,
                currentWeightGrams: 120,
                flowRateGramsPerSec: 0,
                sessionElapsedSeconds: 62,
                dailyCaffeineMg: 220,
                dailyTargetMg: 400,
                cupsToday: 3,
                beverage: .drip
            )
        )
        .preferredColorScheme(.dark)
    }

    #Preview("Coffee — Sipping (cup lifted)") {
        CoffeeTrackingView(
            props: CoffeeTrackingProps(
                connection: .connected,
                batteryPercent: 78,
                isSessionActive: true,
                isCupOnScale: false,
                startWeightGrams: 300,
                lastStableWeightGrams: 120,
                currentWeightGrams: 2,
                flowRateGramsPerSec: 0,
                sessionElapsedSeconds: 62,
                dailyCaffeineMg: 220,
                dailyTargetMg: 400,
                cupsToday: 3,
                beverage: .drip
            )
        )
        .preferredColorScheme(.dark)
    }

    #Preview("Coffee — Link lost mid-session") {
        CoffeeTrackingView(
            props: CoffeeTrackingProps(
                connection: .error,
                errorMessage: "Scale offline — your cup is still being tracked",
                batteryPercent: 78,
                isSessionActive: true,
                isCupOnScale: false,
                startWeightGrams: 300,
                lastStableWeightGrams: 170,
                currentWeightGrams: 170,
                flowRateGramsPerSec: 0,
                sessionElapsedSeconds: 240,
                dailyCaffeineMg: 220,
                dailyTargetMg: 400,
                cupsToday: 3,
                beverage: .drip
            ),
            onReconnect: {}
        )
        .preferredColorScheme(.dark)
    }

    #Preview("Coffee — Searching mid-session") {
        CoffeeTrackingView(
            props: CoffeeTrackingProps(
                connection: .searching,
                batteryPercent: 78,
                isSessionActive: true,
                isCupOnScale: false,
                startWeightGrams: 300,
                lastStableWeightGrams: 170,
                currentWeightGrams: 170,
                flowRateGramsPerSec: 0,
                sessionElapsedSeconds: 240,
                dailyCaffeineMg: 220,
                dailyTargetMg: 400,
                cupsToday: 3,
                beverage: .drip
            ),
            onReconnect: {}
        )
        .preferredColorScheme(.dark)
    }
#endif
