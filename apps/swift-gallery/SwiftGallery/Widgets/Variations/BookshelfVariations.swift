import LifegamesWidgets
import SwiftUI

/// State variations for `BookshelfView`. Uses the `Kind` discriminator because the view ships a
/// dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// data. The wire envelope `{books: {books: [...]}}` requires `Adapters.bookshelf(fromFixture:)`.
enum BookshelfVariations {
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
        .init(id: "default", label: "Default", kind: .fixture("bookshelf")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("bookshelf.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("bookshelf.populated-max")),
        .init(id: "all-completed", label: "All Completed", kind: .fixture("bookshelf.all-completed")),
        .init(id: "all-in-prog", label: "All In Progress", kind: .fixture("bookshelf.all-in-progress")),
        .init(id: "dense-shelf", label: "Dense Shelf", kind: .fixture("bookshelf.dense-shelf")),
        .init(id: "mixed", label: "Mixed", kind: .fixture("bookshelf.mixed")),
        .init(id: "mostly-empty", label: "Mostly Empty", kind: .fixture("bookshelf.mostly-empty")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "bookshelf",
            title: "Bookshelf",
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
            BookshelfView(state: .loading)
        case .empty:
            BookshelfView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "reading", name: name),
               let props = Adapters.bookshelf(fromFixture: data)
            {
                BookshelfView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
