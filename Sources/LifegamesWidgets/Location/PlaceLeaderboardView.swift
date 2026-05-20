import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct PlaceLeaderboardView: View {
    public let places: [LocationProps.Place]

    public init(places: [LocationProps.Place]) {
        self.places = places
    }

    private static let medalColors: [Color] = [
        Color(red: 1.0, green: 0.84, blue: 0.0),
        Color(red: 0.75, green: 0.75, blue: 0.75),
        Color(red: 0.80, green: 0.50, blue: 0.20),
    ]

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "TOP PLACES", dotColor: Color.colorAccentBlue, timestamp: "leaderboard")

            VStack(spacing: 0) {
                VStack(spacing: 6) {
                    ForEach(Array(places.prefix(3).enumerated()), id: \.offset) { index, place in
                        HStack(spacing: 8) {
                            Text("\(index + 1)")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(index < 3 ? Self.medalColors[index] : Color.colorAccentBlue.opacity(0.5))
                                .frame(width: 20, alignment: .center)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(place.name)
                                    .font(.system(size: 11, weight: index == 0 ? .semibold : .regular))
                                    .foregroundStyle(index == 0 ? .white : Color.colorTextTitle)
                                    .lineLimit(1)
                                if let category = place.category {
                                    Text(category)
                                        .font(.system(size: 8, weight: .semibold))
                                        .foregroundStyle(Color.colorAccentBlue.opacity(0.7))
                                        .textCase(.uppercase)
                                        .tracking(0.8)
                                }
                            }

                            Spacer()

                            Text("\(place.visitCount)")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(index == 0 ? Self.medalColors[0] : Color.colorAccentBlue)
                        }
                        .padding(6)
                        .padding(.horizontal, 2)
                        .background(Color.white.opacity(0.03))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .strokeBorder(
                                    index < 3 ? Self.medalColors[index].opacity(0.2) : .clear,
                                    lineWidth: index == 0 ? 1 : 0
                                )
                        )
                    }
                }
                .padding(.bottom, 8)

                Divider().overlay(Color.white.opacity(0.04))

                VStack(spacing: 3) {
                    ForEach(Array(places.dropFirst(3).prefix(5).enumerated()), id: \.offset) { index, place in
                        HStack(spacing: 8) {
                            Text("\(index + 4)")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(Color.colorAccentBlue.opacity(0.4))
                                .frame(width: 18, alignment: .trailing)
                            Text(place.name)
                                .font(.system(size: 10))
                                .foregroundStyle(Color.colorTextMuted)
                                .lineLimit(1)
                            Spacer()
                            Text("\(place.visitCount)")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(Color.colorAccentBlue.opacity(0.55))
                        }
                    }
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentBlue)
    }
}
