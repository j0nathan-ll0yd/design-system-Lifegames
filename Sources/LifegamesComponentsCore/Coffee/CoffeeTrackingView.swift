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
    /// Primary-action tap. The button's *meaning* is state-derived (New Cup / Finish Cup /
    /// Connect / Reconnect — see `buttonTitle`); the caller owns the behavior. Presentational:
    /// the view emits the event, it never mutates (GOVERNANCE P3 — data in, events out).
    public let onPrimaryAction: () -> Void

    public init(
        props: CoffeeTrackingProps,
        animated: Bool = true,
        onPrimaryAction: @escaping () -> Void = {}
    ) {
        self.props = props
        self.animated = animated
        self.onPrimaryAction = onPrimaryAction
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// True only when both the caller requested animation AND the user has not requested
    /// reduced motion. Every animation gate in this view uses this flag (C-MOTION / §10).
    private var shouldAnimate: Bool {
        animated && !reduceMotion
    }

    // MARK: - Derived state

    /// Desaturate the mug when not connected or on error.
    private var mugGrayscale: Double {
        switch props.connection {
        case .unpaired, .error: 1.0
        case .searching: 0.5
        case .connected: 0.0
        }
    }

    /// Dim the mug when connection is absent OR the cup is lifted mid-sip.
    private var mugOpacity: Double {
        if props.connection == .unpaired || props.connection == .error { return 0.35 }
        if props.isSessionActive && !props.isCupOnScale { return 0.60 }
        return 1.0
    }

    /// True while cup is actively lifted — triggers the "Sipping…" affordance.
    private var isSipping: Bool {
        props.isSessionActive && !props.isCupOnScale
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
                        active: props.fillPercent > 0.05 && !isSipping,
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
                        if isSipping {
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
            primaryActionButton
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
        let isDisabled = props.connection == .searching
        let isConnectable = props.connection == .unpaired || props.connection == .error

        return Button {
            onPrimaryAction() // caller owns behavior; view stays presentational (P3)
        } label: {
            HStack(spacing: Spacing.s200) {
                if !isConnectable {
                    // Hardened: SF-Symbol icons use .imageScale + .fontWeight, not a
                    // raw point-size font — direct size calls are banned in Core/Coffee
                    // (C-TOKENS / §10). .imageScale keeps size relative to the label.
                    Image(systemName: props.isSessionActive ? "checkmark" : "plus")
                        .imageScale(.medium)
                        .fontWeight(.semibold)
                        .accessibilityHidden(true)
                }
                Text(buttonTitle)
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
        .accessibilityLabel(buttonA11yLabel)
    }

    private var buttonTitle: String {
        switch props.connection {
        case .unpaired: CopyLoader.widgets.coffee.actionConnect
        case .searching: CopyLoader.widgets.coffee.searching
        case .error: CopyLoader.widgets.coffee.actionReconnect
        case .connected:
            props.isSessionActive
                ? CopyLoader.widgets.coffee.actionFinishCup
                : CopyLoader.widgets.coffee.actionNewCup
        }
    }

    private var buttonA11yLabel: String {
        switch props.connection {
        case .unpaired: CopyLoader.a11y.coffee.actionConnect
        case .searching: CopyLoader.a11y.coffee.actionSearching
        case .error: CopyLoader.a11y.coffee.actionReconnect
        case .connected:
            props.isSessionActive
                ? CopyLoader.a11y.coffee.actionFinishCup
                : CopyLoader.a11y.coffee.actionNewCup
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
private struct HeroSteamRisers: View {
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
        .onAppear { if animated { rising = active } }
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
#endif
