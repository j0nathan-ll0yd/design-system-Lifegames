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
            "Commits": Color.colorAccentGreen, "PRs": Color.colorAccentBlue,
            "Issues": Color.colorAccentAmber, "Other": Color.colorTextMuted,
        ]
        return counts.sorted { $0.value > $1.value }
            .map { (type: $0.key, count: $0.value, color: colorMap[$0.key] ?? Color.colorTextMuted) }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "ACTIVITY PULSE", dotColor: Color.colorAccentGreen, timestamp: "recent")

            Canvas { context, size in
                let count = props.events.count
                let denominator = CGFloat(max(count - 1, 1))
                var points: [CGPoint] = []
                for i in 0 ..< count {
                    let x = CGFloat(i) / denominator * size.width
                    let y = size.height * 0.3 + sin(Double(i) * 0.8) * size.height * 0.2
                    points.append(CGPoint(x: x, y: y))
                }

                guard points.count >= 2 else { return }
                var path = Path()
                path.move(to: points[0])
                for i in 1 ..< points.count {
                    let midX = (points[i - 1].x + points[i].x) / 2
                    let control1 = CGPoint(x: midX, y: points[i - 1].y)
                    let control2 = CGPoint(x: midX, y: points[i].y)
                    path.addCurve(to: points[i], control1: control1, control2: control2)
                }

                let glowColor = Color.colorAccentGreen.opacity(0.4)
                context.addFilter(.shadow(color: glowColor, radius: 4))
                let strokeColor = Color.colorAccentGreen.opacity(0.6)
                context.stroke(path, with: .color(strokeColor), lineWidth: 2)
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
                            .foregroundStyle(Color.colorTextMuted)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}
