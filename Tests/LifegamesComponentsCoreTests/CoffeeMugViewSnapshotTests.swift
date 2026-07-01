#if canImport(UIKit)
    import LifegamesTokens
    import SnapshotTesting
    import SwiftUI
    import Testing
    @testable import LifegamesComponentsCore

    // Snapshot tests for CoffeeMugView at the three canonical fill levels (0 / 0.5 / 1.0)
    // mandated by §6 Step 6, plus a beverage variant and the Variation-C external circular clip.
    //
    // `animated: false` suppresses all `onAppear` animations so frames are fully
    // deterministic — the same technique as `HeartRateView(props:animateECG:false)`.
    // Reduce-motion cannot be injected (env keypath is get-only), so the `animated` seam
    // is the authoritative deterministic path for these tests.
    //
    // S57: record against the CI simulator before merging; see docs/procedures/ios/add-snapshot-test.md.

    @Suite("CoffeeMugView Snapshots")
    @MainActor
    struct CoffeeMugViewSnapshotTests {
        private let layout: SwiftUISnapshotLayout = .device(config: .iPhone13Pro)

        private func wrap<V: View>(_ view: V) -> some View {
            view
                .padding(Spacing.s600)
                .background(LGColor.surfaceBase)
                .preferredColorScheme(.dark)
        }

        // MARK: - Fill levels

        @Test func mugEmpty() {
            assertSnapshot(
                of: wrap(CoffeeMugView(fillPercent: 0, animated: false)),
                as: .image(layout: layout)
            )
        }

        @Test func mugHalfFull() {
            assertSnapshot(
                of: wrap(CoffeeMugView(fillPercent: 0.5, animated: false)),
                as: .image(layout: layout)
            )
        }

        @Test func mugFull() {
            assertSnapshot(
                of: wrap(CoffeeMugView(fillPercent: 1.0, animated: false)),
                as: .image(layout: layout)
            )
        }

        // MARK: - Beverage variant

        @Test func mugEspresso() {
            assertSnapshot(
                of: wrap(CoffeeMugView(fillPercent: 0.6, beverage: .espresso, animated: false)),
                as: .image(layout: layout)
            )
        }

        // MARK: - External circular clip (Variation C pattern)

        @Test func mugCircularClip() {
            assertSnapshot(
                of: wrap(
                    CoffeeMugView(fillPercent: 0.6, animated: false)
                        .frame(width: 120, height: 140)
                        .clipShape(Circle())
                ),
                as: .image(layout: layout)
            )
        }
    }
#endif
