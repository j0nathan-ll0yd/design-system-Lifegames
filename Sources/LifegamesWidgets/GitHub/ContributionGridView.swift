import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ContributionGridView: View {
    public let props: ContributionGridProps

    public init(props: ContributionGridProps) {
        self.props = props
    }

    private func cellColor(level: Int) -> Color {
        switch level {
        case 0: return Color.white.opacity(0.03)
        case 1: return Color.colorAccentGreen.opacity(0.2)
        case 2: return Color.colorAccentGreen.opacity(0.4)
        case 3: return Color.colorAccentGreen.opacity(0.65)
        default: return Color.colorAccentGreen
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "CONTRIBUTIONS", dotColor: Color.colorAccentGreen, timestamp: "52w")

            Canvas { context, _ in
                let cellSize: CGFloat = 5
                let gap: CGFloat = 2
                let cols = props.contributions.count
                let rows = 7

                for col in 0 ..< cols {
                    for row in 0 ..< rows {
                        let level = (row < props.contributions[col].count) ? props.contributions[col][row] : 0
                        let x = CGFloat(col) * (cellSize + gap)
                        let y = CGFloat(row) * (cellSize + gap)
                        let rect = CGRect(x: x, y: y, width: cellSize, height: cellSize)
                        let path = Path(roundedRect: rect, cornerRadius: 1)
                        context.fill(path, with: .color(cellColor(level: level)))
                    }
                }
            }
            .frame(height: 7 * 7)
            .padding(.horizontal, 18)

            HStack(spacing: 16) {
                StatItemView(label: "Repos", value: "\(props.stats.repos)", compact: true)
                StatItemView(label: "Stars", value: "\(props.stats.stars)", compact: true)
                StatItemView(label: "Total", value: "\(props.stats.contributions)", valueColor: Color.colorAccentGreen, compact: true)
            }
            .padding(.horizontal, 18)
            .padding(.top, 10)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}
