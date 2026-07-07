import LifegamesCopy
import LifegamesTokens
import SwiftUI

/// Animated coffee mug fill primitive. Shared across all Coffee screen variations.
///
/// Fill accumulates per sip via `fillPercent` (0–1). The `animated` parameter is a test
/// seam: pass `animated: false` for deterministic snapshot rendering. Every animation is
/// also gated by `@Environment(\.accessibilityReduceMotion)` (C-MOTION / S71).
///
/// The `showHandle` parameter controls handle visibility. Pass `showHandle: false` for
/// circular clip contexts (e.g. Variation C) where the handle arc would protrude past the
/// clip boundary. Defaults to `true` so all existing callers are unaffected.
///
/// Callers that need a circular clip (e.g. Variation C) apply `.clipShape(Circle())`
/// externally — there is no `circularClip` flag (keeps the module deep; §8).
public struct CoffeeMugView: View {
    public let fillPercent: Double
    public let beverage: CoffeeTrackingProps.Beverage
    /// When false, all animations are suppressed regardless of reduce-motion state.
    /// Use for deterministic snapshot tests. Production callers use the default (`true`).
    public let animated: Bool
    /// When false, the handle arc is omitted. Use for circular clip contexts where the
    /// handle would protrude past the clip boundary. Defaults to `true` (backward-compatible).
    public let showHandle: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let bodyWidth: CGFloat = 80
    private let bodyHeight: CGFloat = 100

    public init(
        fillPercent: Double,
        beverage: CoffeeTrackingProps.Beverage = .drip,
        animated: Bool = true,
        showHandle: Bool = true
    ) {
        self.fillPercent = fillPercent
        self.beverage = beverage
        self.animated = animated
        self.showHandle = showHandle
    }

    /// True only when both the caller requested animation AND the user has not requested
    /// reduced motion. Every animation gate in sub-views uses this flag.
    private var shouldAnimate: Bool {
        animated && !reduceMotion
    }

    public var body: some View {
        // Clamp once here so both the visual fill and the a11y value are always in [0, 1],
        // even if a future direct caller (iOS Coffee tab) passes an out-of-range value.
        let f = min(max(fillPercent, 0), 1)

        VStack(spacing: Spacing.s150) {
            SteamPuffs(active: f > 0.05, animated: shouldAnimate)
                .frame(height: 18)

            MugVessel(
                color: LGColor.accentAmber,
                bodyWidth: bodyWidth,
                bodyHeight: bodyHeight,
                cornerRadius: 12,
                fillPercent: f,
                waveHeight: 8,
                animated: shouldAnimate
            )
            .overlay(alignment: .trailing) {
                if showHandle {
                    MugHandle()
                        .stroke(LGColor.accentAmber.opacity(0.3), lineWidth: 3)
                        .frame(width: 20, height: 46)
                        .offset(x: 18, y: 4)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(CopyLoader.a11y.coffee.mug)
        .accessibilityValue("\(Int((f * 100).rounded()))% of this cup")
    }
}

// MARK: - Mug vessel (body + fill gradient + wave + bubbles + gloss)

// Ported from HydrationView's private LiquidVessel; extended with explicit `animated` seam.

private struct MugVessel: View {
    let color: Color
    let bodyWidth: CGFloat
    let bodyHeight: CGFloat
    let cornerRadius: CGFloat
    let fillPercent: Double
    let waveHeight: CGFloat
    let animated: Bool

    @State private var waveOffset: Double = 0
    @State private var glossShift: CGFloat = 0

    var body: some View {
        let fillHeight = bodyHeight * fillPercent

        ZStack(alignment: .bottom) {
            // Vessel shell (dim background)
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(Color.white.opacity(0.04))
                .frame(width: bodyWidth, height: bodyHeight)

            // Liquid fill layer
            ZStack(alignment: .top) {
                Rectangle()
                    .fill(LinearGradient(
                        colors: [color.opacity(0.7), color.opacity(0.25)],
                        startPoint: .bottom, endPoint: .top
                    ))
                    .frame(width: bodyWidth, height: fillHeight)

                if fillPercent > 0.02, animated {
                    WaveShape(offset: waveOffset)
                        .fill(color.opacity(0.5))
                        .frame(width: bodyWidth, height: waveHeight)
                }

                if fillPercent > 0.05, animated {
                    RisingBubbles(width: bodyWidth, height: fillHeight)
                }
            }
            .frame(width: bodyWidth, height: fillHeight, alignment: .top)
        }
        .frame(width: bodyWidth, height: bodyHeight, alignment: .bottom)
        .overlay(alignment: .leading) {
            // Glossy shimmer sweeping left→right across the liquid
            LinearGradient(
                colors: [.clear, Color.white.opacity(0.14), .clear],
                startPoint: .leading, endPoint: .trailing
            )
            .frame(width: bodyWidth * 0.28)
            .offset(x: bodyWidth * 0.16 + glossShift)
            .allowsHitTesting(false)
        }
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(color.opacity(0.25), lineWidth: 1.5)
        )
        // Fill change animation (easeInOut when animated; instant when not)
        .animation(animated ? .easeInOut(duration: 1.6) : nil, value: fillPercent)
        .onAppear {
            guard animated else { return }
            withAnimation(.linear(duration: 2.4).repeatForever(autoreverses: false)) {
                waveOffset = 1.0
            }
            withAnimation(.easeInOut(duration: 8).repeatForever(autoreverses: true)) {
                glossShift = 15
            }
        }
    }
}

// MARK: - Rising bubbles (one-way rise + fade, mirrors web hydraV3Rise)

private struct RisingBubbles: View {
    let width: CGFloat
    let height: CGFloat

    private struct Bubble {
        let x: Double
        let delay: Double
        let duration: Double
        let size: CGFloat
    }

    private let bubbles: [Bubble] = [
        Bubble(x: 0.20, delay: 0.0, duration: 3.0, size: 4),
        Bubble(x: 0.45, delay: 0.8, duration: 3.5, size: 3),
        Bubble(x: 0.70, delay: 1.6, duration: 2.8, size: 5),
        Bubble(x: 0.35, delay: 2.4, duration: 3.2, size: 4),
        Bubble(x: 0.60, delay: 0.4, duration: 3.4, size: 3),
        Bubble(x: 0.15, delay: 1.2, duration: 2.9, size: 4),
    ]

    @State private var animate = false

    var body: some View {
        ZStack(alignment: .bottom) {
            ForEach(0 ..< bubbles.count, id: \.self) { i in
                let b = bubbles[i]
                Circle()
                    .fill(Color.white.opacity(0.22))
                    .frame(width: b.size, height: b.size)
                    .offset(
                        x: width * b.x - width / 2,
                        y: animate ? -(height - b.size) : 0
                    )
                    .scaleEffect(animate ? 0.5 : 1.0)
                    .opacity(animate ? 0 : 0.5)
                    .animation(
                        .easeOut(duration: b.duration)
                            .repeatForever(autoreverses: false)
                            .delay(b.delay),
                        value: animate
                    )
            }
        }
        .frame(width: width, height: height, alignment: .bottom)
        .onAppear { animate = true }
    }
}

// MARK: - Steam puffs

private struct SteamPuffs: View {
    let active: Bool
    let animated: Bool

    @State private var animating = false

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0 ..< 3, id: \.self) { i in
                RoundedRectangle(cornerRadius: 1)
                    .fill(LGColor.accentAmber.opacity(0.3))
                    .frame(width: 2, height: 12 - CGFloat(i) * 2)
                    .scaleEffect(y: animating ? 1.3 : 1.0, anchor: .bottom)
                    .opacity(active ? (animating ? 0.5 : 0.2) : 0)
                    .offset(y: animating ? -4 : 0)
                    .animation(
                        animated
                            ? .easeInOut(duration: 2.0)
                            .repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.4)
                            : nil,
                        value: animating
                    )
            }
        }
        .onAppear { if animated { animating = active } }
    }
}

