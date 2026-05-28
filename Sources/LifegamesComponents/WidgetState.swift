import SwiftUI

/// Represents the loading lifecycle of a widget that fetches remote data.
/// Use `.loading` while fetching, `.empty` when the fetch succeeded but returned no data,
/// and `.populated(T)` when data is available for display.
public enum WidgetState<T> {
    case loading
    case empty
    case populated(T)
}
