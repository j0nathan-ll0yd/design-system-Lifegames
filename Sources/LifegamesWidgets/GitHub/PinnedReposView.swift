import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct PinnedReposView: View {
    public let props: PinnedReposProps

    public init(props: PinnedReposProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "PINNED REPOS", dotColor: Color.colorAccentGreen, timestamp: "pinned")

            VStack(spacing: 8) {
                ForEach(Array(props.repos.enumerated()), id: \.offset) { _, repo in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(repo.name)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Color.colorAccentBlue)
                        Text(repo.description)
                            .font(.system(size: 9))
                            .foregroundStyle(Color.colorTextMuted)
                            .lineLimit(2)
                        HStack(spacing: 10) {
                            HStack(spacing: 3) {
                                Circle().fill(Color(hex: repo.languageColor)).frame(width: 6, height: 6)
                                Text(repo.language).font(.system(size: 9)).foregroundStyle(Color.colorTextMuted)
                            }
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill").font(.system(size: 8)).foregroundStyle(Color.colorAccentAmber)
                                Text("\(repo.stars)").font(.system(size: 9)).foregroundStyle(Color.colorTextMuted)
                            }
                            HStack(spacing: 2) {
                                Image(systemName: "tuningfork").font(.system(size: 8)).foregroundStyle(Color.colorTextMuted)
                                Text("\(repo.forks)").font(.system(size: 9)).foregroundStyle(Color.colorTextMuted)
                            }
                        }
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
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
