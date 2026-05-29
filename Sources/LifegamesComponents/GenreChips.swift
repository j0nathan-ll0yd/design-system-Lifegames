import LifegamesTokens
import SwiftUI

/// Horizontal or wrapping row of monospaced genre capsule tags.
/// Ported from iOS BookshelfView.swift genreCapsules(_:tint:).
/// FlowLayout is owned here (canonical copy; the BookModalView duplicate was removed).
public struct GenreChips: View {
    public let genres: [String]
    public let tint: Color
    public let wraps: Bool
    public let spacing: CGFloat

    public init(
        genres: [String],
        tint: Color = LGColor.accentAmber,
        wraps: Bool = false,
        spacing: CGFloat = 6
    ) {
        self.genres = genres
        self.tint = tint
        self.wraps = wraps
        self.spacing = spacing
    }

    public var body: some View {
        if wraps {
            FlowLayout(spacing: spacing) {
                chips
            }
        } else {
            HStack(spacing: spacing) {
                chips
            }
        }
    }

    private var chips: some View {
        ForEach(genres, id: \.self) { genre in
            Text(genre)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundStyle(tint)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(tint.opacity(0.12))
                .clipShape(Capsule())
        }
    }
}

// MARK: - FlowLayout (verbatim from BookModalView.swift:166-203)

private struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
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
        var totalHeight: CGFloat = 0

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
            totalHeight = y + rowHeight
        }
        return (CGSize(width: maxWidth, height: totalHeight), positions)
    }
}

#Preview("Genre Chips") {
    VStack(alignment: .leading, spacing: 16) {
        GenreChips(genres: ["Science Fiction", "Adventure"])
        GenreChips(genres: ["Thriller", "Mystery", "Crime"], tint: LGColor.accentBlue)
        GenreChips(
            genres: ["Science Fiction", "Adventure", "Space", "Hard SF", "Biology", "Chemistry"],
            wraps: true
        )
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
