import LifegamesTokens
import SwiftUI

/// Thin horizontal progress bar for book reading progress.
/// Ported verbatim from iOS BookshelfDashboardTile.swift progressBar(_:color:).
public struct ReadingProgressBar: View {
    public let progress: Double
    public let color: Color
    public let height: CGFloat

    public init(
        progress: Double,
        color: Color = LGColor.accentAmber,
        height: CGFloat = 4
    ) {
        self.progress = progress
        self.color = color
        self.height = height
    }

    public var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(color.opacity(0.15))
                RoundedRectangle(cornerRadius: 3)
                    .fill(color)
                    .frame(width: geo.size.width * min(progress, 1.0))
            }
        }
        .frame(height: height)
    }
}

#Preview("Reading Progress Bar") {
    VStack(spacing: 16) {
        ReadingProgressBar(progress: 0.67)
        ReadingProgressBar(progress: 1.0, color: LGColor.accentGreen)
        ReadingProgressBar(progress: 0.25, color: LGColor.accentBlue, height: 6)
        ReadingProgressBar(progress: 0.0)
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
