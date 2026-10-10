import LifegamesCopy
import SwiftUI

/// The visible mark for a measurement the export did not carry (atlas decision 0160).
/// Mirrors the web `NO_READING` constant in `packages/web/src/runtime/widget-state.ts`.
/// A symbol, not copy: VoiceOver reads `widgets.widgetState.noReading` for it
/// (via `noReadingAccessibility(_:)`), never "dash".
///
/// Lives in `LifegamesComponentsCore` so the widgets, the bento components
/// (`DatastreamHomeGrid`) and consumers such as the gallery all render the one mark.
public enum NoReading {
    public static let mark = "\u{2014}"

    /// The VoiceOver label for a displayed value: the shared copy key for the
    /// no-reading mark, nil for any real value (which reads as itself).
    public static func accessibilityLabel(for value: String) -> String? {
        value == mark ? CopyLoader.widgets.widgetState.noReading : nil
    }

    /// A measurement as display text, or the mark when the value is missing.
    public static func text(_ value: Int?) -> String {
        value.map { "\($0)" } ?? mark
    }
}

/// Labels a value view for VoiceOver when it shows the no-reading mark.
public struct NoReadingAccessibility: ViewModifier {
    let value: String

    public init(value: String) {
        self.value = value
    }

    public func body(content: Content) -> some View {
        if let label = NoReading.accessibilityLabel(for: value) {
            content.accessibilityLabel(Text(label))
        } else {
            content
        }
    }
}

public extension View {
    /// Apply to every Text that may show `NoReading.mark`.
    func noReadingAccessibility(_ value: String) -> some View {
        modifier(NoReadingAccessibility(value: value))
    }
}
