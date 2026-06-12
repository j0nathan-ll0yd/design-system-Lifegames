import SwiftUI

struct ScreenDirection: Identifiable {
    let id: String
    let label: String
    let make: @MainActor @Sendable () -> AnyView
}

struct ScreenEntry: Identifiable {
    let id: String
    let title: String
    let directions: [ScreenDirection]
}
