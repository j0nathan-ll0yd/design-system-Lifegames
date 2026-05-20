import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct CityConstellationView: View {
    public let cities: [LocationProps.CityEntry]

    public init(cities: [LocationProps.CityEntry]) {
        self.cities = cities
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "CITY CONSTELLATION", dotColor: .colorAccentDefault, timestamp: "cities")

            VStack(spacing: 8) {
                Canvas { context, size in
                    let sorted = cities.sorted { $0.visitCount > $1.visitCount }
                    let maxVisits = sorted.first?.visitCount ?? 1
                    let count = min(sorted.count, 8)
                    guard count > 0 else { return }

                    let cx = size.width / 2
                    let cy = size.height / 2
                    let radius = min(size.width, size.height) * 0.35

                    var points: [CGPoint] = []
                    for i in 0 ..< count {
                        let angle = (Double(i) / Double(count)) * .pi * 2 - .pi / 2
                        let r = radius * (0.5 + 0.5 * Double(sorted[i].visitCount) / Double(maxVisits))
                        let x = cx + CGFloat(cos(angle) * r)
                        let y = cy + CGFloat(sin(angle) * r)
                        points.append(CGPoint(x: x, y: y))
                    }

                    for i in 0 ..< points.count {
                        for j in (i + 1) ..< points.count {
                            var line = Path()
                            line.move(to: points[i])
                            line.addLine(to: points[j])
                            context.stroke(line, with: .color(.white.opacity(0.06)), lineWidth: 1)
                        }
                    }

                    for (i, point) in points.enumerated() {
                        let nodeRadius = CGFloat(4 + 4 * Double(sorted[i].visitCount) / Double(maxVisits))
                        let rect = CGRect(x: point.x - nodeRadius, y: point.y - nodeRadius, width: nodeRadius * 2, height: nodeRadius * 2)
                        context.fill(Path(ellipseIn: rect), with: .color(.colorAccentDefault))
                        context.addFilter(.shadow(color: .init(.colorAccentDefault.opacity(0.6)), radius: 4))
                    }
                }
                .frame(height: 130)

                VStack(spacing: 4) {
                    ForEach(Array(cities.sorted(by: { $0.visitCount > $1.visitCount }).prefix(5).enumerated()), id: \.offset) { _, city in
                        HStack(spacing: 8) {
                            Circle().fill(.colorAccentDefault).frame(width: 6, height: 6)
                                .shadow(color: .colorAccentDefault.opacity(0.5), radius: 4)
                            Text(city.city)
                                .font(.system(size: 11))
                                .foregroundStyle(.colorTextTitle)
                                .lineLimit(1)
                            Spacer()
                            Text("\(city.visitCount)")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(.colorAccentDefault)
                        }
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentDefault)
    }
}
