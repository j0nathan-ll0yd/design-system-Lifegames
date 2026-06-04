import Foundation
import LifegamesWidgets

/// Decodes JSON fixtures bundled with the `LifegamesWidgets` package into typed Props values.
/// Resource lookup is delegated to `WidgetFixtures` (the public accessor exposed by the package)
/// so the gallery never touches `Bundle.module` directly.
enum FixtureLoader {
    /// Direct Codable decode — works for widgets whose fixture JSON is shaped exactly like their
    /// Props type (most GitHub widgets: CommitLog, LanguageBars, PinnedRepos, …).
    static func load<T: Decodable>(category: String, name: String) -> T? {
        guard let data = WidgetFixtures.data(category: category, name: name) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    /// Raw bytes accessor — for widgets whose fixture is in web wire format (envelope-wrapped,
    /// snake_case fields, derived values). Callers feed the bytes to `Adapters.<widget>(...)` to
    /// produce a Props value. Used by Health/Identity/Reading/Other widgets where the wire shape
    /// doesn't match the Props struct.
    static func data(category: String, name: String) -> Data? {
        WidgetFixtures.data(category: category, name: name)
    }

    /// Untyped JSON dictionary accessor — convenience for adapters that work on `[String: Any]`.
    static func dict(category: String, name: String) -> [String: Any]? {
        guard let data = WidgetFixtures.data(category: category, name: name) else { return nil }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }
}
