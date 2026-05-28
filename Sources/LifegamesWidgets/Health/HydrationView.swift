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
                HydrationEmptyView()
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
        HStack(spacing: 0) {
            WaterBottleView(fillPercent: props.waterPercent, value: "\(props.waterOz) oz")
            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(width: 1, height: 80)
            CoffeeMugView(fillPercent: props.caffeinePercent, value: "\(props.caffeineMg) mg")
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 16)
    }
}

// MARK: - Skeleton

private struct HydrationSkeletonView: View {
    var body: some View {
        HStack(spacing: 0) {
            VStack(spacing: 8) {
                SkeletonBar(width: 44, height: 80, cornerRadius: 8)
                SkeletonBar(width: 44, height: 10)
                SkeletonBar(width: 30, height: 8)
            }
            .frame(maxWidth: .infinity)

            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(width: 1, height: 60)

            VStack(spacing: 8) {
                SkeletonBar(width: 44, height: 60, cornerRadius: 8)
                SkeletonBar(width: 44, height: 10)
                SkeletonBar(width: 30, height: 8)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 16)
    }
}

// MARK: - Empty

private struct HydrationEmptyView: View {
    var body: some View {
        HStack(spacing: 0) {
            WaterBottleView(fillPercent: 0, value: "0 oz")
            Rectangle()
                .fill(Color.white.opacity(0.06))
                .frame(width: 1, height: 80)
            CoffeeMugView(fillPercent: 0, value: "0 mg")
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 16)
    }
}

// MARK: - Water Bottle

private struct WaterBottleView: View {
    let fillPercent: Double
    let value: String

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var waveOffset: Double = 0
    @State private var bubbleOffset: Double = 0

    private let bottleBodyHeight: CGFloat = 72
    private let bottleBodyWidth: CGFloat = 36
    private let bottleNeckHeight: CGFloat = 10
    private let bottleNeckWidth: CGFloat = 20
    private let bottleCapHeight: CGFloat = 6

    var body: some View {
        VStack(spacing: 8) {
            // Bottle shape
            VStack(spacing: 0) {
                // Cap
                RoundedRectangle(cornerRadius: 2)
                    .fill(LGColor.accentBlue.opacity(0.4))
                    .frame(width: bottleNeckWidth, height: bottleCapHeight)

                // Neck
                Rectangle()
                    .fill(Color.white.opacity(0.06))
                    .frame(width: bottleNeckWidth, height: bottleNeckHeight)
                    .overlay(
                        Rectangle()
                            .fill(LGColor.accentBlue.opacity(fillPercent > 0.95 ? 0.5 : 0))
                            .frame(width: bottleNeckWidth, height: bottleNeckHeight)
                    )

                // Body
                ZStack(alignment: .bottom) {
                    // Empty background
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.white.opacity(0.04))
                        .frame(width: bottleBodyWidth, height: bottleBodyHeight)

                    // Liquid fill clipped to body
                    GeometryReader { _ in
                        let fillHeight = bottleBodyHeight * fillPercent
                        ZStack(alignment: .top) {
                            // Base liquid
                            Rectangle()
                                .fill(
                                    LinearGradient(
                                        colors: [LGColor.accentBlue.opacity(0.7), LGColor.accentBlue.opacity(0.35)],
                                        startPoint: .bottom,
                                        endPoint: .top
                                    )
                                )
                                .frame(width: bottleBodyWidth, height: fillHeight)

                            // Gloss overlay
                            LinearGradient(
                                colors: [Color.white.opacity(0.18), Color.white.opacity(0)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                            .frame(width: bottleBodyWidth * 0.4, height: fillHeight)
                            .frame(maxWidth: .infinity, alignment: .leading)

                            // Wave at liquid surface
                            if fillPercent > 0.02 && !reduceMotion {
                                WavePath(offset: waveOffset)
                                    .fill(LGColor.accentBlue.opacity(0.5))
                                    .frame(width: bottleBodyWidth, height: 8)
                            }

                            // Bubbles
                            if fillPercent > 0.05 && !reduceMotion {
                                BubblesView(
                                    color: LGColor.accentBlue,
                                    containerWidth: bottleBodyWidth,
                                    containerHeight: fillHeight,
                                    offsets: [0.0, 0.8, 1.6],
                                    xPositions: [0.2, 0.5, 0.75]
                                )
                            }
                        }
                        .frame(width: bottleBodyWidth, height: fillHeight, alignment: .bottom)
                        .frame(maxHeight: .infinity, alignment: .bottom)
                    }
                    .frame(width: bottleBodyWidth, height: bottleBodyHeight)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .animation(.easeInOut(duration: 1.2), value: fillPercent)
                }
            }

            Text(value)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundStyle(LGColor.accentBlue)

            Text("Water")
                .font(.system(size: 10))
                .foregroundStyle(LGColor.textMuted)
        }
        .frame(maxWidth: .infinity)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.linear(duration: 2.0).repeatForever(autoreverses: false)) {
                waveOffset = 1.0
            }
        }
    }
}

