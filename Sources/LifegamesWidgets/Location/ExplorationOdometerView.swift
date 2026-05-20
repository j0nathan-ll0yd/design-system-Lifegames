import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ExplorationOdometerView: View {
    public let totalVisits: Int
    public let totalPlaces: Int
    public let citiesVisited: Int
    public let totalStates: Int
    public let currentCity: String?

    public init(totalVisits: Int, totalPlaces: Int, citiesVisited: Int, totalStates: Int, currentCity: String?) {
        self.totalVisits = totalVisits
        self.totalPlaces = totalPlaces
        self.citiesVisited = citiesVisited
        self.totalStates = totalStates
        self.currentCity = currentCity
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "EXPLORATION", dotColor: Color.colorAccentBlue, timestamp: "odometer")

            VStack(spacing: 14) {
                HStack {
                    OdometerStat(value: "\(totalVisits)", label: "Visits", color: Color.colorAccentBlue)
                    Divider().frame(height: 28).overlay(Color.white.opacity(0.08))
                    OdometerStat(value: "\(totalPlaces)", label: "Places", color: Color.colorAccentBlue)
                    Divider().frame(height: 28).overlay(Color.white.opacity(0.08))
                    OdometerStat(value: "\(citiesVisited)", label: "Cities", color: Color.colorAccentBlue)
                    Divider().frame(height: 28).overlay(Color.white.opacity(0.08))
                    OdometerStat(value: "\(totalStates)", label: "States", color: Color.colorAccentBlue)
                }

                if let city = currentCity {
                    HStack(spacing: 5) {
                        Image(systemName: "house")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.colorAccentBlue.opacity(0.6))
                        Text(city)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.colorAccentBlue)
                        Spacer()
                    }
                    .padding(.top, 10)
                    .overlay(alignment: .top) {
                        Rectangle().fill(Color.colorAccentBlue.opacity(0.12)).frame(height: 1)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentBlue)
    }
}

private struct OdometerStat: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(Color.colorTextMuted)
                .textCase(.uppercase)
                .tracking(1)
        }
        .frame(maxWidth: .infinity)
    }
}
