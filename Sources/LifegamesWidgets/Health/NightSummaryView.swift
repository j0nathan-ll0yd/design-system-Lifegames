import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct NightSummaryView: View {
    public let props: NightSummaryProps

    public init(props: NightSummaryProps) {
        self.props = props
    }

    private struct PhaseInfo {
        let label: String
        let formatted: String
        let color: Color
    }

    private var phases: [PhaseInfo] {
        [
            PhaseInfo(label: "Deep", formatted: props.deepFormatted, color: Color(hex: "#1e40af")),
            PhaseInfo(label: "REM", formatted: props.remFormatted, color: Color.colorAccentPurple),
            PhaseInfo(label: "Core", formatted: props.coreFormatted, color: Color.colorAccentBlue),
            PhaseInfo(label: "Awake", formatted: props.awakeFormatted, color: Color.colorAccentAmber),
        ]
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "NIGHT SUMMARY", dotColor: Color.colorAccentPurple, timestamp: "last night")

            VStack(spacing: 16) {
                HStack(spacing: 16) {
                    MoonIcon()

                    VStack(alignment: .leading, spacing: 6) {
                        Text(props.duration)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(Color.colorTextTitle)

                        HStack(spacing: 8) {
                            Text("Score")
                                .font(.system(size: 10))
                                .foregroundStyle(Color.colorTextMuted)

                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(Color.white.opacity(0.08))
                                        .frame(height: 4)
                                    Capsule()
                                        .fill(Color.colorAccentPurple)
                                        .frame(width: geo.size.width * Double(props.sleepScore) / 100.0, height: 4)
                                }
                            }
                            .frame(height: 4)

                            Text("\(props.sleepScore)")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundStyle(Color.colorAccentPurple)
                        }
                    }
                }

                HStack(spacing: 8) {
                    ForEach(Array(phases.enumerated()), id: \.offset) { _, phase in
                        VStack(spacing: 3) {
                            Text(phase.label)
                                .font(.system(size: 9))
                                .foregroundStyle(Color.colorTextMuted)
                            Text(phase.formatted)
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundStyle(phase.color)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(phase.color.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }

                Text("\(props.deepPct)% deep — \(props.remPct)% REM — restorative sleep")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.colorTextMuted)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: Color.colorAccentPurple)
    }
}

private struct MoonIcon: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.colorAccentPurple.opacity(0.15))
                .frame(width: 48, height: 48)
            Circle()
                .stroke(Color.colorAccentPurple.opacity(0.4), lineWidth: 1.5)
                .frame(width: 48, height: 48)
            Image(systemName: "moon.fill")
                .font(.system(size: 20))
                .foregroundStyle(Color.colorAccentPurple.opacity(0.6))
        }
    }
}

#Preview("Night Summary") {
    NightSummaryView(props: NightSummaryProps(
        sleepScore: 82, duration: "7h 24m",
        deepFormatted: "1h 12m", remFormatted: "1h 48m",
        coreFormatted: "3h 32m", awakeFormatted: "0h 52m",
        deepPct: 16, remPct: 24
    ))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
