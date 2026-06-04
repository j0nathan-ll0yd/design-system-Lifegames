import Foundation

extension WidgetCatalog {
    static var healthEntries: [WidgetEntry] {
        [
            HeartRateVariations.entry,
            HydrationVariations.entry,
            MovementRingsVariations.entry,
            NightSummaryVariations.entry,
            WorkoutsVariations.entry,
        ]
    }
}
