import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct StreakCounterView: View {
    public let props: StreakCounterProps

    public init(props: StreakCounterProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "STREAK", dotColor: .colorAccentGreen, timestamp: "streak")

            VStack(spacing: 12) {
                HStack(spacing: 20) {
                    VStack(spacing: 2) {
                        Text("\(props.current)")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(.colorAccentGreen)
                        Text("Current")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.colorTextMuted)
                            .textCase(.uppercase)
                    }
                    VStack(spacing: 2) {
                        Text("\(props.longest)")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(.colorTextTitle)
                        Text("Longest")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.colorTextMuted)
                            .textCase(.uppercase)
                    }
                }

                HStack(spacing: 3) {
                    ForEach(Array(props.recentDays.enumerated()), id: \.offset) { _, day in
                        Circle()
                            .fill(day.active ? .colorAccentGreen : Color.white.opacity(0.08))
                            .frame(width: 7, height: 7)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 16)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}
