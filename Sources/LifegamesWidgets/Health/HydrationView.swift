import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct HydrationView: View {
    private let state: WidgetState<HydrationProps>

    public init(state: WidgetState<HydrationProps>) {
        self.state = state
    }

    public init(props: HydrationProps) {
        state = .populated(props)
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "HYDRATION", dotColor: LGColor.accentPink, timestamp: "today")

            switch state {
            case .loading:
                HydrationSkeletonView()
            case .empty:
                HydrationPopulatedView(props: .zero)
            case let .populated(props):
                HydrationPopulatedView(props: props)
            }
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

// MARK: - Populated

private struct HydrationPopulatedView: View {
    let props: HydrationProps

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            WaterBottleColumn(fillPercent: props.waterPercent, value: "\(props.waterOz) oz")
                .frame(maxWidth: .infinity)

            VesselDivider()
                .padding(.bottom, 28)

            CoffeeMugColumn(fillPercent: props.caffeinePercent, value: "\(props.caffeineMg) mg")
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 18)
        .padding(.top, 14)
        .padding(.bottom, 16)
    }
}

private struct VesselDivider: View {
    var body: some View {
        Rectangle()
            .fill(LinearGradient(
                colors: [.clear, Color.white.opacity(0.10), .clear],
                startPoint: .top, endPoint: .bottom
            ))
            .frame(width: 1, height: 96)
    }
}

// MARK: - Water Bottle

private struct WaterBottleColumn: View {
    let fillPercent: Double
    let value: String

    private let bodyWidth: CGFloat = 48
    private let bodyHeight: CGFloat = 100

    var body: some View {
        VStack(spacing: 8) {
            VStack(spacing: 0) {
                // Cap
                UnevenRoundedRectangle(topLeadingRadius: 6, topTrailingRadius: 6)
                    .fill(LGColor.accentBlue.opacity(0.06))
                    .overlay(
                        UnevenRoundedRectangle(topLeadingRadius: 6, topTrailingRadius: 6)
                            .stroke(LGColor.accentBlue.opacity(0.3), lineWidth: 2)
                    )
                    .frame(width: 26, height: 12)

                LiquidVessel(
                    color: LGColor.accentBlue,
                    bodyWidth: bodyWidth,
                    bodyHeight: bodyHeight,
                    cornerRadius: 12,
                    fillPercent: fillPercent,
                    waveHeight: 8
                )
            }

            VesselReadout(value: value, label: "Water", color: LGColor.accentBlue)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Coffee Mug

private struct CoffeeMugColumn: View {
    let fillPercent: Double
    let value: String

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let bodyWidth: CGFloat = 52
    private let bodyHeight: CGFloat = 74

    var body: some View {
        VStack(spacing: 8) {
            VStack(spacing: 2) {
                SteamView(active: fillPercent > 0.05 && !reduceMotion)
                    .frame(height: 14)

                LiquidVessel(
                    color: LGColor.accentAmber,
                    bodyWidth: bodyWidth,
                    bodyHeight: bodyHeight,
                    cornerRadius: 10,
                    fillPercent: fillPercent,
                    waveHeight: 6
                )
                .overlay(alignment: .trailing) {
                    MugHandlePath()
                        .stroke(LGColor.accentAmber.opacity(0.25), lineWidth: 2)
                        .frame(width: 14, height: 34)
                        .offset(x: 13, y: 4)
                }
            }

            VesselReadout(value: value, label: "Caffeine", color: LGColor.accentAmber)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Vessel readout (value + label)

private struct VesselReadout: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(color)
                .neonGlow(color, radius: 3)

            Text(label)
                .font(.system(size: 9, weight: .medium))
                .kerning(2)
                .textCase(.uppercase)
                .foregroundStyle(LGColor.textMuted)
        }
    }
}

// MARK: - Liquid vessel (body background + animated liquid + gloss)

private struct LiquidVessel: View {
    let color: Color
    let bodyWidth: CGFloat
    let bodyHeight: CGFloat
    let cornerRadius: CGFloat
    let fillPercent: Double
    let waveHeight: CGFloat

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var waveOffset: Double = 0
    @State private var glossShift: CGFloat = 0

    var body: some View {
        let fillHeight = bodyHeight * fillPercent

        ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(Color.white.opacity(0.04))
                .frame(width: bodyWidth, height: bodyHeight)

            ZStack(alignment: .top) {
                Rectangle()
                    .fill(LinearGradient(
                        colors: [color.opacity(0.7), color.opacity(0.25)],
                        startPoint: .bottom, endPoint: .top
                    ))
                    .frame(width: bodyWidth, height: fillHeight)

                if fillPercent > 0.02, !reduceMotion {
                    WavePath(offset: waveOffset)
                        .fill(color.opacity(0.5))
                        .frame(width: bodyWidth, height: waveHeight)
                }

                if fillPercent > 0.05, !reduceMotion {
                    RisingBubbles(width: bodyWidth, height: fillHeight)
                }
            }
            .frame(width: bodyWidth, height: fillHeight, alignment: .top)
        }
        .frame(width: bodyWidth, height: bodyHeight, alignment: .bottom)
        .overlay(alignment: .leading) {
            // Glossy shimmer band sweeping across the liquid
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
        .animation(reduceMotion ? nil : .easeInOut(duration: 1.6), value: fillPercent)
        .onAppear {
            guard !reduceMotion else { return }
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

// MARK: - Steam

private struct SteamView: View {
    let active: Bool
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
                        .easeInOut(duration: 2.0)
                            .repeatForever(autoreverses: true)
                            .delay(Double(i) * 0.4),
                        value: animating
                    )
            }
        }
        .onAppear { animating = active }
    }
}

// MARK: - Wave Shape

private struct WavePath: Shape {
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

// MARK: - Mug Handle Path

private struct MugHandlePath: Shape {
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

// MARK: - Skeleton

private struct HydrationSkeletonView: View {
    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            VStack(spacing: 8) {
                SkeletonBar(width: 48, height: 100, cornerRadius: 12)
                SkeletonBar(width: 40, height: 12)
                SkeletonBar(width: 30, height: 8)
            }
            .frame(maxWidth: .infinity)

            VesselDivider()
                .padding(.bottom, 28)

            VStack(spacing: 8) {
                SkeletonBar(width: 52, height: 74, cornerRadius: 10)
                SkeletonBar(width: 40, height: 12)
                SkeletonBar(width: 30, height: 8)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 18)
        .padding(.top, 14)
        .padding(.bottom, 16)
    }
}

// MARK: - Empty data

private extension HydrationProps {
    static let zero = HydrationProps(
        waterOz: 0, caffeineMg: 0, waterMax: 100, caffeineMax: 500,
        waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
    )
}

// MARK: - Previews

#Preview("Hydration — Populated") {
    HydrationView(props: HydrationProps(
        waterOz: 54, caffeineMg: 280, waterMax: 100, caffeineMax: 500,
        waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Hydration — Loading") {
    HydrationView(state: .loading)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Hydration — Empty") {
    HydrationView(state: .empty)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Hydration — Dehydrated") {
    HydrationView(props: HydrationProps(
        waterOz: 12, caffeineMg: 80, waterMax: 100, caffeineMax: 500,
        waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Hydration — Overhydrated") {
    HydrationView(props: HydrationProps(
        waterOz: 100, caffeineMg: 480, waterMax: 100, caffeineMax: 500,
        waterRangeLo: 64, waterRangeHi: 80, caffeineRangeLo: 200, caffeineRangeHi: 400
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
