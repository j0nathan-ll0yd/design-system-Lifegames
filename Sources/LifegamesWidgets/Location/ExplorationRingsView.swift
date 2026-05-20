import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ExplorationRingsView: View {
    public let stats: LocationProps.ExplorationStats

    public init(stats: LocationProps.ExplorationStats) {
        self.stats = stats
    }

    private static let goals = (neighborhoods: 50, cities: 10, states: 5)

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "EXPLORATION RINGS", dotColor: Color.colorAccentPink, timestamp: "progress")

            VStack(spacing: 10) {
                ZStack {
                    HealthRingView(
                        progress: min(Double(stats.totalNeighborhoods) / Double(Self.goals.neighborhoods), 1.0),
                        color: Color.colorAccentPink, label: "", value: "",
                        lineWidth: 8, size: 104
                    )
                    HealthRingView(
                        progress: min(Double(stats.totalCities) / Double(Self.goals.cities), 1.0),
                        color: Color.colorAccentBlue, label: "", value: "",
                        lineWidth: 8, size: 80
                    )
                    HealthRingView(
                        progress: min(Double(stats.totalStates) / Double(Self.goals.states), 1.0),
                        color: Color.colorAccentGreen, label: "", value: "",
                        lineWidth: 8, size: 56
                    )
                }
                .frame(width: 120, height: 120)

                VStack(spacing: 6) {
                    RingLegend(color: Color.colorAccentPink, label: "Neighborhoods", count: stats.totalNeighborhoods)
                    RingLegend(color: Color.colorAccentBlue, label: "Cities", count: stats.totalCities)
                    RingLegend(color: Color.colorAccentGreen, label: "States", count: stats.totalStates)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentPink)
    }
}

private struct RingLegend: View {
    let color: Color
    let label: String
    let count: Int

    var body: some View {
        HStack(spacing: 8) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label).font(.system(size: 11)).foregroundStyle(Color.colorTextMuted)
            Spacer()
            Text("\(count)").font(.system(size: 11, weight: .semibold)).foregroundStyle(Color.colorTextTitle)
        }
    }
}
