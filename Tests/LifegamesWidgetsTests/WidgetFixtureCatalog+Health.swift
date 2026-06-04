import Foundation
@testable import LifegamesWidgets

extension WidgetFixtureCatalogTests {
    static var healthRows: [FixtureCatalogRow] {
        [
            // HeartRate — wire-shape fixtures, adapter-required (Kind.fixture states only;
            // skeleton/empty use init(state:) and don't load JSON)
            heartRateRow("heart-rate"),
            heartRateRow("heart-rate.populated-min"),
            heartRateRow("heart-rate.populated-max"),
            heartRateRow("heart-rate.bradycardia"),
            heartRateRow("heart-rate.resting"),
            heartRateRow("heart-rate.normal"),
            heartRateRow("heart-rate.fat-burn"),
            heartRateRow("heart-rate.cardio"),
            heartRateRow("heart-rate.peak"),
            heartRateRow("heart-rate.max"),
            // Hydration — wire-shape fixtures, adapter-required
            hydrationRow("hydration"),
            hydrationRow("hydration.populated-min"),
            hydrationRow("hydration.populated-max"),
            hydrationRow("hydration.caffeine-crash"),
            hydrationRow("hydration.dehydrated"),
            hydrationRow("hydration.hydrated"),
            hydrationRow("hydration.low"),
            hydrationRow("hydration.morning-coffee"),
            hydrationRow("hydration.normal"),
            hydrationRow("hydration.overhydrated"),
            // MovementRings — no fixture rows (plan option b: inline default only, no adapter)
            // NightSummary — wire-shape fixtures, adapter-required
            nightSummaryRow("night-summary"),
            nightSummaryRow("night-summary.populated-min"),
            nightSummaryRow("night-summary.populated-max"),
            nightSummaryRow("night-summary.excellent"),
            nightSummaryRow("night-summary.fair"),
            nightSummaryRow("night-summary.good"),
            nightSummaryRow("night-summary.nap"),
            nightSummaryRow("night-summary.oversleep"),
            nightSummaryRow("night-summary.poor"),
            nightSummaryRow("night-summary.restless"),
            // Workouts — wire-shape fixtures, adapter-required
            workoutsRow("workouts"),
            workoutsRow("workouts.populated-min"),
            workoutsRow("workouts.populated-max"),
            workoutsRow("workouts.barrys-only"),
            workoutsRow("workouts.endurance"),
            workoutsRow("workouts.heavy-day"),
            workoutsRow("workouts.multi-link"),
        ]
    }

    private static func heartRateRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "health",
            name: name,
            propsTypeName: "HeartRateProps",
            adapt: { Adapters.heartRate(fromFixture: $0) }
        )
    }

    private static func hydrationRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "health",
            name: name,
            propsTypeName: "HydrationProps",
            adapt: { Adapters.hydration(fromFixture: $0) }
        )
    }

    private static func nightSummaryRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "health",
            name: name,
            propsTypeName: "NightSummaryProps",
            adapt: { Adapters.nightSummary(fromFixture: $0) }
        )
    }

    private static func workoutsRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "health",
            name: name,
            propsTypeName: "WorkoutsProps",
            adapt: { Adapters.workouts(fromFixture: $0) }
        )
    }
}
