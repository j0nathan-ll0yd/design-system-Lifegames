import LifegamesTokens
import SwiftUI

public struct WidgetHeaderView: View {
    public let label: String
    public let dotColor: Color
    public var timestamp: String

    public init(label: String, dotColor: Color, timestamp: String = "live") {
        self.label = label
        self.dotColor = dotColor
        self.timestamp = timestamp
    }

    public var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .textCase(.uppercase)
                .kerning(3)
                .foregroundStyle(.colorTextMuted)
            Spacer()
            LiveDotView(color: dotColor)
            Text(timestamp)
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(.white.opacity(0.2))
        }
        .padding(.horizontal, 18)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }
}