// MARK: - Coffee Mug

private struct CoffeeMugView: View {
    let fillPercent: Double
    let value: String

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var steamOffset: Double = 0

    private let mugBodyHeight: CGFloat = 60
    private let mugBodyWidth: CGFloat = 40

    var body: some View {
        VStack(spacing: 8) {
            // Mug with handle
            ZStack(alignment: .bottom) {
                // Steam above mug (only when caffeine > 0)
                if fillPercent > 0.05 && !reduceMotion {
                    SteamLinesView(offset: steamOffset)
                        .frame(width: mugBodyWidth, height: 20)
                        .offset(y: -(mugBodyHeight / 2 + 14))
                }

                // Mug body
                ZStack(alignment: .bottom) {
                    // Empty background
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.white.opacity(0.04))
                        .frame(width: mugBodyWidth, height: mugBodyHeight)

                    // Liquid fill
                    GeometryReader { _ in
                        let fillHeight = mugBodyHeight * fillPercent
                        ZStack(alignment: .top) {
                            Rectangle()
                                .fill(
                                    LinearGradient(
                                        colors: [LGColor.accentAmber.opacity(0.7), LGColor.accentAmber.opacity(0.35)],
                                        startPoint: .bottom,
                                        endPoint: .top
                                    )
                                )
                                .frame(width: mugBodyWidth, height: fillHeight)

                            // Gloss overlay
                            LinearGradient(
                                colors: [Color.white.opacity(0.15), Color.white.opacity(0)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                            .frame(width: mugBodyWidth * 0.35, height: fillHeight)
                            .frame(maxWidth: .infinity, alignment: .leading)

                            // Wave
                            if fillPercent > 0.02 && !reduceMotion {
                                WavePath(offset: 0)
                                    .fill(LGColor.accentAmber.opacity(0.5))
                                    .frame(width: mugBodyWidth, height: 6)
                            }

                            // Bubbles
                            if fillPercent > 0.05 && !reduceMotion {
                                BubblesView(
                                    color: LGColor.accentAmber,
                                    containerWidth: mugBodyWidth,
                                    containerHeight: fillHeight,
                                    offsets: [0.3, 1.1, 1.9],
                                    xPositions: [0.25, 0.55, 0.78]
                                )
                            }
                        }
                        .frame(width: mugBodyWidth, height: fillHeight, alignment: .bottom)
                        .frame(maxHeight: .infinity, alignment: .bottom)
                    }
                    .frame(width: mugBodyWidth, height: mugBodyHeight)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .animation(.easeInOut(duration: 1.2), value: fillPercent)
                }

                // Handle (arc on the right side)
                MugHandlePath()
                    .stroke(Color.white.opacity(0.15), lineWidth: 3)
                    .frame(width: 14, height: 28)
                    .offset(x: mugBodyWidth / 2 + 5, y: -6)
            }
            .frame(width: mugBodyWidth + 20, height: mugBodyHeight + 20)

            Text(value)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundStyle(LGColor.accentAmber)

            Text("Caffeine")
                .font(.system(size: 10))
                .foregroundStyle(LGColor.textMuted)
        }
        .frame(maxWidth: .infinity)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                steamOffset = 1.0
            }
        }
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

// MARK: - Bubbles

private struct BubblesView: View {
    let color: Color
    let containerWidth: CGFloat
    let containerHeight: CGFloat
    let offsets: [Double]
    let xPositions: [Double]

    @State private var animating = false

    var body: some View {
        ZStack {
            ForEach(0 ..< min(offsets.count, xPositions.count), id: \.self) { i in
                Circle()
                    .fill(color.opacity(0.35))
                    .frame(width: 4, height: 4)
                    .offset(
                        x: containerWidth * xPositions[i] - containerWidth / 2,
                        y: animating ? -containerHeight * 0.7 : -containerHeight * 0.1
                    )
                    .animation(
                        .easeInOut(duration: 2.0 + Double(i) * 0.4)
                            .repeatForever(autoreverses: true)
                            .delay(offsets[i] * 0.5),
                        value: animating
                    )
            }
        }
        .frame(width: containerWidth, height: containerHeight)
        .onAppear { animating = true }
    }
}

// MARK: - Steam Lines

private struct SteamLinesView: View {
    var offset: Double
    @State private var animating = false

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0 ..< 3, id: \.self) { i in
                SteamLine(delay: Double(i) * 0.4, animating: animating)
            }
        }
        .onAppear { animating = true }
    }
}

private struct SteamLine: View {
    let delay: Double
    let animating: Bool

    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(Color.white.opacity(0.2))
            .frame(width: 3, height: animating ? 14 : 6)
            .opacity(animating ? 0.1 : 0.5)
            .animation(
                .easeInOut(duration: 1.2).repeatForever(autoreverses: true).delay(delay),
                value: animating
            )
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
