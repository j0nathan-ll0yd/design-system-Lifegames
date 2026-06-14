import SwiftUI

enum AccountScreen {
    static let entry = ScreenEntry(
        id: "account",
        title: "Account",
        directions: [
            ScreenDirection(
                id: "neon-console",
                label: "Neon Console",
                make: { AnyView(AccountNeonConsole()) }
            ),
        ]
    )
}
