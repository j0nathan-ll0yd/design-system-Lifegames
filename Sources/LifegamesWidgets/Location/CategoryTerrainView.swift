import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct CategoryTerrainView: View {
    public let categories: [LocationProps.CategoryEntry]

    public init(categories: [LocationProps.CategoryEntry]) {
        self.categories = categories
    }

    private static let categoryColors: [Color] = [Color.colorAccentGreen, Color.colorAccentBlue, Color.colorAccentPink, Color.colorAccentAmber, Color.colorAccentPurple]

    private var totalMinutes: Int {
        categories.reduce(0) { $0 + $1.totalMinutes }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "TIME TERRAIN", dotColor: Color.colorAccentGreen, timestamp: "categories")

            VStack(alignment: .leading, spacing: 8) {
                GeometryReader { geo in
                    HStack(spacing: 0) {
                        ForEach(Array(categories.enumerated()), id: \.offset) { index, cat in
                            let pct = totalMinutes > 0 ? CGFloat(cat.totalMinutes) / CGFloat(totalMinutes) : 0
                            let color = Self.categoryColors[index % Self.categoryColors.count]
                            Rectangle()
                                .fill(color)
                                .frame(width: geo.size.width * pct)
                        }
                    }
                }
                .frame(height: 16)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                HStack(spacing: 8) {
                    ForEach(Array(categories.prefix(5).enumerated()), id: \.offset) { index, cat in
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Self.categoryColors[index % Self.categoryColors.count])
                                .frame(width: 6, height: 6)
                            Text(cat.category)
                                .font(.system(size: 10))
                                .foregroundStyle(Color.colorTextMuted)
                        }
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}
