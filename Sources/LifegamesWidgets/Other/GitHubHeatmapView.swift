import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct GitHubHeatmapView: View {
    public let props: GitHubHeatmapProps

    public init(props: GitHubHeatmapProps) {
        self.props = props
    }

    private func cellColor(level: Int) -> Color {
        switch level {
        case 0: return Color.white.opacity(0.04)
        case 1: return Color.colorAccentGreen.opacity(0.25)
        case 2: return Color.colorAccentGreen.opacity(0.5)
        case 3: return Color.colorAccentGreen.opacity(0.75)
        default: return Color.colorAccentGreen
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "GITHUB CONTRIBUTIONS", dotColor: Color.colorAccentGreen, timestamp: "this year")

            VStack(spacing: 12) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 2) {
                        ForEach(Array(props.contributions.enumerated()), id: \.offset) { _, week in
                            VStack(spacing: 2) {
                                ForEach(Array(week.enumerated()), id: \.offset) { _, level in
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(cellColor(level: level))
                                        .frame(width: 10, height: 10)
                                }
                            }
                        }
                    }
                }

                HStack(spacing: 0) {
                    StatColumn(value: "\(props.repos)", label: "Repos")
                    Spacer()
                    StatColumn(value: "\(props.stars)", label: "Stars")
                    Spacer()
                    StatColumn(value: props.totalContributions.formatted(), label: "Contributions")
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}

private struct StatColumn: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundStyle(Color.colorAccentGreen)
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(Color.colorTextMuted)
        }
    }
}

#Preview("GitHub Heatmap") {
    GitHubHeatmapView(props: GitHubHeatmapProps(
        contributions: (0 ..< 20).map { _ in (0 ..< 7).map { _ in Int.random(in: 0 ... 4) } },
        totalContributions: 1847,
        repos: 42,
        stars: 156
    ))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
