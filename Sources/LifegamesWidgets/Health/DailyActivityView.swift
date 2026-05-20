import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DailyActivityView: View {
    public let props: DailyActivityProps

    public init(props: DailyActivityProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "DAILY ACTIVITY", dotColor: Color.colorAccentPink, timestamp: "today")

            HStack(alignment: .top, spacing: 24) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Movement")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.colorTextMuted)
                        .textCase(.uppercase)

                    MetricRow(label: "Steps", value: props.steps.formatted())
                    MetricRow(label: "Distance", value: "\(props.distance)", unit: "m")
                    MetricRow(label: "Exercise", value: "\(props.exerciseMinutes)", unit: "min")
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Energy")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.colorTextMuted)
                        .textCase(.uppercase)

                    MetricRow(label: "Active", value: "\(props.activeCalories)", unit: "kcal")
                    MetricRow(label: "Basal", value: "\(props.basalCalories)", unit: "kcal")
                    MetricRow(label: "Total", value: "\(props.totalCalories)", unit: "kcal")
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: Color.colorAccentPink)
    }
}

private struct MetricRow: View {
    let label: String
    let value: String
    var unit: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(Color.colorTextMuted)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.colorTextTitle)
                if let unit {
                    Text(unit)
                        .font(.system(size: 11))
                        .foregroundStyle(Color.colorTextMuted)
                }
            }
        }
    }
}

#Preview("Daily Activity") {
    DailyActivityView(props: DailyActivityProps(
        steps: 8421, distance: 6200, exerciseMinutes: 32,
        activeCalories: 380, basalCalories: 1650, totalCalories: 2030
    ))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
