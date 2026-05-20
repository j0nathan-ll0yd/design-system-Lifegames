import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct TheatreReviewsView: View {
    public let props: TheatreReviewsProps

    public init(props: TheatreReviewsProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "THEATRE REVIEWS", dotColor: Color.colorAccentAmber, timestamp: "\(props.totalCount) reviews")

            if props.reviews.isEmpty {
                emptyState
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(Array(props.reviews.enumerated()), id: \.offset) { _, review in
                            ReviewCard(review: review)
                        }
                    }
                    .padding(.horizontal, 18)
                }
                .padding(.bottom, 16)
            }
        }
        .neonCard(accent: Color(hex: "#ffd600"))
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "theatermasks")
                .font(.system(size: 24))
                .foregroundStyle(Color.colorAccentAmber.opacity(0.4))
            Text("No reviews yet")
                .font(.system(size: 11))
                .foregroundStyle(Color.colorTextMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }
}

private struct ReviewCard: View {
    let review: TheatreReviewsProps.Review

    private var gradeColor: Color {
        switch review.gradeColor {
        case "green": return Color.colorAccentGreen
        case "blue": return Color.colorAccentBlue
        case "amber": return Color.colorAccentAmber
        case "red": return Color(hex: "#ef4444")
        default: return Color.colorAccentAmber
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#ffd600").opacity(0.12), Color.colorAccentBlue.opacity(0.08)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 95, height: 143)
                    .overlay(
                        Image(systemName: "theatermasks.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(Color(hex: "#ffd600").opacity(0.3))
                    )

                Text(review.grade)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(gradeColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.colorSurfaceBase.opacity(0.85))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(gradeColor.opacity(0.5), lineWidth: 1)
                    )
                    .padding(6)
            }

            Text(review.title)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.colorTextTitle)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(width: 95)
        }
    }
}

#Preview("Theatre Reviews") {
    TheatreReviewsView(props: TheatreReviewsProps(
        reviews: [
            .init(title: "Wicked", grade: "A+"),
            .init(title: "Hamilton", grade: "A"),
            .init(title: "The Phantom of the Opera", grade: "B+"),
        ],
        totalCount: 24
    ))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}
