import LifegamesComponents
import LifegamesTokens
import SwiftUI

// MARK: - HomeBentoScreen

enum HomeBentoScreen {
    static let entry = ScreenEntry(
        id: "home-bento",
        title: "Home · Datastream",
        directions: [
            ScreenDirection(id: "bento", label: "Bento") {
                // No-op onSelect mirrors the app embedding: every tile renders as a
                // single button-trait element (audited by BentoTileAccessibilityUITests).
                AnyView(DatastreamHomeGrid(data: .sample, onSelect: { _ in }))
            },
        ]
    )
}
