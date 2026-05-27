#if canImport(UIKit)
import LifegamesTokens
import SnapshotTesting
import SwiftUI
import Testing
@testable import LifegamesComponents

@Suite("SectionHeader Snapshots")
@MainActor
struct SectionHeaderSnapshotTests {
    @Test func sectionHeaderDefault() {
        let view = SectionHeader(title: "VITALS")
            .frame(width: 320)
            .padding()
            .background(LGColor.surfaceBase)
            .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: .iPhone13Pro)))
    }
}
#endif
