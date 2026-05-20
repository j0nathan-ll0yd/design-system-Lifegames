import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct StarredRepoListView: View {
    public let props: StarredRepoListProps

    public init(props: StarredRepoListProps) {
        self.props = props
    }

    private func formatStars(_ n: Int) -> String {
        n >= 1000 ? "\(n / 1000)k" : "\(n)"
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "STARRED REPOS", dotColor: .colorAccentPink, timestamp: "list")

            VStack(spacing: 3) {
                ForEach(Array(props.repos.enumerated()), id: \.offset) { _, repo in
                    HStack(spacing: 8) {
                        Circle().fill(Color(hex: repo.languageColor)).frame(width: 6, height: 6)
                        Text("\(repo.owner)/\(repo.name)")
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundStyle(.colorTextTitle)
                            .lineLimit(1)
                        Spacer()
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill").font(.system(size: 7)).foregroundStyle(.colorAccentAmber)
                            Text(formatStars(repo.stars)).font(.system(size: 9, design: .monospaced)).foregroundStyle(.colorTextMuted)
                        }
                        Text(repo.starredAt)
                            .font(.system(size: 8))
                            .foregroundStyle(.colorTextMuted.opacity(0.5))
                            .frame(width: 60, alignment: .trailing)
                    }
                    .padding(.vertical, 3)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentPink)
    }
}
