import SwiftUI

/// Represents the loading lifecycle of a widget that fetches remote data.
/// Use `.loading` while fetching, `.empty` when the fetch succeeded but returned no data,
/// and `.populated(T)` when data is available for display.
///
/// `.unavailable` and `.suppressed` are the honest non-data states (atlas decision 0160).
/// Both render the widget chrome plus a notice and never render a data value.
public enum WidgetState<T> {
    case loading
    case empty
    case populated(T)
    /// The export could not be read. Chrome plus a "Data unavailable" notice, no values.
    case unavailable
    /// A hiding focus mode is active. Chrome plus a "Hidden during focus" notice, no data at all.
    case suppressed
}
