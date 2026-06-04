import SwiftUI

/// One state variation of a widget. The `make` closure is invoked lazily when the detail view
/// renders the row, so heavyweight widget body construction is deferred until needed.
struct VariationState: Identifiable {
    let id: String
    let label: String
    let make: @MainActor @Sendable () -> AnyView
}

/// A single widget registered in the gallery catalog. Each `*Variations.swift` file exposes one
/// of these via a `static var entry: WidgetEntry { ... }` accessor.
struct WidgetEntry: Identifiable, Hashable {
    let id: String
    let title: String
    let category: WidgetCategory
    let states: [VariationState]

    static func == (lhs: WidgetEntry, rhs: WidgetEntry) -> Bool {
        lhs.id == rhs.id && lhs.category == rhs.category
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(category)
    }
}

extension WidgetEntry {
    /// Returns `states` sorted by the canonical convention:
    ///
    /// 1. `default` (no suffix)
    /// 2. `populated-min`, `min`
    /// 3. `populated-max`, `max-pop`, `max`
    /// 4. Named variants (alphabetical by label)
    /// 5. `skeleton`
    /// 6. `empty`
    ///
    /// Per-widget authors may declare `states` in any order — the detail view applies this sort
    /// before rendering, so the canonical convention is enforced in one place.
    var canonicallyOrderedStates: [VariationState] {
        states.sorted { a, b in
            let pa = Self.priority(of: a.id)
            let pb = Self.priority(of: b.id)
            if pa != pb { return pa < pb }
            return a.label.localizedCaseInsensitiveCompare(b.label) == .orderedAscending
        }
    }

    private static func priority(of id: String) -> Int {
        switch id {
        case "default": return 0
        case "populated-min", "min": return 1
        case "populated-max", "max-pop", "max": return 2
        case "skeleton": return 1000
        case "empty": return 1001
        default: return 500
        }
    }
}
