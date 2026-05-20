import LifegamesTokens
import SwiftUI

public struct MetricCardView: View {
    public let title: String
    public let value: String
    public var unit: String?
    public let icon: String
    public let color: Color

    public init(title: String, value: String, unit: String? = nil, icon: String, color: Color) {
        self.title = title
        self.value = value
        self.unit = unit
        self.icon = icon
        self.color = color
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(color)

            Spacer()

            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.system(.title2, design: .rounded, weight: .bold))
                    .foregroundStyle(Color.colorTextTitle)
                if let unit {
                    Text(unit)
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(Color.colorTextMuted)
                }
            }

            Text(title)
                .font(.caption)
                .foregroundStyle(Color.colorTextMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(minHeight: 100)
        .portalCard()
    }
}

#Preview("Metric Card") {
    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
        MetricCardView(title: "Heart Rate", value: "72", unit: "bpm", icon: "heart.fill", color: Color.colorAccentPink)
        MetricCardView(title: "Steps", value: "8,247", unit: nil, icon: "figure.walk", color: Color.colorAccentGreen)
    }
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
