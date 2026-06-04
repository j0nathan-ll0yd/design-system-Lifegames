import LifegamesWidgets
import SwiftUI

/// State variations for `BookModalView`. Uses the `Kind` discriminator because the view ships a
/// dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// data. The flat wire format uses `desc` instead of `description`; `Adapters.bookModal(fromFixture:)`
/// handles the field rename. Empty fixture stubs (`{}`) are handled by `.skeleton`/`.empty` kinds.
enum BookModalVariations {
    enum Kind {
        case fixture(String)
        case skeleton
        case empty
    }

    struct State: Identifiable {
        let id: String
        let label: String
        let kind: Kind
    }

    static let states: [State] = [
        .init(id: "currently-reading", label: "Currently Reading", kind: .fixture("book-modal.currently-reading")),
        .init(id: "completed-with-rating", label: "Completed with Rating", kind: .fixture("book-modal.completed-with-rating")),
        .init(id: "series-book", label: "Series Book", kind: .fixture("book-modal.series-book")),
        .init(id: "wishlist", label: "Wishlist", kind: .fixture("book-modal.wishlist")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "book-modal",
            title: "Book Modal",
            category: .reading,
            states: states.map { state in
                VariationState(id: state.id, label: state.label) {
                    AnyView(render(state: state))
                }
            }
        )
    }

    @ViewBuilder
    private static func render(state: State) -> some View {
        switch state.kind {
        case .skeleton:
            BookModalView(state: .loading)
        case .empty:
            BookModalView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "reading", name: name),
               let props = Adapters.bookModal(fromFixture: data)
            {
                BookModalView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
