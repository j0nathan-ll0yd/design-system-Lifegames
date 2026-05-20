import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DevActivityTimelineView: View {
    public let props: DevActivityProps

    public init(props: DevActivityProps) {
        self.props = props
    }

    private func dotColor(for type: String) -> Color {
        switch type {
        case "commit": return Color.colorAccentGreen
        case "pr_merged": return Color.colorAccentPurple
        case "pr_opened": return Color.colorAccentBlue
        case "pr_closed": return Color.colorHealthRed
        case "issue_opened": return Color.colorAccentAmber
        case "issue_closed": return Color.colorAccentGreen
        default: return Color.colorTextMuted
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "ACTIVITY TIMELINE", dotColor: Color.colorAccentGreen, timestamp: "recent")

            VStack(spacing: 0) {
                ForEach(Array(props.events.enumerated()), id: \.offset) { index, event in
                    HStack(alignment: .top, spacing: 12) {
                        VStack(spacing: 0) {
                            Circle()
                                .fill(dotColor(for: event.type))
                                .frame(width: 8, height: 8)
                                .neonGlow(dotColor(for: event.type), radius: 3)
                            if index < props.events.count - 1 {
                                Rectangle()
                                    .fill(Color.white.opacity(0.06))
                                    .frame(width: 1)
                                    .frame(maxHeight: .infinity)
                            }
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(event.repo)
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(Color.colorTextTitle)
                                Spacer()
                                Text(event.date)
                                    .font(.system(size: 9))
                                    .foregroundStyle(Color.colorTextMuted)
                            }
                            Text(event.title)
                                .font(.system(size: 10))
                                .foregroundStyle(Color.colorTextMuted)
                                .lineLimit(1)
                        }
                        .padding(.bottom, 10)
                    }
                }
            }
            .padding(.horizontal, 18)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}
