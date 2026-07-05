import Foundation
import SwiftUI

enum ScreenCatalog {
    static let all: [ScreenEntry] = [
        LaunchScreen.entry,
        MainTabShellScreen.entry,
        FileListScreen.entry,
        FileDetailScreen.entry,
        LoginScreen.entry,
        AccountScreen.entry,
        DownloadSettingsScreen.entry,
        SampleFilesScreen.entry,
        // Coffee — Acaia Pearl tracking UI (Hero direction promoted to CoffeeTrackingView)
        // directions.count == 1 → full-viewport render (ScreenDetailView §8)
        coffeeEntry,
        HomeBentoScreen.entry,
        SettingsConsolidatedScreen.entry,
    ]

    // MARK: - Coffee entry

    private static let coffeeEntry = ScreenEntry(
        id: "coffee",
        title: "Coffee",
        directions: [
            ScreenDirection(
                id: "coffee",
                label: "Coffee",
                make: { AnyView(CoffeeStateSwitcher()) }
            ),
        ]
    )
}
