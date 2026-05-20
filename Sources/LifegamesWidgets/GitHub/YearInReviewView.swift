import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct YearInReviewView: View {
    public let props: YearInReviewProps

    public init(props: YearInReviewProps) {
        self.props = props
    }

    private struct ReviewStat: View {
        let label: String
        let value: String
        let color: Color

        var body: some View {
            VStack(spacing: 4) {
                Text(value)
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
                Text(label)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(Color.colorTextMuted)
                    .textCase(.uppercase)
                    .tracking(0.5)
            }
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "YEAR IN REVIEW", dotColor: Color.colorAccentGreen, timestamp: "annual")

            VStack(spacing: 16) {
                HStack {
                    ReviewStat(label: "Contributions", value: "\(props.totalContributions)", color: Color.colorAccentGreen)
                    Spacer()
                    ReviewStat(label: "Top Language", value: props.topLanguage, color: Color.colorAccentBlue)
                }

                HStack {
                    ReviewStat(label: "Most Active", value: props.mostActiveMonth, color: Color.colorAccentAmber)
                    Spacer()
                    ReviewStat(label: "Repos Created", value: "\(props.reposCreated)", color: Color.colorAccentPurple)
                    Spacer()
                    ReviewStat(label: "Longest Streak", value: "\(props.longestStreak)d", color: Color.colorAccentPink)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}
