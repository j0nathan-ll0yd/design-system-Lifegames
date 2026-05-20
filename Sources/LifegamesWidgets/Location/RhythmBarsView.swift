import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct RhythmBarsView: View {
    public let last90Days: [LocationProps.DayEntry]

    public init(last90Days: [LocationProps.DayEntry]) {
        self.last90Days = last90Days
    }

    private static let dayLabels = ["M", "T", "W", "T", "F", "S", "S"]

    private var weekdayTotals: [Int] {
        var totals = Array(repeating: 0, count: 7)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let calendar = Calendar.current
        for day in last90Days {
            if let date = formatter.date(from: day.date) {
                let weekday = (calendar.component(.weekday, from: date) + 5) % 7
                totals[weekday] += day.count
            }
        }
        return totals
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "WEEKLY RHYTHM", dotColor: .colorAccentBlue, timestamp: "90d")

            let totals = weekdayTotals
            let maxVal = max(totals.max() ?? 1, 1)

            VStack(spacing: 4) {
                HStack(alignment: .bottom, spacing: 6) {
                    ForEach(0 ..< 7, id: \.self) { day in
                        VStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(.colorAccentBlue)
                                .frame(height: max(2, CGFloat(totals[day]) / CGFloat(maxVal) * 70))
                                .shadow(color: .colorAccentBlue.opacity(0.3), radius: 6)
                            Text(Self.dayLabels[day])
                                .font(.system(size: 9))
                                .foregroundStyle(.colorTextMuted)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .frame(height: 80)

                if let busiestIdx = totals.enumerated().max(by: { $0.element < $1.element })?.offset {
                    HStack(spacing: 6) {
                        Text("Busiest:")
                            .font(.system(size: 10))
                            .foregroundStyle(.colorTextMuted)
                            .textCase(.uppercase)
                            .tracking(0.8)
                        Text(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][busiestIdx])
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.colorAccentBlue)
                    }
                    .padding(.top, 8)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentBlue)
    }
}
