import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DevActivityCardsView: View {
    public let props: DevActivityProps

    public init(props: DevActivityProps) {
        self.props = props
    }

    private func borderColor(for type: String) -> Color {
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
            WidgetHeaderView(label: "ACTIVITY CARDS", dotColor: Color.colorAccentGreen, timestamp: "recent")

            VStack(spacing: 6) {
                ForEach(Array(props.events.prefix(6).enumerated()), id: \.offset) { _, event in
                    HStack(spacing: 10) {
                        Rectangle()
                            .fill(borderColor(for: event.type))
                            .frame(width: 3)
                            .clipShape(RoundedRectangle(cornerRadius: 1.5))

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
                    }
                    .padding(8)
                    .background(Color.white.opacity(0.03))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}
