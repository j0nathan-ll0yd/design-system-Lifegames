import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct StarredRepoCardsView: View {
    public let props: StarredRepoCardsProps

    public init(props: StarredRepoCardsProps) {
        self.props = props
    }

    private func formatCount(_ n: Int) -> String {
        n >= 1000 ? "\(n / 1000)k" : "\(n)"
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "STARRED REPOS", dotColor: Color.colorAccentPink, timestamp: "recent")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(Array(props.repos.prefix(6).enumerated()), id: \.offset) { _, repo in
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(repo.owner)/\(repo.name)")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(Color.colorAccentBlue)
                            .lineLimit(1)
                        Text(repo.description)
                            .font(.system(size: 8))
                            .foregroundStyle(Color.colorTextMuted)
                            .lineLimit(2)
                        HStack(spacing: 8) {
                            HStack(spacing: 3) {
                                Circle().fill(Color(hex: repo.languageColor)).frame(width: 5, height: 5)
                                Text(repo.language).font(.system(size: 8)).foregroundStyle(Color.colorTextMuted)
                            }
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill").font(.system(size: 7)).foregroundStyle(Color.colorAccentAmber)
                                Text(formatCount(repo.stars)).font(.system(size: 8)).foregroundStyle(Color.colorTextMuted)
                            }
                        }
                    }
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.03))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentPink)
    }
}
