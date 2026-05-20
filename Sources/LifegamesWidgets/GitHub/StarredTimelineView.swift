import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct StarredTimelineView: View {
    public let props: StarredTimelineProps

    public init(props: StarredTimelineProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "STARRED TIMELINE", dotColor: Color.colorAccentPink, timestamp: "recent")

            VStack(spacing: 0) {
                ForEach(Array(props.repos.enumerated()), id: \.offset) { index, repo in
                    HStack(alignment: .top, spacing: 12) {
                        VStack(spacing: 0) {
                            Circle()
                                .fill(Color(hex: repo.languageColor))
                                .frame(width: 8, height: 8)
                                .neonGlow(Color(hex: repo.languageColor), radius: 3)
                            if index < props.repos.count - 1 {
                                Rectangle()
                                    .fill(Color.white.opacity(0.06))
                                    .frame(width: 1)
                                    .frame(maxHeight: .infinity)
                            }
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text("\(repo.owner)/\(repo.name)")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(Color.colorAccentBlue)
                                    .lineLimit(1)
                                Spacer()
                                Text(repo.starredAt)
                                    .font(.system(size: 9))
                                    .foregroundStyle(Color.colorTextMuted)
                            }
                            Text(repo.description)
                                .font(.system(size: 9))
                                .foregroundStyle(Color.colorTextMuted)
                                .lineLimit(1)
                        }
                        .padding(.bottom, 10)
                    }
                }
            }
            .padding(.horizontal, 18)
        }
        .neonCard(accent: Color.colorAccentPink)
    }
}
