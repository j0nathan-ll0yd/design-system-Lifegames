#if canImport(UIKit)
import LifegamesTokens
import SnapshotTesting
import SwiftUI
import Testing
@testable import LifegamesWidgets

@Suite("SleepView Snapshots")
@MainActor
struct SleepViewSnapshotTests {
    @Test func sleepViewWithScore() {
        let view = SleepView(props: SleepProps(
            duration: "7h 24m",
            coreFormatted: "3h 32m",
            deepFormatted: "1h 12m",
            remFormatted: "1h 48m",
            awakeFormatted: "0h 52m",
            sleepScore: 82
        ))
        .frame(width: 360)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: .iPhone13Pro)))
    }

    @Test func sleepViewWithoutScore() {
        let view = SleepView(props: SleepProps(
            duration: "5h 41m",
            coreFormatted: "2h 50m",
            deepFormatted: "0h 48m",
            remFormatted: "1h 33m",
            awakeFormatted: "0h 30m",
            sleepScore: nil
        ))
        .frame(width: 360)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
        assertSnapshot(of: view, as: .image(layout: .device(config: .iPhone13Pro)))
    }
}
#endif
