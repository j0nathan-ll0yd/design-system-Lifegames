import LifegamesTokens
import SwiftUI

/// Row of star icons representing a rating value.
/// Ported from iOS BookshelfView.swift starRating(_:color:).
public struct RatingStars: View {
    public let rating: Int
    public let outOf: Int
    public let size: CGFloat
    public let onColor: Color
    public let offColor: Color

    public init(
        rating: Int,
        outOf: Int = 5,
        size: CGFloat = 10,
        onColor: Color = LGColor.accentAmber,
        offColor: Color = LGColor.textSubtle
    ) {
        self.rating = rating
        self.outOf = outOf
        self.size = size
        self.onColor = onColor
        self.offColor = offColor
    }

    public var body: some View {
        HStack(spacing: 2) {
            ForEach(1 ... outOf, id: \.self) { star in
                Image(systemName: star <= rating ? "star.fill" : "star")
                    .font(.system(size: size))
                    .foregroundStyle(star <= rating ? onColor : offColor)
            }
        }
    }
}

#Preview("Rating Stars") {
    VStack(spacing: 16) {
        RatingStars(rating: 5)
        RatingStars(rating: 3)
        RatingStars(rating: 1)
        RatingStars(rating: 4, size: 7)
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
