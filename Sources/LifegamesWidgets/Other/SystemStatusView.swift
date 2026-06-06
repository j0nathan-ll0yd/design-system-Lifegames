import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct SystemStatusView: View {
    public let props: SystemStatusProps

    public init(props: SystemStatusProps) {
        self.props = props
    }

    private func dotColor(for status: String) -> Color {
        switch status {
        case "green": return Color.colorAccentGreen
        case "amber": return Color.colorAccentAmber
        case "red": return LGColor.accentRed
        default: return Color.colorAccentGreen
        }
    }

    private func keyColor(for colorName: String) -> Color {
        switch colorName {
        case "red": return Color.colorAccentPink
        case "purple": return Color.colorAccentPurple
        case "blue": return Color.colorAccentBlue
        case "amber": return Color.colorAccentAmber
        case "green": return Color.colorAccentGreen
        case "yellow": return LGColor.statusWarning
        default: return Color.colorAccentGreen
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "SYSTEM STATUS", dotColor: Color.colorAccentGreen, timestamp: "realtime")

            VStack(spacing: 0) {
                ForEach(Array(props.lines.enumerated()), id: \.offset) { index, line in
                    HStack(spacing: 10) {
                        LiveDotView(color: dotColor(for: line.dotColor))
                            .frame(width: 6, height: 6)

                        Text("\(line.key):")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(keyColor(for: line.keyColorName))

                        Text(line.value)
                            .font(.system(size: 10))
                            .foregroundStyle(Color.colorTextMuted)
                            .lineLimit(1)

                        Spacer()
                    }
                    .padding(.vertical, 6)

                    if index < props.lines.count - 1 {
                        Divider().overlay(Color.white.opacity(0.04))
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}

#Preview("System Status") {
    SystemStatusView(props: SystemStatusProps(lines: [
        .init(key: "Health", value: "Active \u{2022} 62 BPM", status: "online"),
        .init(key: "Sleep", value: "7h 24m \u{2022} Score 82", status: "online"),
        .init(key: "Books", value: "5 books \u{2022} 1 reading", status: "online"),
        .init(key: "Github Events", value: "12 events today", status: "online"),
        .init(key: "Theatre Reviews", value: "24 reviews", status: "stale"),
    ]))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
