import SwiftUI

/// Lays out one onboarding page inside its fixed-height card.
///
/// Each page is a `VStack` whose `Spacer`s centre the copy and pin the actions to the bottom. At
/// accessibility text sizes that content outgrows the card, and SwiftUI truncated the copy to fit
/// ("reads your h…"). `ViewThatFits` keeps the spaced layout whenever it fits, so a default-size
/// page is unchanged, and otherwise scrolls the same content so every line wraps in full.
struct OnboardingPageLayout<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ViewThatFits(in: .vertical) {
            content
            ScrollView { content }
        }
    }
}
