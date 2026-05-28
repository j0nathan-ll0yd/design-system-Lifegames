import LifegamesTokens
import SwiftUI

/// A shimmering placeholder bar used in skeleton loading states.
/// Respects the system accessibility `reduceMotion` setting — when enabled,
/// the bar renders at a fixed opacity with no animation.
public struct SkeletonBar: View {
    private let width: CGFloat?
    private let height: CGFloat
    private let cornerRadius: CGFloat

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var opacity: Double = 0.3

    public init(width: CGFloat? = nil, height: CGFloat = 12, cornerRadius: CGFloat = 4) {
        self.width = width
        self.height = height
        self.cornerRadius = cornerRadius
    }

    public var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(LGColor.surfaceRaised)
            .frame(width: width, height: height)
            .opacity(reduceMotion ? 0.5 : opacity)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(
                    .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                ) {
                    opacity = 0.7
                }
            }
    }
}

#Preview("SkeletonBar") {
    VStack(spacing: 12) {
        SkeletonBar(width: 200, height: 16)
        SkeletonBar(width: 140, height: 12)
        SkeletonBar(height: 10)
    }
    .padding()
    .preferredColorScheme(.dark)
}
