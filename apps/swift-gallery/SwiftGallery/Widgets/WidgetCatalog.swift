import Foundation

/// Aggregates per-category widget entries declared in `WidgetCatalog+<Category>.swift` files.
/// Per-category extensions own their own list to keep file ownership clean during parallel work
/// — adding a new widget to one category never touches files owned by another category.
enum WidgetCatalog {
    static var entriesByCategory: [WidgetCategory: [WidgetEntry]] {
        [
            .health: healthEntries,
            .identity: identityEntries,
            .location: locationEntries,
            .reading: readingEntries,
            .other: otherEntries,
            .github: githubEntries,
        ]
    }

    static func entries(in category: WidgetCategory) -> [WidgetEntry] {
        entriesByCategory[category] ?? []
    }

    /// Categories that have at least one widget registered. Used by `CategoryListView` so empty
    /// categories don't appear until their fan-out work lands.
    static var populatedCategories: [WidgetCategory] {
        WidgetCategory.allCases.filter { !entries(in: $0).isEmpty }
    }
}
