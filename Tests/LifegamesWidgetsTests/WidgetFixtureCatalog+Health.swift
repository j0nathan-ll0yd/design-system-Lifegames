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
            // Hydration, MovementRings, NightSummary, Workouts added by Health worker in fan-out.
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
}
