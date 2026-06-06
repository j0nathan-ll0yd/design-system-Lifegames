import LifegamesTokens
import SwiftUI
import Testing
@testable import LifegamesOnboarding

@Suite("OnboardingFlowView Initialization")
@MainActor
struct OnboardingFlowViewTests {
    @Test func flowViewInitializesWithoutCrashing() {
        let pages: [OnboardingPermissionProps] = [
            OnboardingPermissionProps(
                id: "healthKit",
                icon: "heart.fill",
                title: "HEALTH DATA",
                description: "Reads your health data.",
                accentColor: LGColor.accentPink,
                status: .pending
            ),
        ]
        let view = OnboardingFlowView(
            pages: pages,
            currentPageIndex: 0,
            onRequestPermission: { _ in },
            onOpenSettings: {},
            onSkipPermission: { _ in },
            onComplete: {},
            onNext: {}
        )
        #expect(view.pages.count == 1)
        #expect(view.currentPageIndex == 0)
    }

    @Test func flowViewAcceptsEmptyPages() {
        let view = OnboardingFlowView(
            pages: [],
            currentPageIndex: 0,
            onRequestPermission: { _ in },
            onOpenSettings: {},
            onSkipPermission: { _ in },
            onComplete: {},
            onNext: {}
        )
        #expect(view.pages.isEmpty)
    }
}
