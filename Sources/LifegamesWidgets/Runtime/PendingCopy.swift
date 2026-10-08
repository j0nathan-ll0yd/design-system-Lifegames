import Foundation

/// User-visible strings that await a key in LifegamesCopy.
///
/// Mirrors `packages/web/src/runtime/pending-copy.ts` exactly. Atlas decision 0160 adds
/// honest widget states. Their strings belong in the copy package, but a copy release is in
/// flight (decision 0158). Once the `widgets.widgetState.*` keys exist, replace every use of
/// this enum with `CopyLoader` and delete this file.
enum PendingCopy {
    enum WidgetStateStrings {
        /// Proposed key widgets.widgetState.noReading: accessible name of the no-reading mark.
        static let noReading = "No reading"
        /// Proposed key widgets.widgetState.unavailable: notice when an export cannot be read.
        static let unavailable = "Data unavailable"
        /// Proposed key widgets.widgetState.suppressed: notice while a hiding focus mode is active.
        static let suppressed = "Hidden during focus"
    }
}
