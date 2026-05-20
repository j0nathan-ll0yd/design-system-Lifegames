import Charts
import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct WeeklyPulseView: View {
    public let props: WeeklyPulseProps

    public init(props: WeeklyPulseProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "WEEKLY PULSE", dotColor: .colorAccentGreen, timestamp: "12w")

            Chart {
                ForEach(Array(props.weeks.enumerated()), id: \.offset) { index, week in
                    BarMark(
                        x: .value("Week", index),
                        y: .value("Contributions", week.total)
                    )
                    .foregroundStyle(.colorAccentGreen.opacity(0.7))
                    .cornerRadius(2)
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis(.hidden)
            .frame(height: 60)
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}
