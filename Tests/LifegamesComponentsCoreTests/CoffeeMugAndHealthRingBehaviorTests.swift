import LifegamesTokens
import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesComponentsCore

/// Behavioral pairs for `CoffeeMugViewSnapshotTests` and, in the watch test target,
/// `HealthRingViewSnapshotTests` (HealthRingView lives in this module).
@Suite("CoffeeMugView and HealthRingView — behavioral")
@MainActor
struct CoffeeMugAndHealthRingBehaviorTests {
    // MARK: - CoffeeMugView. The fill level reaches VoiceOver as a clamped percentage.

    @Test(arguments: [
        (0.0, "0% of this cup"), // mugEmpty
        (0.5, "50% of this cup"), // mugHalfFull
        (1.0, "100% of this cup"), // mugFull
        (0.6, "60% of this cup"), // mugEspresso, mugCircularClip
        (-0.2, "0% of this cup"), // below range: clamped
        (1.4, "100% of this cup"), // above range: clamped
    ])
    func mugAnnouncesItsClampedFill(fill: Double, expected: String) throws {
        let mug = try CoffeeMugView(fillPercent: fill, animated: false).inspect()
        #expect(try mug.vStack().accessibilityValue().string() == expected)
    }

    @Test func mugBeverageDoesNotChangeTheRenderedFill() throws {
        // mugEspresso renders the same 0.6 fill as drip: `beverage` is stored but unused by the
        // view today. If a beverage tint lands, this test and the espresso image change together.
        let drip = try CoffeeMugView(fillPercent: 0.6, animated: false).inspect().vStack()
        let espresso = try CoffeeMugView(fillPercent: 0.6, beverage: .espresso, animated: false)
            .inspect().vStack()
        #expect(try drip.accessibilityValue().string() == espresso.accessibilityValue().string())
    }

    @Test func mugHandleRendersOnlyWhenRequested() throws {
        // mugCircularClip passes `showHandle: false` (Variation C): the handle arc is the one
        // stroked shape the overlay adds, so hiding it removes exactly one shape from the tree.
        let withHandle = try CoffeeMugView(fillPercent: 0.6, animated: false).inspect()
            .findAll(ViewType.Shape.self).count
        let withoutHandle = try CoffeeMugView(fillPercent: 0.6, animated: false, showHandle: false).inspect()
            .findAll(ViewType.Shape.self).count
        #expect(withHandle == withoutHandle + 1)
    }

    // MARK: - HealthRingView (healthRingViewDefault)

    @Test func ringShowsValueAndLabelAndTrimsToProgress() throws {
        let ring = try HealthRingView(progress: 0.75, color: LGColor.accentPink, label: "MOVE", value: "380")
            .inspect()
        #expect(try ring.findAll(ViewType.Text.self).map { try $0.string() } == ["380", "MOVE"])
        // Exactly one trimmed shape: the progress arc. The track circle is untrimmed.
        let trims = ring.findAll(ViewType.Shape.self).compactMap { try? $0.trim() }
        #expect(trims.count == 1)
        #expect(trims.first?.from == 0)
        #expect(trims.first?.to == 0.75)
    }
}
