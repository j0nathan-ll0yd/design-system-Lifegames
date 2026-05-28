import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct NightSummaryView: View {
    private let state: WidgetState<NightSummaryProps>

    public init(state: WidgetState<NightSummaryProps>) {
        self.state = state
    }

    public init(props: NightSummaryProps) {
        state = .populated(props)
    }

    public var body: some View {
        switch state {
        case .loading:
            NightSummarySkeletonView()
        case .empty:
            NightSummaryEmptyView()
        case let .populated(props):
            NightSummaryPopulatedView(props: props)
        }
    }
}

// MARK: - Populated

private struct PhaseInfo: Identifiable {
    let id: Int
    let label: String
    let formatted: String
    let color: Color
}

private struct NightSummaryPopulatedView: View {
    let props: NightSummaryProps

    private var phases: [PhaseInfo] {
        [
            PhaseInfo(id: 0, label: "Deep", formatted: props.deepFormatted, color: LGColor.sleepDeep),
            PhaseInfo(id: 1, label: "REM", formatted: props.remFormatted, color: LGColor.accentPurple),
            PhaseInfo(id: 2, label: "Core", formatted: props.coreFormatted, color: LGColor.accentBlue),
            PhaseInfo(id: 3, label: "Awake", formatted: props.awakeFormatted, color: LGColor.accentAmber),
        ]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "NIGHT SUMMARY", dotColor: LGColor.accentPurple, timestamp: "last night")

            VStack(spacing: 16) {
                HStack(spacing: 16) {
                    CrescentMoonIcon()

                    VStack(alignment: .leading, spacing: 6) {
                        Text(props.duration)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(LGColor.textTitle)

                        HStack(spacing: 8) {
                            Text("Score")
                                .font(.system(size: 10))
                                .foregroundStyle(LGColor.textMuted)

                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(Color.white.opacity(0.08))
                                        .frame(height: 4)
                                    Capsule()
                                        .fill(LGColor.accentPurple)
                                        .frame(width: geo.size.width * Double(props.sleepScore) / 100.0, height: 4)
                                }
                            }
                            .frame(height: 4)

                            Text("\(props.sleepScore)")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundStyle(LGColor.accentPurple)
                        }
                    }
                }

                PhasePillsRow(phases: phases)

                Text("\(props.deepPct)% deep — \(props.remPct)% REM — restorative sleep")
                    .font(.system(size: 10))
                    .foregroundStyle(LGColor.textMuted)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPurple)
    }
}

// MARK: - Phase Pills with stagger animation

private struct PhasePillsRow: View {
    let phases: [PhaseInfo]

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared: [Bool] = [false, false, false, false]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(phases) { phase in
                let isAppeared = appeared[phase.id]
                VStack(spacing: 3) {
                    Text(phase.label)
                        .font(.system(size: 9))
                        .foregroundStyle(LGColor.textMuted)
                    Text(phase.formatted)
                        .font(.system(size: 11, weight: .semibold, design: .monospaced))
                        .foregroundStyle(phase.color)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(phase.color.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .opacity(isAppeared ? 1.0 : 0.0)
                .offset(y: isAppeared ? 0 : 6)
            }
        }
        .task {
            guard !reduceMotion else {
                appeared = [true, true, true, true]
                return
            }
            for i in 0 ..< phases.count {
                let delay = Double(i) * 0.1 + 0.3
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                withAnimation(.easeOut(duration: 0.25)) {
                    appeared[i] = true
                }
            }
        }
    }
}

// MARK: - Custom crescent moon

private struct CrescentMoonIcon: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(LGColor.accentPurple.opacity(0.15))
                .frame(width: 56, height: 56)
                .shadow(color: LGColor.accentPurple.opacity(0.5), radius: 8, x: 0, y: 0)

            Circle()
                .stroke(LGColor.accentPurple.opacity(0.4), lineWidth: 1.5)
                .frame(width: 56, height: 56)

            Canvas { context, size in
                let cx = size.width / 2
                let cy = size.height / 2
                let r: CGFloat = 14

                // Crescent: full circle minus offset circle to create crescent shape
                var crescent = Path()
                crescent.addArc(center: CGPoint(x: cx, y: cy), radius: r, startAngle: .degrees(0), endAngle: .degrees(360), clockwise: false)

                var cutout = Path()
                cutout.addArc(center: CGPoint(x: cx + 5, y: cy - 3), radius: r * 0.78, startAngle: .degrees(0), endAngle: .degrees(360), clockwise: false)

                context.clip(to: cutout, options: .inverse)
                context.fill(crescent, with: .color(LGColor.accentPurple.opacity(0.7)))

                // Crater circles
                context.fill(
                    Path(ellipseIn: CGRect(x: cx - 9, y: cy - 5, width: 5, height: 5)),
                    with: .color(LGColor.accentPurple.opacity(0.25))
                )
                context.fill(
                    Path(ellipseIn: CGRect(x: cx + 3, y: cy + 4, width: 3.5, height: 3.5)),
                    with: .color(LGColor.accentPurple.opacity(0.18))
                )
            }
            .frame(width: 56, height: 56)
        }
    }
}

// MARK: - Skeleton

private struct NightSummarySkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "NIGHT SUMMARY", dotColor: LGColor.accentPurple, timestamp: "last night")

            VStack(alignment: .center, spacing: 10) {
                SkeletonBar(width: 40, height: 40, cornerRadius: 20)
                SkeletonBar(width: 80, height: 22)
                SkeletonBar(height: 8, cornerRadius: 4)

                HStack(spacing: 8) {
                    SkeletonBar(width: 60, height: 22, cornerRadius: 50)
                    SkeletonBar(width: 55, height: 22, cornerRadius: 50)
                    SkeletonBar(width: 65, height: 22, cornerRadius: 50)
                    SkeletonBar(width: 50, height: 22, cornerRadius: 50)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPurple)
    }
}

// MARK: - Empty

private struct NightSummaryEmptyView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "NIGHT SUMMARY", dotColor: LGColor.accentPurple, timestamp: "last night")

            VStack(spacing: 8) {
                Image(systemName: "moon.zzz")
                    .font(.system(size: 28))
                    .foregroundStyle(LGColor.accentPurple.opacity(0.4))
                Text("No sleep data")
                    .font(.system(size: 13))
                    .foregroundStyle(LGColor.textMuted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
        }
        .neonCard(accent: LGColor.accentPurple)
    }
}

// MARK: - Previews

#Preview("Night Summary — Populated") {
    NightSummaryView(props: NightSummaryProps(
        sleepScore: 82, duration: "7h 24m",
        deepFormatted: "1h 12m", remFormatted: "1h 48m",
        coreFormatted: "3h 32m", awakeFormatted: "0h 52m",
        deepPct: 16, remPct: 24
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Night Summary — Loading") {
    NightSummaryView(state: .loading)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Night Summary — Empty") {
    NightSummaryView(state: .empty)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}
