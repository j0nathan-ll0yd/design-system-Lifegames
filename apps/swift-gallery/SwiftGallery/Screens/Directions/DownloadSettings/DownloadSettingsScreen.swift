import SwiftUI

enum DownloadSettingsScreen {
    static let entry = ScreenEntry(
        id: "download-settings",
        title: "Download Settings",
        directions: [
            ScreenDirection(
                id: "neon-console",
                label: "Neon Console",
                make: { AnyView(DownloadSettingsNeonConsole()) }
            ),
        ]
    )
}
