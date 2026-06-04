import LifegamesWidgets
import SwiftUI

/// State variations for `ReadingFeedView`. Uses the `Kind` discriminator because the view ships a
/// dual init: `init(state: .loading/.empty)` for skeleton/empty chrome and `init(props:)` for
/// data. The wire envelope `{reading: {articles: [...]}}` requires `Adapters.readingFeed(fromFixture:)`.
enum ReadingFeedVariations {
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
        .init(id: "default", label: "Default", kind: .fixture("reading-feed")),
        .init(id: "populated-min", label: "Populated (min)", kind: .fixture("reading-feed.populated-min")),
        .init(id: "populated-max", label: "Populated (max)", kind: .fixture("reading-feed.populated-max")),
        .init(id: "binge-week", label: "Binge Week", kind: .fixture("reading-feed.binge-week")),
        .init(id: "mixed-types", label: "Mixed Types", kind: .fixture("reading-feed.mixed-types")),
        .init(id: "quiet-week", label: "Quiet Week", kind: .fixture("reading-feed.quiet-week")),
        .init(id: "recent-burst", label: "Recent Burst", kind: .fixture("reading-feed.recent-burst")),
        .init(id: "single-entry", label: "Single Entry", kind: .fixture("reading-feed.single-entry")),
        .init(id: "skeleton", label: "Skeleton", kind: .skeleton),
        .init(id: "empty", label: "Empty", kind: .empty),
    ]

    static var entry: WidgetEntry {
        WidgetEntry(
            id: "reading-feed",
            title: "Reading Feed",
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
            ReadingFeedView(state: .loading)
        case .empty:
            ReadingFeedView(state: .empty)
        case let .fixture(name):
            if let data = FixtureLoader.data(category: "reading", name: name),
               let props = Adapters.readingFeed(fromFixture: data)
            {
                ReadingFeedView(props: props)
            } else {
                Text("Missing fixture: \(name)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.red)
            }
        }
    }
}
