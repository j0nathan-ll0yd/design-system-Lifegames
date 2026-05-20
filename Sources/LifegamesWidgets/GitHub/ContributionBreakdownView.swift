import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ContributionBreakdownView: View {
    public let props: ContributionBreakdownProps

    public init(props: ContributionBreakdownProps) {
        self.props = props
    }

    private struct StatPill: View {
        let label: String
        let value: Int
        let color: Color

        var body: some View {
            VStack(spacing: 4) {
                Text("\(value)")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
                Text(label)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.colorTextMuted)
                    .textCase(.uppercase)
                    .tracking(0.5)
            }
            .frame(maxWidth: .infinity)
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "CONTRIBUTIONS", dotColor: .colorAccentGreen, timestamp: "year")

            HStack(spacing: 0) {
                StatPill(label: "Commits", value: props.commits, color: .colorAccentGreen)
                StatPill(label: "PRs", value: props.pullRequests, color: .colorAccentBlue)
                StatPill(label: "Issues", value: props.issues, color: .colorAccentAmber)
                StatPill(label: "Reviews", value: props.reviews, color: .colorAccentPurple)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}
