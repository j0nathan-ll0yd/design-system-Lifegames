import LifegamesComponents
import LifegamesCopy
import LifegamesTokens
import SwiftUI

private let starredReposCopy = CopyLoader.widgets.starredRepos

private struct StarredRepoListPopulatedView: View {
    let props: StarredRepoListProps

    init(props: StarredRepoListProps) {
        self.props = props
    }

    private func formatStars(_ n: Int) -> String {
        n >= 1000 ? "\(n / 1000)k" : "\(n)"
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: starredReposCopy.title.uppercased(), dotColor: Color.colorAccentPink, timestamp: starredReposCopy.timestampRecent)

            VStack(spacing: 3) {
                ForEach(Array(props.repos.enumerated()), id: \.offset) { _, repo in
                    HStack(spacing: 8) {
                        Circle().fill(Color(hex: repo.languageColor)).frame(width: 6, height: 6)
                        Text("\(repo.owner)/\(repo.name)")
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundStyle(Color.colorTextTitle)
                            .lineLimit(1)
                        Spacer()
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill").font(.system(size: 7)).foregroundStyle(Color.colorAccentAmber)
                            Text(formatStars(repo.stars)).font(.system(size: 9, design: .monospaced)).foregroundStyle(Color.colorTextMuted)
                        }
                        Text(repo.starredAt)
                            .font(.system(size: 8))
                            .foregroundStyle(Color.colorTextMuted.opacity(0.5))
                            .frame(width: 60, alignment: .trailing)
                    }
                    .padding(.vertical, 3)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentPink)
    }
}

public struct StarredRepoListView: View {
    private let state: WidgetState<StarredRepoListProps>

    public init(state: WidgetState<StarredRepoListProps>) {
        self.state = state
    }

    public init(props: StarredRepoListProps) {
        state = props.repos.isEmpty ? .empty : .populated(props)
    }

    public var body: some View {
        switch state {
        case .loading:
            StarredRepoListMessageView(message: nil)
        case .empty:
            StarredRepoListMessageView(message: starredReposCopy.empty)
        case let .populated(props):
            StarredRepoListPopulatedView(props: props)
        case .unavailable:
            WidgetStateNoticeCard(notice: .unavailable, title: starredReposCopy.title, accent: Color.colorAccentPink)
        case .suppressed:
            WidgetStateNoticeCard(notice: .suppressed, title: starredReposCopy.title, accent: Color.colorAccentPink)
        }
    }
}

/// Loading (message nil) and empty chrome. Mirrors the other widgets' skeleton and empty cards.
private struct StarredRepoListMessageView: View {
    let message: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: starredReposCopy.title.uppercased(), dotColor: Color.colorAccentPink, timestamp: starredReposCopy.timestampRecent)

            if let message {
                Text(message)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.colorTextMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(0 ..< 4, id: \.self) { _ in
                        SkeletonBar(width: 240, height: 10)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 12)
            }
        }
        .neonCard(accent: Color.colorAccentPink)
    }
}

#Preview("Starred Repo List — Unavailable") {
    StarredRepoListView(state: .unavailable)
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Starred Repo List — Suppressed") {
    StarredRepoListView(state: .suppressed)
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}
