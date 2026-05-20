import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DurationDonutView: View {
    public let categories: [LocationProps.CategoryEntry]
    public let totalHours: Double

    public init(categories: [LocationProps.CategoryEntry], totalHours: Double) {
        self.categories = categories
        self.totalHours = totalHours
    }

    private static let colors: [Color] = [.colorAccentAmber, .colorAccentGreen, .colorAccentBlue, .colorAccentPink, .colorAccentPurple]

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "TIME SPENT", dotColor: .colorAccentAmber, timestamp: "all time")

            VStack(spacing: 10) {
                ZStack {
                    Canvas { context, size in
                        let center = CGPoint(x: size.width / 2, y: size.height / 2)
                        let outerRadius = min(size.width, size.height) / 2
                        let innerRadius = outerRadius * 0.65
                        let totalMin = categories.reduce(0) { $0 + $1.totalMinutes }
                        guard totalMin > 0 else { return }

                        var startAngle: Angle = .degrees(-90)
                        for (index, cat) in categories.enumerated() {
                            let fraction = Double(cat.totalMinutes) / Double(totalMin)
                            let endAngle = startAngle + .degrees(fraction * 360)
                            let color = Self.colors[index % Self.colors.count]

                            var path = Path()
                            path.addArc(center: center, radius: outerRadius, startAngle: startAngle, endAngle: endAngle, clockwise: false)
                            path.addArc(center: center, radius: innerRadius, startAngle: endAngle, endAngle: startAngle, clockwise: true)
                            path.closeSubpath()
                            context.fill(path, with: .color(color))

                            startAngle = endAngle
                        }
                    }
                    .frame(width: 140, height: 140)

                    VStack(spacing: 2) {
                        Text(String(format: "%.0f", totalHours))
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundStyle(.colorAccentAmber)
                        Text("hours")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundStyle(.colorTextMuted)
                            .textCase(.uppercase)
                    }
                }

                HStack(spacing: 8) {
                    ForEach(Array(categories.prefix(4).enumerated()), id: \.offset) { index, cat in
                        HStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Self.colors[index % Self.colors.count])
                                .frame(width: 8, height: 8)
                            Text(cat.category)
                                .font(.system(size: 9))
                                .foregroundStyle(.colorTextMuted)
                        }
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentAmber)
    }
}
