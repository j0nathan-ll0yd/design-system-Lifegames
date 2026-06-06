#if canImport(UIKit)
import LifegamesTokens
import SnapshotTesting
import SwiftUI
import Testing
@testable import LifegamesComponentsWatch

@Suite("HealthRingView Snapshots")
@MainActor
struct HealthRingViewSnapshotTests {
    @Test func healthRingViewDefault() {
        let view = HealthRingView(
            progress: 0.75,
            color: LGColor.accentPink,
            label: "MOVE",
            value: "380"
        )
        .frame(width: 120, height: 140)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: .iPhone13Pro)))
    }
}
#endif
