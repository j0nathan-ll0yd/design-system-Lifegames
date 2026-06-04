import Foundation

extension WidgetCatalog {
    static var healthEntries: [WidgetEntry] {
        [
            HeartRateVariations.entry,
            // Hydration, MovementRings, NightSummary, Workouts added by Health worker in fan-out.
        ]
    }
}
