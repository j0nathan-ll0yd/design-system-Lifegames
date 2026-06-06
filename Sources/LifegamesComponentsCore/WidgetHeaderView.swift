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
                .foregroundStyle(Color.colorTextMuted)
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

#if os(iOS)
    #Preview("Widget Header") {
        VStack(spacing: 20) {
            WidgetHeaderView(label: "HEALTH", dotColor: Color.colorAccentPink, timestamp: "today")
            WidgetHeaderView(label: "LOCATION", dotColor: Color.colorAccentBlue, timestamp: "live")
            WidgetHeaderView(label: "BOOKSHELF", dotColor: Color.colorAccentAmber, timestamp: "library")
        }
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
    }
#endif
