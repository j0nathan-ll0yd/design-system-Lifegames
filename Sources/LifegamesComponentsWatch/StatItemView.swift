import LifegamesTokens
import SwiftUI

public struct StatItemView: View {
    public let label: String
    public let value: String
    public var valueColor: Color
    public var compact: Bool

    public init(label: String, value: String, valueColor: Color = Color.colorTextTitle, compact: Bool = false) {
        self.label = label
        self.value = value
        self.valueColor = valueColor
        self.compact = compact
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: compact ? 11 : 12, weight: .medium))
                .foregroundStyle(Color.colorTextMuted)
                .textCase(.uppercase)
                .tracking(0.5)

            Text(value)
                .font(.system(size: compact ? 20 : 28, weight: .bold, design: .rounded))
                .foregroundStyle(valueColor)
        }
    }
}
