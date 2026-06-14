import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic empty-state wrapper over Apple's `ContentUnavailableView`.
/// All text is host-owned (`LocalizedStringKey`); the optional call-to-action
/// button is tinted with an injected semantic `accent` (default
/// `LGColor.accentDefault`). Consumed by `ListScaffold` and any list/grid
/// surface that needs a "nothing here yet" state.
public struct LGEmptyState: View {
    public let title: LocalizedStringKey
    public let systemImage: String
    public let description: LocalizedStringKey?
    public let actionTitle: LocalizedStringKey?
    public let action: (@Sendable () -> Void)?
    public var accent: Color

    public init(
        title: LocalizedStringKey,
        systemImage: String,
        description: LocalizedStringKey? = nil,
        actionTitle: LocalizedStringKey? = nil,
        accent: Color = LGColor.accentDefault,
        action: (@Sendable () -> Void)? = nil
    ) {
        self.title = title
        self.systemImage = systemImage
        self.description = description
        self.actionTitle = actionTitle
        self.accent = accent
        self.action = action
    }

    public var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            if let description {
                Text(description)
            }
        } actions: {
            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                }
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .frame(minHeight: 44)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview("Empty State — no action") {
    LGEmptyState(
        title: "No Downloads",
        systemImage: "tray",
        description: "Items you save for offline use will appear here."
    )
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Empty State — with action") {
    LGEmptyState(
        title: "No Results",
        systemImage: "magnifyingglass",
        description: "Try a different search term.",
        actionTitle: "Clear Search",
        accent: LGColor.accentBlue,
        action: {}
    )
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}
