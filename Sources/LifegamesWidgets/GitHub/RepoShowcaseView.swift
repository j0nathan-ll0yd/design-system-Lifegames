import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct RepoShowcaseView: View {
    public let props: RepoShowcaseProps

    public init(props: RepoShowcaseProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "REPO SHOWCASE", dotColor: .colorAccentGreen, timestamp: "pinned")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(Array(props.repos.enumerated()), id: \.offset) { _, repo in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(repo.name)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.colorAccentBlue)
                        Text(repo.description)
                            .font(.system(size: 9))
                            .foregroundStyle(.colorTextMuted)
                            .lineLimit(2)
                        HStack(spacing: 8) {
                            HStack(spacing: 3) {
                                Circle().fill(Color(hex: repo.languageColor)).frame(width: 6, height: 6)
                                Text(repo.language).font(.system(size: 8)).foregroundStyle(.colorTextMuted)
                            }
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill").font(.system(size: 7)).foregroundStyle(.colorAccentAmber)
                                Text("\(repo.stars)").font(.system(size: 8)).foregroundStyle(.colorTextMuted)
                            }
                        }
                        if !repo.topics.isEmpty {
                            HStack(spacing: 4) {
                                ForEach(repo.topics.prefix(3), id: \.self) { topic in
                                    Text(topic)
                                        .font(.system(size: 7))
                                        .foregroundStyle(.colorAccentBlue.opacity(0.8))
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 2)
                                        .background(.colorAccentBlue.opacity(0.1))
                                        .clipShape(RoundedRectangle(cornerRadius: 3))
                                }
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
        .neonCard(accent: .colorAccentGreen)
    }
}
