import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct StreakCalendarView: View {
    public let last90Days: [LocationProps.DayEntry]
    public let currentStreak: Int

    public init(last90Days: [LocationProps.DayEntry], currentStreak: Int) {
        self.last90Days = last90Days
        self.currentStreak = currentStreak
    }

    private static let dayHeaders = ["M", "T", "W", "T", "F", "S", "S"]

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "STREAK CALENDAR", dotColor: .colorAccentGreen, timestamp: "30d")

            VStack(spacing: 4) {
                HStack(spacing: 3) {
                    ForEach(Self.dayHeaders.indices, id: \.self) { i in
                        Text(Self.dayHeaders[i])
                            .font(.system(size: 8))
                            .foregroundStyle(.colorTextMuted)
                            .textCase(.uppercase)
                            .frame(maxWidth: .infinity)
                    }
                }

                let recentDays = Array(last90Days.suffix(35))
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 3), count: 7), spacing: 3) {
                    ForEach(Array(recentDays.enumerated()), id: \.offset) { _, day in
                        let isActive = day.count > 0
                        RoundedRectangle(cornerRadius: 4)
                            .fill(isActive ? .colorAccentGreen.opacity(0.15) : Color.white.opacity(0.03))
                            .aspectRatio(1, contentMode: .fit)
                            .overlay(
                                Text("\(Calendar.current.component(.day, from: dateFrom(day.date)))")
                                    .font(.system(size: 9))
                                    .foregroundStyle(isActive ? .colorAccentGreen : .colorTextMuted)
                            )
                    }
                }

                HStack(spacing: 5) {
                    Text("Current streak:")
                        .font(.system(size: 10))
                        .foregroundStyle(.colorTextMuted)
                    Text("\(currentStreak)")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.colorAccentGreen)
                    Text("days")
                        .font(.system(size: 10))
                        .foregroundStyle(.colorTextMuted)
                }
                .padding(.top, 6)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }

    private func dateFrom(_ str: String) -> Date {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: str) ?? Date()
    }
}
