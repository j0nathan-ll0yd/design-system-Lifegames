import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct StarredByLanguageView: View {
    public let props: StarredByLanguageProps

    public init(props: StarredByLanguageProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "STARRED BY LANGUAGE", dotColor: .colorAccentPink, timestamp: "starred")

            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(props.groups.enumerated()), id: \.offset) { _, group in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Circle().fill(Color(hex: group.languageColor)).frame(width: 8, height: 8)
                            Text(group.language)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.colorTextTitle)
                            Text("\(group.repos.count)")
                                .font(.system(size: 9))
                                .foregroundStyle(.colorTextMuted)
                        }
                        ForEach(Array(group.repos.enumerated()), id: \.offset) { _, repo in
                            HStack {
                                Text("\(repo.owner)/\(repo.name)")
                                    .font(.system(size: 9))
                                    .foregroundStyle(.colorTextMuted)
                                    .lineLimit(1)
                                Spacer()
                                HStack(spacing: 2) {
                                    Image(systemName: "star.fill").font(.system(size: 7)).foregroundStyle(.colorAccentAmber)
                                    Text(formatStars(repo.stars)).font(.system(size: 8)).foregroundStyle(.colorTextMuted)
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentPink)
    }

    private func formatStars(_ count: Int) -> String {
        count >= 1000 ? "\(count / 1000)k" : "\(count)"
    }
}
