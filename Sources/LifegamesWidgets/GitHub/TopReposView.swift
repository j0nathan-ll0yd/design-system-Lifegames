import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct TopReposView: View {
    public let props: TopReposProps

    public init(props: TopReposProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "TOP REPOS", dotColor: Color.colorAccentGreen, timestamp: "stars")

            VStack(spacing: 3) {
                ForEach(Array(props.repos.enumerated()), id: \.offset) { _, repo in
                    HStack(spacing: 8) {
                        Text("\(repo.rank)")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color.colorAccentGreen.opacity(0.5))
                            .frame(width: 16, alignment: .trailing)
                        Circle().fill(Color(hex: repo.languageColor)).frame(width: 6, height: 6)
                        Text(repo.name)
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundStyle(Color.colorTextTitle)
                            .lineLimit(1)
                        Spacer()
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill").font(.system(size: 7)).foregroundStyle(Color.colorAccentAmber)
                            Text("\(repo.stars)").font(.system(size: 9, design: .monospaced)).foregroundStyle(Color.colorTextMuted)
                        }
                    }
                    .padding(.vertical, 3)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}
