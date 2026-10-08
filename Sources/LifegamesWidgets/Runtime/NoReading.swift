import LifegamesCopy
import SwiftUI

/// The visible mark for a measurement the export did not carry (atlas decision 0160).
/// Mirrors the web `NO_READING` constant in `packages/web/src/runtime/widget-state.ts`.
/// A symbol, not copy: VoiceOver reads `widgets.widgetState.noReading` for it
/// (via `noReadingAccessibility(_:)`), never "dash".
enum NoReading {
    static let mark = "\u{2014}"

    /// The VoiceOver label for a displayed value: the shared copy key for the
    /// no-reading mark, nil for any real value (which reads as itself).
    static func accessibilityLabel(for value: String) -> String? {
        value == mark ? CopyLoader.widgets.widgetState.noReading : nil
    }
}

/// Labels a value view for VoiceOver when it shows the no-reading mark.
struct NoReadingAccessibility: ViewModifier {
    let value: String

    func body(content: Content) -> some View {
        if let label = NoReading.accessibilityLabel(for: value) {
            content.accessibilityLabel(Text(label))
        } else {
            content
        }
    }
}

extension View {
    /// Apply to every Text that may show `NoReading.mark`.
    func noReadingAccessibility(_ value: String) -> some View {
        modifier(NoReadingAccessibility(value: value))
    }
}
