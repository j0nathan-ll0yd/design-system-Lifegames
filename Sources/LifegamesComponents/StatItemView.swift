import LifegamesTokens
import SwiftUI

public struct StatItemView: View {
    public let label: String
    public let value: String
    public var valueColor: Color
    public var compact: Bool

    public init(label: String, value: String, valueColor: Color = .colorTextTitle, compact: Bool = false) {
        self.label = label
        self.value = value
        self.valueColor = valueColor
        self.compact = compact
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: compact ? 11 : 12, weight: .medium))
                .foregroundStyle(.colorTextMuted)
                .textCase(.uppercase)
                .tracking(0.5)

            Text(value)
                .font(.system(size: compact ? 20 : 28, weight: .bold, design: .rounded))
                .foregroundStyle(valueColor)
        }
    }
}

#Preview("Stat Item") {
    HStack {
        StatItemView(label: "Steps", value: "8,432", valueColor: .colorAccentGreen)
        Spacer()
        StatItemView(label: "Distance", value: "5.2 km")
        Spacer()
        StatItemView(label: "Calories", value: "432", valueColor: .colorHealthRed)
    }
    .padding()
    .background(.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
