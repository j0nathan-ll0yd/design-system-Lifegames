import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ActivityFeedView: View {
    public let props: ActivityFeedProps

    public init(props: ActivityFeedProps) {
        self.props = props
    }

    private func iconInfo(for type: String) -> (symbol: String, color: Color) {
        switch type {
        case "pushed": return ("arrow.right", Color.colorAccentGreen)
        case "opened PR": return ("plus.circle", Color.colorAccentBlue)
        case "opened issue": return ("circle.dotted", Color.colorAccentAmber)
        case "starred": return ("star.fill", Color.colorAccentPink)
        case "created": return ("plus", Color.colorAccentGreen)
        default: return ("circle.fill", Color.colorAccentGreen)
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "ACTIVITY FEED", dotColor: Color.colorAccentGreen, timestamp: "recent")

            VStack(spacing: 0) {
                ForEach(Array(props.events.enumerated()), id: \.offset) { index, event in
                    let icon = iconInfo(for: event.type)
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: icon.symbol)
                            .font(.system(size: 11))
                            .foregroundStyle(icon.color)
                            .frame(width: 22, height: 22)
                            .background(Color.white.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 4))

                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(event.repo)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(Color.colorTextTitle)
                                    .lineLimit(1)
                                Spacer()
                                Text(event.date)
                                    .font(.system(size: 9))
                                    .foregroundStyle(Color.colorTextMuted)
                            }
                            HStack(spacing: 6) {
                                Text(event.title)
                                    .font(.system(size: 10))
                                    .foregroundStyle(Color.colorTextMuted)
                                    .lineLimit(1)
                                if !event.detail.isEmpty {
                                    Text(event.detail)
                                        .font(.system(size: 9))
                                        .foregroundStyle(Color.colorAccentGreen.opacity(0.7))
                                }
                            }
                        }
                    }
                    .padding(.vertical, 8)

                    if index < props.events.count - 1 {
                        Divider().overlay(Color.white.opacity(0.05))
                    }
                }
            }
            .padding(.horizontal, 18)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}
