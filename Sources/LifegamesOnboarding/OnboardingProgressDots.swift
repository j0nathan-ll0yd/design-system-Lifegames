import LifegamesTokens
import SwiftUI

public struct OnboardingProgressDots: View {
    public let total: Int
    public let currentIndex: Int

    public init(total: Int, currentIndex: Int) {
        self.total = total
        self.currentIndex = currentIndex
    }

    public var body: some View {
        HStack(spacing: Spacing.s200) {
            ForEach(0 ..< total, id: \.self) { index in
                Capsule()
                    .fill(index == currentIndex ? LGColor.accentPink : LGColor.borderSubtle)
                    .frame(width: index == currentIndex ? Spacing.s600 : Spacing.s200, height: Spacing.s200)
                    .animation(.easeInOut(duration: 0.25), value: currentIndex)
            }
        }
    }
}

#Preview("Progress Dots") {
    VStack(spacing: Spacing.s600) {
        OnboardingProgressDots(total: 5, currentIndex: 0)
        OnboardingProgressDots(total: 5, currentIndex: 2)
        OnboardingProgressDots(total: 5, currentIndex: 4)
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
