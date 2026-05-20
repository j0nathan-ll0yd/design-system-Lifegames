import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ContributionRingsView: View {
    public let props: ContributionRingsProps

    public init(props: ContributionRingsProps) {
        self.props = props
    }

    private struct RingLayer: View {
        let progress: Double
        let color: Color
        let radius: CGFloat
        let lineWidth: CGFloat

        var body: some View {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.12), lineWidth: lineWidth)
                    .frame(width: radius * 2, height: radius * 2)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: radius * 2, height: radius * 2)
                    .shadow(color: color.opacity(0.5), radius: 4)
            }
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "CONTRIBUTION RINGS", dotColor: .colorAccentGreen, timestamp: "year")

            HStack(spacing: 16) {
                ZStack {
                    RingLayer(progress: Double(props.commits.pct) / 100.0, color: .colorAccentGreen, radius: 48, lineWidth: 8)
                    RingLayer(progress: Double(props.pullRequests.pct) / 100.0, color: .colorAccentBlue, radius: 37, lineWidth: 8)
                    RingLayer(progress: Double(props.issues.pct) / 100.0, color: .colorAccentAmber, radius: 26, lineWidth: 8)
                    RingLayer(progress: Double(props.reviews.pct) / 100.0, color: .colorAccentPurple, radius: 15, lineWidth: 8)
                }
                .frame(width: 104, height: 104)

                VStack(alignment: .leading, spacing: 6) {
                    RingLegendRow(color: .colorAccentGreen, label: "Commits", value: props.commits.count)
                    RingLegendRow(color: .colorAccentBlue, label: "PRs", value: props.pullRequests.count)
                    RingLegendRow(color: .colorAccentAmber, label: "Issues", value: props.issues.count)
                    RingLegendRow(color: .colorAccentPurple, label: "Reviews", value: props.reviews.count)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

private struct RingLegendRow: View {
    let color: Color
    let label: String
    let value: Int

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(.colorTextMuted)
            Spacer()
            Text("\(value)")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.colorTextTitle)
        }
    }
}
