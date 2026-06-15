import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic generic list shell. The host supplies row content via the
/// `row` builder and an optional `emptyState`. Pull-to-refresh is wired when
/// `onRefresh` is supplied. Nav chrome (`NavigationStack`, title, toolbar,
/// search) is HOST-owned; swipe / selection affordances live on the host's
/// `row` view (`.swipeActions` there), not on the template. The `accent`
/// (default `LGColor.accentDefault`) is reserved for host theming and is not
/// consumed by the bare list rendering.
public struct ListTemplate<Item: Identifiable, Row: View>: View {
    public let items: [Item]
    public var accent: Color
    public let emptyState: LGEmptyState?
    public let onRefresh: (@Sendable () async -> Void)?
    public let row: (Item) -> Row

    public init(
        items: [Item],
        accent: Color = LGColor.accentDefault,
        emptyState: LGEmptyState? = nil,
        onRefresh: (@Sendable () async -> Void)? = nil,
        @ViewBuilder row: @escaping (Item) -> Row
    ) {
        self.items = items
        self.accent = accent
        self.emptyState = emptyState
        self.onRefresh = onRefresh
        self.row = row
    }

    public var body: some View {
        Group {
            if items.isEmpty, let emptyState {
                emptyState
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                listContent
            }
        }
        .background(LGColor.surfaceBase)
    }

    private var listContent: some View {
        let list = List {
            ForEach(items) { item in
                row(item)
                    .listRowBackground(LGColor.surfaceRaised)
            }
        }
        .scrollContentBackground(.hidden)

        return Group {
            if let onRefresh {
                list.refreshable { await onRefresh() }
            } else {
                list
            }
        }
    }
}

private struct ListPreviewItem: Identifiable {
    let id: Int
    let title: String
}

#Preview("List — populated") {
    ListTemplate(
        items: [
            ListPreviewItem(id: 1, title: "First Item"),
            ListPreviewItem(id: 2, title: "Second Item"),
            ListPreviewItem(id: 3, title: "Third Item"),
        ],
        accent: LGColor.accentBlue,
        onRefresh: {}
    ) { item in
        HStack {
            Image(systemName: "doc.fill")
                .foregroundStyle(LGColor.accentBlue)
            Text(item.title)
                .font(.system(size: 15))
                .foregroundStyle(LGColor.textPrimary)
            Spacer()
        }
    }
    .preferredColorScheme(.dark)
}

#Preview("List — empty") {
    ListTemplate(
        items: [ListPreviewItem](),
        accent: LGColor.accentBlue,
        emptyState: LGEmptyState(
            title: "Nothing Here",
            systemImage: "tray",
            description: "Items will appear once added."
        )
    ) { item in
        Text(item.title)
    }
    .preferredColorScheme(.dark)
}
