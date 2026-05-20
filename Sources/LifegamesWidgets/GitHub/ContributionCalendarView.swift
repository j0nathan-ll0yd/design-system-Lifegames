import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ContributionCalendarView: View {
    public let props: ContributionCalendarProps

    public init(props: ContributionCalendarProps) {
        self.props = props
    }

    private static let dayLabels = ["M", "W", "F"]

    private func cellColor(level: Int) -> Color {
        switch level {
        case 0: return Color.white.opacity(0.03)
        case 1: return .colorAccentGreen.opacity(0.25)
        case 2: return .colorAccentGreen.opacity(0.45)
        case 3: return .colorAccentGreen.opacity(0.7)
        default: return .colorAccentGreen
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "CONTRIBUTIONS", dotColor: .colorAccentGreen, timestamp: "90d")

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 3) {
                    VStack(alignment: .trailing, spacing: 0) {
                        ForEach(0 ..< 7, id: \.self) { dayIndex in
                            if dayIndex == 1 || dayIndex == 3 || dayIndex == 5 {
                                Text(Self.dayLabels[(dayIndex - 1) / 2])
                                    .font(.system(size: 8))
                                    .foregroundStyle(.colorTextMuted)
                                    .frame(width: 14, height: 14)
                            } else {
                                Color.clear.frame(width: 14, height: 14)
                            }
                        }
                    }

                    ForEach(Array(props.weeks.enumerated()), id: \.offset) { _, week in
                        VStack(spacing: 2) {
                            ForEach(Array(week.days.enumerated()), id: \.offset) { _, day in
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(cellColor(level: day.level))
                                    .frame(width: 14, height: 14)
                            }
                        }
                    }
                }

                HStack(spacing: 0) {
                    ForEach(props.months, id: \.self) { month in
                        Text(month)
                            .font(.system(size: 9))
                            .foregroundStyle(.colorTextMuted)
                        Spacer()
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}
