import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DailyActivityView: View {
    private let state: WidgetState<DailyActivityProps>

    public init(state: WidgetState<DailyActivityProps>) {
        self.state = state
    }

    public init(props: DailyActivityProps) {
        state = .populated(props)
    }

    public var body: some View {
        switch state {
        case .loading:
            DailyActivitySkeletonView()
        case .empty:
            DailyActivityEmptyView()
        case let .populated(props):
            DailyActivityPopulatedView(props: props)
        }
    }
}

// MARK: - Populated

private struct DailyActivityPopulatedView: View {
    let props: DailyActivityProps

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "DAILY ACTIVITY", dotColor: LGColor.accentPink, timestamp: "today")

            HStack(alignment: .top, spacing: 0) {
                ActivityColumn(title: "Movement", metrics: [
                    ActivityMetric(label: "Steps", value: props.steps.formatted()),
                    ActivityMetric(label: "Distance", value: "\(props.distance)", unit: "m"),
                    ActivityMetric(label: "Exercise", value: "\(props.exerciseMinutes)", unit: "min"),
                ])
                .padding(.trailing, 16)

                ActivityColumn(title: "Energy", metrics: [
                    ActivityMetric(label: "Active", value: "\(props.activeCalories)", unit: "kcal"),
                    ActivityMetric(label: "Basal", value: "\(props.basalCalories)", unit: "kcal"),
                    ActivityMetric(label: "Total", value: "\(props.totalCalories)", unit: "kcal"),
                ])
                .padding(.leading, 16)
            }
            .overlay(ActivityColumnDivider())
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

// MARK: - Skeleton

private struct DailyActivitySkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "DAILY ACTIVITY", dotColor: LGColor.accentPink, timestamp: "")

            HStack(alignment: .top, spacing: 0) {
                VStack(alignment: .leading, spacing: 14) {
                    SkeletonBar(width: 64, height: 10)
                    SkeletonColumnGroup()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.trailing, 16)

                VStack(alignment: .leading, spacing: 14) {
                    SkeletonBar(width: 48, height: 10)
                    SkeletonColumnGroup()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 16)
            }
            .overlay(ActivityColumnDivider())
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

private struct SkeletonColumnGroup: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ForEach(0 ..< 3, id: \.self) { _ in
                VStack(alignment: .leading, spacing: 4) {
                    SkeletonBar(width: 44, height: 8)
                    SkeletonBar(width: 72, height: 18)
                }
            }
        }
    }
}

// MARK: - Empty

private struct DailyActivityEmptyView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "DAILY ACTIVITY", dotColor: LGColor.accentPink, timestamp: "today")

            HStack(alignment: .top, spacing: 0) {
                ActivityColumn(title: "Movement", metrics: [
                    ActivityMetric(label: "Steps", value: "0", muted: true),
                    ActivityMetric(label: "Distance", value: "0", unit: "m", muted: true),
                    ActivityMetric(label: "Exercise", value: "0", unit: "min", muted: true),
                ])
                .padding(.trailing, 16)

                ActivityColumn(title: "Energy", metrics: [
                    ActivityMetric(label: "Active", value: "0", unit: "kcal", muted: true),
                    ActivityMetric(label: "Basal", value: "0", unit: "kcal", muted: true),
                    ActivityMetric(label: "Total", value: "0", unit: "kcal", muted: true),
                ])
                .padding(.leading, 16)
            }
            .overlay(ActivityColumnDivider())
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: LGColor.accentPink)
    }
}

// MARK: - Shared subviews

private struct ActivityMetric: Identifiable {
    var id: String {
        label
    }

    let label: String
    let value: String
    var unit: String?
    var muted: Bool = false
}

private struct ActivityColumn: View {
    let title: String
    let metrics: [ActivityMetric]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.system(size: 10, weight: .bold))
                .kerning(3)
                .textCase(.uppercase)
                .foregroundStyle(LGColor.healthRed)
                .neonGlow(LGColor.healthRed, radius: 3)

            ForEach(metrics) { metric in
                MetricRow(label: metric.label, value: metric.value, unit: metric.unit, muted: metric.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct ActivityColumnDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.white.opacity(0.06))
            .frame(width: 1)
    }
}

private struct MetricRow: View {
    let label: String
    let value: String
    var unit: String?
    var muted: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .kerning(1.5)
                .textCase(.uppercase)
                .foregroundStyle(LGColor.textMuted)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundStyle(muted ? LGColor.textMuted : LGColor.textTitle)
                if let unit {
                    Text(unit)
                        .font(.system(size: 11))
                        .foregroundStyle(LGColor.textMuted)
                }
            }
        }
    }
}

// MARK: - Previews

#Preview("Daily Activity — Populated") {
    DailyActivityView(props: DailyActivityProps(
        steps: 8421, distance: 6200, exerciseMinutes: 32,
        activeCalories: 380, basalCalories: 1650, totalCalories: 2030
    ))
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Daily Activity — Loading") {
    DailyActivityView(state: .loading)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Daily Activity — Empty") {
    DailyActivityView(state: .empty)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}
