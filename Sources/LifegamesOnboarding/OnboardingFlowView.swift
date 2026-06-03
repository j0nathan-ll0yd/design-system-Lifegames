import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct OnboardingFlowView: View {
    public let pages: [OnboardingPermissionProps]
    public let currentPageIndex: Int
    public let onRequestPermission: @Sendable (String) -> Void
    public let onOpenSettings: @Sendable () -> Void
    public let onSkipPermission: @Sendable (String) -> Void
    public let onComplete: @Sendable () -> Void
    public let onNext: @Sendable () -> Void

    public init(
        pages: [OnboardingPermissionProps],
        currentPageIndex: Int,
        onRequestPermission: @Sendable @escaping (String) -> Void,
        onOpenSettings: @Sendable @escaping () -> Void,
        onSkipPermission: @Sendable @escaping (String) -> Void,
        onComplete: @Sendable @escaping () -> Void,
        onNext: @Sendable @escaping () -> Void
    ) {
        self.pages = pages
        self.currentPageIndex = currentPageIndex
        self.onRequestPermission = onRequestPermission
        self.onOpenSettings = onOpenSettings
        self.onSkipPermission = onSkipPermission
        self.onComplete = onComplete
        self.onNext = onNext
    }

    /// Total pages: intro(0) + permission cards(1..N) + summary(N+1)
    private var totalDots: Int {
        pages.count + 2
    }

    public var body: some View {
        ZStack {
            LGColor.surfaceBase
                .ignoresSafeArea()

            RadialGradient(
                colors: [currentAccentColor.opacity(0.06), .clear],
                center: .top,
                startRadius: 0,
                endRadius: 500
            )
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 0.4), value: currentPageIndex)

            pageContent
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
                .id(currentPageIndex)
                .animation(.easeInOut(duration: 0.3), value: currentPageIndex)
                .padding(.horizontal, Spacing.s600)
                .padding(.vertical, Spacing.s800)
        }
    }

    @ViewBuilder
    private var pageContent: some View {
        if currentPageIndex == 0 {
            OnboardingIntroPage(totalPages: totalDots, onContinue: onNext)
        } else if currentPageIndex <= pages.count {
            let permIndex = currentPageIndex - 1
            OnboardingPermissionPage(
                props: pages[permIndex],
                pageIndex: currentPageIndex,
                totalPages: totalDots,
                onRequestPermission: onRequestPermission,
                onOpenSettings: onOpenSettings,
                onSkipPermission: onSkipPermission
            )
        } else {
            OnboardingSummaryPage(permissions: pages, onComplete: onComplete)
        }
    }

    private var currentAccentColor: Color {
        if currentPageIndex == 0 {
            return LGColor.accentPink
        } else if currentPageIndex <= pages.count {
            return pages[currentPageIndex - 1].accentColor
        } else {
            return LGColor.accentGreen
        }
    }
}

#Preview("Flow - Intro") {
    OnboardingFlowView(
        pages: samplePages,
        currentPageIndex: 0,
        onRequestPermission: { _ in },
        onOpenSettings: {},
        onSkipPermission: { _ in },
        onComplete: {},
        onNext: {}
    )
    .preferredColorScheme(.dark)
}

#Preview("Flow - Health Permission") {
    OnboardingFlowView(
        pages: samplePages,
        currentPageIndex: 1,
        onRequestPermission: { _ in },
        onOpenSettings: {},
        onSkipPermission: { _ in },
        onComplete: {},
        onNext: {}
    )
    .preferredColorScheme(.dark)
}

#Preview("Flow - Summary") {
    OnboardingFlowView(
        pages: samplePagesGranted,
        currentPageIndex: 4,
        onRequestPermission: { _ in },
        onOpenSettings: {},
        onSkipPermission: { _ in },
        onComplete: {},
        onNext: {}
    )
    .preferredColorScheme(.dark)
}

private let samplePages: [OnboardingPermissionProps] = [
    OnboardingPermissionProps(
        id: "healthKit",
        icon: "heart.fill",
        title: "HEALTH DATA",
        description: "LifePortal reads your heart rate, activity, sleep, and more.",
        accentColor: LGColor.accentPink,
        status: .pending
    ),
    OnboardingPermissionProps(
        id: "locationAlways",
        icon: "location.fill",
        title: "LOCATION",
        description: "LifePortal tracks where you go to log your activities.",
        accentColor: LGColor.accentGreen,
        status: .pending
    ),
    OnboardingPermissionProps(
        id: "motion",
        icon: "figure.walk",
        title: "MOTION",
        description: "LifePortal detects your activity type using motion sensors.",
        accentColor: LGColor.accentAmber,
        status: .pending
    ),
]

private let samplePagesGranted: [OnboardingPermissionProps] = [
    OnboardingPermissionProps(
        id: "healthKit",
        icon: "heart.fill",
        title: "HEALTH DATA",
        description: "LifePortal reads your heart rate, activity, sleep, and more.",
        accentColor: LGColor.accentPink,
        status: .granted
    ),
    OnboardingPermissionProps(
        id: "locationAlways",
        icon: "location.fill",
        title: "LOCATION",
        description: "LifePortal tracks where you go to log your activities.",
        accentColor: LGColor.accentGreen,
        status: .granted
    ),
    OnboardingPermissionProps(
        id: "motion",
        icon: "figure.walk",
        title: "MOTION",
        description: "LifePortal detects your activity type using motion sensors.",
        accentColor: LGColor.accentAmber,
        status: .skipped
    ),
]
