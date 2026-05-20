import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ProfileCardView: View {
    public let props: ProfileCardProps

    public init(props: ProfileCardProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "PROFILE", dotColor: .colorAccentGreen, timestamp: "github")

            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    Circle()
                        .fill(.colorAccentPurple.opacity(0.3))
                        .frame(width: 48, height: 48)
                        .overlay(
                            Text(String(props.name.prefix(1)))
                                .font(.system(size: 20, weight: .bold))
                                .foregroundStyle(.colorAccentPurple)
                        )

                    VStack(alignment: .leading, spacing: 2) {
                        Text(props.name)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.colorTextTitle)
                        Text(props.bio)
                            .font(.system(size: 10))
                            .foregroundStyle(.colorTextMuted)
                            .lineLimit(2)
                    }
                }

                HStack(spacing: 16) {
                    StatItemView(label: "Followers", value: "\(props.followers)", compact: true)
                    StatItemView(label: "Following", value: "\(props.following)", compact: true)
                    StatItemView(label: "Repos", value: "\(props.publicRepos)", valueColor: .colorAccentGreen, compact: true)
                }

                Text(props.createdAt)
                    .font(.system(size: 9))
                    .foregroundStyle(.colorTextMuted.opacity(0.6))
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}
