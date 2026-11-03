import LifegamesTokens
import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesOnboarding

/// Behavioral assertions for onboarding at accessibility text sizes. At AX3 the pages outgrew their
/// card and truncated the copy ("reads your h…"), and the summary rows truncated both the title
/// and the status ("HEA… PEN…").
@Suite("Onboarding — accessibility text sizes")
@MainActor
struct OnboardingAccessibilityLayoutTests {
    private static let permissions: [OnboardingPermissionProps] = [
        ("healthKit", "heart.fill", "HEALTH DATA"),
        ("locationAlways", "location.fill", "LOCATION"),
        ("motion", "figure.walk", "MOTION"),
        ("bluetooth", "dot.radiowaves.left.and.right", "BLUETOOTH"),
    ].map { id, icon, title in
        OnboardingPermissionProps(
            id: id,
            icon: icon,
            title: title,
            description: "LifePortal reads your heart rate, activity, sleep, and more.",
            accentColor: LGColor.accentPink,
            status: .pending
        )
    }

    private static var pages: [(String, AnyView)] {
        [
            ("intro", AnyView(OnboardingIntroPage(totalPages: 6, onContinue: {}))),
            ("permission", AnyView(OnboardingPermissionPage(
                props: permissions[0],
                pageIndex: 1,
                totalPages: 6,
                onRequestPermission: { _ in },
                onOpenSettings: {},
                onSkipPermission: { _ in }
            ))),
            ("summary", AnyView(OnboardingSummaryPage(permissions: permissions, onComplete: {}))),
        ]
    }

    /// The spaced layout is tried first, so a page that fits renders as before; the same content
    /// scrolls when it does not fit, so no line is cut short.
    @Test func everyPageFallsBackToScrollingContent() throws {
        for (name, page) in Self.pages {
            let fits = try page.inspect().find(ViewType.ViewThatFits.self)
            #expect((try? fits.vStack(0)) != nil, "\(name): the first choice is the spaced page")
            let scroll = try fits.scrollView(1)
            #expect((try? scroll.find(ViewType.Button.self)) != nil, "\(name): the fallback scrolls the whole page")
        }
    }

    @Test func summaryRowsKeepTitleAndStatusOnOneLineAtDefaultSize() throws {
        let summary = OnboardingSummaryPage(permissions: Self.permissions, onComplete: {})
            .environment(\.dynamicTypeSize, .large)
        for permission in Self.permissions {
            let title = try summary.inspect().find(text: permission.title)
            let row = try title.find(ViewType.HStack.self, relation: .parent)
            #expect((try? row.find(text: "PENDING")) != nil, "\(permission.title)")
        }
    }

    @Test func summaryRowsStackTitleAboveStatusAtAccessibilitySizes() throws {
        let summary = OnboardingSummaryPage(permissions: Self.permissions, onComplete: {})
            .environment(\.dynamicTypeSize, .accessibility3)
        for permission in Self.permissions {
            let title = try summary.inspect().find(text: permission.title)
            let titleRow = try? title.find(ViewType.HStack.self, relation: .parent)
            #expect((try? titleRow?.find(text: "PENDING")) == nil, "\(permission.title): status leaves the title row")
            #expect(try title.fixedSize() == (horizontal: false, vertical: true), "\(permission.title): title wraps")
        }
    }
}
