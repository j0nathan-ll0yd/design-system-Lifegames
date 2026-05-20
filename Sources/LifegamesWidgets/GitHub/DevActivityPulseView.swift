import Charts
import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DevActivityPulseView: View {
    public let props: DevActivityProps

    public init(props: DevActivityProps) {
        self.props = props
    }

    private var typeCounts: [(type: String, count: Int, color: Color)] {
        var counts: [String: Int] = [:]
        for event in props.events {
            let bucket: String
            switch event.type {
            case "commit": bucket = "Commits"
            case "pr_merged", "pr_opened", "pr_closed": bucket = "PRs"
            case "issue_opened", "issue_closed": bucket = "Issues"
            default: bucket = "Other"
            }
            counts[bucket, default: 0] += 1
        }
        let colorMap: [String: Color] = [
            "Commits": .colorAccentGreen, "PRs": .colorAccentBlue,
            "Issues": .colorAccentAmber, "Other": .colorTextMuted,
        ]
        return counts.sorted { $0.value > $1.value }
            .map { (type: $0.key, count: $0.value, color: colorMap[$0.key] ?? .colorTextMuted) }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "ACTIVITY PULSE", dotColor: .colorAccentGreen, timestamp: "recent")

            Canvas { context, size in
                let points = props.events.enumerated().map { index, _ in
                    CGPoint(
                        x: CGFloat(index) / CGFloat(max(props.events.count - 1, 1)) * size.width,
                        y: size.height * 0.3 + sin(Double(index) * 0.8) * size.height * 0.2
                    )
                }

                guard points.count >= 2 else { return }
                var path = Path()
                path.move(to: points[0])
                for i in 1 ..< points.count {
                    let control1 = CGPoint(
                        x: (points[i - 1].x + points[i].x) / 2,
                        y: points[i - 1].y
                    )
                    let control2 = CGPoint(
                        x: (points[i - 1].x + points[i].x) / 2,
                        y: points[i].y
                    )
                    path.addCurve(to: points[i], control1: control1, control2: control2)
                }

                context.addFilter(.shadow(color: .init(.colorAccentGreen.opacity(0.4)), radius: 4))
                context.stroke(path, with: .color(.colorAccentGreen.opacity(0.6)), lineWidth: 2)
            }
            .frame(height: 60)
            .padding(.horizontal, 18)

            HStack(spacing: 12) {
                ForEach(Array(typeCounts.enumerated()), id: \.offset) { _, item in
                    HStack(spacing: 4) {
                        Circle()
                            .fill(item.color)
                            .frame(width: 6, height: 6)
                        Text("\(item.count) \(item.type)")
                            .font(.system(size: 9))
                            .foregroundStyle(.colorTextMuted)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}
