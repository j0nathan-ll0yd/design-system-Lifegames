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
                AnyView(DatastreamHomeGrid(data: .sample))
            },
        ]
    )
}
