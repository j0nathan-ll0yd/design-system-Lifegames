import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct CodingHoursView: View {
    public let props: CodingHoursProps

    public init(props: CodingHoursProps) {
        self.props = props
    }

    private static let dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    private func cellColor(level: Int) -> Color {
        switch level {
        case 0: return Color.white.opacity(0.03)
        case 1: return .colorAccentGreen.opacity(0.2)
        case 2: return .colorAccentGreen.opacity(0.4)
        case 3: return .colorAccentGreen.opacity(0.65)
        default: return .colorAccentGreen
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "CODING HOURS", dotColor: .colorAccentGreen, timestamp: "punch card")

            HStack(alignment: .top, spacing: 4) {
                VStack(alignment: .trailing, spacing: 2) {
                    ForEach(0 ..< 7, id: \.self) { day in
                        Text(Self.dayLabels[day])
                            .font(.system(size: 8))
                            .foregroundStyle(.colorTextMuted)
                            .frame(height: 10)
                    }
                }
                .frame(width: 24)

                LazyHGrid(rows: Array(repeating: GridItem(.fixed(10), spacing: 2), count: 7), spacing: 2) {
                    ForEach(0 ..< 24, id: \.self) { hour in
                        ForEach(0 ..< 7, id: \.self) { day in
                            let level = (day < props.grid.count && hour < props.grid[day].count)
                                ? props.grid[day][hour] : 0
                            RoundedRectangle(cornerRadius: 2)
                                .fill(cellColor(level: level))
                                .frame(width: 10, height: 10)
                        }
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}
