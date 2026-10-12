import Foundation
import LifegamesComponents

public extension Adapters {
    /// Reads the fixture's top-level `state` string and maps `unavailable` and `suppressed`
    /// to their `WidgetState` cases. Returns nil for any other fixture (including data
    /// fixtures with no `state` key), so callers fall through to the per-widget adapter.
    static func honestState<T>(fromFixture data: Data) -> WidgetState<T>? {
        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let state = json["state"] as? String
        else { return nil }
        switch state {
        case "unavailable": return .unavailable
        case "suppressed": return .suppressed
        default: return nil
        }
    }
}
