import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct TopicCloudView: View {
    public let props: TopicCloudProps

    public init(props: TopicCloudProps) {
        self.props = props
    }

    private func fontSize(for size: String) -> CGFloat {
        switch size {
        case "xl": return 14
        case "lg": return 12
        case "md": return 10
        default: return 9
        }
    }

    private func opacity(for size: String) -> Double {
        switch size {
        case "xl": return 1.0
        case "lg": return 0.85
        case "md": return 0.7
        default: return 0.55
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "TOPIC CLOUD", dotColor: Color.colorAccentGreen, timestamp: "topics")

            FlowLayout(spacing: 6) {
                ForEach(Array(props.topics.enumerated()), id: \.offset) { _, topic in
                    Text(topic.name)
                        .font(.system(size: fontSize(for: topic.size), weight: .medium))
                        .foregroundStyle(Color.colorAccentBlue.opacity(opacity(for: topic.size)))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.colorAccentBlue.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal _: ProposedViewSize, subviews: Subviews, cache _: inout ()) {
        let result = arrange(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}
