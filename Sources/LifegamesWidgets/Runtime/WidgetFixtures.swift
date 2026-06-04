import Foundation

/// Public accessor for widget fixture JSON bundled with the `LifegamesWidgets` package.
///
/// `Bundle.module` is only synthesized inside the package that owns the resources; consuming
/// targets (gallery apps, downstream binaries) cannot reach it directly. This enum exposes a
/// typed entry point so callers don't need to know which bundle holds the JSON.
public enum WidgetFixtures {
    /// `category` is retained as a documentation/organization contract for callers; the lookup
    /// itself is by name only because SPM's `.process("Resources")` rule flattens every JSON
    /// file into the bundle root regardless of its source directory. Widget fixture names are
    /// globally unique (slug-prefixed: `heart-rate.peak`, `activity-feed.empty`, …) so flat
    /// lookup is unambiguous in practice.
    public static func url(category _: String, name: String) -> URL? {
        Bundle.module.url(forResource: name, withExtension: "json")
    }

    public static func data(category: String, name: String) -> Data? {
        url(category: category, name: name).flatMap { try? Data(contentsOf: $0) }
    }
}
