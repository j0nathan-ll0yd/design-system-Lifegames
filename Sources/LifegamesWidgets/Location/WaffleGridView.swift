import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct WaffleGridView: View {
    public let categories: [LocationProps.CategoryEntry]

    public init(categories: [LocationProps.CategoryEntry]) {
        self.categories = categories
    }

    private static let colors: [Color] = [.colorAccentBlue, .colorAccentGreen, .colorAccentPink, .colorAccentAmber, .colorAccentPurple]

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "TIME MAP", dotColor: .colorAccentBlue, timestamp: "categories")

            VStack(spacing: 8) {
                let totalVisits = categories.reduce(0) { $0 + $1.visitCount }
                let cells: [(color: Color, tooltip: String)] = {
                    guard totalVisits > 0 else {
                        return Array(repeating: (Color.white.opacity(0.05), ""), count: 100)
                    }
                    var result: [(Color, String)] = []
                    for (index, cat) in categories.enumerated() {
                        let count = max(1, Int(round(Double(cat.visitCount) / Double(totalVisits) * 100)))
                        let color = Self.colors[index % Self.colors.count]
                        result.append(contentsOf: Array(repeating: (color, cat.category), count: count))
                    }
                    while result.count < 100 {
                        result.append((Color.white.opacity(0.05), ""))
                    }
                    return Array(result.prefix(100))
                }()

                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 10), spacing: 2) {
                    ForEach(0 ..< 100, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(cells[i].color)
                            .aspectRatio(1, contentMode: .fit)
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
        .neonCard(accent: .colorAccentBlue)
    }
}