// MARK: - Wave shape (Animatable, mirrors web cubic-bezier fill transition)

private struct WaveShape: Shape {
    var offset: Double

    var animatableData: Double {
        get { offset }
        set { offset = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        let midY = h * 0.5
        let amplitude = h * 0.4
        let phaseShift = offset * w

        path.move(to: CGPoint(x: 0, y: midY))
        for x in stride(from: 0, through: w, by: 2) {
            let angle = ((x + phaseShift) / w) * .pi * 2
            let y = midY + amplitude * sin(angle)
            path.addLine(to: CGPoint(x: x, y: y))
        }
        path.addLine(to: CGPoint(x: w, y: rect.maxY))
        path.addLine(to: CGPoint(x: 0, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

// MARK: - Mug handle arc

private struct MugHandle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.addArc(
            center: CGPoint(x: 0, y: rect.midY),
            radius: rect.height / 2,
            startAngle: .degrees(-70),
            endAngle: .degrees(70),
            clockwise: false
        )
        return path
    }
}

// MARK: - Previews

#if os(iOS)
    #Preview("Coffee Mug — Empty (0%)") {
        CoffeeMugView(fillPercent: 0)
            .padding(Spacing.s600)
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }

    #Preview("Coffee Mug — Quarter (25%)") {
        CoffeeMugView(fillPercent: 0.25)
            .padding(Spacing.s600)
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }

    #Preview("Coffee Mug — Drinking (60%)") {
        CoffeeMugView(fillPercent: 0.6)
            .padding(Spacing.s600)
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }

    #Preview("Coffee Mug — Full (100%)") {
        CoffeeMugView(fillPercent: 1.0)
            .padding(Spacing.s600)
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }

    #Preview("Coffee Mug — Circular Clip (Variation C)") {
        CoffeeMugView(fillPercent: 0.6)
            .frame(width: 120, height: 140)
            .clipShape(Circle())
            .padding(Spacing.s600)
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
    }
#endif
